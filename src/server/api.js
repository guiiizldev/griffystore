const express = require("express");
const http = require("http");
const https = require("https");
const path = require("path");
const crypto = require("crypto");
const { query, db, closeDb } = require("./database");
const { migrate } = require("./schema");
const { issueFiscalDocument } = require("./fiscal");
const packageInfo = require("../../package.json");

function toNumber(value) {
  return Number(value || 0);
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function businessDate() {
  return today();
}

function uid(prefix) {
  return `${prefix}${Date.now()}${Math.random().toString(16).slice(2, 7)}`;
}

function adminSecret() {
  return process.env.STOREFRONT_ADMIN_SECRET || process.env.APP_SECRET || process.env.MYSQL_PASSWORD || "griffy-store-dev-secret";
}

function signAdminToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", adminSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyAdminToken(token = "") {
  const [body, signature] = String(token).split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", adminSecret()).update(body).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

function bearerToken(req) {
  const header = req.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function requireRoleToken(req, roles = []) {
  const token = verifyAdminToken(bearerToken(req));
  if (!token || (roles.length && !roles.includes(token.role))) return null;
  return token;
}

function mapProduct(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    supplier: row.supplier,
    unit: row.unit,
    stock: row.stock,
    min: row.min_stock,
    cost: toNumber(row.cost),
    price: toNumber(row.price),
    wholesalePrice: toNumber(row.wholesale_price),
    lot: row.lot,
    validity: row.validity ? formatDate(row.validity) : null,
    cover: row.cover,
  };
}

function mapStoreProduct(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    stock: Number(row.stock || 0),
    price: toNumber(row.price),
    cover: row.cover,
  };
}

function mapTimeEntry(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    type: row.entry_type,
    at: row.entry_at,
    source: row.source,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    accuracy: row.accuracy === null || row.accuracy === undefined ? null : Number(row.accuracy),
    distanceMeters: row.distance_meters,
    locationStatus: row.location_status,
    photoData: row.photo_data,
    deviceInfo: row.device_info,
    ipAddress: row.ip_address,
    note: row.note,
  };
}

function distanceMeters(aLat, aLng, bLat, bLng) {
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(earth * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

function timeClockSummary(entries) {
  const byUserDay = new Map();
  for (const entry of entries) {
    const day = formatDate(entry.entry_at);
    const key = `${entry.user_id}:${day}`;
    if (!byUserDay.has(key)) {
      byUserDay.set(key, {
        userId: entry.user_id,
        userName: entry.user_name,
        date: day,
        firstIn: null,
        lastOut: null,
        breakStart: null,
        breakEnd: null,
        entries: [],
      });
    }
    const item = byUserDay.get(key);
    item.entries.push(mapTimeEntry(entry));
    if (entry.entry_type === "Entrada" && !item.firstIn) item.firstIn = entry.entry_at;
    if (entry.entry_type === "Saida") item.lastOut = entry.entry_at;
    if (entry.entry_type === "Intervalo inicio" && !item.breakStart) item.breakStart = entry.entry_at;
    if (entry.entry_type === "Intervalo fim") item.breakEnd = entry.entry_at;
  }
  return Array.from(byUserDay.values()).map((item) => {
    const first = item.firstIn ? new Date(item.firstIn) : null;
    const last = item.lastOut ? new Date(item.lastOut) : null;
    const lateMinutes = first ? Math.max(0, first.getHours() * 60 + first.getMinutes() - 9 * 60) : null;
    const workedMinutes = first && last ? Math.max(0, Math.round((last - first) / 60000)) : null;
    return { ...item, lateMinutes, workedMinutes };
  });
}

function mapRepairPart(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    compatibleModels: row.compatible_models,
    supplier: row.supplier,
    unit: row.unit,
    stock: Number(row.stock || 0),
    min: Number(row.min_stock || 0),
    cost: toNumber(row.cost),
    location: row.location,
    notes: row.notes,
    active: Boolean(row.active),
  };
}

function repairPartPayload(body, id) {
  return {
    id,
    code: body.code || null,
    name: body.name,
    category: body.category || "",
    compatibleModels: body.compatibleModels || "",
    supplier: body.supplier || "",
    unit: body.unit || "unidade",
    stock: Number(body.stock || 0),
    min: Number(body.min || 0),
    cost: Number(body.cost || 0),
    location: body.location || "",
    notes: body.notes || "",
    active: body.active === false || body.active === "false" || body.active === "0" ? 0 : 1,
  };
}

function mapSale(row) {
  return {
    id: row.id,
    date: formatDate(row.sale_date),
    customer: row.customer,
    payment: row.payment,
    operator: row.operator,
    seller: row.seller || row.operator,
    discount: toNumber(row.discount),
    total: toNumber(row.total),
    status: row.status || "active",
    canceledAt: row.canceled_at,
    canceledBy: row.canceled_by,
    cancelReason: row.cancel_reason,
    shiftId: row.shift_id,
    fiscalStatus: row.fiscal_status,
    fiscalKey: row.fiscal_key,
    fiscalProtocol: row.fiscal_protocol,
    items: [],
    payments: [],
  };
}

function mapShift(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.shift_name,
    operator: row.operator,
    openingAmount: toNumber(row.opening_amount),
    businessDate: formatDate(row.business_date || row.opened_at),
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    closingAmount: row.closing_amount == null ? null : toNumber(row.closing_amount),
    expectedAmount: row.expected_amount == null ? null : toNumber(row.expected_amount),
    differenceAmount: row.difference_amount == null ? null : toNumber(row.difference_amount),
    status: row.status,
    notes: row.notes,
  };
}

function mapService(row) {
  return {
    id: row.id,
    customer: row.customer,
    phone: row.phone_model,
    customerPhone: row.customer_phone,
    customerDocument: row.customer_document,
    brand: row.brand,
    imei: row.imei,
    passwordInfo: row.password_info,
    accessories: row.accessories,
    condition: row.device_condition,
    issue: row.issue,
    status: row.status,
    estimate: toNumber(row.estimate),
    laborCost: toNumber(row.labor_cost),
    partsCost: toNumber(row.parts_cost),
    priority: row.priority || "Normal",
    warrantyDays: Number(row.warranty_days || 90),
    diagnosis: row.diagnosis,
    solution: row.solution,
    parts: row.parts,
    approvedAt: row.approved_at,
    finishedAt: row.finished_at,
    deliveredAt: row.delivered_at,
    notes: row.notes,
    openedAt: formatDate(row.opened_at),
    tech: row.tech,
    events: [],
  };
}

function mapPurchaseDocument(row) {
  return {
    id: row.id,
    type: row.document_type,
    date: formatDate(row.document_date),
    customerName: row.customer_name,
    customerDocument: row.customer_document,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    customerDistrict: row.customer_district,
    customerZip: row.customer_zip,
    customerCity: row.customer_city,
    customerState: row.customer_state,
    deviceBrand: row.device_brand,
    deviceModel: row.device_model,
    deviceImei: row.device_imei,
    deviceSerial: row.device_serial,
    deviceColor: row.device_color,
    deviceStorage: row.device_storage,
    deviceCondition: row.device_condition,
    accessories: row.accessories,
    quantity: Number(row.quantity || 1),
    warrantyMonths: Number(row.warranty_months || 6),
    purchaseValue: toNumber(row.purchase_value),
    paymentMethod: row.payment_method,
    notes: row.notes,
    operator: row.operator,
    createdAt: row.created_at,
  };
}

function purchaseDocumentPayload(body, id) {
  return {
    id,
    type: body.type || "Nota de compra de aparelho",
    date: body.date || today(),
    customerName: body.customerName || body.customer || "",
    customerDocument: body.customerDocument || "",
    customerPhone: body.customerPhone || "",
    customerAddress: body.customerAddress || "",
    customerDistrict: body.customerDistrict || "",
    customerZip: body.customerZip || "",
    customerCity: body.customerCity || "",
    customerState: body.customerState || "",
    deviceBrand: body.deviceBrand || "",
    deviceModel: body.deviceModel || "",
    deviceImei: body.deviceImei || "",
    deviceSerial: body.deviceSerial || "",
    deviceColor: body.deviceColor || "",
    deviceStorage: body.deviceStorage || "",
    deviceCondition: body.deviceCondition || "",
    accessories: body.accessories || "",
    quantity: Number(body.quantity || 1),
    warrantyMonths: Number(body.warrantyMonths || 6),
    purchaseValue: Number(body.purchaseValue || 0),
    paymentMethod: body.paymentMethod || "",
    notes: body.notes || "",
    operator: body.operator || null,
  };
}

function servicePayload(body, id) {
  const laborCost = Number(body.laborCost || 0);
  const partsCost = Number(body.partsCost || 0);
  const estimate = Number(body.estimate || laborCost + partsCost || 0);
  return {
    id,
    customer: body.customer,
    phone: body.phone,
    customerPhone: body.customerPhone || "",
    customerDocument: body.customerDocument || "",
    brand: body.brand || "",
    imei: body.imei || "",
    passwordInfo: body.passwordInfo || "",
    accessories: body.accessories || "",
    condition: body.condition || "",
    issue: body.issue,
    status: body.status || "Recebido",
    estimate,
    laborCost,
    partsCost,
    priority: body.priority || "Normal",
    warrantyDays: Number(body.warrantyDays || 90),
    diagnosis: body.diagnosis || "",
    solution: body.solution || "",
    parts: body.parts || "",
    notes: body.notes || "",
    tech: body.tech || null,
  };
}

function productPayload(body, id) {
  return {
    id,
    code: body.code || null,
    name: body.name,
    category: body.category,
    subcategory: body.subcategory || null,
    supplier: body.supplier || null,
    unit: body.unit || "unidade",
    stock: Number(body.stock || 0),
    min: Number(body.min || 0),
    cost: Number(body.cost || 0),
    price: Number(body.price || 0),
    wholesalePrice: Number(body.wholesalePrice || 0),
    lot: body.lot || null,
    validity: body.validity || null,
    cover: body.cover || null,
  };
}

function mapSettings(rows) {
  return rows.reduce((settings, row) => {
    settings[row.key] = row.value || "";
    return settings;
  }, {});
}

async function settingValue(key, fallback = "") {
  const rows = await query("SELECT setting_value AS value FROM app_settings WHERE setting_key = :key LIMIT 1", { key });
  return rows[0]?.value ?? fallback;
}

function parseJsonList(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (_error) {
    return [];
  }
}

function formatDate(value) {
  if (!value) return today();
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function compareVersions(left, right) {
  const leftParts = String(left || "0").split(".").map((part) => Number(part) || 0);
  const rightParts = String(right || "0").split(".").map((part) => Number(part) || 0);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, { timeout: 10000 }, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`Servidor de atualizacao respondeu ${response.statusCode}.`));
        return;
      }
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (_error) {
          reject(new Error("Manifesto de atualizacao invalido."));
        }
      });
    });
    request.on("timeout", () => {
      request.destroy(new Error("Tempo esgotado ao verificar atualizacao."));
    });
    request.on("error", reject);
  });
}

async function loadUpdateManifest(req) {
  const manifestUrl = process.env.UPDATE_MANIFEST_URL || "";
  if (manifestUrl) {
    const manifest = await fetchJson(manifestUrl);
    const baseUrl = new URL(manifestUrl);
    const rawUrl = manifest.url || manifest.downloadUrl || "";
    if (rawUrl && !/^https?:\/\//i.test(rawUrl)) manifest.downloadUrl = new URL(rawUrl, baseUrl).toString();
    return manifest;
  }

  const manifestPath = path.join(__dirname, "../../updates/latest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const rawUrl = manifest.url || manifest.downloadUrl || "";
  if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host");
    manifest.downloadUrl = `${protocol}://${host}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
  }
  return manifest;
}

function groupBy(rows, key) {
  return rows.reduce((map, row) => {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
    return map;
  }, new Map());
}

async function snapshot() {
  const activeShiftRows = await query("SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
  const activeShift = activeShiftRows[0] || null;
  const movementSql = activeShift
    ? "SELECT id, shift_id, type, description, amount, movement_date AS date, operator FROM cash_movements WHERE shift_id = :shiftId ORDER BY movement_date ASC"
    : "SELECT id, shift_id, type, description, amount, movement_date AS date, operator FROM cash_movements WHERE 1 = 0";
  const movementParams = activeShift ? { shiftId: activeShift.id } : {};

  const [categories, permissions, settings, users, products, repairParts, repairPartMovements, customers, services, serviceEvents, documents, movements, historyMovements, shifts] = await Promise.all([
    query("SELECT name FROM categories WHERE active = 1 ORDER BY name"),
    query("SELECT role_name AS role, module_key AS module, allowed = 1 AS allowed FROM role_permissions ORDER BY role_name, module_key"),
    query("SELECT setting_key AS `key`, setting_value AS value FROM app_settings ORDER BY setting_key"),
    query("SELECT id, name, role, pin, active = 1 AS active FROM users ORDER BY name"),
    query("SELECT * FROM products ORDER BY name"),
    query("SELECT * FROM repair_parts WHERE active = 1 ORDER BY name"),
    query("SELECT m.*, p.name AS part_name FROM repair_part_movements m LEFT JOIN repair_parts p ON p.id = m.part_id ORDER BY m.movement_date DESC LIMIT 100"),
    query("SELECT id, name, phone, document FROM customers ORDER BY name"),
    query("SELECT * FROM services ORDER BY opened_at DESC"),
    query("SELECT * FROM service_events ORDER BY event_date DESC, id DESC LIMIT 1200"),
    query("SELECT * FROM purchase_documents ORDER BY document_date DESC, created_at DESC"),
    query(movementSql, movementParams),
    query("SELECT id, shift_id, type, description, amount, movement_date AS date, operator FROM cash_movements ORDER BY movement_date DESC LIMIT 1000"),
    query("SELECT * FROM cash_shifts ORDER BY opened_at DESC LIMIT 20"),
  ]);

  const sales = await query("SELECT * FROM sales ORDER BY created_at DESC LIMIT 1200");
  const saleIds = sales.map((sale) => sale.id);
  let items = [];
  let payments = [];
  if (saleIds.length) {
    const placeholders = saleIds.map((_, index) => `:saleId${index}`).join(",");
    const params = saleIds.reduce((acc, id, index) => ({ ...acc, [`saleId${index}`]: id }), {});
    [items, payments] = await Promise.all([
      query(`SELECT * FROM sale_items WHERE sale_id IN (${placeholders}) ORDER BY id ASC`, params),
      query(`SELECT * FROM sale_payments WHERE sale_id IN (${placeholders}) ORDER BY id ASC`, params),
    ]);
  }
  const itemsBySale = groupBy(items, "sale_id");
  const paymentsBySale = groupBy(payments, "sale_id");
  const eventsByService = groupBy(serviceEvents, "service_id");

  const mappedSales = sales.map(mapSale);
  mappedSales.forEach((sale) => {
    sale.items = (itemsBySale.get(sale.id) || [])
      .map((item) => ({
        id: item.product_id,
        name: item.product_name,
        qty: item.qty,
        price: toNumber(item.price),
      }));
    sale.payments = (paymentsBySale.get(sale.id) || [])
      .map((payment) => ({
        method: payment.method,
        amount: toNumber(payment.amount),
        details: payment.details,
        installments: payment.installments,
      }));
  });
  const mappedServices = services.map(mapService);
  mappedServices.forEach((service) => {
    service.events = (eventsByService.get(service.id) || [])
      .slice()
      .reverse()
      .map((event) => ({
        id: event.id,
        date: event.event_date,
        operator: event.operator,
        type: event.event_type,
        description: event.description,
      }));
  });

  return {
    categories: categories.map((category) => category.name),
    permissions: mapPermissions(permissions),
    settings: mapSettings(settings),
    users: users.map((user) => ({ ...user, active: Boolean(user.active) })),
    products: products.map(mapProduct),
    repairParts: repairParts.map(mapRepairPart),
    repairPartMovements: repairPartMovements.map((movement) => ({
      id: movement.id,
      partId: movement.part_id,
      partName: movement.part_name,
      serviceId: movement.service_id,
      type: movement.type,
      qty: Number(movement.qty || 0),
      unitCost: toNumber(movement.unit_cost),
      description: movement.description,
      operator: movement.operator,
      date: movement.movement_date,
    })),
    customers,
    services: mappedServices,
    documents: documents.map(mapPurchaseDocument),
    sales: mappedSales,
    cash: {
      open: Boolean(activeShift),
      shift: mapShift(activeShift),
      shifts: shifts.map(mapShift),
      operator: activeShift?.operator || null,
      openedAt: today(),
      openingAmount: toNumber(activeShift?.opening_amount || 0),
      movements: movements.map((movement) => ({
        ...movement,
        amount: toNumber(movement.amount),
        date: formatDate(movement.date),
      })),
      historyMovements: historyMovements.map((movement) => ({
        ...movement,
        amount: toNumber(movement.amount),
        date: formatDate(movement.date),
      })),
    },
  };
}

function createApp(options = {}) {
  const publicMode = Boolean(options.publicMode);
  const storeAssetsPath = path.join(__dirname, "../../store/assets");
  const storeBuildPath = path.join(__dirname, "../../store-app/dist");
  const timeClockPath = path.join(__dirname, "../../timeclock");
  const scannerPath = path.join(__dirname, "../../scanner");
  const app = express();
  app.use((req, res, next) => {
    const allowedOrigin = process.env.STOREFRONT_ALLOWED_ORIGIN || "*";
    const origin = req.headers.origin;
    if (allowedOrigin === "*" || !origin || allowedOrigin.split(",").map((item) => item.trim()).includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin === "*" ? "*" : origin || allowedOrigin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Pin");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: "8mb" }));
  app.use("/assets", express.static(path.join(__dirname, "../../assets")));
  app.use("/store-assets", express.static(storeAssetsPath));
  app.use("/ponto", express.static(timeClockPath));
  app.use("/scanner", express.static(scannerPath));
  app.use("/updates", express.static(path.join(__dirname, "../../updates"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".json")) res.setHeader("Cache-Control", "no-store");
    },
  }));
  app.get("/loja/catalogo", (_req, res) => res.sendFile(path.join(__dirname, "../../store/catalogo.html")));
  app.get("/loja/admin", (_req, res) => res.sendFile(path.join(__dirname, "../../store/admin.html")));
  app.use("/loja", express.static(path.join(__dirname, "../../store")));
  if (!publicMode) app.use(express.static(path.join(__dirname, "../..")));

  app.get("/api/health", async (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/version", async (_req, res) => {
    res.json({
      name: packageInfo.productName || packageInfo.name,
      version: packageInfo.version,
      updateManifestUrl: process.env.UPDATE_MANIFEST_URL || "",
    });
  });

  app.get("/api/updates/check", async (req, res) => {
    const currentVersion = String(req.query.currentVersion || packageInfo.version || "0.0.0");
    const manifest = await loadUpdateManifest(req);
    if (!manifest) {
      res.json({ enabled: false, currentVersion, updateAvailable: false });
      return;
    }
    const latestVersion = manifest.version || manifest.latestVersion || "";
    const downloadUrl = manifest.downloadUrl || manifest.url || "";
    res.json({
      enabled: true,
      currentVersion,
      latestVersion,
      updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
      downloadUrl,
      sha256: manifest.sha256 || "",
      size: manifest.size || null,
      notes: manifest.notes || "",
      required: Boolean(manifest.required),
      publishedAt: manifest.publishedAt || "",
    });
  });

  app.get("/api/storefront/config", async (_req, res) => {
    const settings = mapSettings(await query("SELECT setting_key AS `key`, setting_value AS value FROM app_settings"));
    let themes = [];
    try {
      themes = JSON.parse(settings["site.themes"] || "[]");
    } catch (_error) {
      themes = [];
    }
    res.json({
      name: settings["store.name"] || "Griffy Store",
      phone: settings["store.phone"] || "",
      whatsapp: settings["store.whatsapp"] || settings["store.phone"] || "",
      instagram: settings["store.instagram"] || "https://www.instagram.com/griffy_storeoficial_gs/",
      address: settings["store.address"] || "",
      theme: settings["site.theme"] || "auto",
      themes,
      promo: {
        enabled: settings["site.promo.enabled"] === "true",
        title: settings["site.promo.title"] || "Promocao Griffy Store",
        text: settings["site.promo.text"] || "Ofertas especiais por tempo limitado.",
        buttonText: settings["site.promo.buttonText"] || "Ver ofertas",
        target: settings["site.promo.target"] || "./catalogo.html",
      },
    });
  });

  app.post("/api/storefront/admin/login", async (req, res) => {
    const adminRows = await query("SELECT id, name FROM users WHERE role = 'admin' AND active = 1 AND pin = :pin LIMIT 1", {
      pin: req.body.pin || "",
    });
    const admin = adminRows[0];
    if (!admin) {
      res.status(403).json({ error: "PIN de administrador invalido." });
      return;
    }
    res.json({
      token: signAdminToken({ id: admin.id, name: admin.name, role: "admin", exp: Date.now() + 8 * 60 * 60 * 1000 }),
      user: { id: admin.id, name: admin.name },
    });
  });

  app.post("/api/storefront/admin/config", async (req, res) => {
    const admin = verifyAdminToken(bearerToken(req));
    if (!admin) {
      res.status(401).json({ error: "Sessao administrativa expirada. Entre novamente." });
      return;
    }
    const allowed = {
      "site.theme": req.body.theme || "auto",
      "site.promo.enabled": req.body.promo?.enabled ? "true" : "false",
      "site.promo.title": req.body.promo?.title || "",
      "site.promo.text": req.body.promo?.text || "",
      "site.promo.buttonText": req.body.promo?.buttonText || "",
      "site.promo.target": req.body.promo?.target || "./catalogo.html",
      "site.themes": JSON.stringify(Array.isArray(req.body.themes) ? req.body.themes : []),
      "store.whatsapp": req.body.whatsapp || "",
      "store.instagram": req.body.instagram || "",
      "store.address": req.body.address || "",
    };
    for (const [key, value] of Object.entries(allowed)) {
      await query(
        `INSERT INTO app_settings (setting_key, setting_value)
         VALUES (:key, :value)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        { key, value },
      );
    }
    res.json({ ok: true });
  });

  app.get("/api/storefront/admin/orders", async (req, res) => {
    const admin = verifyAdminToken(bearerToken(req));
    if (!admin) {
      res.status(401).json({ error: "Sessao administrativa expirada. Entre novamente." });
      return;
    }
    const orders = await query("SELECT * FROM online_orders ORDER BY created_at DESC LIMIT 150");
    const items = await query("SELECT * FROM online_order_items ORDER BY id ASC");
    res.json(
      orders.map((order) => ({
        id: order.id,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerDocument: order.customer_document,
        deliveryType: order.delivery_type,
        paymentMethod: order.payment_method,
        address: order.address,
        notes: order.notes,
        total: toNumber(order.total),
        status: order.status || "Novo",
        createdAt: order.created_at,
        items: items
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            qty: Number(item.qty || 0),
            price: toNumber(item.price),
          })),
      })),
    );
  });

  app.patch("/api/storefront/admin/orders/:id", async (req, res) => {
    const admin = verifyAdminToken(bearerToken(req));
    if (!admin) {
      res.status(401).json({ error: "Sessao administrativa expirada. Entre novamente." });
      return;
    }
    const status = req.body.status || "Novo";
    const allowed = ["Novo", "Em atendimento", "Separado", "Concluido", "Cancelado"];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: "Status de pedido invalido." });
      return;
    }
    await query("UPDATE online_orders SET status = :status WHERE id = :id", { id: req.params.id, status });
    res.json({ ok: true });
  });

  app.get("/api/storefront/products", async (req, res) => {
    const search = `%${String(req.query.q || "").trim()}%`;
    const category = String(req.query.category || "").trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit || 500), 1000));
    const params = { search };
    let sql = "SELECT id, code, name, category, stock, price, cover FROM products WHERE stock > 0 AND price > 0";
    if (category) {
      sql += " AND category = :category";
      params.category = category;
    }
    if (String(req.query.q || "").trim()) {
      sql += " AND (name LIKE :search OR code LIKE :search OR category LIKE :search)";
    }
    sql += ` ORDER BY category, name LIMIT ${limit}`;
    const products = await query(sql, params);
    res.json(products.map(mapStoreProduct));
  });

  app.post("/api/storefront/orders", async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) {
      res.status(400).json({ error: "Carrinho vazio." });
      return;
    }
    const ids = items.map((item) => String(item.id || ""));
    const placeholders = ids.map((_, index) => `:id${index}`).join(",");
    const params = ids.reduce((acc, id, index) => ({ ...acc, [`id${index}`]: id }), {});
    const products = await query(`SELECT id, name, price, stock FROM products WHERE id IN (${placeholders})`, params);
    const orderItems = items.map((item) => {
      const product = products.find((row) => row.id === item.id);
      if (!product) throw new Error("Produto nao encontrado.");
      const qty = Math.max(1, Number(item.qty || 1));
      if (qty > Number(product.stock || 0)) throw new Error(`Estoque insuficiente para ${product.name}.`);
      return { id: product.id, name: product.name, qty, price: toNumber(product.price) };
    });
    const total = orderItems.reduce((sum, item) => sum + item.qty * item.price, 0);
    const order = {
      id: uid("web"),
      customerName: req.body.customerName || "",
      customerPhone: req.body.customerPhone || "",
      customerDocument: req.body.customerDocument || null,
      deliveryType: req.body.deliveryType || "Retirada",
      paymentMethod: req.body.paymentMethod || "A combinar",
      address: req.body.address || null,
      notes: req.body.notes || null,
      total,
    };
    if (!order.customerName || !order.customerPhone) {
      res.status(400).json({ error: "Informe nome e telefone." });
      return;
    }
    const connection = await db().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO online_orders (id, customer_name, customer_phone, customer_document, delivery_type, payment_method, address, notes, total)
         VALUES (:id, :customerName, :customerPhone, :customerDocument, :deliveryType, :paymentMethod, :address, :notes, :total)`,
        order,
      );
      for (const item of orderItems) {
        await connection.execute(
          `INSERT INTO online_order_items (order_id, product_id, product_name, qty, price)
           VALUES (:orderId, :productId, :productName, :qty, :price)`,
          { orderId: order.id, productId: item.id, productName: item.name, qty: item.qty, price: item.price },
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    res.json({ id: order.id, total });
  });

  app.post("/api/login", async (req, res) => {
    const { userId, pin } = req.body;
    const rows = await query("SELECT id, name, role, active FROM users WHERE id = :userId AND pin = :pin LIMIT 1", { userId, pin });
    const user = rows[0];
    if (!user || !user.active || user.role === "caixa") {
      res.status(401).json({ error: "PIN invalido." });
      return;
    }
    res.json({ id: user.id, name: user.name, role: user.role });
  });

  app.post("/api/timeclock/login", async (req, res) => {
    const rows = await query("SELECT id, name, role, active FROM users WHERE id = :userId AND pin = :pin LIMIT 1", {
      userId: req.body.userId || "",
      pin: req.body.pin || "",
    });
    const user = rows[0];
    if (!user || !user.active || user.role === "caixa") {
      res.status(401).json({ error: "PIN invalido." });
      return;
    }
    res.json({
      token: signAdminToken({ id: user.id, name: user.name, role: user.role, exp: Date.now() + 12 * 60 * 60 * 1000 }),
      user: { id: user.id, name: user.name, role: user.role },
    });
  });

  app.get("/api/timeclock/users", async (_req, res) => {
    const users = await query("SELECT id, name, role FROM users WHERE active = 1 AND role <> 'caixa' ORDER BY name");
    res.json(users);
  });

  app.get("/api/timeclock/me", async (req, res) => {
    const user = requireRoleToken(req);
    if (!user) {
      res.status(401).json({ error: "Sessao expirada." });
      return;
    }
    const [entries, profiles] = await Promise.all([
      query("SELECT * FROM time_clock_entries WHERE user_id = :userId ORDER BY entry_at DESC LIMIT 120", { userId: user.id }),
      query("SELECT user_id, face_photo_data, face_updated_at, updated_at FROM time_clock_profiles WHERE user_id = :userId LIMIT 1", { userId: user.id }),
    ]);
    const profile = profiles[0] || {};
    res.json({
      user,
      profile: {
        facePhotoData: profile.face_photo_data || "",
        faceUpdatedAt: profile.face_updated_at || profile.updated_at || null,
      },
      entries: entries.map(mapTimeEntry),
      summary: timeClockSummary(entries).slice(0, 31),
    });
  });

  app.post("/api/timeclock/profile/face", async (req, res) => {
    const user = requireRoleToken(req);
    if (!user) {
      res.status(401).json({ error: "Sessao expirada." });
      return;
    }
    if (!req.body.photoData || !String(req.body.photoData).startsWith("data:image/")) {
      res.status(400).json({ error: "Selfie obrigatoria para atualizar o facial." });
      return;
    }
    const photoData = String(req.body.photoData).slice(0, 5_000_000);
    await query(
      `INSERT INTO time_clock_profiles (user_id, face_photo_data, face_updated_at)
       VALUES (:userId, :photoData, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE face_photo_data = VALUES(face_photo_data), face_updated_at = CURRENT_TIMESTAMP`,
      { userId: user.id, photoData },
    );
    res.json({ ok: true, facePhotoData: photoData, faceUpdatedAt: new Date().toISOString() });
  });

  app.post("/api/timeclock/punch", async (req, res) => {
    const user = requireRoleToken(req);
    if (!user) {
      res.status(401).json({ error: "Sessao expirada." });
      return;
    }
    const type = req.body.type || "Entrada";
    const allowed = ["Entrada", "Intervalo inicio", "Intervalo fim", "Saida"];
    if (!allowed.includes(type)) {
      res.status(400).json({ error: "Tipo de ponto invalido." });
      return;
    }
    if (!req.body.photoData || !String(req.body.photoData).startsWith("data:image/")) {
      res.status(400).json({ error: "Selfie obrigatoria para registrar o ponto." });
      return;
    }
    if (req.body.latitude === undefined || req.body.longitude === undefined) {
      res.status(400).json({ error: "Localizacao obrigatoria para registrar o ponto." });
      return;
    }
    const settings = mapSettings(await query("SELECT setting_key AS `key`, setting_value AS value FROM app_settings WHERE setting_key LIKE 'timeclock.%'"));
    const storeLat = Number(settings["timeclock.store_latitude"] || 0);
    const storeLng = Number(settings["timeclock.store_longitude"] || 0);
    const allowedRadius = Number(settings["timeclock.allowed_radius_meters"] || 150);
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const hasStoreLocation = Boolean(storeLat && storeLng);
    const distance = hasStoreLocation ? distanceMeters(storeLat, storeLng, latitude, longitude) : null;
    const locationStatus = !hasStoreLocation ? "Loja sem local" : distance <= allowedRadius ? "Dentro do raio" : "Fora do raio";
    const entry = {
      id: uid("tc"),
      userId: user.id,
      userName: user.name,
      type,
      source: req.body.source || "web",
      latitude,
      longitude,
      accuracy: req.body.accuracy === undefined ? null : Number(req.body.accuracy || 0),
      distanceMeters: distance,
      locationStatus,
      photoData: String(req.body.photoData).slice(0, 5_000_000),
      deviceInfo: String(req.body.deviceInfo || req.get("User-Agent") || "").slice(0, 255),
      ipAddress: String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].slice(0, 80),
      note: req.body.note || null,
    };
    await query(
      `INSERT INTO time_clock_entries
       (id, user_id, user_name, entry_type, source, latitude, longitude, accuracy, distance_meters, location_status, photo_data, device_info, ip_address, note)
       VALUES (:id, :userId, :userName, :type, :source, :latitude, :longitude, :accuracy, :distanceMeters, :locationStatus, :photoData, :deviceInfo, :ipAddress, :note)`,
      entry,
    );
    res.json({ ok: true, entry });
  });

  app.get("/api/timeclock/admin/summary", async (req, res) => {
    const admin = requireRoleToken(req, ["admin", "gerente"]);
    if (!admin) {
      res.status(403).json({ error: "Apenas administrador ou gerente." });
      return;
    }
    const month = String(req.query.month || today().slice(0, 7));
    const entries = await query(
      "SELECT * FROM time_clock_entries WHERE DATE_FORMAT(entry_at, '%Y-%m') = :month ORDER BY entry_at ASC",
      { month },
    );
    const settings = mapSettings(await query("SELECT setting_key AS `key`, setting_value AS value FROM app_settings WHERE setting_key LIKE 'timeclock.%'"));
    res.json({ month, settings, summary: timeClockSummary(entries), entries: entries.map(mapTimeEntry) });
  });

  app.post("/api/timeclock/admin/settings", async (req, res) => {
    const admin = requireRoleToken(req, ["admin", "gerente"]);
    if (!admin) {
      res.status(403).json({ error: "Apenas administrador ou gerente." });
      return;
    }
    const allowed = {
      "timeclock.store_latitude": req.body.storeLatitude || "",
      "timeclock.store_longitude": req.body.storeLongitude || "",
      "timeclock.allowed_radius_meters": String(Number(req.body.allowedRadiusMeters || 150)),
    };
    for (const [key, value] of Object.entries(allowed)) {
      await query(
        `INSERT INTO app_settings (setting_key, setting_value)
         VALUES (:key, :value)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        { key, value },
      );
    }
    res.json({ ok: true });
  });

  app.post("/api/products/reset", async (req, res) => {
    if (!["admin", "gerente"].includes(req.body.operatorRole)) {
      res.status(403).json({ error: "Apenas administrador ou gerente podem zerar produtos." });
      return;
    }
    if (req.body.confirmation !== "ZERAR PRODUTOS") {
      res.status(400).json({ error: "Confirmacao invalida. Digite ZERAR PRODUTOS." });
      return;
    }
    await query("DELETE FROM products");
    res.json({ ok: true });
  });

  app.post("/api/barcode-scans", async (req, res) => {
    const code = String(req.body.code || "").trim();
    if (!code) {
      res.status(400).json({ error: "Codigo vazio." });
      return;
    }
    const scan = { id: uid("scan"), code, deviceName: req.body.deviceName || "Celular" };
    await query(
      "INSERT INTO barcode_scans (id, code, device_name) VALUES (:id, :code, :deviceName)",
      scan,
    );
    res.json({ ok: true, scan });
  });

  app.post("/api/barcode-scans/consume", async (_req, res) => {
    const rows = await query("SELECT * FROM barcode_scans WHERE used = 0 ORDER BY created_at ASC LIMIT 1");
    const scan = rows[0];
    if (!scan) {
      res.json({ code: "" });
      return;
    }
    await query("UPDATE barcode_scans SET used = 1 WHERE id = :id", { id: scan.id });
    res.json({ id: scan.id, code: scan.code, deviceName: scan.device_name, createdAt: scan.created_at });
  });

  app.get("/api/state", async (_req, res) => {
    res.json(await snapshot());
  });

  app.post("/api/products", async (req, res) => {
    const product = productPayload(req.body, uid("p"));
    await query(
      `INSERT INTO products
       (id, code, name, category, subcategory, supplier, unit, stock, min_stock, cost, price, wholesale_price, lot, validity, cover)
       VALUES (:id, :code, :name, :category, :subcategory, :supplier, :unit, :stock, :min, :cost, :price, :wholesalePrice, :lot, :validity, :cover)`,
      product,
    );
    res.json(product);
  });

  app.put("/api/products/:id", async (req, res) => {
    const product = productPayload(req.body, req.params.id);
    await query(
      `UPDATE products
       SET code = :code, name = :name, category = :category, subcategory = :subcategory,
           supplier = :supplier, unit = :unit, stock = :stock, min_stock = :min,
           cost = :cost, price = :price, wholesale_price = :wholesalePrice,
           lot = :lot, validity = :validity, cover = :cover
       WHERE id = :id`,
      product,
    );
    res.json(product);
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!["admin", "gerente"].includes(req.body.operatorRole)) {
      res.status(403).json({ error: "Apenas administrador ou gerente podem excluir produtos." });
      return;
    }
    const rows = await query("SELECT id, name FROM products WHERE id = :id LIMIT 1", { id: req.params.id });
    if (!rows.length) {
      res.status(404).json({ error: "Produto nao encontrado." });
      return;
    }
    await query("DELETE FROM products WHERE id = :id", { id: req.params.id });
    res.json({ ok: true, id: req.params.id, name: rows[0].name });
  });

  app.post("/api/products/:id/stock", async (req, res) => {
    const qty = Number(req.body.qty);
    const delta = req.body.type === "Entrada" ? qty : -qty;
    await query("UPDATE products SET stock = GREATEST(0, stock + :delta) WHERE id = :id", { id: req.params.id, delta });
    await query(
      "INSERT INTO cash_movements (id, type, description, amount, movement_date, operator) VALUES (:id, :type, :description, 0, CURRENT_DATE, :operator)",
      {
        id: uid("m"),
        type: req.body.type === "Entrada" ? "Saída" : "Entrada",
        description: req.body.description || "Movimento de estoque",
        operator: req.body.operator || null,
      },
    );
    res.json({ ok: true });
  });

  app.post("/api/repair-parts", async (req, res) => {
    const part = repairPartPayload(req.body, uid("part"));
    await query(
      `INSERT INTO repair_parts
       (id, code, name, category, compatible_models, supplier, unit, stock, min_stock, cost, location, notes, active)
       VALUES (:id, :code, :name, :category, :compatibleModels, :supplier, :unit, :stock, :min, :cost, :location, :notes, :active)`,
      part,
    );
    res.json(part);
  });

  app.put("/api/repair-parts/:id", async (req, res) => {
    const part = repairPartPayload(req.body, req.params.id);
    await query(
      `UPDATE repair_parts
       SET code = :code, name = :name, category = :category, compatible_models = :compatibleModels,
           supplier = :supplier, unit = :unit, stock = :stock, min_stock = :min,
           cost = :cost, location = :location, notes = :notes, active = :active
       WHERE id = :id`,
      part,
    );
    res.json(part);
  });

  app.post("/api/repair-parts/:id/movements", async (req, res) => {
    const qty = Math.max(1, Number(req.body.qty || 1));
    const type = req.body.type || "Entrada";
    const partRows = await query("SELECT * FROM repair_parts WHERE id = :id LIMIT 1", { id: req.params.id });
    if (!partRows.length) {
      res.status(404).json({ error: "Peca nao encontrada." });
      return;
    }
    const delta = type === "Entrada" ? qty : type === "Ajuste" ? Number(req.body.adjustment || 0) : -qty;
    const nextStock = Number(partRows[0].stock || 0) + delta;
    if (nextStock < 0) {
      res.status(409).json({ error: "Estoque insuficiente para esta peca." });
      return;
    }
    await query("UPDATE repair_parts SET stock = :stock WHERE id = :id", { id: req.params.id, stock: nextStock });
    const movement = {
      id: uid("rpm"),
      partId: req.params.id,
      serviceId: req.body.serviceId || null,
      type,
      qty: type === "Ajuste" ? Math.abs(delta) : qty,
      unitCost: Number(req.body.unitCost || partRows[0].cost || 0),
      description: req.body.description || "",
      operator: req.body.operator || null,
    };
    await query(
      `INSERT INTO repair_part_movements
       (id, part_id, service_id, type, qty, unit_cost, description, operator)
       VALUES (:id, :partId, :serviceId, :type, :qty, :unitCost, :description, :operator)`,
      movement,
    );
    if (movement.serviceId) {
      await query("INSERT INTO service_events (service_id, operator, event_type, description) VALUES (:serviceId, :operator, 'Peca', :description)", {
        serviceId: movement.serviceId,
        operator: movement.operator,
        description: `${type}: ${qty}x ${partRows[0].name}${movement.description ? ` - ${movement.description}` : ""}`,
      });
    }
    res.json({ ...movement, stock: nextStock });
  });

  app.post("/api/customers", async (req, res) => {
    const customer = { id: uid("c"), name: req.body.name, phone: req.body.phone || "", document: req.body.document || "" };
    await query("INSERT INTO customers (id, name, phone, document) VALUES (:id, :name, :phone, :document)", customer);
    res.json(customer);
  });

  app.post("/api/documents", async (req, res) => {
    const document = purchaseDocumentPayload(req.body, uid("doc"));
    await query(
      `INSERT INTO purchase_documents
       (id, document_type, document_date, customer_name, customer_document, customer_phone,
        customer_address, customer_district, customer_zip, customer_city, customer_state,
        device_brand, device_model, device_imei, device_serial, device_color,
        device_storage, device_condition, accessories, quantity, warranty_months,
        purchase_value, payment_method, notes, operator)
       VALUES
       (:id, :type, :date, :customerName, :customerDocument, :customerPhone,
        :customerAddress, :customerDistrict, :customerZip, :customerCity, :customerState,
        :deviceBrand, :deviceModel, :deviceImei, :deviceSerial, :deviceColor,
        :deviceStorage, :deviceCondition, :accessories, :quantity, :warrantyMonths,
        :purchaseValue, :paymentMethod, :notes, :operator)`,
      document,
    );
    const existing = await query("SELECT id FROM customers WHERE LOWER(name) = LOWER(:customerName) LIMIT 1", document);
    if (!existing.length && document.customerName) {
      await query("INSERT INTO customers (id, name, phone, document) VALUES (:id, :name, :phone, :document)", {
        id: uid("c"),
        name: document.customerName,
        phone: document.customerPhone,
        document: document.customerDocument,
      });
    }
    res.json(document);
  });

  app.put("/api/documents/:id", async (req, res) => {
    const document = purchaseDocumentPayload(req.body, req.params.id);
    await query(
      `UPDATE purchase_documents
       SET document_type = :type, document_date = :date, customer_name = :customerName,
           customer_document = :customerDocument, customer_phone = :customerPhone,
           customer_address = :customerAddress, customer_district = :customerDistrict,
           customer_zip = :customerZip, customer_city = :customerCity, customer_state = :customerState,
           device_brand = :deviceBrand, device_model = :deviceModel,
           device_imei = :deviceImei, device_serial = :deviceSerial, device_color = :deviceColor,
           device_storage = :deviceStorage, device_condition = :deviceCondition, accessories = :accessories,
           quantity = :quantity, warranty_months = :warrantyMonths,
           purchase_value = :purchaseValue, payment_method = :paymentMethod, notes = :notes, operator = :operator
       WHERE id = :id`,
      document,
    );
    res.json(document);
  });

  app.post("/api/services", async (req, res) => {
    const service = servicePayload(req.body, uid("s"));
    await query(
      `INSERT INTO services
       (id, customer, phone_model, customer_phone, customer_document, brand, imei, password_info,
        accessories, device_condition, issue, status, estimate, labor_cost, parts_cost, priority,
        warranty_days, diagnosis, solution, parts, notes, opened_at, tech)
       VALUES
       (:id, :customer, :phone, :customerPhone, :customerDocument, :brand, :imei, :passwordInfo,
        :accessories, :condition, :issue, :status, :estimate, :laborCost, :partsCost, :priority,
        :warrantyDays, :diagnosis, :solution, :parts, :notes, CURRENT_DATE, :tech)`,
      service,
    );
    const existing = await query("SELECT id FROM customers WHERE LOWER(name) = LOWER(:customer) LIMIT 1", { customer: service.customer });
    if (!existing.length) {
      await query("INSERT INTO customers (id, name, phone, document) VALUES (:id, :name, :phone, :document)", {
        id: uid("c"),
        name: service.customer,
        phone: service.customerPhone,
        document: service.customerDocument,
      });
    }
    await query("INSERT INTO service_events (service_id, operator, event_type, description) VALUES (:id, :operator, 'Criacao', :description)", {
      id: service.id,
      operator: service.tech,
      description: `OS aberta com status ${service.status}`,
    });
    res.json(service);
  });

  app.put("/api/services/:id", async (req, res) => {
    const service = servicePayload(req.body, req.params.id);
    await query(
      `UPDATE services
       SET customer = :customer, phone_model = :phone, customer_phone = :customerPhone,
           customer_document = :customerDocument, brand = :brand, imei = :imei,
           password_info = :passwordInfo, accessories = :accessories, device_condition = :condition,
           issue = :issue, status = :status, estimate = :estimate, labor_cost = :laborCost,
           parts_cost = :partsCost, priority = :priority, warranty_days = :warrantyDays,
           diagnosis = :diagnosis, solution = :solution, parts = :parts, notes = :notes, tech = :tech
       WHERE id = :id`,
      service,
    );
    await query("INSERT INTO service_events (service_id, operator, event_type, description) VALUES (:id, :operator, 'Atualizacao', 'OS atualizada')", {
      id: service.id,
      operator: service.tech,
    });
    res.json(service);
  });

  app.patch("/api/services/:id/status", async (req, res) => {
    const nowFields = {
      approvedAt: req.body.status === "Aprovado" ? ", approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP)" : "",
      finishedAt: req.body.status === "Pronto" ? ", finished_at = COALESCE(finished_at, CURRENT_TIMESTAMP)" : "",
      deliveredAt: req.body.status === "Entregue" ? ", delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)" : "",
    };
    await query(
      `UPDATE services SET status = :status${nowFields.approvedAt}${nowFields.finishedAt}${nowFields.deliveredAt} WHERE id = :id`,
      { id: req.params.id, status: req.body.status },
    );
    await query("INSERT INTO service_events (service_id, operator, event_type, description) VALUES (:id, :operator, 'Status', :description)", {
      id: req.params.id,
      operator: req.body.operator || null,
      description: `Status alterado para ${req.body.status}`,
    });
    res.json({ ok: true });
  });

  app.post("/api/users", async (req, res) => {
    if (!["admin", "gerente", "vendedor", "tecnico"].includes(req.body.role)) {
      res.status(400).json({ error: "Cargo invalido." });
      return;
    }
    const user = { id: uid("u"), name: req.body.name, role: req.body.role, pin: req.body.pin, active: 1 };
    await query("INSERT INTO users (id, name, role, pin, active) VALUES (:id, :name, :role, :pin, :active)", user);
    res.json({ ...user, active: true });
  });

  app.put("/api/users/:id", async (req, res) => {
    if (!["admin", "gerente", "vendedor", "tecnico"].includes(req.body.role)) {
      res.status(400).json({ error: "Cargo invalido." });
      return;
    }
    const user = {
      id: req.params.id,
      name: req.body.name,
      role: req.body.role,
      pin: req.body.pin,
      active: req.body.active === false || req.body.active === "false" || req.body.active === "0" ? 0 : 1,
    };
    await query("UPDATE users SET name = :name, role = :role, pin = :pin, active = :active WHERE id = :id", user);
    res.json({ ...user, active: Boolean(user.active) });
  });

  app.delete("/api/users/:id", async (req, res) => {
    const rows = await query("SELECT role FROM users WHERE id = :id LIMIT 1", { id: req.params.id });
    if (!rows.length) {
      res.status(404).json({ error: "Operador nao encontrado." });
      return;
    }
    const admins = await query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1");
    if (rows[0].role === "admin" && Number(admins[0].total || 0) <= 1) {
      res.status(409).json({ error: "Nao e possivel excluir o ultimo administrador ativo." });
      return;
    }
    await query("UPDATE users SET active = 0 WHERE id = :id", { id: req.params.id });
    res.json({ ok: true });
  });

  app.post("/api/permissions", async (req, res) => {
    const { role, modules } = req.body;
    if (!["gerente", "vendedor", "tecnico"].includes(role)) {
      res.status(400).json({ error: "Cargo invalido para permissoes." });
      return;
    }
    const allowedModules = Array.isArray(modules) ? modules : [];
    const allModules = ["dashboard", "pos", "inventory", "parts", "services", "customers", "purchases", "documents", "operators", "permissions", "reports", "settings", "backup"];
    for (const module of allModules) {
      await query(
        `INSERT INTO role_permissions (role_name, module_key, allowed)
         VALUES (:role, :module, :allowed)
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
        { role, module, allowed: allowedModules.includes(module) ? 1 : 0 },
      );
    }
    res.json({ ok: true });
  });

  app.post("/api/cash/movements", async (req, res) => {
    const shift = await getOpenShift();
    if (!shift) {
      res.status(409).json({ error: "Abra um turno de caixa antes de lancar movimentos." });
      return;
    }
    const movement = {
      id: uid("m"),
      shiftId: shift.id,
      type: req.body.type,
      description: req.body.description,
      amount: Number(req.body.amount || 0),
      operator: req.body.operator || null,
    };
    await query(
      "INSERT INTO cash_movements (id, shift_id, type, description, amount, movement_date, operator) VALUES (:id, :shiftId, :type, :description, :amount, :businessDate, :operator)",
      { ...movement, businessDate: formatDate(shift.business_date || businessDate()) },
    );
    res.json(movement);
  });

  app.post("/api/sales", async (req, res) => {
    const shift = await getOpenShift();
    if (!shift) {
      res.status(409).json({ error: "Abra um turno de caixa antes de finalizar vendas." });
      return;
    }
    const sale = {
      id: uid("sale"),
      date: today(),
      customer: req.body.customer || null,
      payment: req.body.payment || "Pix",
      operator: req.body.operator,
      seller: req.body.seller || req.body.operator,
      discount: Number(req.body.discount || 0),
      total: Number(req.body.total || 0),
      items: req.body.items || [],
      payments: req.body.payments || [],
      shiftId: shift.id,
      businessDate: formatDate(shift.business_date || businessDate()),
    };
    if (!sale.payments.length) {
      sale.payments = [{ method: sale.payment, amount: sale.total, details: "", installments: null }];
    }

    const connection = await db().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO sales (id, shift_id, sale_date, customer, payment, operator, seller, discount, total)
         VALUES (:id, :shiftId, :businessDate, :customer, :payment, :operator, :seller, :discount, :total)`,
        sale,
      );
      for (const item of sale.items) {
        await connection.execute(
          `INSERT INTO sale_items (sale_id, product_id, product_name, qty, price)
           VALUES (:saleId, :productId, :productName, :qty, :price)`,
          {
            saleId: sale.id,
            productId: item.id,
            productName: item.name,
            qty: Number(item.qty),
            price: Number(item.price),
          },
        );
        await connection.execute("UPDATE products SET stock = GREATEST(0, stock - :qty) WHERE id = :id", {
          id: item.id,
          qty: Number(item.qty),
        });
      }
      for (const payment of sale.payments) {
        await connection.execute(
          `INSERT INTO sale_payments (sale_id, method, amount, details, installments)
           VALUES (:saleId, :method, :amount, :details, :installments)`,
          {
            saleId: sale.id,
            method: payment.method || sale.payment,
            amount: Number(payment.amount || 0),
            details: payment.details || null,
            installments: payment.installments ? Number(payment.installments) : null,
          },
        );
      }
      await connection.execute(
        "INSERT INTO cash_movements (id, shift_id, sale_id, type, description, amount, movement_date, operator) VALUES (:id, :shiftId, :saleId, 'Entrada', :description, :amount, :businessDate, :operator)",
        {
          id: uid("m"),
          shiftId: shift.id,
          saleId: sale.id,
          description: `Venda ${sale.id}`,
          amount: sale.total,
          businessDate: sale.businessDate,
          operator: sale.operator,
        },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json(sale);
  });

  app.post("/api/sales/:id/cancel", async (req, res) => {
    const adminRows = await query("SELECT id, name FROM users WHERE role = 'admin' AND active = 1 AND pin = :pin LIMIT 1", {
      pin: req.body.adminPin || "",
    });
    const approvingAdmin = adminRows[0];
    if (!approvingAdmin) {
      res.status(403).json({ error: "PIN de administrador invalido para cancelar a venda." });
      return;
    }
    const shift = await getOpenShift();
    if (!shift) {
      res.status(409).json({ error: "Abra um turno de caixa antes de cancelar vendas." });
      return;
    }
    const rows = await query("SELECT * FROM sales WHERE id = :id LIMIT 1", { id: req.params.id });
    const sale = rows[0];
    if (!sale) {
      res.status(404).json({ error: "Venda nao encontrada." });
      return;
    }
    if ((sale.status || "active") === "canceled") {
      res.status(409).json({ error: "Venda ja cancelada." });
      return;
    }
    const items = await query("SELECT * FROM sale_items WHERE sale_id = :id", { id: req.params.id });
    const connection = await db().getConnection();
    try {
      await connection.beginTransaction();
      for (const item of items) {
        await connection.execute("UPDATE products SET stock = stock + :qty WHERE id = :id", {
          id: item.product_id,
          qty: Number(item.qty),
        });
      }
      await connection.execute(
        `UPDATE sales
         SET status = 'canceled', canceled_at = CURRENT_TIMESTAMP, canceled_by = :operator, cancel_reason = :reason
         WHERE id = :id`,
        {
          id: req.params.id,
          operator: req.body.operator || null,
          reason: `${req.body.reason || ""} | Autorizado por ${approvingAdmin.name}`.trim(),
        },
      );
      await connection.execute(
        "INSERT INTO cash_movements (id, shift_id, sale_id, type, description, amount, movement_date, operator) VALUES (:id, :shiftId, :saleId, 'Saída', :description, :amount, :businessDate, :operator)",
        {
          id: uid("m"),
          shiftId: shift.id,
          saleId: req.params.id,
          description: `Cancelamento venda ${req.params.id}`,
          amount: toNumber(sale.total),
          businessDate: formatDate(shift.business_date || businessDate()),
          operator: req.body.operator || null,
        },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    res.json({ ok: true });
  });

  app.post("/api/sales/:id/fiscal", async (req, res) => {
    const rows = await query("SELECT * FROM sales WHERE id = :id LIMIT 1", { id: req.params.id });
    if (!rows.length) {
      res.status(404).json({ error: "Venda nao encontrada." });
      return;
    }
    const result = await issueFiscalDocument(mapSale(rows[0]));
    res.json(result);
  });

  app.post("/api/settings", async (req, res) => {
    for (const [key, value] of Object.entries(req.body || {})) {
      await query(
        `INSERT INTO app_settings (setting_key, setting_value)
         VALUES (:key, :value)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        { key, value: value == null ? "" : String(value) },
      );
    }
    res.json({ ok: true });
  });

  app.get("/api/backup", async (_req, res) => {
    res.json({
      exportedAt: new Date().toISOString(),
      data: await snapshot(),
      raw: {
        products: await query("SELECT * FROM products ORDER BY name"),
        repairParts: await query("SELECT * FROM repair_parts ORDER BY name"),
        repairPartMovements: await query("SELECT * FROM repair_part_movements ORDER BY movement_date"),
        sales: await query("SELECT * FROM sales ORDER BY created_at"),
        saleItems: await query("SELECT * FROM sale_items ORDER BY id"),
        salePayments: await query("SELECT * FROM sale_payments ORDER BY id"),
        cashMovements: await query("SELECT * FROM cash_movements ORDER BY movement_date"),
        cashShifts: await query("SELECT * FROM cash_shifts ORDER BY opened_at"),
        customers: await query("SELECT * FROM customers ORDER BY name"),
        services: await query("SELECT * FROM services ORDER BY opened_at"),
        serviceEvents: await query("SELECT * FROM service_events ORDER BY event_date, id"),
        documents: await query("SELECT * FROM purchase_documents ORDER BY document_date, created_at"),
        users: await query("SELECT id, name, role, active, created_at FROM users ORDER BY name"),
        settings: await query("SELECT * FROM app_settings ORDER BY setting_key"),
      },
    });
  });

  app.post("/api/cash/open", async (req, res) => {
    const existing = await getOpenShift();
    if (existing) {
      res.status(409).json({ error: "Ja existe um turno de caixa aberto." });
      return;
    }
    const shift = {
      id: uid("shift"),
      shiftName: req.body.shiftName || "Turno",
      operator: req.body.operator || "Operador",
      openingAmount: Number(req.body.openingAmount || 0),
      businessDate: req.body.businessDate || businessDate(),
    };
    await query(
      `INSERT INTO cash_shifts (id, shift_name, operator, opening_amount, business_date)
       VALUES (:id, :shiftName, :operator, :openingAmount, :businessDate)`,
      shift,
    );
    res.json(shift);
  });

  app.post("/api/cash/close", async (req, res) => {
    const shift = await getOpenShift();
    if (!shift) {
      res.status(409).json({ error: "Nao existe turno aberto para fechar." });
      return;
    }
    const expected = await expectedShiftAmount(shift.id, shift.opening_amount);
    const closing = Number(req.body.closingAmount || 0);
    const difference = closing - expected;
    await query(
      `UPDATE cash_shifts
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closing_amount = :closing,
           expected_amount = :expected, difference_amount = :difference, notes = :notes
       WHERE id = :id`,
      { id: shift.id, closing, expected, difference, notes: req.body.notes || null },
    );
    res.json({ id: shift.id, expectedAmount: expected, closingAmount: closing, differenceAmount: difference });
  });

  if (publicMode) {
    app.use(express.static(storeBuildPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.sendFile(path.join(storeBuildPath, "index.html"));
    });
  }

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: error.message || "Erro interno." });
  });

  return app;
}

function mapPermissions(rows) {
  const result = { admin: ["dashboard", "pos", "inventory", "parts", "services", "customers", "purchases", "documents", "operators", "permissions", "reports", "settings", "backup"] };
  for (const row of rows) {
    if (!result[row.role]) result[row.role] = [];
    if (row.allowed) result[row.role].push(row.module);
  }
  return result;
}

async function getOpenShift() {
  const rows = await query("SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
  return rows[0] || null;
}

async function expectedShiftAmount(shiftId, openingAmount) {
  const rows = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'Entrada' THEN amount ELSE 0 END), 0) AS entradas,
       COALESCE(SUM(CASE WHEN type = 'Saída' THEN amount ELSE 0 END), 0) AS saidas
     FROM cash_movements
     WHERE shift_id = :shiftId`,
    { shiftId },
  );
  return toNumber(openingAmount) + toNumber(rows[0].entradas) - toNumber(rows[0].saidas);
}

async function startServer(port = 3789) {
  await migrate();
  const app = createApp();
  const httpServer = http.createServer(app);
  const sockets = new Set();
  httpServer.keepAliveTimeout = 1000;
  httpServer.headersTimeout = 3000;
  httpServer.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
  return {
    close: () =>
      new Promise((resolve) => {
        let closed = false;
        const finish = async () => {
          if (closed) return;
          closed = true;
          await closeDb();
          resolve();
        };
        const forceClose = setTimeout(() => {
          sockets.forEach((socket) => socket.destroy());
          finish();
        }, 1500);
        forceClose.unref?.();
        httpServer.close(async () => {
          clearTimeout(forceClose);
          await finish();
        });
        httpServer.closeAllConnections?.();
      }),
  };
}

module.exports = { createApp, startServer };
