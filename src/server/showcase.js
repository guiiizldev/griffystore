const Papa = require("papaparse");
const crypto = require("node:crypto");
const models = require("../../store/device-models.json");
const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const fields = [
  "model",
  "storage",
  "color",
  "condition",
  "price",
  "quantity",
  "image",
  "notes",
  "battery",
];
const aliases = {
  modelo: "model",
  aparelho: "model",
  model: "model",
  memoria: "storage",
  armazenamento: "storage",
  storage: "storage",
  cor: "color",
  color: "color",
  condicao: "condition",
  estado: "condition",
  condition: "condition",
  preco: "price",
  valor: "price",
  price: "price",
  quantidade: "quantity",
  estoque: "quantity",
  quantity: "quantity",
  imagem: "image",
  foto: "image",
  image: "image",
  observacoes: "notes",
  descricao: "notes",
  notes: "notes",
  bateria: "battery",
  saudebateria: "battery",
  battery: "battery",
};
function safeImage(value) {
  if (!value) return "";
  if (/^\/store-assets\/[a-z0-9/_\.\-]+$/i.test(value) && !value.includes(".."))
    return value;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !/^(localhost|127\.|10\.|192\.168\.|\[)/i.test(url.hostname)
    )
      return url.href;
  } catch {}
  throw new Error("Informe uma URL HTTPS valida para a foto.");
}
function money(value) {
  if (typeof value === "number") return value;
  let text = String(value ?? "")
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "");
  if (!text) return null;
  if (text.includes(",")) {
    if (!/^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$/.test(text)) return NaN;
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  return /^\d+(?:\.\d{1,2})?$/.test(text) ? Number(text) : NaN;
}
function validateDevice(input) {
  const model = String(input.model || "").trim();
  if (!model || model.length > 100)
    throw new Error("Informe o modelo (ate 100 caracteres).");
  const match = models.find(
    (item) => normalize(item.name) === normalize(model),
  );
  const storage = String(input.storage || "")
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/G$/, "GB");
  if (!/^\d{1,4}(GB|TB)$/.test(storage))
    throw new Error("Informe a memoria, por exemplo 128GB ou 1TB.");
  const condition = {
    lacrado: "Lacrado",
    novo: "Novo",
    seminovo: "Seminovo",
    usado: "Seminovo",
  }[normalize(input.condition)];
  if (!condition)
    throw new Error("Condicao deve ser Lacrado, Novo ou Seminovo.");
  const price = money(input.price);
  if (price === null || !Number.isFinite(price) || price <= 0 || price > 999999)
    throw new Error("Informe um preco valido maior que zero.");
  const quantity =
    input.quantity === "" || input.quantity === undefined
      ? 1
      : Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9999)
    throw new Error("Quantidade deve ser um inteiro entre 0 e 9999.");
  const color = String(input.color || "").trim();
  const notes = String(input.notes || "").trim();
  if (!color || color.length > 60 || notes.length > 1000)
    throw new Error(
      "Informe a cor (ate 60 caracteres) e observacoes de ate 1000 caracteres.",
    );
  const image = safeImage(String(input.image || "").trim());
  const battery =
    input.battery === "" ||
    input.battery === undefined ||
    input.battery === null
      ? null
      : Number(String(input.battery).replace(/%$/, ""));
  if (
    battery !== null &&
    (!Number.isInteger(battery) || battery < 0 || battery > 100)
  )
    throw new Error("Saude da bateria deve ser entre 0 e 100%.");
  const name = match?.name || model;
  const key = crypto
    .createHash("sha256")
    .update([name, storage, color, condition].map(normalize).join("|"))
    .digest("hex");
  return {
    key,
    model: name,
    brand: match?.brand || (/^iphone\b/i.test(model) ? "Apple" : ""),
    storage,
    color,
    condition,
    price: Math.round(price * 100) / 100,
    quantity,
    image: image || match?.image || "",
    imageKind:
      image && image !== match?.image
        ? "custom"
        : match?.image
          ? "reference"
          : "missing",
    notes,
    battery,
  };
}
function chatList(text) {
  const rows = [];
  let current = null,
    variants = [],
    pendingPrice = "";
  const colors = [
    ["\u26ab", "Preto"],
    ["\u26aa", "Branco"],
    ["\u{1f535}", "Azul"],
    ["\u{1f7e1}", "Amarelo"],
    ["\u{1f7e0}", "Laranja"],
    ["\u{1fa77}", "Rosa"],
  ];
  const finish = () => {
    if (!current) return;
    for (const variant of variants.length ? variants : [{}]) {
      const input = {
        model: current.model,
        storage: current.storage,
        condition: "",
        color: current.color || "",
        battery: current.battery ?? "",
        price: current.price || "",
        quantity: 1,
        notes: "",
        ...variant,
      };
      const prices = [
        ...new Set(
          [...(variant.prices || []), ...current.prices].filter(Boolean),
        ),
      ];
      const issues = [
        "Quantidade inicial 1: confirme disponibilidade.",
        ...current.issues,
        ...(variant.issues || []),
      ];
      if (prices.length === 1) input.price = prices[0];
      if (prices.length > 1) {
        input.price = "";
        issues.push(
          `Precos diferentes na origem: ${prices.join(" / ")}. Escolha o valor de venda.`,
        );
      }
      delete input.prices;
      delete input.issues;
      rows.push({
        line: current.line,
        input,
        warning: issues.join(" "),
        needsReview: issues.length > 0,
      });
    }
  };
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const match =
      /^(iphone\s+(?:\d{1,2}(?:\s*(?:pro\s*max|pro|plus|mini))?|air))\s+(\d{1,4})\s*(gb?|tb)\b(.*)$/i.exec(
        line,
      );
    if (match) {
      finish();
      const inline = match[4].trim();
      const extraPrice = inline ? money(inline) : null;
      current = {
        model: match[1].replace(/\s+/g, " "),
        storage: `${match[2]}${match[3].toUpperCase().replace(/^G$/, "GB")}`,
        line: index + 1,
        prices: [
          pendingPrice,
          Number.isFinite(extraPrice) ? extraPrice : "",
        ].filter(Boolean),
        issues: [],
      };
      variants = [];
      pendingPrice = "";
      return;
    }
    if (/^(?:R\$\s*)?[\d.,]+$/.test(line) && Number.isFinite(money(line))) {
      pendingPrice = money(line);
      return;
    }
    if (!current) return;
    const color = colors.find(([emoji]) => line.includes(emoji));
    if (color) {
      const prefix = line.split(/\bT\s*:/i)[0];
      const retail = /R\$\s*([\d.,]+)(?:\/([\d.,]+))?/.exec(prefix);
      const issues = ["Cor interpretada de emoji: confirme a cor comercial."];
      if (line.includes("\u274c"))
        issues.push("Marcacao X: confirme a disponibilidade.");
      if (/\bT\s*:/i.test(line))
        issues.push("Valor de troca nao sera publicado.");
      variants.push({
        color: color[1],
        battery: /([0-9]{1,3})\s*%/.exec(line)?.[1] || "",
        prices: retail
          ? [money(retail[1]), retail[2] ? money(retail[2]) : ""].filter(
              Boolean,
            )
          : [],
        issues,
      });
    } else if (!/^(Final\s+Troca|Lista atualizada)/i.test(line))
      current.issues.push(
        `Confira a observacao da origem: ${line.slice(0, 100)}`,
      );
  });
  finish();
  if (!rows.length || rows.length > 500)
    throw new Error(
      "Nao foram encontrados aparelhos validos na lista (limite: 500).",
    );
  return rows.map((row) => {
    try {
      return { ...row, device: validateDevice(row.input), error: "" };
    } catch (error) {
      return { ...row, device: null, error: error.message };
    }
  });
}
function parseList(text) {
  if (typeof text !== "string" || !text.trim() || text.length > 200000)
    throw new Error("Cole uma lista de ate 200 mil caracteres.");
  if (!/[;\t|]/.test(text) && /(?:^|\n)\s*iphone\s+\d+/i.test(text))
    return chatList(text);
  const parsed = Papa.parse(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", "\t", "|", ","],
  });
  if (parsed.errors.some((error) => error.code !== "UndetectableDelimiter"))
    throw new Error(
      "Nao foi possivel ler as colunas. Confira as aspas e os separadores da lista.",
    );
  const data = parsed.data;
  if (data.length > 501) throw new Error("Importe ate 500 aparelhos por vez.");
  const header = data[0].map((value) => aliases[normalize(value)]);
  const hasHeader = header.includes("model") && header.includes("price");
  if (
    hasHeader &&
    new Set(header.filter(Boolean)).size !== header.filter(Boolean).length
  )
    throw new Error("Existem colunas repetidas no cabecalho.");
  const columns = hasHeader ? header : fields;
  const seen = new Set();
  return data.slice(hasHeader ? 1 : 0).map((values, index) => {
    const line = index + (hasHeader ? 2 : 1);
    const input = Object.fromEntries(
      columns
        .filter(Boolean)
        .map((field) => [field, values[columns.indexOf(field)] || ""]),
    );
    try {
      const device = validateDevice(input);
      if (seen.has(device.key))
        throw new Error(
          "Aparelho repetido nesta lista. Agrupe a quantidade na mesma linha.",
        );
      seen.add(device.key);
      return {
        line,
        device,
        input,
        error: "",
        warning:
          device.imageKind === "missing"
            ? "Modelo sem foto automatica. Adicione uma foto."
            : "",
      };
    } catch (error) {
      return { line, input, device: null, error: error.message };
    }
  });
}
function mapDevice(row) {
  return {
    id: row.id,
    model: row.model,
    brand: row.brand,
    storage: row.storage,
    color: row.color,
    condition: row.device_condition,
    price: Number(row.price),
    quantity: Number(row.quantity),
    image: row.image || "",
    imageKind: row.image_kind,
    notes: row.notes || "",
    battery:
      row.battery === null || row.battery === undefined
        ? null
        : Number(row.battery),
    active: Boolean(row.active),
    updatedAt: row.updated_at,
  };
}
function registerShowcase(app, { query, db, requireRoleToken }) {
  const draftKey = "site.showcase.import_draft";
  const route = (handler) => async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
  const admin = async (req, res) => {
    const token = requireRoleToken(req, ["admin"]);
    const rows = token
      ? await query(
          "SELECT id FROM users WHERE id=:id AND active=1 AND role='admin'",
          { id: token.id },
        )
      : [];
    if (!rows.length) {
      res
        .status(403)
        .json({ error: "Apenas administrador pode gerenciar a vitrine." });
      return null;
    }
    return rows[0];
  };
  app.get(
    "/api/storefront/admin/devices/draft",
    route(async (req, res) => {
      if (!(await admin(req, res))) return;
      const rows = await query(
        "SELECT setting_value FROM app_settings WHERE setting_key=:key",
        { key: draftKey },
      );
      res
        .set("Cache-Control", "no-store")
        .json({ text: rows[0]?.setting_value || "" });
    }),
  );
  app.get(
    "/api/storefront/devices",
    route(async (_req, res) => {
      const rows = await query(
        "SELECT * FROM storefront_devices WHERE active=1 AND quantity>0 ORDER BY updated_at DESC, model LIMIT 1000",
      );
      res.set("Cache-Control", "no-store").json(rows.map(mapDevice));
    }),
  );
  app.get(
    "/api/storefront/admin/devices",
    route(async (req, res) => {
      if (!(await admin(req, res))) return;
      res.json(
        (
          await query(
            "SELECT * FROM storefront_devices ORDER BY updated_at DESC LIMIT 1000",
          )
        ).map(mapDevice),
      );
    }),
  );
  app.post(
    "/api/storefront/admin/devices/preview",
    route(async (req, res) => {
      if (!(await admin(req, res))) return;
      try {
        const rows = parseList(req.body.text);
        await query(
          "INSERT INTO app_settings(setting_key,setting_value) VALUES(:key,:text) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
          { key: draftKey, text: req.body.text },
        );
        res.json({ rows });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }),
  );
  app.post(
    "/api/storefront/admin/devices/publish",
    route(async (req, res) => {
      if (!(await admin(req, res))) return;
      let devices;
      try {
        if (
          !Array.isArray(req.body.devices) ||
          !req.body.devices.length ||
          req.body.devices.length > 500
        )
          throw new Error("Revise de 1 a 500 aparelhos antes de publicar.");
        devices = req.body.devices.map(validateDevice);
        if (new Set(devices.map((item) => item.key)).size !== devices.length)
          throw new Error("Remova os aparelhos repetidos antes de publicar.");
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
      const connection = await db().getConnection();
      try {
        await connection.beginTransaction();
        // Serializes list publication while keeping existing listings absent from the list untouched.
        await connection.execute(
          "SELECT id FROM users WHERE id=:id FOR UPDATE",
          { id: requireRoleToken(req).id },
        );
        for (const device of devices) {
          await connection.execute(
            `INSERT INTO storefront_devices (id,model,brand,storage,color,device_condition,price,quantity,image,image_kind,notes,battery,active)
          VALUES (:key,:model,:brand,:storage,:color,:condition,:price,:quantity,:image,:imageKind,:notes,:battery,1)
          ON DUPLICATE KEY UPDATE price=VALUES(price),quantity=VALUES(quantity),image=VALUES(image),image_kind=VALUES(image_kind),notes=VALUES(notes),battery=VALUES(battery),active=1,updated_at=CURRENT_TIMESTAMP`,
            device,
          );
        }
        await connection.execute(
          "DELETE FROM app_settings WHERE setting_key=:key",
          { key: draftKey },
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      res.json({ ok: true, count: devices.length });
    }),
  );
  app.patch(
    "/api/storefront/admin/devices/:id",
    route(async (req, res) => {
      if (!(await admin(req, res))) return;
      if (typeof req.body.active !== "boolean")
        return res
          .status(400)
          .json({ error: "Informe a visibilidade do aparelho." });
      const result = await query(
        "UPDATE storefront_devices SET active=:active WHERE id=:id",
        { active: req.body.active ? 1 : 0, id: req.params.id },
      );
      if (!result.affectedRows)
        return res.status(404).json({ error: "Aparelho nao encontrado." });
      res.json({ ok: true });
    }),
  );
}
module.exports = { parseList, validateDevice, mapDevice, registerShowcase };
