const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const today = () => new Date().toISOString().slice(0, 10);
const storeHours = { open: "09:00", close: "21:00" };
const dashboardAlertLimit = 18;
const posProductLimit = 80;
const inventoryProductLimit = 250;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function businessDate(date = new Date()) {
  return localDateString(date);
}

function isAfterClosingTime(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 21 * 60;
}

const defaultCategories = [
  "ADAPTADOR DE ENERGIA",
  "BOLSA A PROVA D'ÁGUA",
  "CABOS DE CARREGADOR",
  "CAPAS",
  "CARREGADOR COMPLETO",
  "CARREGADOR VEICULAR",
  "CHIP",
  "COPO TÉRMICO",
  "FONES",
  "HOVERBOARD",
  "IPHONES",
  "JBL",
  "LUZ PARA VÍDEO",
  "MAQUININHA DE APARAR PÉ",
  "PELÍCULA DE CÂMERA",
  "PELÍCULAS",
  "PENDRIVE",
  "PERFUMES ÁRABES",
  "POWER BANK",
  "RASTREADOR DE DISPOSITIVO",
  "SMART WATCH",
  "SUPORTE DE CELULAR",
  "TECLADO DE COMPUTADOR",
  "UMIDIFICADOR",
  "VIDEO GAMES",
];

const appModules = [
  { id: "dashboard", icon: "⌂", label: "Painel", title: "Painel de controle", subtitle: "Resumo financeiro, servicos e alertas de estoque" },
  { id: "pos", icon: "▣", label: "Caixa", title: "Caixa e vendas", subtitle: "Venda rapida com baixa automatica de estoque" },
  { id: "inventory", icon: "▤", label: "Estoque", title: "Estoque", subtitle: "Produtos, categorias, custos e precos" },
  { id: "services", icon: "◈", label: "Assistencia", title: "Assistencia tecnica", subtitle: "Ordens de servico e acompanhamento por status" },
  { id: "customers", icon: "◌", label: "Clientes", title: "Clientes", subtitle: "Cadastro para vendas, garantias e assistencia" },
  { id: "operators", icon: "◎", label: "Operadores", title: "Operadores", subtitle: "Controle de acesso por funcao" },
  { id: "permissions", icon: "◫", label: "Permissoes", title: "Permissoes", subtitle: "Controle quais modulos cada cargo pode acessar" },
  { id: "reports", icon: "◍", label: "Relatorios", title: "Relatorios", subtitle: "Fechamento, movimentos e desempenho" },
  { id: "settings", icon: "#", label: "Config", title: "Configuracoes", subtitle: "Dados da loja e preparacao fiscal" },
  { id: "backup", icon: "v", label: "Backup", title: "Backup", subtitle: "Exportacao de seguranca dos dados" },
];

appModules.splice(5, 0, { id: "documents", icon: "D", label: "Documentos", title: "Documentos", subtitle: "Notas de compra de aparelhos e termos da loja" });
appModules.splice(5, 0, { id: "purchases", icon: "I", label: "Compras iPhone", title: "Compras de iPhone", subtitle: "Aparelhos comprados pela loja para revenda" });
appModules.splice(3, 0, { id: "parts", icon: "P", label: "Pecas", title: "Estoque tecnico", subtitle: "Pecas para reparos e assistencia tecnica" });

const defaultPermissions = {
  admin: appModules.map((module) => module.id),
  gerente: ["dashboard", "pos", "inventory", "parts", "services", "customers", "purchases", "documents", "operators", "reports", "settings", "backup"],
  vendedor: ["dashboard", "pos", "inventory", "services", "customers", "purchases", "documents", "reports"],
  tecnico: ["dashboard", "pos", "inventory", "parts", "services", "customers", "purchases", "documents", "reports"],
};

const seed = {
  categories: defaultCategories,
  permissions: defaultPermissions,
  settings: {
    "store.name": "Griffy Store",
    "store.phone": "",
    "store.cnpj": "",
    "store.ie": "",
    "store.address": "",
    "store.whatsapp": "",
    "store.instagram": "https://www.instagram.com/griffy_storeoficial_gs/",
    "fiscal.provider": "",
    "fiscal.enabled": "false",
    "fiscal.environment": "homologacao",
    "sales.cancel_operator_ids": "[]",
  },
  users: [
    { id: "u1", name: "Administrador", role: "admin", pin: "1234", active: true },
    { id: "u3", name: "Vendedor", role: "vendedor", pin: "3333", active: true },
    { id: "u4", name: "Técnico", role: "tecnico", pin: "4444", active: true },
  ],
  products: [
    { id: "p1", name: "iPhone 11 128GB", category: "IPHONES", stock: 4, cost: 1450, price: 1899, min: 1 },
    { id: "p2", name: "Samsung A34 5G", category: "CHIP", stock: 6, cost: 1220, price: 1699, min: 2 },
    { id: "p3", name: "Xiaomi Redmi Note 13", category: "CHIP", stock: 8, cost: 980, price: 1399, min: 2 },
    { id: "p4", name: "Película 3D Premium", category: "PELÍCULAS", stock: 42, cost: 8, price: 35, min: 10 },
    { id: "p5", name: "Carregador Turbo USB-C", category: "CARREGADOR COMPLETO", stock: 21, cost: 32, price: 79.9, min: 6 },
    { id: "p6", name: "Capa Silicone Reforçada", category: "CAPAS", stock: 33, cost: 12, price: 49.9, min: 8 },
  ],
  repairParts: [],
  repairPartMovements: [],
  customers: [
    { id: "c1", name: "Mariana Costa", phone: "(11) 98888-1212", document: "123.456.789-00" },
    { id: "c2", name: "Rafael Lima", phone: "(11) 97777-3434", document: "987.654.321-00" },
  ],
  services: [
    {
      id: "s1",
      customer: "Mariana Costa",
      phone: "iPhone XR",
      issue: "Troca de tela e revisão do conector",
      status: "Em diagnóstico",
      estimate: 420,
      openedAt: today(),
      tech: "Técnico",
    },
    {
      id: "s2",
      customer: "Rafael Lima",
      phone: "Samsung A52",
      issue: "Bateria descarregando rápido",
      status: "Aguardando peça",
      estimate: 180,
      openedAt: today(),
      tech: "Técnico",
    },
  ],
  documents: [],
  sales: [],
  cash: {
    open: false,
    shift: null,
    shifts: [],
    operator: null,
    openedAt: today(),
    openingAmount: 0,
    movements: [],
  },
};

const storageKey = "griffy-store-system-v1";

function configuredApiBase() {
  const fromQuery = new URLSearchParams(window.location.search).get("apiBase");
  const configured = window.GRIFFY_API_BASE || fromQuery || localStorage.getItem("griffy-api-base") || "http://127.0.0.1:3789/api";
  const clean = String(configured).trim().replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

function configuredAppVersion() {
  return new URLSearchParams(window.location.search).get("appVersion") || "0.2.0";
}

const apiBase = configuredApiBase();
let apiOnline = false;
let state = loadState();
let session = JSON.parse(localStorage.getItem("griffy-session") || "null");
let view = "dashboard";
let modal = null;
let cart = [];
let ui = {};
let paymentRows = [{ method: "Pix", amount: "", details: "", installments: "" }];
let lastCloseReport = null;
let appInfo = { version: configuredAppVersion() };
let updateInfo = null;
let notifications = [];
let renderScheduled = false;
let afterRenderTasks = [];

const documentTypes = [
  "Nota de compra de aparelho",
  "Termo de transferencia de posse de aparelho",
  "Declaracao de recebimento e conferencia de mercadorias",
];

function loadState() {
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    localStorage.setItem(storageKey, JSON.stringify(seed));
    return structuredClone(seed);
  }
  const parsed = JSON.parse(stored);
  parsed.categories = parsed.categories?.length ? parsed.categories : defaultCategories;
  parsed.permissions = parsed.permissions || defaultPermissions;
  parsed.permissions.gerente = Array.from(new Set([...(parsed.permissions.gerente || []), ...defaultPermissions.gerente]));
  parsed.permissions.vendedor = Array.from(new Set([...(parsed.permissions.vendedor || []), ...defaultPermissions.vendedor]));
  parsed.permissions.tecnico = Array.from(new Set([...(parsed.permissions.tecnico || []), ...defaultPermissions.tecnico]));
  delete parsed.permissions.caixa;
  parsed.users = (parsed.users || seed.users).filter((user) => user.role !== "caixa");
  parsed.settings = { ...seed.settings, ...(parsed.settings || {}) };
  parsed.documents = parsed.documents || [];
  parsed.repairParts = parsed.repairParts || [];
  parsed.repairPartMovements = parsed.repairPartMovements || [];
  parsed.cash = parsed.cash || seed.cash;
  parsed.cash.historyMovements = parsed.cash.historyMovements || [];
  return parsed;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

async function api(path, options = {}) {
  const { timeoutMs = 18000, headers = {}, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: { "Content-Type": "application/json", ...headers },
      ...fetchOptions,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Falha na API local.");
    return body;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Tempo esgotado ao comunicar com o banco/API. Verifique a internet ou a VPS e tente novamente.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function apiSend(path, body, method = "POST") {
  return api(path, { method, body: JSON.stringify(body) });
}

async function boot() {
  try {
    await api("/health");
    apiOnline = true;
    state = await api("/state");
    const serverInfo = await api("/version").catch(() => ({}));
    appInfo = { ...serverInfo, version: configuredAppVersion() };
    checkForUpdates(true);
  } catch (_error) {
    apiOnline = false;
  }
  enforceCashLoginRules();
  render();
}

async function reloadState() {
  if (!apiOnline) return;
  state = await api("/state");
}

function setSession(user) {
  session = user ? { id: user.id, name: user.name, role: user.role } : null;
  localStorage.setItem("griffy-session", JSON.stringify(session));
  render();
}

async function startSession(user) {
  session = { id: user.id, name: user.name, role: user.role };
  localStorage.setItem("griffy-session", JSON.stringify(session));
  if (enforceCashLoginRules()) return;
  render();
  if (apiOnline) {
    reloadState()
      .then(() => {
        enforceCashLoginRules();
        render();
      })
      .catch((error) => notify(error.message, inferNotificationType(error.message)));
  }
}

function enforceCashLoginRules() {
  if (!session) return false;
  const usesCash = canAccess("pos");
  if (usesCash && state.cash.open && state.cash.shift?.businessDate && state.cash.shift.businessDate !== businessDate()) {
    view = "reports";
    modal = { type: "closeShift" };
    alert("Existe um caixa aberto de outro dia operacional. Feche esse caixa antes de continuar.");
    render();
    return true;
  }

  if (usesCash && state.cash.open && isAfterClosingTime()) {
    view = "reports";
    alert("Horario de fechamento da loja atingido (21:00). Feche o turno de caixa no fim do expediente.");
  }

  if (usesCash && !state.cash.open) {
    view = "pos";
    modal = { type: "openShift" };
  }
  return false;
}

function hasRole(...roles) {
  return session && roles.includes(session.role);
}

function canDeleteProducts() {
  return hasRole("admin", "gerente");
}

function canAccess(moduleId) {
  if (!session) return false;
  if (session.role === "admin") return true;
  return (state.permissions?.[session.role] || defaultPermissions[session.role] || []).includes(moduleId);
}

function uid(prefix) {
  return `${prefix}${Date.now()}${Math.random().toString(16).slice(2, 7)}`;
}

function app() {
  return `${session ? workspace() : loginScreen()}${notificationsTemplate()}`;
}

function notificationsTemplate() {
  return `<div class="toast-root" id="toastRoot">
    ${notifications
      .map(
        (item) => `<article class="toast ${item.type}">
          <div>
            <strong>${item.title}</strong>
            <span>${item.message}</span>
          </div>
          <button type="button" onclick="dismissNotification('${item.id}')">x</button>
        </article>`,
      )
      .join("")}
  </div>`;
}

function notificationTitle(type) {
  return {
    success: "Concluido",
    error: "Erro",
    warning: "Atencao",
    duplicate: "Duplicado",
    info: "Aviso",
  }[type] || "Aviso";
}

function inferNotificationType(message = "") {
  const text = String(message).toLowerCase();
  if (text.includes("duplic") || text.includes("duplicate") || text.includes("er_dup_entry")) return "duplicate";
  if (text.includes("erro") || text.includes("error") || text.includes("falha") || text.includes("invalido") || text.includes("inválido")) return "error";
  if (text.includes("atencao") || text.includes("atenção") || text.includes("aviso") || text.includes("feche") || text.includes("insuficiente")) return "warning";
  if (text.includes("salv") || text.includes("finalizada") || text.includes("conclu")) return "success";
  return "info";
}

function renderNotifications() {
  const root = document.getElementById("toastRoot");
  if (root) root.outerHTML = notificationsTemplate();
}

function notify(message, type = "info", title = "") {
  const id = uid("toast");
  const finalType = type || inferNotificationType(message);
  notifications = [{ id, type: finalType, title: title || notificationTitle(finalType), message: String(message || "") }, ...notifications].slice(0, 5);
  renderNotifications();
  setTimeout(() => dismissNotification(id), finalType === "error" || finalType === "duplicate" ? 6500 : 4200);
}

function dismissNotification(id) {
  notifications = notifications.filter((item) => item.id !== id);
  renderNotifications();
}

window.alert = (message) => notify(message, inferNotificationType(message));

function loginScreen() {
  return `
    <main class="login-shell">
      <section class="login-panel">
        <div>
          <img class="login-logo-wide" src="assets/logoretangular-enhanced.png" alt="Griffy Store" />
          <p class="brand-subtitle">Sistema de loja, assistência técnica e caixa</p>
        </div>
        <form class="login-form" onsubmit="login(event)">
          <label>Operador
            <select name="userId">
              ${state.users
                .filter((u) => u.active && u.role !== "caixa")
                .map((u) => `<option value="${u.id}">${u.name} · ${roleName(u.role)}</option>`)
                .join("")}
            </select>
          </label>
          <label>PIN
            <input name="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Digite o PIN" required />
          </label>
          <button class="btn primary" type="submit">Entrar</button>
        </form>
      </section>
    </main>
  `;
}

function workspace() {
  const nav = [
    ["dashboard", "⌂", "Painel", ["admin", "caixa", "vendedor", "tecnico"]],
    ["pos", "▣", "Caixa", ["admin", "caixa", "vendedor"]],
    ["inventory", "▤", "Estoque", ["admin", "caixa", "vendedor"]],
    ["services", "◈", "Assistência", ["admin", "tecnico", "caixa"]],
    ["customers", "◌", "Clientes", ["admin", "caixa", "vendedor", "tecnico"]],
    ["operators", "◎", "Operadores", ["admin"]],
    ["reports", "◍", "Relatórios", ["admin", "caixa"]],
  ].filter((item) => item[3].includes(session.role));
  nav.length = 0;
  appModules
    .filter((module) => canAccess(module.id))
    .forEach((module) => nav.push([module.id, module.icon, module.label]));

  if (!nav.some((item) => item[0] === view)) view = nav[0][0];

  return `
    <div class="workspace">
      <aside class="sidebar">
        <div class="brand-row">
          <div class="brand-mark"><img src="assets/logoretangular-sidebar.png" alt="Griffy Store" /></div>
          <div>
            <div class="store-name">Griffy Store</div>
            <div class="store-meta">Celulares · Manutenção · Acessórios</div>
          </div>
        </div>
        <nav class="nav">
          ${nav
            .map(
              ([id, icon, label]) => `
                <button class="${view === id ? "active" : ""}" onclick="go('${id}')" title="${label}">
                  <span>${icon}</span>${label}
                </button>`,
            )
            .join("")}
        </nav>
        <div class="user-box">
          <div>
            <strong>${session.name}</strong>
            <div class="store-meta">${roleName(session.role)}</div>
          </div>
          <button class="btn" onclick="logout()">Sair</button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <h1>${pageTitle()}</h1>
            <p>${pageSubtitle()}</p>
          </div>
          <div class="toolbar">
            ${apiOnline ? '<span class="pill ok">MySQL conectado</span>' : '<span class="pill warn">Modo demo</span>'}
            ${updateInfo?.updateAvailable ? `<button class="btn primary" onclick="installUpdate()">Atualizar ${updateInfo.latestVersion}</button>` : ""}
            ${state.cash.open ? `<span class="pill ok">Caixa aberto · ${state.cash.shift?.name || "Turno"}</span>` : '<span class="pill danger">Caixa fechado</span>'}
            <span class="pill warn">Expediente 09:00-21:00</span>
            ${state.cash.open && isAfterClosingTime() ? '<span class="pill danger">Fechar caixa</span>' : ""}
            <button class="btn" onclick="logout()">Sair</button>
          </div>
        </header>
        <section class="content">${screen()}</section>
      </main>
      ${modal ? modalTemplate() : ""}
    </div>
  `;
}

function pageTitle() {
  if (view === "permissions") return "Permissoes";
  if (view === "settings") return "Configuracoes";
  if (view === "backup") return "Backup";
  if (view === "documents") return "Documentos";
  if (view === "purchases") return "Compras de iPhone";
  if (view === "parts") return "Estoque tecnico";
  return {
    dashboard: "Painel de controle",
    pos: "Caixa e vendas",
    inventory: "Estoque",
    services: "Assistência técnica",
    customers: "Clientes",
    operators: "Operadores",
    reports: "Relatórios",
  }[view];
}

function pageSubtitle() {
  if (view === "permissions") return "Controle quais modulos cada cargo pode acessar";
  if (view === "settings") return "Dados da loja e preparacao fiscal";
  if (view === "backup") return "Exportacao de seguranca dos dados";
  if (view === "documents") return "Notas de compra de aparelhos e documentos da loja";
  if (view === "purchases") return "Historico de aparelhos comprados para revenda";
  if (view === "parts") return "Pecas para reparos, sem venda no caixa";
  return {
    dashboard: "Resumo financeiro, serviços e alertas de estoque",
    pos: "Venda rápida com baixa automática de estoque",
    inventory: "Celulares, acessórios, custos e preços",
    services: "Ordens de serviço e acompanhamento por status",
    customers: "Cadastro para vendas, garantias e assistência",
    operators: "Controle de acesso por função",
    reports: "Fechamento, movimentos e desempenho",
  }[view];
}

function screen() {
  if (view === "permissions") return permissionsScreen();
  if (view === "settings") return settingsScreen();
  if (view === "backup") return backupScreen();
  if (view === "documents") return documentsScreen();
  if (view === "purchases") return purchasesScreen();
  if (view === "parts") return partsScreen();
  return {
    dashboard: dashboardScreen,
    pos: posScreen,
    inventory: inventoryScreen,
    services: servicesScreenPro,
    customers: customersScreen,
    operators: operatorsScreenAdmin,
    reports: reportsScreen,
  }[view]();
}

function dashboardScreen() {
  const activeSales = daySales();
  const revenue = activeSales.reduce((sum, sale) => sum + sale.total, 0);
  const profit = activeSales.reduce(
    (sum, sale) =>
      sum +
      sale.items.reduce((itemSum, item) => {
        const product = state.products.find((p) => p.id === item.id);
        return itemSum + (Number(item.price || 0) - Number(product?.cost || 0)) * Number(item.qty || 0);
      }, 0),
    0,
  );
  const soldByProduct = activeSales.reduce((summary, sale) => {
    for (const item of sale.items) summary[item.name] = (summary[item.name] || 0) + Number(item.qty || 0);
    return summary;
  }, {});
  const topProduct = Object.entries(soldByProduct).sort((a, b) => b[1] - a[1])[0];
  const activeServices = state.services.filter((service) => !isArchivedService(service));
  const serviceValue = activeServices.reduce((sum, service) => sum + Number(service.estimate || 0), 0);
  const lowStock = state.products.filter((p) => p.stock <= p.min);
  const visibleLowStock = lowStock.slice(0, dashboardAlertLimit);
  const topSeller = sellerRanking(activeSales)[0];
  return `
    <div class="grid metrics">
      ${metric("Vendas do dia", money.format(revenue), `${activeSales.length} atendimento(s)`)}
      ${metric("Ordens abertas", activeServices.length, money.format(serviceValue))}
      ${metric("Itens em estoque", state.products.reduce((sum, p) => sum + p.stock, 0), `${lowStock.length} alerta(s)`)}
      ${metric("Melhor vendedor", topSeller?.seller || "-", topSeller ? money.format(topSeller.total) : "Sem vendas ativas")}
    </div>
    <div class="grid panel-grid" style="margin-top:16px">
      <section class="card">
        <div class="card-head">
          <h2>Últimas vendas</h2>
          <button class="btn" onclick="go('pos')">Abrir caixa</button>
        </div>
        ${salesTable(activeSales.slice(-6).reverse())}
      </section>
      <section class="card">
        <div class="card-head">
          <h2>Alertas de estoque</h2>
          <button class="btn" onclick="go('inventory')">Ver estoque</button>
        </div>
        ${
          lowStock.length
            ? `<div class="grid">${visibleLowStock
                .map((p) => `<div class="cart-item"><span><strong>${p.name}</strong><br><small class="muted">${p.category}</small></span><span class="pill warn">${p.stock} un.</span></div>`)
                .join("")}</div>
              ${
                lowStock.length > visibleLowStock.length
                  ? `<div class="notice-box compact-notice"><strong>${lowStock.length - visibleLowStock.length} alerta(s) oculto(s)</strong><span>Abra o estoque e use a busca para localizar itens especificos.</span></div>`
                  : ""
              }`
            : '<div class="empty">Nenhum produto abaixo do mínimo.</div>'
        }
      </section>
    </div>
  `;
}

function posScreen() {
  if (!state.cash.open) {
    return `
      <section class="card">
        <div class="card-head">
          <h2>Caixa fechado</h2>
        </div>
        <div class="empty">Abra o turno antes de iniciar vendas.</div>
        <div class="actions">
          <button class="btn primary" onclick="openModal('openShift')">Abrir turno</button>
        </div>
      </section>
    `;
  }
  const products = filteredProducts();
  const visibleProducts = products.slice(0, posProductLimit);
  return `
    <div class="grid panel-grid">
      <section class="card">
        <div class="card-head">
          <h2>Produtos</h2>
          <div class="toolbar">
            <input id="productSearch" placeholder="Buscar produto ou codigo" oninput="setUi('productSearch', this.value)" value="${valueOf("productSearch")}" />
            <button class="btn primary" onclick="addBySearch()">Adicionar codigo</button>
            <button class="btn" onclick="pullMobileScan()">Puxar scanner</button>
            <button class="btn" onclick="openModal('product')">Novo item</button>
          </div>
        </div>
        <div class="product-grid">
          ${visibleProducts
            .map(
              (p) => `
              <article class="product-tile">
                <div class="product-art"><div class="phone-shape"></div></div>
                <div>
                  <div class="product-title">${p.name}</div>
                  <div class="product-meta">${p.category} · ${p.stock} un.</div>
                </div>
                <strong>${money.format(p.price)}</strong>
                <button class="btn primary" ${p.stock < 1 ? "disabled" : ""} onclick="addCart('${p.id}')">Adicionar</button>
              </article>`,
            )
            .join("")}
        </div>
        ${
          products.length > visibleProducts.length
            ? `<div class="notice-box compact-notice"><strong>${products.length - visibleProducts.length} produto(s) oculto(s)</strong><span>Use a busca por nome ou codigo para carregar itens especificos.</span></div>`
            : ""
        }
      </section>
      <aside class="card">
        <div class="card-head">
          <h2>Carrinho</h2>
          <button class="btn danger" onclick="clearCart()">Limpar</button>
        </div>
        <div class="cart-list">
          ${
            cart.length
              ? cart
                  .map(
                    (item) => `
                    <div class="cart-item">
                      <span><strong>${item.name}</strong><br><small class="muted">${item.qty} x ${money.format(item.price)}</small></span>
                      <span>
                        <button class="btn" onclick="decCart('${item.id}')">−</button>
                        <input class="qty-input" type="number" min="1" value="${item.qty}" onchange="setCartQty('${item.id}', this.value)" />
                        <button class="btn" onclick="addCart('${item.id}')">+</button>
                      </span>
                    </div>`,
                  )
                  .join("")
              : '<div class="empty">Carrinho vazio.</div>'
          }
        </div>
        <div class="totals">
          <div><span>Subtotal</span><strong>${money.format(cartTotal())}</strong></div>
          <div><span>Desconto</span><input id="discount" type="number" min="0" step="0.01" value="${valueOf("discount") || 0}" oninput="setUi('discount', this.value)" /></div>
          <div class="grand"><span>Total</span><span>${money.format(Math.max(0, cartTotal() - Number(valueOf("discount") || 0)))}</span></div>
        </div>
        <label>Cliente
          <select id="saleCustomer" onchange="setUi('saleCustomer', this.value, false)">
            <option value="">Consumidor final</option>
            ${state.customers.map((c) => `<option ${valueOf("saleCustomer") === c.name ? "selected" : ""}>${c.name}</option>`).join("")}
          </select>
        </label>
        <label>Vendedor
          <select id="saleSeller" onchange="setUi('saleSeller', this.value, false)">
            ${salespeople().map((u) => `<option value="${u.name}" ${selectedSellerName() === u.name ? "selected" : ""}>${u.name}</option>`).join("")}
          </select>
        </label>
        <label class="legacy-payment">Pagamento
          <select id="payment" onchange="setUi('payment', this.value, false)">
            ${["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"].map((item) => `<option ${valueOf("payment") === item ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </label>
        ${paymentPanelHtml()}
        <button class="btn primary" onclick="checkout()" ${cart.length && state.cash.open ? "" : "disabled"}>Finalizar venda</button>
      </aside>
    </div>
  `;
}

function inventoryScreen() {
  const products = filteredProducts();
  const visibleProducts = products.slice(0, inventoryProductLimit);
  return `
    <section class="card">
      <div class="card-head">
        <h2>Produtos cadastrados</h2>
        <div class="toolbar">
          <input id="productSearch" placeholder="Buscar produto" oninput="setUi('productSearch', this.value)" value="${valueOf("productSearch")}" />
          <button class="btn primary" onclick="openModal('product')">Cadastrar produto</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Custo</th><th>Venda</th><th>Margem</th><th></th></tr></thead>
          <tbody>
            ${visibleProducts
              .map((p) => {
                const margin = p.price ? ((p.price - p.cost) / p.price) * 100 : 0;
                return `<tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.category}</td>
                  <td><span class="pill ${p.stock <= p.min ? "warn" : "ok"}">${p.stock} un.</span></td>
                  <td>${money.format(p.cost)}</td>
                  <td>${money.format(p.price)}</td>
                  <td>${margin.toFixed(1)}%</td>
                  <td>
                    <button class="btn" onclick="openModal('product','${p.id}')">Editar</button>
                    <button class="btn" onclick="openModal('stock','${p.id}')">Movimentar</button>
                    ${canDeleteProducts() ? `<button class="btn danger" onclick="deleteProduct('${p.id}')">Excluir</button>` : ""}
                  </td>
                </tr>`;
              })
              .join("")}
            ${
              products.length > visibleProducts.length
                ? `<tr><td colspan="7"><div class="notice-box compact-notice"><strong>${products.length - visibleProducts.length} produto(s) oculto(s)</strong><span>Use a busca para localizar itens especificos sem travar a tela.</span></div></td></tr>`
                : ""
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function partsScreen() {
  const parts = filteredRepairParts();
  const low = parts.filter((part) => Number(part.stock || 0) <= Number(part.min || 0));
  const totalCost = parts.reduce((sum, part) => sum + Number(part.stock || 0) * Number(part.cost || 0), 0);
  return `
    <section class="card">
      <div class="card-head">
        <h2>Estoque de pecas para reparo</h2>
        <div class="toolbar">
          <input id="partSearch" placeholder="Buscar peca, codigo, modelo ou fornecedor" oninput="setUi('partSearch', this.value)" value="${valueOf("partSearch")}" />
          <button class="btn primary" onclick="openModal('repairPart')">Cadastrar peca</button>
        </div>
      </div>
      <div class="grid metrics document-metrics">
        ${metric("Pecas", parts.length, "cadastradas")}
        ${metric("Alertas", low.length, "estoque minimo")}
        ${metric("Unidades", parts.reduce((sum, part) => sum + Number(part.stock || 0), 0), "disponiveis")}
        ${metric("Custo em pecas", money.format(totalCost), "valor interno")}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Peca</th><th>Compatibilidade</th><th>Estoque</th><th>Custo</th><th>Local</th><th>Fornecedor</th><th></th></tr></thead>
          <tbody>
            ${parts
              .map(
                (part) => `<tr>
                  <td><strong>${part.name}</strong><br><small>${part.code || part.category || ""}</small></td>
                  <td>${part.compatibleModels || "-"}</td>
                  <td><span class="pill ${Number(part.stock || 0) <= Number(part.min || 0) ? "warn" : "ok"}">${part.stock} ${part.unit || "un."}</span><br><small>min. ${part.min || 0}</small></td>
                  <td>${money.format(Number(part.cost || 0))}</td>
                  <td>${part.location || "-"}</td>
                  <td>${part.supplier || "-"}</td>
                  <td>
                    <button class="btn" onclick="openModal('repairPart','${part.id}')">Editar</button>
                    <button class="btn" onclick="openModal('repairPartMovement','${part.id}')">Movimentar</button>
                  </td>
                </tr>`,
              )
              .join("") || `<tr><td colspan="7"><div class="empty compact-empty">Nenhuma peca cadastrada.</div></td></tr>`}
          </tbody>
        </table>
      </div>
      <h3 class="subhead">Historico recente</h3>
      ${repairPartMovementsTable()}
    </section>
  `;
}

function servicesScreen() {
  const statuses = ["Em diagnóstico", "Aguardando peça", "Em reparo", "Pronto"];
  return `
    <section class="card">
      <div class="card-head">
        <h2>Ordens de serviço</h2>
        <button class="btn primary" onclick="openModal('service')">Nova OS</button>
      </div>
      <div class="status-board">
        ${statuses
          .map(
            (status) => `
            <div class="status-column">
              <h3>${status}</h3>
              ${state.services
                .filter((s) => s.status === status)
                .map(
                  (s) => `
                  <article class="service-card">
                    <strong>${s.customer}</strong>
                    <span>${s.phone}</span>
                    <small class="muted">${s.issue}</small>
                    <strong>${money.format(Number(s.estimate || 0))}</strong>
                    <select onchange="changeServiceStatus('${s.id}', this.value)">
                      ${statuses.map((x) => `<option ${x === s.status ? "selected" : ""}>${x}</option>`).join("")}
                    </select>
                  </article>`,
                )
                .join("") || '<div class="empty">Sem OS.</div>'}
            </div>`,
          )
          .join("")}
      </div>
    </section>
  `;
}

function servicesScreenPro() {
  const statuses = activeServiceStatuses();
  const query = valueOf("serviceSearch").toLowerCase();
  const priority = valueOf("servicePriority");
  const filtered = state.services.filter((service) => {
    const haystack = `${service.id} ${service.customer} ${service.phone} ${service.imei || ""} ${service.issue} ${service.status}`.toLowerCase();
    return !isArchivedService(service) && haystack.includes(query) && (!priority || service.priority === priority);
  });
  return `
    <section class="card">
      <div class="card-head">
        <h2>Ordens de servico</h2>
        <div class="toolbar">
          <input id="serviceSearch" placeholder="Buscar OS, cliente, aparelho ou IMEI" oninput="setUi('serviceSearch', this.value)" value="${valueOf("serviceSearch")}" />
          <select id="servicePriority" onchange="setUi('servicePriority', this.value)">
            <option value="">Todas prioridades</option>
            ${["Urgente", "Alta", "Normal", "Baixa"].map((item) => `<option ${priority === item ? "selected" : ""}>${item}</option>`).join("")}
          </select>
          <button class="btn primary" onclick="openModal('service')">Nova OS</button>
        </div>
      </div>
      <div class="grid metrics service-metrics">
        ${metric("OS abertas", filtered.length, `${filtered.length} no filtro`)}
        ${metric("Aguardando aprovacao", filtered.filter((s) => s.status === "Aguardando aprovacao").length, "orcamento pendente")}
        ${metric("Prontas", filtered.filter((s) => s.status === "Pronto").length, "aguardando retirada")}
        ${metric("Valor em OS", money.format(filtered.reduce((sum, s) => sum + Number(s.estimate || 0), 0)), "orcamentos")}
      </div>
      <div class="status-board">
        ${statuses
          .map(
            (status) => `
            <div class="status-column">
              <h3>${status}</h3>
              ${filtered
                .filter((s) => s.status === status)
                .map(
                  (s) => `
                  <article class="service-card">
                    <div class="service-card-head">
                      <strong>${s.customer}</strong>
                      <span class="pill ${servicePriorityClass(s.priority)}">${s.priority || "Normal"}</span>
                    </div>
                    <span>${s.phone}${s.imei ? ` · IMEI ${s.imei}` : ""}</span>
                    <small class="muted">${s.issue}</small>
                    <div class="receipt-line"><span>Orcamento</span><strong>${money.format(Number(s.estimate || 0))}</strong></div>
                    <select onchange="changeServiceStatus('${s.id}', this.value)">
                      ${statuses.map((x) => `<option ${x === s.status ? "selected" : ""}>${x}</option>`).join("")}
                    </select>
                    <div class="actions inline-actions">
                      <button class="btn" onclick="openModal('service','${s.id}')">Editar</button>
                      <button class="btn" onclick="openModal('serviceOrder','${s.id}')">OS</button>
                    </div>
                  </article>`,
                )
                .join("") || '<div class="empty">Sem OS.</div>'}
            </div>`,
          )
          .join("")}
      </div>
    </section>
  `;
}

function serviceStatuses() {
  return ["Recebido", "Em diagnostico", "Aguardando aprovacao", "Aprovado", "Aguardando peca", "Em reparo", "Pronto", "Entregue", "Cancelado"];
}

function activeServiceStatuses() {
  return serviceStatuses().filter((status) => !["Entregue", "Cancelado"].includes(status));
}

function isArchivedService(service) {
  return ["Entregue", "Cancelado"].includes(service.status);
}

function servicePriorityClass(priority) {
  return priority === "Urgente" || priority === "Alta" ? "danger" : priority === "Baixa" ? "ok" : "warn";
}

function documentsScreen() {
  const documents = filteredDocuments();
  const total = documents.reduce((sum, doc) => sum + Number(doc.purchaseValue || 0), 0);
  return `
    <section class="card">
      <div class="card-head">
        <h2>Documentos</h2>
        <div class="toolbar">
          <input id="documentSearch" placeholder="Buscar cliente, aparelho ou IMEI" oninput="setUi('documentSearch', this.value)" value="${valueOf("documentSearch")}" />
          <select id="documentTypeFilter" onchange="setUi('documentTypeFilter', this.value)">
            <option value="">Todos os documentos</option>
            ${documentTypes.map((type) => `<option value="${type}" ${valueOf("documentTypeFilter") === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
          <button class="btn primary" onclick="openModal('purchaseDocument')">Novo documento</button>
        </div>
      </div>
      <div class="grid metrics document-metrics">
        ${metric("Documentos", documents.length, "no filtro")}
        ${metric("Valor em compras", money.format(total), "aparelhos comprados")}
        ${metric("Este mes", documents.filter((doc) => String(doc.date || "").slice(0, 7) === today().slice(0, 7)).length, "documentos")}
        ${metric("Operador", session?.name || "-", "sessao atual")}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Cliente</th><th>Aparelho</th><th>IMEI/Serial</th><th>Valor</th><th>Operador</th><th></th></tr></thead>
          <tbody>
            ${documents
              .map(
                (doc) => `<tr>
                  <td>${doc.date || "-"}</td>
                  <td><span class="pill warn">${shortDocumentType(doc.type)}</span></td>
                  <td><strong>${doc.customerName}</strong><br><small>${doc.customerDocument || ""}</small></td>
                  <td>${doc.deviceBrand || ""} ${doc.deviceModel || ""}<br><small>${doc.deviceStorage || ""} ${doc.deviceColor || ""}</small></td>
                  <td>${doc.deviceImei || doc.deviceSerial || "-"}</td>
                  <td>${money.format(Number(doc.purchaseValue || 0))}</td>
                  <td>${doc.operator || "-"}</td>
                  <td>
                    <button class="btn" onclick="openModal('purchaseDocument','${doc.id}')">Editar</button>
                    <button class="btn" onclick="openModal('purchaseDocumentPrint','${doc.id}')">Imprimir</button>
                  </td>
                </tr>`,
              )
              .join("") || `<tr><td colspan="8"><div class="empty compact-empty">Nenhum documento cadastrado.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function purchasesScreen() {
  const purchases = filteredPurchases();
  const total = purchases.reduce((sum, doc) => sum + Number(doc.purchaseValue || 0), 0);
  const month = today().slice(0, 7);
  const monthPurchases = purchases.filter((doc) => String(doc.date || "").slice(0, 7) === month);
  const avg = purchases.length ? total / purchases.length : 0;
  return `
    <section class="card">
      <div class="card-head">
        <h2>Compras de iPhone para revenda</h2>
        <div class="toolbar">
          <input id="purchaseSearch" placeholder="Buscar vendedor, comprador, modelo, IMEI ou serial" oninput="setUi('purchaseSearch', this.value)" value="${valueOf("purchaseSearch")}" />
          <select id="purchaseMonthFilter" onchange="setUi('purchaseMonthFilter', this.value)">
            <option value="">Todos os periodos</option>
            <option value="${month}" ${valueOf("purchaseMonthFilter") === month ? "selected" : ""}>Este mes</option>
          </select>
          <button class="btn primary" onclick="openModal('devicePurchase')">Nova compra</button>
        </div>
      </div>
      <div class="grid metrics document-metrics">
        ${metric("Aparelhos comprados", purchases.length, "no filtro")}
        ${metric("Valor investido", money.format(total), "total em compras")}
        ${metric("Este mes", monthPurchases.length, money.format(monthPurchases.reduce((sum, doc) => sum + Number(doc.purchaseValue || 0), 0)))}
        ${metric("Ticket medio", money.format(avg), "por aparelho")}
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Quem vendeu para a loja</th>
              <th>Aparelho</th>
              <th>Identificacao</th>
              <th>Condicao</th>
              <th>Pagamento</th>
              <th>Comprador</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${purchases
              .map(
                (doc) => `<tr>
                  <td>${doc.date || "-"}</td>
                  <td><strong>${doc.customerName || "-"}</strong><br><small>${doc.customerDocument || ""} ${doc.customerPhone || ""}</small></td>
                  <td><strong>${doc.deviceBrand || "Apple"} ${doc.deviceModel || ""}</strong><br><small>${doc.deviceStorage || ""} ${doc.deviceColor || ""}</small></td>
                  <td>IMEI: ${doc.deviceImei || "-"}<br><small>Serial: ${doc.deviceSerial || "-"}</small></td>
                  <td><small>${doc.deviceCondition || "Nao informado"}</small></td>
                  <td><strong>${money.format(Number(doc.purchaseValue || 0))}</strong><br><small>${doc.paymentMethod || "-"}</small></td>
                  <td>${doc.operator || "-"}</td>
                  <td>
                    <button class="btn" onclick="openModal('devicePurchase','${doc.id}')">Editar</button>
                    <button class="btn" onclick="openModal('purchaseDocumentPrint','${doc.id}')">Documento</button>
                  </td>
                </tr>`,
              )
              .join("") || `<tr><td colspan="8"><div class="empty compact-empty">Nenhuma compra cadastrada.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function customersScreen() {
  return `
    <section class="card">
      <div class="card-head">
        <h2>Clientes</h2>
        <button class="btn primary" onclick="openModal('customer')">Cadastrar cliente</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Telefone</th><th>Documento</th><th>Histórico</th></tr></thead>
          <tbody>
            ${state.customers
              .map(
                (c) => `<tr>
                  <td><strong>${c.name}</strong></td>
                  <td>${c.phone}</td>
                  <td>${c.document}</td>
                  <td>${state.sales.filter((s) => s.customer === c.name).length} venda(s)</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function operatorsScreen() {
  return `
    <section class="card">
      <div class="card-head">
        <h2>Operadores</h2>
        <button class="btn primary" onclick="openModal('operator')">Novo operador</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Função</th><th>Status</th><th>PIN</th></tr></thead>
          <tbody>
            ${state.users
              .filter((u) => u.role !== "caixa")
              .map(
                (u) => `<tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${roleName(u.role)}</td>
                  <td><span class="pill ${u.active ? "ok" : "danger"}">${u.active ? "Ativo" : "Bloqueado"}</span></td>
                  <td>${"•".repeat(String(u.pin).length)}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function operatorsScreenAdmin() {
  const isAdmin = session?.role === "admin";
  return `
    <section class="card">
      <div class="card-head">
        <h2>Operadores</h2>
        ${isAdmin ? `<button class="btn primary" onclick="openModal('operator')">Novo operador</button>` : ""}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Funcao</th><th>Status</th><th>PIN</th>${isAdmin ? "<th>Acoes</th>" : ""}</tr></thead>
          <tbody>
            ${state.users
              .filter((u) => u.role !== "caixa")
              .map(
                (u) => `<tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${roleName(u.role)}</td>
                  <td><span class="pill ${u.active ? "ok" : "danger"}">${u.active ? "Ativo" : "Bloqueado"}</span></td>
                  <td>${"*".repeat(String(u.pin).length)}</td>
                  ${
                    isAdmin
                      ? `<td>
                          <div class="actions inline-actions">
                            <button class="btn" onclick="openModal('operator','${u.id}')">Editar</button>
                            <button class="btn danger" onclick="deleteOperator('${u.id}')" ${u.id === session.id ? "disabled" : ""}>Excluir</button>
                          </div>
                        </td>`
                      : ""
                  }
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${isAdmin ? "" : '<div class="empty">Somente o administrador pode adicionar, editar ou excluir operadores.</div>'}
    </section>
  `;
}

function permissionsScreen() {
  const editableRoles = ["gerente", "vendedor", "tecnico"];
  const modules = appModules.filter((module) => module.id !== "permissions");
  return `
    <section class="card">
      <div class="card-head">
        <h2>Permissoes por cargo</h2>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Modulo</th>
              ${editableRoles.map((role) => `<th>${roleName(role)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${modules
              .map(
                (module) => `<tr>
                  <td><strong>${module.label}</strong><br><small class="muted">${module.id}</small></td>
                  ${editableRoles
                    .map((role) => {
                      const checked = (state.permissions?.[role] || []).includes(module.id) ? "checked" : "";
                      return `<td><input type="checkbox" data-role="${role}" data-module="${module.id}" ${checked} /></td>`;
                    })
                    .join("")}
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button class="btn primary" onclick="savePermissions()">Salvar permissoes</button>
      </div>
      <div class="notice-box" style="margin-top:16px">
        <strong>Cancelamento de vendas</strong>
        <span>Qualquer operador pode solicitar um estorno, mas a venda so sera cancelada apos informar o PIN de um administrador ativo.</span>
      </div>
    </section>
  `;
}

function settingsScreen() {
  const settings = state.settings || {};
  return `
    <section class="card">
      <div class="card-head">
        <h2>Dados da loja</h2>
      </div>
      <form class="form-grid" onsubmit="saveSettings(event)">
        <div class="split">
          <label>Nome da loja<input name="store.name" value="${settings["store.name"] || "Griffy Store"}" /></label>
          <label>Telefone<input name="store.phone" value="${settings["store.phone"] || ""}" /></label>
          <label>CNPJ<input name="store.cnpj" value="${settings["store.cnpj"] || ""}" /></label>
          <label>Inscricao estadual<input name="store.ie" value="${settings["store.ie"] || ""}" /></label>
          <label>WhatsApp da loja<input name="store.whatsapp" value="${settings["store.whatsapp"] || ""}" placeholder="11999999999" /></label>
          <label>Instagram<input name="store.instagram" value="${settings["store.instagram"] || "https://www.instagram.com/griffy_storeoficial_gs/"}" /></label>
        </div>
        <label>Endereco<textarea name="store.address">${settings["store.address"] || ""}</textarea></label>
        <div class="card-head" style="margin-top:12px"><h2>Fiscal</h2></div>
        <div class="split">
          <label>Provedor fiscal
            <select name="fiscal.provider">
              ${["", "Nuvem Fiscal", "Focus NFe", "PlugNotas", "TecnoSpeed"].map((item) => `<option ${settings["fiscal.provider"] === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </label>
          <label>Ambiente
            <select name="fiscal.environment">
              ${["homologacao", "producao"].map((item) => `<option ${settings["fiscal.environment"] === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </label>
          <label>Fiscal ativo
            <select name="fiscal.enabled">
              ${["false", "true"].map((item) => `<option ${settings["fiscal.enabled"] === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="notice-box">
          <strong>Nota simples</strong>
          <span>${fiscalEnabled() ? "Desativada automaticamente porque o fiscal esta ativo." : "Ativa automaticamente enquanto o fiscal estiver desativado."}</span>
        </div>
        <div class="card-head" style="margin-top:12px"><h2>Atualizacoes</h2></div>
        <div class="notice-box">
          <strong>Versao instalada: ${appInfo.version || "0.2.0"}</strong>
          <span>${updateStatusText()}</span>
        </div>
        <div class="actions">
          <button class="btn" type="button" onclick="checkForUpdates(false)">Verificar atualizacao</button>
          ${updateInfo?.updateAvailable ? `<button class="btn primary" type="button" onclick="installUpdate()">Baixar instalador ${updateInfo.latestVersion}</button>` : ""}
        </div>
        ${canDeleteProducts() ? `
          <div class="card-head" style="margin-top:12px"><h2>Zona administrativa</h2></div>
          <div class="notice-box danger-zone">
            <strong>Zerar produtos cadastrados</strong>
            <span>Remove todos os produtos do estoque para recadastrar do zero. Historico de vendas permanece guardado.</span>
            <div class="actions"><button class="btn danger" type="button" onclick="resetProducts()">Zerar produtos</button></div>
          </div>
        ` : ""}
        <div class="actions"><button class="btn primary" type="submit">Salvar configuracoes</button></div>
      </form>
    </section>
  `;
}

function backupScreen() {
  return `
    <section class="card">
      <div class="card-head">
        <h2>Backup dos dados</h2>
      </div>
      <div class="empty">Exporte uma copia JSON completa do banco para guardar em local seguro.</div>
      <div class="actions">
        <button class="btn primary" onclick="downloadBackup()">Baixar backup</button>
        <button class="btn" onclick="exportData()">Exportar estado atual</button>
      </div>
    </section>
  `;
}

function shiftSales() {
  if (!state.cash.shift?.id) return state.sales.filter((sale) => sale.status !== "canceled");
  return state.sales.filter((sale) => sale.status !== "canceled" && (!sale.shiftId || sale.shiftId === state.cash.shift.id));
}

function daySales(date = state.cash.shift?.businessDate || businessDate()) {
  return state.sales.filter((sale) => sale.status !== "canceled" && String(sale.date || "").slice(0, 10) === date);
}

function paymentSummary(sales = shiftSales()) {
  return sales.reduce((summary, sale) => {
    for (const payment of salePayments(sale)) {
      const method = payment.method || "Pix";
      summary[method] = (summary[method] || 0) + Number(payment.amount || 0);
    }
    return summary;
  }, {});
}

function paymentSummaryHtml(sales = shiftSales()) {
  const summary = paymentSummary(sales);
  const methods = Object.keys(summary);
  if (!methods.length) return '<div class="empty compact-empty">Nenhum pagamento no turno.</div>';
  return `<div class="payment-summary">${methods
    .map((method) => `<div><span>${method}</span><strong>${money.format(summary[method])}</strong></div>`)
    .join("")}</div>`;
}

function sumPayment(summary, pattern) {
  return Object.entries(summary).reduce((total, [method, amount]) => (pattern.test(method.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()) ? total + Number(amount || 0) : total), 0);
}

function isCancellationMovement(movement) {
  return String(movement.description || "").toLowerCase().includes("cancelamento");
}

function isSaleMovement(movement) {
  return String(movement.description || "").toLowerCase().startsWith("venda ");
}

function isCashOut(movement) {
  return String(movement.type || "") !== "Entrada";
}

function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "-");
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function buildCashCloseReport(formData = {}, result = {}) {
  const sales = shiftSales();
  const payments = paymentSummary(sales);
  const movements = state.cash.movements || [];
  const openingAmount = Number(state.cash.openingAmount || 0);
  const closingAmount = Number(result.closingAmount ?? formData.closingAmount ?? 0);
  const expectedAmount = Number(result.expectedAmount ?? cashBalance());
  const estornos = movements.filter((movement) => isCashOut(movement) && isCancellationMovement(movement)).reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
  const sangrias = movements.filter((movement) => isCashOut(movement) && !isCancellationMovement(movement)).reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
  const reforcos = movements.filter((movement) => movement.type === "Entrada" && !isSaleMovement(movement)).reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
  return {
    id: result.id || state.cash.shift?.id || "",
    shiftName: state.cash.shift?.name || "Turno",
    operator: state.cash.shift?.operator || state.cash.operator || session?.name || "-",
    openedAt: state.cash.shift?.openedAt || state.cash.shift?.businessDate || businessDate(),
    closedAt: new Date().toISOString(),
    openingAmount,
    prazo: 0,
    credit: sumPayment(payments, /credito|credit/),
    creditTax: 0,
    debit: sumPayment(payments, /debito|debit/),
    debitTax: 0,
    pix: sumPayment(payments, /pix/),
    cash: sumPayment(payments, /dinheiro/),
    change: sales.reduce((sum, sale) => sum + saleChange(sale), 0),
    reforcos,
    sangrias,
    estornos,
    acrescimos: 0,
    descontos: sales.reduce((sum, sale) => sum + Number(sale.discount || 0), 0),
    deliveryFee: 0,
    expectedAmount,
    closingAmount,
    differenceAmount: Number(result.differenceAmount ?? closingAmount - expectedAmount),
    notes: formData.notes || "",
  };
}

function fiscalEnabled() {
  return String(state.settings?.["fiscal.enabled"] || "false") === "true";
}

function simpleNoteEnabled() {
  return !fiscalEnabled();
}

function updateStatusText() {
  if (!apiOnline) return "Conecte o sistema ao MySQL/API local para verificar atualizacoes.";
  if (!updateInfo) return "Nenhuma verificacao feita nesta sessao.";
  if (updateInfo.enabled === false) return "Auto update ainda nao configurado. Preencha UPDATE_MANIFEST_URL no arquivo .env.";
  if (updateInfo.updateAvailable) return `Nova versao ${updateInfo.latestVersion} disponivel. ${updateInfo.notes || ""}`;
  return `Sistema atualizado. Ultima versao: ${updateInfo.latestVersion || appInfo.version || "atual"}.`;
}

async function checkForUpdates(silent = false) {
  if (!apiOnline) {
    if (!silent) alert("API local offline. Abra o sistema conectado ao banco para verificar atualizacoes.");
    return;
  }
  try {
    updateInfo = await api(`/updates/check?currentVersion=${encodeURIComponent(appInfo.version || configuredAppVersion())}`);
    if (!silent) {
      if (updateInfo.enabled === false) alert("Auto update ainda nao configurado. Preencha UPDATE_MANIFEST_URL no .env.");
      else if (updateInfo.updateAvailable) alert(`Nova versao disponivel: ${updateInfo.latestVersion}`);
      else alert("Sistema ja esta atualizado.");
    }
    render();
  } catch (error) {
    if (!silent) alert(error.message);
  }
}

function installUpdate() {
  if (!updateInfo?.downloadUrl) {
    alert("Link do instalador nao encontrado no manifesto de atualizacao.");
    return;
  }
  window.open(updateInfo.downloadUrl, "_blank");
}

function cancelOperatorIds() {
  try {
    const value = state.settings?.["sales.cancel_operator_ids"] || "[]";
    const parsed = Array.isArray(value) ? value : JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (_error) {
    return [];
  }
}

function operatorCanCancelSales() {
  return session?.role === "admin" || cancelOperatorIds().includes(String(session?.id || ""));
}

function salespeople() {
  const active = state.users.filter((user) => user.active && ["admin", "gerente", "vendedor", "tecnico"].includes(user.role));
  if (active.some((user) => user.id === session?.id)) return active;
  return session ? [{ ...session, active: true }, ...active] : active;
}

function selectedSellerName() {
  const selected = valueOf("saleSeller");
  if (selected) return selected;
  return session?.name || salespeople()[0]?.name || "";
}

function sellerRanking(sales = state.sales.filter((sale) => sale.status !== "canceled")) {
  return sales
    .reduce((rows, sale) => {
      const seller = sale.seller || sale.operator || "Sem vendedor";
      let row = rows.find((item) => item.seller === seller);
      if (!row) {
        row = { seller, count: 0, total: 0, items: 0 };
        rows.push(row);
      }
      row.count += 1;
      row.total += Number(sale.total || 0);
      row.items += (sale.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
      return rows;
    }, [])
    .sort((a, b) => b.total - a.total);
}

function sellerRankingHtml(sales) {
  const ranking = sellerRanking(sales);
  if (!ranking.length) return '<div class="empty compact-empty">Nenhuma venda para ranquear.</div>';
  return `<div class="table-wrap"><table class="compact-table">
    <thead><tr><th>#</th><th>Vendedor</th><th>Vendas</th><th>Itens</th><th>Total</th></tr></thead>
    <tbody>${ranking
      .map(
        (row, index) => `<tr>
          <td>${index + 1}</td>
          <td><strong>${row.seller}</strong></td>
          <td>${row.count}</td>
          <td>${row.items}</td>
          <td><strong>${money.format(row.total)}</strong></td>
        </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

function reportMonth() {
  return valueOf("reportMonth") || today().slice(0, 7);
}

function monthLabel(month = reportMonth()) {
  const [year, monthNumber] = String(month).split("-");
  if (!year || !monthNumber) return month;
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function salesForMonth(month = reportMonth()) {
  return state.sales.filter((sale) => sale.status !== "canceled" && String(sale.date || "").slice(0, 7) === month);
}

function closedCashShifts(month = reportMonth()) {
  return (state.cash.shifts || [])
    .filter((shift) => shift.status === "closed")
    .filter((shift) => !month || String(shift.businessDate || shift.closedAt || "").slice(0, 7) === month);
}

function cashMovementsForShift(shift) {
  const history = state.cash.historyMovements || [];
  if (shift?.id && history.length) return history.filter((movement) => movement.shift_id === shift.id || movement.shiftId === shift.id);
  if (state.cash.shift?.id && shift?.id === state.cash.shift.id) return state.cash.movements || [];
  return [];
}

function salesForShift(shift) {
  if (!shift) return [];
  return state.sales.filter((sale) => {
    if (sale.status === "canceled") return false;
    if (shift.id && sale.shiftId) return sale.shiftId === shift.id;
    return String(sale.date || "").slice(0, 10) === String(shift.businessDate || "").slice(0, 10);
  });
}

function cashReportFromShift(shift) {
  const sales = salesForShift(shift);
  const payments = paymentSummary(sales);
  const movements = cashMovementsForShift(shift);
  const openingAmount = Number(shift?.openingAmount || 0);
  const estornos = movements.filter((movement) => isCashOut(movement) && isCancellationMovement(movement)).reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
  const sangrias = movements.filter((movement) => isCashOut(movement) && !isCancellationMovement(movement)).reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
  const reforcos = movements.filter((movement) => movement.type === "Entrada" && !isSaleMovement(movement)).reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
  const expectedAmount = Number(shift?.expectedAmount ?? openingAmount + movements.reduce((sum, movement) => sum + (movement.type === "Entrada" ? Number(movement.amount || 0) : -Number(movement.amount || 0)), 0));
  const closingAmount = Number(shift?.closingAmount ?? expectedAmount);
  return {
    id: shift?.id || "",
    shiftName: shift?.name || "Turno",
    operator: shift?.operator || "-",
    openedAt: shift?.openedAt || shift?.businessDate || "",
    closedAt: shift?.closedAt || "",
    openingAmount,
    prazo: 0,
    credit: sumPayment(payments, /credito|credit/),
    creditTax: 0,
    debit: sumPayment(payments, /debito|debit/),
    debitTax: 0,
    pix: sumPayment(payments, /pix/),
    cash: sumPayment(payments, /dinheiro/),
    change: sales.reduce((sum, sale) => sum + saleChange(sale), 0),
    reforcos,
    sangrias,
    estornos,
    acrescimos: 0,
    descontos: sales.reduce((sum, sale) => sum + Number(sale.discount || 0), 0),
    deliveryFee: 0,
    expectedAmount,
    closingAmount,
    differenceAmount: Number(shift?.differenceAmount ?? closingAmount - expectedAmount),
    notes: shift?.notes || "",
    salesCount: sales.length,
    salesTotal: sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
  };
}

function paymentSummaryCards(sales) {
  const summary = paymentSummary(sales);
  const methods = Object.keys(summary);
  if (!methods.length) return '<div class="empty compact-empty">Nenhum pagamento no periodo.</div>';
  return `<div class="payment-summary report-payment-summary">${methods.map((method) => `<div><span>${method}</span><strong>${money.format(summary[method])}</strong></div>`).join("")}</div>`;
}

function closedShiftsTable(shifts) {
  if (!shifts.length) return '<div class="empty">Nenhum caixa fechado nesse periodo.</div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>Turno</th><th>Operador</th><th>Abertura</th><th>Esperado</th><th>Informado</th><th>Diferenca</th><th>Acoes</th></tr></thead>
    <tbody>${shifts
      .map((shift) => {
        const report = cashReportFromShift(shift);
        return `<tr>
          <td>${shift.businessDate || "-"}</td>
          <td><strong>${shift.name || "Turno"}</strong><br><small>${formatDateTime(shift.openedAt)} - ${formatDateTime(shift.closedAt)}</small></td>
          <td>${shift.operator || "-"}</td>
          <td>${money.format(report.openingAmount)}</td>
          <td>${money.format(report.expectedAmount)}</td>
          <td>${money.format(report.closingAmount)}</td>
          <td><span class="pill ${report.differenceAmount === 0 ? "ok" : report.differenceAmount > 0 ? "warn" : "danger"}">${money.format(report.differenceAmount)}</span></td>
          <td><button class="btn" onclick="openModal('cashHistoryReport','${shift.id}')">Ver relatorio</button></td>
        </tr>`;
      })
      .join("")}</tbody>
  </table></div>`;
}

function reportsScreen() {
  return `
    <div class="grid panel-grid">
      <section class="card">
        <div class="card-head">
          <h2>Vendas</h2>
          <button class="btn" onclick="exportData()">Exportar JSON</button>
        </div>
        <h3 class="subhead">Ranking de vendedores</h3>
        ${sellerRankingHtml(state.sales.filter((sale) => sale.status !== "canceled"))}
        ${salesTable(state.sales.slice().reverse())}
        <h3 class="subhead">OS arquivadas</h3>
        ${archivedServicesTable()}
      </section>
      <aside class="card">
        <div class="card-head"><h2>Caixa</h2></div>
        <div class="totals">
          <div><span>Turno</span><strong>${state.cash.shift?.name || "Fechado"}</strong></div>
          <div><span>Dia operacional</span><strong>${state.cash.shift?.businessDate || businessDate()}</strong></div>
          <div><span>Responsavel abertura</span><strong>${state.cash.operator || "-"}</strong></div>
          <div><span>Abertura</span><strong>${money.format(state.cash.openingAmount)}</strong></div>
          <div><span>Entradas</span><strong>${money.format(state.cash.movements.filter((m) => m.type === "Entrada").reduce((s, m) => s + m.amount, 0))}</strong></div>
          <div><span>Saídas</span><strong>${money.format(state.cash.movements.filter((m) => m.type === "Saída").reduce((s, m) => s + m.amount, 0))}</strong></div>
          <div class="grand"><span>Saldo</span><span>${money.format(cashBalance())}</span></div>
        </div>
        <h3 class="subhead">Formas de pagamento</h3>
        ${paymentSummaryHtml()}
        ${state.cash.open && isAfterClosingTime() ? '<div class="notice-box"><strong>Fim do expediente</strong><span>A loja funciona das 09:00 as 21:00. Feche o caixa para encerrar o dia operacional.</span></div>' : ""}
        <div class="grid">
          ${
            state.cash.open
              ? `<button class="btn primary" onclick="openModal('movement')">Lançar movimento</button>
                 <button class="btn danger" onclick="openModal('closeShift')">Fechar turno</button>`
              : `<button class="btn primary" onclick="openModal('openShift')">Abrir turno</button>`
          }
        </div>
      </aside>
    </div>
  `;
}

function reportsScreen() {
  const month = reportMonth();
  const sales = salesForMonth(month);
  const shifts = closedCashShifts(month);
  const salesTotal = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const expectedTotal = shifts.reduce((sum, shift) => sum + Number(cashReportFromShift(shift).expectedAmount || 0), 0);
  const closingTotal = shifts.reduce((sum, shift) => sum + Number(cashReportFromShift(shift).closingAmount || 0), 0);
  const differenceTotal = shifts.reduce((sum, shift) => sum + Number(cashReportFromShift(shift).differenceAmount || 0), 0);
  return `
    <section class="card report-hero">
      <div class="card-head">
        <div>
          <h2>Relatorio mensal</h2>
          <p class="muted">Resumo de vendas, caixas fechados e desempenho de ${monthLabel(month)}.</p>
        </div>
        <div class="toolbar">
          <input id="reportMonth" type="month" value="${month}" onchange="setUi('reportMonth', this.value)" />
          <button class="btn" onclick="exportMonthlyReport()">Exportar relatorio</button>
          <button class="btn" onclick="window.print()">Imprimir</button>
        </div>
      </div>
      <div class="grid metrics document-metrics">
        ${metric("Vendas do mes", money.format(salesTotal), `${sales.length} atendimento(s)`)}
        ${metric("Caixas fechados", shifts.length, "turnos encerrados")}
        ${metric("Total esperado", money.format(expectedTotal), "soma dos fechamentos")}
        ${metric("Diferenca total", money.format(differenceTotal), closingTotal ? `informado: ${money.format(closingTotal)}` : "sem fechamento")}
      </div>
    </section>
    <div class="grid panel-grid report-grid">
      <section class="card">
        <div class="card-head">
          <h2>Caixas fechados</h2>
          ${state.cash.open ? `<button class="btn danger" onclick="openModal('closeShift')">Fechar caixa atual</button>` : `<button class="btn primary" onclick="openModal('openShift')">Abrir caixa</button>`}
        </div>
        ${closedShiftsTable(shifts)}
        <h3 class="subhead">Vendas do mes</h3>
        ${salesTable(sales.slice().reverse())}
      </section>
      <aside class="card">
        <div class="card-head"><h2>Resumo financeiro</h2></div>
        <div class="totals">
          <div><span>Mes</span><strong>${monthLabel(month)}</strong></div>
          <div><span>Vendas</span><strong>${money.format(salesTotal)}</strong></div>
          <div><span>Descontos</span><strong>${money.format(sales.reduce((sum, sale) => sum + Number(sale.discount || 0), 0))}</strong></div>
          <div><span>Caixas fechados</span><strong>${shifts.length}</strong></div>
          <div><span>Esperado em caixa</span><strong>${money.format(expectedTotal)}</strong></div>
          <div><span>Informado no fechamento</span><strong>${money.format(closingTotal)}</strong></div>
          <div class="grand"><span>Diferenca</span><span>${money.format(differenceTotal)}</span></div>
        </div>
        <h3 class="subhead">Formas de pagamento do mes</h3>
        ${paymentSummaryCards(sales)}
        <h3 class="subhead">Ranking de vendedores</h3>
        ${sellerRankingHtml(sales)}
        <h3 class="subhead">OS arquivadas</h3>
        ${archivedServicesTable()}
      </aside>
    </div>
    <section class="card report-current-cash">
      <div class="card-head"><h2>Caixa atual</h2></div>
      <div class="grid panel-grid">
        <div class="totals">
          <div><span>Turno</span><strong>${state.cash.shift?.name || "Fechado"}</strong></div>
          <div><span>Dia operacional</span><strong>${state.cash.shift?.businessDate || businessDate()}</strong></div>
          <div><span>Responsavel abertura</span><strong>${state.cash.operator || "-"}</strong></div>
          <div><span>Abertura</span><strong>${money.format(state.cash.openingAmount)}</strong></div>
          <div><span>Entradas</span><strong>${money.format(state.cash.movements.filter((m) => m.type === "Entrada").reduce((s, m) => s + m.amount, 0))}</strong></div>
          <div><span>Saidas</span><strong>${money.format(state.cash.movements.filter((m) => m.type !== "Entrada").reduce((s, m) => s + m.amount, 0))}</strong></div>
          <div class="grand"><span>Saldo</span><span>${money.format(cashBalance())}</span></div>
        </div>
        <div>
          <h3 class="subhead">Formas de pagamento do turno</h3>
          ${paymentSummaryHtml()}
          ${state.cash.open && isAfterClosingTime() ? '<div class="notice-box"><strong>Fim do expediente</strong><span>A loja funciona das 09:00 as 21:00. Feche o caixa para encerrar o dia operacional.</span></div>' : ""}
          <div class="grid">
            ${
              state.cash.open
                ? `<button class="btn primary" onclick="openModal('movement')">Lancar movimento</button>
                   <button class="btn danger" onclick="openModal('closeShift')">Fechar turno</button>`
                : `<button class="btn primary" onclick="openModal('openShift')">Abrir turno</button>`
            }
          </div>
        </div>
      </div>
    </section>
  `;
}

function archivedServicesTable() {
  const archived = state.services.filter(isArchivedService).slice().reverse();
  if (!archived.length) return '<div class="empty">Nenhuma OS arquivada ainda.</div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>OS</th><th>Cliente</th><th>Aparelho</th><th>Status</th><th>Valor</th><th>Tecnico</th><th>Acoes</th></tr></thead>
    <tbody>${archived
      .map(
        (service) => `<tr>
          <td><strong>${service.id}</strong></td>
          <td>${service.customer}</td>
          <td>${service.phone}${service.imei ? ` · ${service.imei}` : ""}</td>
          <td><span class="pill ${service.status === "Cancelado" ? "danger" : "ok"}">${service.status}</span></td>
          <td><strong>${money.format(Number(service.estimate || 0))}</strong></td>
          <td>${service.tech || "-"}</td>
          <td><button class="btn" onclick="openModal('serviceOrder','${service.id}')">Ver OS</button></td>
        </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

function metric(label, value, detail) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong><small class="muted">${detail}</small></article>`;
}

function salesTable(sales) {
  if (!sales.length) return '<div class="empty">Nenhuma venda registrada ainda.</div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Operador</th><th>Pagamento</th><th>Total</th><th>Status</th><th>Acoes</th></tr></thead>
    <tbody>${sales
      .map(
        (s) => `<tr>
          <td>${s.date}</td>
          <td>${s.customer || "Consumidor final"}</td>
          <td>${s.seller || s.operator}</td>
          <td>${s.operator}</td>
          <td>${paymentsLabel(salePayments(s))}</td>
          <td><strong>${money.format(s.total)}</strong></td>
          <td><span class="pill ${s.status === "canceled" ? "danger" : "ok"}">${s.status === "canceled" ? "Cancelada" : "Ativa"}</span></td>
          <td>
            ${simpleNoteEnabled() ? `<button class="btn" onclick="openModal('receipt','${s.id}')">Nota simples</button>` : ""}
            ${fiscalEnabled() && apiOnline ? `<button class="btn" onclick="issueFiscal('${s.id}')">NF</button>` : ""}
            ${s.status === "canceled" ? "" : `<button class="btn danger" onclick="openModal('cancelSale','${s.id}')">Cancelar</button>`}
          </td>
        </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

function modalTemplate() {
  const forms = {
    product: productForm,
    stock: stockForm,
    service: serviceForm,
    customer: customerForm,
    operator: operatorForm,
    movement: movementForm,
    openShift: openShiftForm,
    closeShift: closeShiftForm,
    cashCloseReport: cashCloseReportForm,
    cashHistoryReport: cashHistoryReportForm,
    receipt: receiptForm,
    cancelSale: cancelSaleForm,
    serviceOrder: serviceOrderForm,
    purchaseDocument: purchaseDocumentForm,
    devicePurchase: () => purchaseDocumentForm(true),
    purchaseDocumentPrint: purchaseDocumentPrintForm,
    repairPart: repairPartForm,
    repairPartMovement: repairPartMovementForm,
  };
  return `<div class="modal-backdrop">
    <section class="modal">${forms[modal.type]()}</section>
  </div>`;
}

function productForm() {
  return productFormFull();
}

function productFormFull() {
  const product = modal.id ? state.products.find((p) => p.id === modal.id) || {} : {};
  return formShell(modal.id ? "Editar produto" : "Cadastrar produto", "saveProduct(event)", `
    <div class="split">
      <label>Codigo<input name="code" value="${product.code || ""}" /></label>
      <label>Nome<input name="name" value="${product.name || ""}" required /></label>
      <label>Categoria<select name="category">${categoryOptions(product.category || "")}</select></label>
      <label>Subcategoria<input name="subcategory" value="${product.subcategory || ""}" /></label>
      <label>Fornecedor<input name="supplier" value="${product.supplier || ""}" /></label>
      <label>Unidade<input name="unit" value="${product.unit || "unidade"}" /></label>
      <label>Estoque<input name="stock" type="number" value="${product.stock ?? 1}" required /></label>
      <label>Estoque minimo<input name="min" type="number" min="0" value="${product.min ?? 1}" required /></label>
      <label>Custo<input name="cost" type="number" min="0" step="0.01" value="${product.cost ?? 0}" required /></label>
      <label>Preco varejo<input name="price" type="number" min="0" step="0.01" value="${product.price ?? 0}" required /></label>
      <label>Preco atacado<input name="wholesalePrice" type="number" min="0" step="0.01" value="${product.wholesalePrice ?? 0}" /></label>
      <label>Lote<input name="lot" value="${product.lot || ""}" /></label>
      <label>Validade<input name="validity" type="date" value="${product.validity || ""}" /></label>
    </div>`);
}

function productFormLegacy() {
  return formShell("Cadastrar produto", "saveProduct(event)", `
    <div class="split">
      <label>Nome<input name="name" required /></label>
      <label>Categoria<select name="category">${categoryOptions()}</select></label>
      <label>Estoque<input name="stock" type="number" min="0" value="1" required /></label>
      <label>Estoque mínimo<input name="min" type="number" min="0" value="1" required /></label>
      <label>Custo<input name="cost" type="number" min="0" step="0.01" required /></label>
      <label>Preço de venda<input name="price" type="number" min="0" step="0.01" required /></label>
    </div>`);
}

function stockForm() {
  const product = state.products.find((p) => p.id === modal.id);
  return formShell(`Movimentar estoque`, "saveStock(event)", `
    <p class="muted"><strong>${product.name}</strong> · saldo atual: ${product.stock} un.</p>
    <div class="split">
      <label>Tipo<select name="type"><option>Entrada</option><option>Saída</option></select></label>
      <label>Quantidade<input name="qty" type="number" min="1" value="1" required /></label>
    </div>
    <label>Observação<input name="description" placeholder="Compra, ajuste, perda, garantia..." /></label>`);
}

function repairPartForm() {
  const part = modal.id ? (state.repairParts || []).find((item) => item.id === modal.id) || {} : {};
  return formShell(modal.id ? "Editar peca tecnica" : "Cadastrar peca tecnica", "saveRepairPart(event)", `
    <div class="split">
      <label>Codigo<input name="code" value="${part.code || ""}" /></label>
      <label>Nome da peca<input name="name" value="${part.name || ""}" required /></label>
      <label>Categoria<input name="category" value="${part.category || ""}" placeholder="Tela, bateria, conector..." /></label>
      <label>Modelos compativeis<input name="compatibleModels" value="${part.compatibleModels || ""}" placeholder="iPhone 11, 12, A32..." /></label>
      <label>Fornecedor<input name="supplier" value="${part.supplier || ""}" /></label>
      <label>Unidade<input name="unit" value="${part.unit || "unidade"}" /></label>
      <label>Estoque<input name="stock" type="number" min="0" value="${part.stock ?? 0}" required /></label>
      <label>Estoque minimo<input name="min" type="number" min="0" value="${part.min ?? 1}" required /></label>
      <label>Custo interno<input name="cost" type="number" min="0" step="0.01" value="${part.cost ?? 0}" required /></label>
      <label>Localizacao<input name="location" value="${part.location || ""}" placeholder="Gaveta, caixa, bancada..." /></label>
    </div>
    <label>Observacoes<textarea name="notes">${part.notes || ""}</textarea></label>`);
}

function repairPartMovementForm() {
  const part = (state.repairParts || []).find((item) => item.id === modal.id);
  if (!part) return '<div class="empty">Peca nao encontrada.</div>';
  const activeServices = (state.services || []).filter((service) => !isArchivedService(service));
  return formShell("Movimentar peca tecnica", "saveRepairPartMovement(event)", `
    <p class="muted"><strong>${part.name}</strong> · saldo atual: ${part.stock} ${part.unit || "un."}</p>
    <div class="split">
      <label>Tipo<select name="type"><option>Entrada</option><option>Saida</option><option>Uso em OS</option></select></label>
      <label>Quantidade<input name="qty" type="number" min="1" value="1" required /></label>
      <label>Custo unitario<input name="unitCost" type="number" min="0" step="0.01" value="${part.cost || 0}" /></label>
      <label>OS vinculada
        <select name="serviceId">
          <option value="">Sem OS</option>
          ${activeServices.map((service) => `<option value="${service.id}">${service.customer} · ${service.phone} · ${service.status}</option>`).join("")}
        </select>
      </label>
    </div>
    <label>Observacao<input name="description" placeholder="Compra, ajuste, troca de tela, bateria usada..." /></label>`);
}

function receiptForm() {
  const sale = state.sales.find((s) => s.id === modal.id);
  if (!sale) return '<div class="empty">Venda nao encontrada.</div>';
  const subtotal = sale.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);
  const payments = salePayments(sale);
  return `
    <div class="modal-head"><h2>Nota simples</h2><button class="btn" onclick="modal=null;render()">Fechar</button></div>
    <div class="receipt">
      <strong>${state.settings?.["store.name"] || "Griffy Store"}</strong>
      <span>${state.settings?.["store.phone"] || ""}</span>
      <span class="receipt-warning">DOCUMENTO NAO FISCAL</span>
      <hr />
      <div>Venda: ${sale.id}</div>
      <div>Data: ${sale.date}</div>
      <div>Vendedor: ${sale.seller || sale.operator}</div>
      <div>Operador: ${sale.operator}</div>
      <div>Cliente: ${sale.customer || "Consumidor final"}</div>
      <hr />
      ${sale.items.map((item) => `<div class="receipt-line"><span>${item.qty}x ${item.name}</span><strong>${money.format(item.qty * item.price)}</strong></div>`).join("")}
      <hr />
      <div class="receipt-line"><span>Subtotal</span><strong>${money.format(subtotal)}</strong></div>
      <div class="receipt-line"><span>Desconto</span><strong>${money.format(Number(sale.discount || 0))}</strong></div>
      <div class="receipt-line"><span>Total</span><strong>${money.format(sale.total)}</strong></div>
      ${payments.map((payment) => `<div class="receipt-line"><span>${payment.method}${payment.installments ? ` ${payment.installments}x` : ""}</span><strong>${money.format(payment.amount)}</strong></div>`).join("")}
      <div class="receipt-line"><span>Troco</span><strong>${money.format(saleChange(sale))}</strong></div>
      <div>Status: ${sale.status === "canceled" ? "Cancelada" : "Ativa"}</div>
    </div>
    <div class="actions"><button class="btn primary" onclick="window.print()">Imprimir</button></div>
  `;
}

function closeReportLine(label, value, marker = "") {
  return `<div class="receipt-line"><span>${label}</span><strong>${value}</strong>${marker ? `<em>${marker}</em>` : ""}</div>`;
}

function cashCloseReportForm() {
  const report = lastCloseReport;
  if (!report) return '<div class="empty">Relatorio de fechamento nao encontrado.</div>';
  return `
    <div class="modal-head"><h2>Fechamento do caixa</h2><button class="btn" onclick="modal=null;render()">Fechar</button></div>
    <div class="receipt cash-close-report">
      <strong>FECHAMENTO DO CAIXA</strong>
      <span>${state.settings?.["store.name"] || "Griffy Store"}</span>
      <hr />
      ${closeReportLine("ABERTURA", formatDateTime(report.openedAt))}
      ${closeReportLine("FECHAMENTO", formatDateTime(report.closedAt))}
      ${closeReportLine("OPERADOR", report.operator)}
      ${closeReportLine("TURNO", report.shiftName)}
      <hr />
      ${closeReportLine("VALOR INICIAL", money.format(report.openingAmount), "(+)")}
      ${closeReportLine("A PRAZO", money.format(report.prazo), "( )")}
      ${closeReportLine("CRED. (LIQ)", money.format(report.credit), "(+)")}
      ${closeReportLine("CRED. (TAXA)", money.format(report.creditTax), "( )")}
      ${closeReportLine("DEBIT. (LIQ)", money.format(report.debit), "(+)")}
      ${closeReportLine("DEBIT. (TAXA)", money.format(report.debitTax), "( )")}
      ${closeReportLine("PIX", money.format(report.pix), "(+)")}
      ${closeReportLine("DINHEIRO", money.format(report.cash), "(+)")}
      ${closeReportLine("TROCO", money.format(report.change), "( )")}
      ${closeReportLine("REFORCOS", money.format(report.reforcos), "(+)")}
      ${closeReportLine("SANGRIAS", money.format(report.sangrias), "(-)")}
      ${closeReportLine("ESTORNOS", money.format(report.estornos), "(-)")}
      ${closeReportLine("ACRESCIMOS", money.format(report.acrescimos), "( )")}
      ${closeReportLine("DESCONTOS", money.format(report.descontos), "( )")}
      ${closeReportLine("TX ENTREGA", money.format(report.deliveryFee), "( )")}
      <hr />
      ${closeReportLine("RESULTADO", money.format(report.expectedAmount), "( )")}
      ${closeReportLine("EM CAIXA", money.format(report.closingAmount), "( )")}
      ${closeReportLine("DIFERENCA", money.format(report.differenceAmount), report.differenceAmount === 0 ? "(=)" : report.differenceAmount > 0 ? "(+)" : "(-)")}
      ${report.notes ? `<hr /><div>Obs: ${report.notes}</div>` : ""}
    </div>
    <div class="actions">
      <button class="btn" onclick="modal=null;render()">Voltar</button>
      <button class="btn primary" onclick="window.print()">Imprimir</button>
    </div>
  `;
}

function cashHistoryReportForm() {
  const shift = (state.cash.shifts || []).find((item) => item.id === modal.id);
  if (!shift) return '<div class="empty">Caixa fechado nao encontrado.</div>';
  const report = cashReportFromShift(shift);
  return `
    <div class="modal-head"><h2>Relatorio do caixa fechado</h2><button class="btn" onclick="modal=null;render()">Fechar</button></div>
    <div class="receipt cash-close-report">
      <strong>FECHAMENTO DO CAIXA</strong>
      <span>${state.settings?.["store.name"] || "Griffy Store"}</span>
      <hr />
      ${closeReportLine("ABERTURA", formatDateTime(report.openedAt))}
      ${closeReportLine("FECHAMENTO", formatDateTime(report.closedAt))}
      ${closeReportLine("OPERADOR", report.operator)}
      ${closeReportLine("TURNO", report.shiftName)}
      ${closeReportLine("VENDAS", `${report.salesCount} / ${money.format(report.salesTotal)}`)}
      <hr />
      ${closeReportLine("VALOR INICIAL", money.format(report.openingAmount), "(+)")}
      ${closeReportLine("A PRAZO", money.format(report.prazo), "( )")}
      ${closeReportLine("CRED. (LIQ)", money.format(report.credit), "(+)")}
      ${closeReportLine("CRED. (TAXA)", money.format(report.creditTax), "( )")}
      ${closeReportLine("DEBIT. (LIQ)", money.format(report.debit), "(+)")}
      ${closeReportLine("DEBIT. (TAXA)", money.format(report.debitTax), "( )")}
      ${closeReportLine("PIX", money.format(report.pix), "(+)")}
      ${closeReportLine("DINHEIRO", money.format(report.cash), "(+)")}
      ${closeReportLine("TROCO", money.format(report.change), "( )")}
      ${closeReportLine("REFORCOS", money.format(report.reforcos), "(+)")}
      ${closeReportLine("SANGRIAS", money.format(report.sangrias), "(-)")}
      ${closeReportLine("ESTORNOS", money.format(report.estornos), "(-)")}
      ${closeReportLine("ACRESCIMOS", money.format(report.acrescimos), "( )")}
      ${closeReportLine("DESCONTOS", money.format(report.descontos), "( )")}
      ${closeReportLine("TX ENTREGA", money.format(report.deliveryFee), "( )")}
      <hr />
      ${closeReportLine("RESULTADO", money.format(report.expectedAmount), "( )")}
      ${closeReportLine("EM CAIXA", money.format(report.closingAmount), "( )")}
      ${closeReportLine("DIFERENCA", money.format(report.differenceAmount), report.differenceAmount === 0 ? "(=)" : report.differenceAmount > 0 ? "(+)" : "(-)")}
      ${report.notes ? `<hr /><div>Obs: ${report.notes}</div>` : ""}
    </div>
    <div class="actions">
      <button class="btn" onclick="modal=null;render()">Voltar</button>
      <button class="btn primary" onclick="window.print()">Imprimir</button>
    </div>
  `;
}

function cancelSaleForm() {
  const sale = state.sales.find((s) => s.id === modal.id);
  return formShell("Cancelar venda", "cancelSale(event)", `
    <p class="muted">Venda <strong>${sale?.id || ""}</strong> no valor de <strong>${money.format(sale?.total || 0)}</strong>.</p>
    <div class="notice-box"><strong>Autorizacao de administrador</strong><span>Informe o PIN de qualquer administrador ativo para confirmar este estorno.</span></div>
    <label>PIN do administrador<input id="adminPin" name="adminPin" type="password" inputmode="numeric" autocomplete="off" autofocus required /></label>
    <label>Motivo<textarea name="reason" required></textarea></label>`);
}

function serviceFormLegacy() {
  return formShell("Nova ordem de serviço", "saveService(event)", `
    <div class="split">
      <label>Cliente<input name="customer" list="customerList" required /></label>
      <label>Aparelho<input name="phone" placeholder="Modelo do celular" required /></label>
      <label>Valor previsto<input name="estimate" type="number" min="0" step="0.01" value="0" /></label>
      <label>Status<select name="status"><option>Em diagnóstico</option><option>Aguardando peça</option><option>Em reparo</option><option>Pronto</option></select></label>
    </div>
    <label>Defeito relatado<textarea name="issue" required></textarea></label>
    <datalist id="customerList">${state.customers.map((c) => `<option value="${c.name}">`).join("")}</datalist>`);
}

function serviceForm() {
  const service = modal.id ? state.services.find((s) => s.id === modal.id) || {} : {};
  return formShell(modal.id ? "Editar ordem de servico" : "Nova ordem de servico", "saveService(event)", `
    <div class="split">
      <label>Cliente<input name="customer" list="customerList" value="${service.customer || ""}" required /></label>
      <label>Telefone do cliente<input name="customerPhone" value="${service.customerPhone || ""}" /></label>
      <label>Documento<input name="customerDocument" value="${service.customerDocument || ""}" /></label>
      <label>Tecnico responsavel<input name="tech" value="${service.tech || session?.name || ""}" /></label>
    </div>
    <div class="split">
      <label>Aparelho/modelo<input name="phone" value="${service.phone || ""}" placeholder="Ex: iPhone 13 Pro" required /></label>
      <label>Marca<input name="brand" value="${service.brand || ""}" /></label>
      <label>IMEI/Serial<input name="imei" value="${service.imei || ""}" /></label>
      <label>Senha/padrao informado<input name="passwordInfo" value="${service.passwordInfo || ""}" /></label>
    </div>
    <div class="split">
      <label>Status<select name="status">${serviceStatuses().map((status) => `<option ${service.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
      <label>Prioridade<select name="priority">${["Urgente", "Alta", "Normal", "Baixa"].map((item) => `<option ${service.priority === item || (!service.priority && item === "Normal") ? "selected" : ""}>${item}</option>`).join("")}</select></label>
      <label>Garantia em dias<input name="warrantyDays" type="number" min="0" value="${service.warrantyDays ?? 90}" /></label>
      <label>Orcamento total<input name="estimate" type="number" min="0" step="0.01" value="${service.estimate ?? 0}" /></label>
      <label>Mao de obra<input name="laborCost" type="number" min="0" step="0.01" value="${service.laborCost ?? 0}" /></label>
      <label>Custo de pecas<input name="partsCost" type="number" min="0" step="0.01" value="${service.partsCost ?? 0}" /></label>
    </div>
    <label>Defeito relatado<textarea name="issue" required>${service.issue || ""}</textarea></label>
    <label>Estado do aparelho na entrada<textarea name="condition" placeholder="Tela, tampa, bateria, sinais de queda, oxidacao...">${service.condition || ""}</textarea></label>
    <label>Acessorios recebidos<textarea name="accessories" placeholder="Capa, chip, carregador, caixa, pelicula...">${service.accessories || ""}</textarea></label>
    <label>Diagnostico tecnico<textarea name="diagnosis">${service.diagnosis || ""}</textarea></label>
    <label>Solucao/servico executado<textarea name="solution">${service.solution || ""}</textarea></label>
    <label>Pecas usadas<textarea name="parts">${service.parts || ""}</textarea></label>
    <label>Observacoes internas<textarea name="notes">${service.notes || ""}</textarea></label>
    <datalist id="customerList">${state.customers.map((c) => `<option value="${c.name}">`).join("")}</datalist>`);
}

function serviceOrderForm() {
  const service = state.services.find((s) => s.id === modal.id);
  if (!service) return '<div class="empty">OS nao encontrada.</div>';
  return `
    <div class="modal-head"><h2>Ordem de servico</h2><button class="btn" onclick="modal=null;render()">Fechar</button></div>
    <div class="receipt service-order">
      <strong>${state.settings?.["store.name"] || "Griffy Store"}</strong>
      <span>${state.settings?.["store.phone"] || ""}</span>
      <hr />
      <div class="receipt-line"><span>OS</span><strong>${service.id}</strong></div>
      <div class="receipt-line"><span>Abertura</span><strong>${service.openedAt || today()}</strong></div>
      <div class="receipt-line"><span>Status</span><strong>${service.status}</strong></div>
      <div class="receipt-line"><span>Prioridade</span><strong>${service.priority || "Normal"}</strong></div>
      <hr />
      <div><strong>Cliente</strong>: ${service.customer}</div>
      <div><strong>Telefone</strong>: ${service.customerPhone || "-"}</div>
      <div><strong>Documento</strong>: ${service.customerDocument || "-"}</div>
      <hr />
      <div><strong>Aparelho</strong>: ${service.phone}</div>
      <div><strong>Marca</strong>: ${service.brand || "-"}</div>
      <div><strong>IMEI/Serial</strong>: ${service.imei || "-"}</div>
      <div><strong>Acessorios</strong>: ${service.accessories || "-"}</div>
      <div><strong>Estado</strong>: ${service.condition || "-"}</div>
      <hr />
      <div><strong>Defeito</strong>: ${service.issue}</div>
      <div><strong>Diagnostico</strong>: ${service.diagnosis || "-"}</div>
      <div><strong>Solucao</strong>: ${service.solution || "-"}</div>
      <div><strong>Pecas</strong>: ${service.parts || "-"}</div>
      <hr />
      <div class="receipt-line"><span>Orcamento</span><strong>${money.format(Number(service.estimate || 0))}</strong></div>
      <div class="receipt-line"><span>Garantia</span><strong>${service.warrantyDays || 90} dias</strong></div>
      <hr />
      <strong>Historico</strong>
      ${(service.events || []).map((event) => `<div><small>${String(event.date).slice(0, 19)} · ${event.type} · ${event.operator || "-"}</small><br>${event.description || ""}</div>`).join("") || "<div>Sem historico.</div>"}
      <hr />
      <div class="signature-row"><span>Assinatura do cliente</span><span>Responsavel tecnico</span></div>
    </div>
    <div class="actions"><button class="btn primary" onclick="window.print()">Imprimir OS</button></div>
  `;
}

function purchaseDocumentForm(devicePurchaseMode = false) {
  const doc = modal.id ? (state.documents || []).find((item) => item.id === modal.id) || {} : {};
  const title = devicePurchaseMode ? (modal.id ? "Editar compra de iPhone" : "Nova compra de iPhone") : modal.id ? "Editar documento" : "Novo documento";
  return formShell(title, "savePurchaseDocument(event)", `
    <div class="split">
      ${
        devicePurchaseMode
          ? `<input type="hidden" name="type" value="Nota de compra de aparelho" />`
          : `<label>Tipo do documento
              <select name="type">
                ${documentTypes.map((type) => `<option value="${type}" ${(doc.type || documentTypes[0]) === type ? "selected" : ""}>${type}</option>`).join("")}
              </select>
            </label>`
      }
      <label>Data<input name="date" type="date" value="${doc.date || today()}" required /></label>
      <label>${devicePurchaseMode ? "Quem vendeu para a loja" : "Cliente"}<input name="customerName" list="customerList" value="${doc.customerName || ""}" required /></label>
      <label>CPF/RG<input name="customerDocument" value="${doc.customerDocument || ""}" /></label>
      <label>Telefone<input name="customerPhone" value="${doc.customerPhone || ""}" /></label>
      <label>Endereco<input name="customerAddress" value="${doc.customerAddress || ""}" /></label>
      <label>Bairro<input name="customerDistrict" value="${doc.customerDistrict || ""}" /></label>
      <label>CEP<input name="customerZip" value="${doc.customerZip || ""}" /></label>
      <label>Municipio<input name="customerCity" value="${doc.customerCity || "Rio de Janeiro"}" /></label>
      <label>UF<input name="customerState" value="${doc.customerState || "RJ"}" /></label>
    </div>
    <div class="split">
      <label>Marca<input name="deviceBrand" value="${doc.deviceBrand || (devicePurchaseMode ? "Apple" : "")}" /></label>
      <label>Modelo do aparelho<input name="deviceModel" value="${doc.deviceModel || ""}" placeholder="Ex: iPhone 13 Pro Max" required /></label>
      <label>IMEI<input name="deviceImei" value="${doc.deviceImei || ""}" /></label>
      <label>Serial<input name="deviceSerial" value="${doc.deviceSerial || ""}" /></label>
      <label>Cor<input name="deviceColor" value="${doc.deviceColor || ""}" /></label>
      <label>Armazenamento<input name="deviceStorage" value="${doc.deviceStorage || ""}" placeholder="Ex: 128GB" /></label>
      <label>Quantidade<input name="quantity" type="number" min="1" value="${doc.quantity || 1}" /></label>
      <label>Garantia em meses<input name="warrantyMonths" type="number" min="0" value="${doc.warrantyMonths || 6}" /></label>
      <label>Valor da compra<input name="purchaseValue" type="number" min="0" step="0.01" value="${doc.purchaseValue ?? 0}" required /></label>
      <label>Forma de pagamento<input name="paymentMethod" value="${doc.paymentMethod || ""}" placeholder="Pix, dinheiro, transferencia..." /></label>
    </div>
    <label>Estado do aparelho<textarea name="deviceCondition" placeholder="Tela, bateria, tampa, Face ID, iCloud, bloqueios, saude da bateria, marcas de uso...">${doc.deviceCondition || ""}</textarea></label>
    <label>Acessorios entregues<textarea name="accessories" placeholder="Caixa, carregador, cabo, capinha, nota anterior...">${doc.accessories || ""}</textarea></label>
    <label>Observacoes/termos adicionais<textarea name="notes" placeholder="Texto complementar usado pela loja.">${doc.notes || ""}</textarea></label>
    <datalist id="customerList">${state.customers.map((c) => `<option value="${c.name}">`).join("")}</datalist>`);
}

function formatDateBr(value) {
  const [year, month, day] = String(value || today()).slice(0, 10).split("-");
  return `${day || ""}/${month || ""}/${year || ""}`;
}

function nfCell(label, value, extraClass = "") {
  return `<div class="${extraClass}"><strong>${label}</strong><span>${value || ""}</span></div>`;
}

function purchaseDocumentPrintForm() {
  const doc = (state.documents || []).find((item) => item.id === modal.id);
  if (!doc) return '<div class="empty">Documento nao encontrado.</div>';
  if (doc.type === "Termo de transferencia de posse de aparelho") return transferDocumentPrintForm(doc);
  if (doc.type === "Declaracao de recebimento e conferencia de mercadorias") return receiptConferencePrintForm(doc);
  const storeName = state.settings?.["store.name"] || "Griffy Store";
  const storePhone = state.settings?.["store.phone"] || "(21) 97983-4256";
  const storeCnpj = state.settings?.["store.cnpj"] || "55.978.089/0001-57";
  const storeAddress = state.settings?.["store.address"] || "Rua Maragogi, no 27 - Penha - Rio de Janeiro - RJ - CEP 21072-180";
  const value = Number(doc.purchaseValue || 0);
  const quantity = Number(doc.quantity || 1);
  const unitValue = quantity > 0 ? value / quantity : value;
  const productDescription = `${doc.deviceBrand || ""} ${doc.deviceModel || ""} ${doc.deviceStorage || ""} ${doc.deviceColor || ""}`.replace(/\s+/g, " ").trim();
  const documentNumber = String(doc.id || "").replace(/\D/g, "").slice(-9).padStart(9, "0").replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
  const dateBr = formatDateBr(doc.date || today());
  return `
    <div class="modal-head"><h2>Documento de compra</h2><button class="btn" onclick="modal=null;render()">Fechar</button></div>
    <div class="document-print nf-print">
      <div class="nf-topline">NOSSOS PRODUTOS TEM GARANTIA DE ATE 12 MESES</div>
      <header class="nf-header">
        <div class="nf-receipt-box">
          <strong>DATA DE RECEBIMENTO</strong>
          <span>${dateBr}</span>
          <strong>${doc.warrantyMonths || 6} MESES DE GARANTIA</strong>
          <small>IDENTIFICACAO E ASSINATURA DO RECEBEDOR</small>
        </div>
        <div class="nf-store-box">
          <img src="assets/logoretangular-enhanced.png" alt="Griffy Store" />
          <strong>${storeName.toUpperCase()}</strong>
          <span>${storeAddress}</span>
          <span>FONE: ${storePhone}</span>
        </div>
        <div class="nf-number-box">
          <strong>NF-e</strong>
          <span>No ${documentNumber}</span>
          <span>SERIE 001</span>
        </div>
      </header>
      <div class="nf-identification">
        <div><strong>NATUREZA DA OPERACAO</strong><span>${productDescription || doc.type || "COMPRA DE APARELHO"}</span></div>
        <div><strong>EID</strong><span>${doc.deviceSerial || "-"}</span></div>
        <div><strong>IMEI</strong><span>${doc.deviceImei || "-"}</span></div>
        <div><strong>INSCRICAO ESTADUAL</strong><span>${state.settings?.["store.ie"] || "000000000"}</span></div>
        <div><strong>CNPJ</strong><span>${storeCnpj}</span></div>
      </div>
      <h3 class="nf-section-title">DESTINATARIO / REMETENTE</h3>
      <div class="nf-grid nf-recipient">
        <div class="span-2"><strong>NOME/RAZAO</strong><span>${doc.customerName || "-"}</span></div>
        <div><strong>C.N.P.J / C.P.F.</strong><span>${doc.customerDocument || "-"}</span></div>
        <div><strong>DATA</strong><span>${dateBr}</span></div>
        <div class="span-2"><strong>ENDERECO</strong><span>${doc.customerAddress || "-"}</span></div>
        <div><strong>BAIRRO/DISTRITO</strong><span>${doc.customerDistrict || "-"}</span></div>
        <div><strong>CEP</strong><span>${doc.customerZip || "-"}</span></div>
        <div><strong>MUNICIPIO</strong><span>${doc.customerCity || "Rio de Janeiro"}</span></div>
        <div><strong>FONE/FAX</strong><span>${doc.customerPhone || "-"}</span></div>
        <div><strong>UF</strong><span>${doc.customerState || "RJ"}</span></div>
        <div><strong>HORA DE SAIDA</strong><span>${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
      </div>
      <div class="nf-payment-line"><strong>FORMA DE PAGAMENTO</strong><span>DINHEIRO</span><span>CARTAO</span><span>PIX</span><span>UPGRADE</span><b>${money.format(value)}</b><em>${doc.paymentMethod || "-"}</em></div>
      <h3 class="nf-section-title">CALCULO DO IMPOSTO</h3>
      <div class="nf-grid nf-tax">
        ${nfCell("BASE DE CALCULO DO ICMS", "0,00")}
        ${nfCell("VALOR DO ICMS", "0,00")}
        ${nfCell("BASE DE CALCULO DO ICMS SUBSTITUICAO", "0,00")}
        ${nfCell("FORMA DE PAGAMENTO", doc.paymentMethod || "-")}
        ${nfCell("VALOR TOTAL DOS PRODUTOS", money.format(value))}
        ${nfCell("VALOR DO FRETE", "0,00")}
        ${nfCell("VALOR DO SEGURO", "0,00")}
        ${nfCell("DESCONTO", "0,00")}
        ${nfCell("OUTRAS DESPESAS ACESSORIAS", "0,00")}
        ${nfCell("VALOR DO IPI", "0,00")}
        ${nfCell("VALOR TOTAL DA NOTA", money.format(value))}
      </div>
      <h3 class="nf-section-title">TRANSPORTADOR / VOLUME</h3>
      <div class="nf-grid nf-transport">
        ${nfCell("RAZAO SOCIAL", storeName.toUpperCase())}
        ${nfCell("FRETE POR CONTA", "")}
        ${nfCell("CODIGO ANTT", "")}
        ${nfCell("PLACA DO VEICULO", "")}
        ${nfCell("UF", "RJ")}
        ${nfCell("CNPJ/CPF", storeCnpj)}
        ${nfCell("ENDERECO", storeAddress, "span-2")}
        ${nfCell("MUNICIPIO", "RIO DE JANEIRO")}
        ${nfCell("UF", "RJ")}
        ${nfCell("INSCRICAO ESTADUAL", state.settings?.["store.ie"] || "0")}
        ${nfCell("QUANTIDADE", String(quantity).padStart(2, "0"))}
        ${nfCell("ESPECIE", "CELULAR")}
        ${nfCell("MARCA", doc.deviceBrand || "-")}
        ${nfCell("NUMERACAO", documentNumber)}
        ${nfCell("PESO BRUTO", "0,00")}
        ${nfCell("PESO LIQUIDO", "0,00")}
      </div>
      <h3 class="nf-section-title">INFORMACOES DO LOCAL DE ENTREGA / RETIRADA</h3>
      <div class="nf-grid nf-pickup">
        ${nfCell("NOME/RAZAO SOCIAL", storeName.toUpperCase(), "span-2")}
        ${nfCell("C.N.P.J / C.P.F.", storeCnpj)}
        ${nfCell("INSCRICAO ESTADUAL", state.settings?.["store.ie"] || "")}
        ${nfCell("ENDERECO", storeAddress, "span-2")}
        ${nfCell("BAIRRO/DISTRITO", "PENHA")}
        ${nfCell("CEP", "21072-180")}
        ${nfCell("MUNICIPIO", "Rio de Janeiro")}
        ${nfCell("UF", "RJ")}
        ${nfCell("FONE/FAX", storePhone)}
      </div>
      <h3 class="nf-section-title">DADOS DO PRODUTO / SERVICOS</h3>
      <table class="nf-products">
        <thead><tr><th>CODIGO</th><th>PRODUTO</th><th>DESCRICAO DOS PRODUTOS / SERVICOS</th><th>NCM/SH</th><th>CST</th><th>CFOP</th><th>UNID.</th><th>QTD.</th><th>VLR UNIT.</th><th>VALOR TOTAL</th><th>B. CALC. ICMS</th><th>VALOR ICMS</th><th>VALOR IPI</th></tr></thead>
        <tbody><tr><td>00000</td><td>CEL</td><td>${productDescription || "-"}</td><td>0</td><td>0</td><td>00</td><td>UN</td><td>${String(quantity).padStart(2, "0")}</td><td>${money.format(unitValue)}</td><td>${money.format(value)}</td><td>0,00</td><td>0,00</td><td>0,00</td></tr></tbody>
      </table>
      <h3 class="nf-section-title">CALCULO DO ISSQN</h3>
      <div class="nf-grid nf-issqn">
        ${nfCell("INSCRICAO MUNICIPAL", "")}
        ${nfCell("VALOR TOTAL DOS SERVICOS", "0,00")}
        ${nfCell("BASE DE CALCULO DO ISSQN", "0,00")}
        ${nfCell("VALOR DO ISSQN", "0,00")}
      </div>
      <h3 class="nf-section-title">DADOS ADICIONAIS</h3>
      <div class="nf-additional">${doc.accessories || doc.notes || "-"}</div>
      <div class="signature-row document-signatures"><span>Identificacao e assinatura do recebedor</span><span>Responsavel ${storeName}</span></div>
    </div>
    <div class="actions"><button class="btn" onclick="openModal('purchaseDocument','${doc.id}')">Editar</button><button class="btn primary" onclick="window.print()">Imprimir documento</button></div>
  `;
}

function documentPrintShell(title, doc, bodyHtml) {
  const storeName = state.settings?.["store.name"] || "Griffy Store";
  const storePhone = state.settings?.["store.phone"] || "(21) 97983-4256";
  const storeCnpj = state.settings?.["store.cnpj"] || "55.978.089/0001-57";
  const storeAddress = state.settings?.["store.address"] || "Rua Maragogi, no 27 - Penha - Rio de Janeiro - RJ - CEP 21072-180";
  return `
    <div class="modal-head"><h2>${title}</h2><button class="btn" onclick="modal=null;render()">Fechar</button></div>
    <div class="document-print term-print">
      <header class="term-head">
        <img src="assets/logoretangular-enhanced.png" alt="Griffy Store" />
        <div>
          <strong>${storeName.toUpperCase()}</strong>
          <span>CNPJ: ${storeCnpj}</span>
          <span>${storeAddress}</span>
          <span>FONE: ${storePhone}</span>
        </div>
      </header>
      <h2>${title}</h2>
      <div class="document-meta">
        <span><strong>Documento:</strong> ${doc.id}</span>
        <span><strong>Data:</strong> ${formatDateBr(doc.date || today())}</span>
        <span><strong>Operador:</strong> ${doc.operator || "-"}</span>
      </div>
      ${bodyHtml}
      <div class="signature-row document-signatures"><span>Assinatura do cliente/remetente</span><span>Assinatura da Griffy Store</span></div>
    </div>
    <div class="actions"><button class="btn" onclick="openModal('purchaseDocument','${doc.id}')">Editar</button><button class="btn primary" onclick="window.print()">Imprimir documento</button></div>
  `;
}

function deviceSummaryHtml(doc) {
  const productDescription = `${doc.deviceBrand || ""} ${doc.deviceModel || ""} ${doc.deviceStorage || ""} ${doc.deviceColor || ""}`.replace(/\s+/g, " ").trim();
  return `
    <section>
      <h3>Dados do aparelho / mercadoria</h3>
      <div class="document-grid">
        <p><strong>Descricao:</strong> ${productDescription || "-"}</p>
        <p><strong>IMEI:</strong> ${doc.deviceImei || "-"}</p>
        <p><strong>Serial/EID:</strong> ${doc.deviceSerial || "-"}</p>
        <p><strong>Quantidade:</strong> ${doc.quantity || 1}</p>
        <p><strong>Valor:</strong> ${money.format(Number(doc.purchaseValue || 0))}</p>
        <p><strong>Pagamento:</strong> ${doc.paymentMethod || "-"}</p>
      </div>
      <p><strong>Estado/conferencia:</strong> ${doc.deviceCondition || "-"}</p>
      <p><strong>Acessorios/itens recebidos:</strong> ${doc.accessories || "-"}</p>
    </section>
  `;
}

function customerSummaryHtml(doc, title = "Dados do cliente") {
  return `
    <section>
      <h3>${title}</h3>
      <div class="document-grid">
        <p><strong>Nome:</strong> ${doc.customerName || "-"}</p>
        <p><strong>Documento:</strong> ${doc.customerDocument || "-"}</p>
        <p><strong>Telefone:</strong> ${doc.customerPhone || "-"}</p>
        <p><strong>Endereco:</strong> ${doc.customerAddress || "-"}</p>
        <p><strong>Bairro:</strong> ${doc.customerDistrict || "-"}</p>
        <p><strong>Cidade/UF:</strong> ${doc.customerCity || "Rio de Janeiro"} - ${doc.customerState || "RJ"}</p>
      </div>
    </section>
  `;
}

function transferDocumentPrintForm(doc) {
  return documentPrintShell(
    "Termo de transferencia de posse de aparelho",
    doc,
    `
      ${customerSummaryHtml(doc, "Cedente / antigo possuidor")}
      ${deviceSummaryHtml(doc)}
      <section>
        <h3>Termo</h3>
        <p>Por meio deste termo, o cedente acima identificado declara transferir a posse do aparelho descrito para a Griffy Store, afirmando ser legitimo possuidor do bem e que o aparelho nao possui origem ilicita, bloqueio, restricao de propriedade, pendencia financeira ou impedimento de transferencia informado nesta data.</p>
        <p>A Griffy Store recebe o aparelho nas condicoes descritas, ficando o cedente responsavel pela veracidade das informacoes prestadas e por qualquer reclamacao futura relacionada a origem, propriedade ou restricao do equipamento.</p>
        ${doc.notes ? `<p><strong>Observacoes:</strong> ${doc.notes}</p>` : ""}
      </section>
    `,
  );
}

function receiptConferencePrintForm(doc) {
  return documentPrintShell(
    "Declaracao de recebimento e conferencia de mercadoria(s)",
    doc,
    `
      ${customerSummaryHtml(doc, "Entregador / fornecedor")}
      ${deviceSummaryHtml(doc)}
      <section>
        <h3>Declaracao</h3>
        <p>Declaramos o recebimento da(s) mercadoria(s) descrita(s) neste documento para conferencia pela Griffy Store. A conferencia considera quantidade, identificacao, estado aparente, acessorios informados e demais observacoes registradas no ato do recebimento.</p>
        <p>O recebimento nao substitui analise tecnica posterior quando necessaria. Divergencias, bloqueios, danos ocultos, inconsistencias de IMEI/serial ou ausencia de acessorios poderao ser apontados apos verificacao completa.</p>
        ${doc.notes ? `<p><strong>Observacoes:</strong> ${doc.notes}</p>` : ""}
      </section>
    `,
  );
}

function customerForm() {
  return formShell("Cadastrar cliente", "saveCustomer(event)", `
    <div class="split">
      <label>Nome<input name="name" required /></label>
      <label>Telefone<input name="phone" required /></label>
      <label>Documento<input name="document" /></label>
    </div>`);
}

function operatorFormLegacy() {
  return formShell("Novo operador", "saveOperator(event)", `
    <div class="split">
      <label>Nome<input name="name" required /></label>
      <label>Função<select name="role"><option value="admin">Administrador</option><option value="caixa">Caixa</option><option value="vendedor">Vendedor</option><option value="tecnico">Técnico</option></select></label>
      <label>PIN<input name="pin" inputmode="numeric" required /></label>
    </div>`);
}

function operatorForm() {
  const operator = modal.id ? state.users.find((u) => u.id === modal.id) || {} : {};
  if (session?.role !== "admin") return '<div class="empty">Somente o administrador pode alterar operadores.</div>';
  return formShell(modal.id ? "Editar operador" : "Novo operador", "saveOperator(event)", `
    <div class="split">
      <label>Nome<input name="name" type="text" value="${operator.name || ""}" autocomplete="off" autofocus required /></label>
      <label>Funcao
        <select name="role">
          ${[
            ["admin", "Administrador"],
            ["gerente", "Gerente"],
            ["vendedor", "Vendedor"],
            ["tecnico", "Tecnico"],
          ]
            .map(([value, label]) => `<option value="${value}" ${operator.role === value ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
      </label>
      <label>PIN<input name="pin" inputmode="numeric" value="${operator.pin || ""}" required /></label>
      <label>Status
        <select name="active">
          <option value="true" ${operator.active !== false ? "selected" : ""}>Ativo</option>
          <option value="false" ${operator.active === false ? "selected" : ""}>Bloqueado</option>
        </select>
      </label>
    </div>`);
}

function movementForm() {
  return formShell("Movimento de caixa", "saveMovement(event)", `
    <div class="split">
      <label>Tipo<select name="type"><option>Entrada</option><option>Saída</option></select></label>
      <label>Valor<input name="amount" type="number" min="0" step="0.01" required /></label>
    </div>
    <label>Descrição<input name="description" required /></label>`);
}

function openShiftFormLegacy() {
  return formShell("Abrir turno de caixa", "openShift(event)", `
    <p class="muted">Funcionário responsável: <strong>${session?.name || "-"}</strong></p>
    <div class="split">
      <label>Turno
        <select name="shiftName">
          <option>Turno 1</option>
          <option>Turno 2</option>
        </select>
      </label>
      <label>Valor inicial<input name="openingAmount" type="number" min="0" step="0.01" value="0" required /></label>
    </div>`);
}

function closeShiftFormLegacy() {
  return formShell("Fechar turno de caixa", "closeShift(event)", `
    <div class="totals">
      <div><span>Turno</span><strong>${state.cash.shift?.name || "-"}</strong></div>
      <div><span>Valor esperado</span><strong>${money.format(cashBalance())}</strong></div>
    </div>
    <h3 class="subhead">Resumo por pagamento</h3>
    ${paymentSummaryHtml()}
    <label>Valor contado no caixa<input name="closingAmount" type="number" min="0" step="0.01" value="${cashBalance().toFixed(2)}" required /></label>
    <label>Observação<textarea name="notes" placeholder="Opcional"></textarea></label>`);
}

function openShiftForm() {
  return formShell("Abrir turno de caixa", "openShift(event)", `
    <p class="muted">Funcionario responsavel: <strong>${session?.name || "-"}</strong></p>
    <p class="muted">Dia operacional: <strong>${businessDate()}</strong> - Horario da loja: <strong>09:00 as 21:00</strong></p>
    <div class="split">
      <label>Turno
        <select name="shiftName">
          <option>Turno 1</option>
          <option>Turno 2</option>
        </select>
      </label>
      <label>Valor inicial<input name="openingAmount" type="number" min="0" step="0.01" value="0" required /></label>
    </div>`);
}

function closeShiftForm() {
  return formShell("Fechar turno de caixa", "closeShift(event)", `
    <div class="totals">
      <div><span>Turno</span><strong>${state.cash.shift?.name || "-"}</strong></div>
      <div><span>Dia operacional</span><strong>${state.cash.shift?.businessDate || businessDate()}</strong></div>
      <div><span>Valor esperado</span><strong>${money.format(cashBalance())}</strong></div>
    </div>
    ${isAfterClosingTime() ? '<div class="notice-box"><strong>Fim do expediente</strong><span>Fechamento recomendado apos as 21:00.</span></div>' : ""}
    <h3 class="subhead">Resumo por pagamento</h3>
    ${paymentSummaryHtml()}
    <label>Valor contado no caixa<input name="closingAmount" type="number" min="0" step="0.01" value="${cashBalance().toFixed(2)}" required /></label>
    <label>Observacao<textarea name="notes" placeholder="Opcional"></textarea></label>`);
}

function formShell(title, handler, fields) {
  return `<div class="modal-head"><h2>${title}</h2><button class="btn" onclick="modal=null;render()">Fechar</button></div>
    <form onsubmit="${handler}" class="form-grid" autocomplete="off">
      ${fields}
      <div class="actions"><button class="btn" type="button" onclick="modal=null;render()">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
    </form>`;
}

function filteredProducts() {
  const query = valueOf("productSearch").toLowerCase();
  return state.products.filter((p) => `${p.code || ""} ${p.name} ${p.category} ${p.supplier || ""}`.toLowerCase().includes(query));
}

function filteredRepairParts() {
  const query = valueOf("partSearch").toLowerCase();
  return (state.repairParts || []).filter((part) =>
    `${part.code || ""} ${part.name || ""} ${part.category || ""} ${part.compatibleModels || ""} ${part.supplier || ""} ${part.location || ""}`.toLowerCase().includes(query),
  );
}

function repairPartMovementsTable() {
  const movements = (state.repairPartMovements || []).slice(0, 12);
  if (!movements.length) return '<div class="empty compact-empty">Nenhuma movimentacao de peca ainda.</div>';
  return `<div class="table-wrap"><table class="compact-table">
    <thead><tr><th>Data</th><th>Peca</th><th>Tipo</th><th>Qtd.</th><th>OS</th><th>Operador</th><th>Obs.</th></tr></thead>
    <tbody>${movements
      .map(
        (movement) => `<tr>
          <td>${String(movement.date || "").slice(0, 19)}</td>
          <td><strong>${movement.partName || movement.partId}</strong></td>
          <td><span class="pill ${movement.type === "Entrada" ? "ok" : "warn"}">${movement.type}</span></td>
          <td>${movement.qty}</td>
          <td>${movement.serviceId || "-"}</td>
          <td>${movement.operator || "-"}</td>
          <td>${movement.description || "-"}</td>
        </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

function filteredDocuments() {
  const query = valueOf("documentSearch").toLowerCase();
  const type = valueOf("documentTypeFilter");
  return (state.documents || []).filter((doc) =>
    `${doc.id} ${doc.customerName || ""} ${doc.customerDocument || ""} ${doc.deviceBrand || ""} ${doc.deviceModel || ""} ${doc.deviceImei || ""} ${doc.deviceSerial || ""}`
      .toLowerCase()
      .includes(query),
  ).filter((doc) => !type || doc.type === type);
}

function filteredPurchases() {
  const query = valueOf("purchaseSearch").toLowerCase();
  const month = valueOf("purchaseMonthFilter");
  return (state.documents || [])
    .filter((doc) => (doc.type || documentTypes[0]) === "Nota de compra de aparelho")
    .filter((doc) => !month || String(doc.date || "").slice(0, 7) === month)
    .filter((doc) =>
      `${doc.id} ${doc.customerName || ""} ${doc.customerDocument || ""} ${doc.customerPhone || ""} ${doc.operator || ""} ${doc.deviceBrand || ""} ${doc.deviceModel || ""} ${doc.deviceImei || ""} ${doc.deviceSerial || ""} ${doc.deviceStorage || ""} ${doc.deviceColor || ""}`
        .toLowerCase()
        .includes(query),
    );
}

function shortDocumentType(type) {
  if (type === "Termo de transferencia de posse de aparelho") return "Transferencia";
  if (type === "Declaracao de recebimento e conferencia de mercadorias") return "Recebimento";
  return "Compra";
}

function categories() {
  return state.categories?.length ? state.categories : defaultCategories;
}

function categoryOptions(selected = "") {
  return categories().map((category) => `<option ${selected === category ? "selected" : ""}>${category}</option>`).join("");
}

function valueOf(id) {
  return document.getElementById(id)?.value ?? ui[id] ?? "";
}

function setUi(id, value, shouldRender = true) {
  ui[id] = value;
  if (!shouldRender) return;
  render();
  afterRender(() => {
    const element = document.getElementById(id);
    if (!element) return;
    element.focus();
    if (typeof element.setSelectionRange === "function") {
      const end = String(value).length;
      try {
        element.setSelectionRange(end, end);
      } catch (_error) {
        // Numeric inputs can reject selection ranges.
      }
    }
  });
}

function roleNameLegacy(role) {
  return { admin: "Administrador", caixa: "Caixa", vendedor: "Vendedor", tecnico: "Técnico" }[role] || role;
}

function roleName(role) {
  return { admin: "Administrador", gerente: "Gerente", vendedor: "Vendedor", tecnico: "Tecnico", caixa: "Caixa desativado" }[role] || role;
}

function cashBalance() {
  return state.cash.movements.reduce(
    (sum, m) => sum + (m.type === "Entrada" ? m.amount : -m.amount),
    Number(state.cash.openingAmount || 0),
  );
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function saleTotal() {
  return Math.max(0, cartTotal() - Number(valueOf("discount") || 0));
}

function paymentMethods() {
  return ["Pix", "Dinheiro", "Cartao de debito", "Cartao de credito"];
}

function paymentTotal() {
  return paymentRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function paymentChange() {
  const hasCash = paymentRows.some((payment) => payment.method === "Dinheiro");
  return hasCash ? Math.max(0, paymentTotal() - saleTotal()) : 0;
}

function paymentPanelHtml() {
  return `
    <div class="payment-box">
      <div class="section-title">
        <strong>Pagamentos</strong>
        <button class="btn" onclick="addPaymentRow()">Adicionar</button>
      </div>
      ${paymentRowsHtml()}
      <div class="totals compact">
        <div><span>Recebido</span><strong>${money.format(paymentTotal())}</strong></div>
        <div><span>Restante</span><strong>${money.format(Math.max(0, saleTotal() - paymentTotal()))}</strong></div>
        <div><span>Troco</span><strong>${money.format(paymentChange())}</strong></div>
      </div>
    </div>
  `;
}

function paymentRowsHtml() {
  return `<div class="payment-rows">${paymentRows
    .map(
      (payment, index) => `
      <div class="payment-row">
        <select id="payment-method-${index}" onchange="updatePayment(${index}, 'method', this.value, this.id)">
          ${paymentMethods().map((method) => `<option ${payment.method === method ? "selected" : ""}>${method}</option>`).join("")}
        </select>
        <input id="payment-amount-${index}" type="number" min="0" step="0.01" value="${payment.amount}" placeholder="Valor" oninput="updatePayment(${index}, 'amount', this.value, this.id)" />
        <input id="payment-details-${index}" value="${payment.details || ""}" placeholder="Detalhe" oninput="updatePayment(${index}, 'details', this.value, this.id)" />
        <input id="payment-installments-${index}" type="number" min="1" max="24" value="${payment.installments || ""}" placeholder="Parc." oninput="updatePayment(${index}, 'installments', this.value, this.id)" />
        <button class="btn danger" onclick="removePaymentRow(${index})" ${paymentRows.length === 1 ? "disabled" : ""}>Remover</button>
      </div>`,
    )
    .join("")}</div>`;
}

function normalizedPayments(total = saleTotal()) {
  const activeRows = paymentRows.map((payment) => ({
    method: payment.method || "Pix",
    amount: Number(payment.amount || 0),
    details: payment.details || "",
    installments: payment.installments ? Number(payment.installments) : null,
  }));
  const rows = activeRows
    .map((payment) => ({
      method: payment.method || "Pix",
      amount: Number(payment.amount || 0),
      details: payment.details || "",
      installments: payment.installments ? Number(payment.installments) : null,
    }))
    .filter((payment) => payment.amount > 0);
  const selectedPayment = activeRows[0] || { method: valueOf("payment") || "Pix", details: "", installments: null };
  return rows.length ? rows : [{ method: selectedPayment.method || "Pix", amount: total, details: selectedPayment.details || "", installments: selectedPayment.installments || null }];
}

function paymentsLabel(payments) {
  return payments.map((payment) => payment.method).join(" + ") || "Pix";
}

function salePayments(sale) {
  return sale.payments?.length ? sale.payments : [{ method: sale.payment || "Pix", amount: Number(sale.total || 0), details: "", installments: null }];
}

function salePaidTotal(sale) {
  return salePayments(sale).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function saleChange(sale) {
  const payments = salePayments(sale);
  const hasCash = payments.some((payment) => payment.method === "Dinheiro");
  return hasCash ? Math.max(0, salePaidTotal(sale) - Number(sale.total || 0)) : 0;
}

async function login(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  if (apiOnline) {
    try {
      const user = await apiSend("/login", { userId: data.get("userId"), pin: data.get("pin") });
      await startSession(user);
    } catch (error) {
      alert(error.message);
    }
    return;
  }
  const user = state.users.find((u) => u.id === data.get("userId"));
  if (!user || !user.active || user.pin !== data.get("pin")) {
    alert("PIN inválido.");
    return;
  }
  startSession(user);
}

function logout() {
  cart = [];
  session = null;
  localStorage.removeItem("griffy-session");
  render();
}

function go(next) {
  view = next;
  render();
}

function openModal(type, id = null) {
  modal = { type, id };
  render();
  setTimeout(() => document.querySelector(".modal input, .modal select, .modal textarea")?.focus(), 0);
}

function closeModal(event) {
  if (event.target === event.currentTarget) {
    modal = null;
    render();
  }
}

function addCart(id) {
  const product = state.products.find((p) => p.id === id);
  const item = cart.find((x) => x.id === id);
  const currentQty = item ? item.qty : 0;
  if (!product || currentQty >= product.stock) return;
  if (item) item.qty += 1;
  else cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  render();
}

function addBySearch() {
  const query = valueOf("productSearch").trim().toLowerCase();
  if (!query) return;
  const product =
    state.products.find((p) => String(p.code || "").toLowerCase() === query) ||
    state.products.find((p) => p.name.toLowerCase().includes(query));
  if (!product) {
    alert("Produto nao encontrado.");
    return;
  }
  addCart(product.id);
}

async function pullMobileScan() {
  if (!apiOnline) {
    alert("Scanner mobile precisa da API conectada.");
    return;
  }
  try {
    const scan = await apiSend("/barcode-scans/consume", {});
    if (!scan.code) {
      alert("Nenhum codigo enviado pelo celular.");
      return;
    }
    ui.productSearch = scan.code;
    const product = state.products.find((p) => String(p.code || "").toLowerCase() === String(scan.code).toLowerCase());
    if (!product) {
      alert(`Codigo ${scan.code} recebido, mas produto nao encontrado.`);
      render();
      return;
    }
    addCart(product.id);
    alert(`Produto adicionado pelo scanner: ${product.name}`);
  } catch (error) {
    alert(error.message);
  }
}

function setCartQty(id, qtyValue) {
  const item = cart.find((x) => x.id === id);
  const product = state.products.find((p) => p.id === id);
  if (!item || !product) return;
  const qty = Math.max(1, Math.min(Number(qtyValue || 1), Number(product.stock || 1)));
  item.qty = qty;
  render();
}

function addPaymentRow() {
  paymentRows.push({ method: "Pix", amount: "", details: "", installments: "" });
  render();
}

function removePaymentRow(index) {
  paymentRows.splice(index, 1);
  if (!paymentRows.length) paymentRows = [{ method: "Pix", amount: "", details: "", installments: "" }];
  render();
}

function updatePayment(index, field, value, elementId = null) {
  paymentRows[index] = { ...paymentRows[index], [field]: value };
  render();
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      if (typeof element.setSelectionRange === "function") {
        const end = String(value).length;
        try {
          element.setSelectionRange(end, end);
        } catch (_error) {
          // Numeric inputs can reject selection ranges.
        }
      }
    }
  }
}

function decCart(id) {
  const item = cart.find((x) => x.id === id);
  if (!item) return;
  item.qty -= 1;
  if (item.qty <= 0) cart = cart.filter((x) => x.id !== id);
  render();
}

function clearCart() {
  cart = [];
  render();
}

async function checkout() {
  if (!state.cash.open) {
    alert("Abra um turno de caixa antes de finalizar vendas.");
    return;
  }
  const discount = Number(valueOf("discount") || 0);
  const total = Math.max(0, cartTotal() - discount);
  const payments = normalizedPayments(total);
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  if (paid + 0.001 < total) {
    alert(`Pagamento incompleto. Falta ${money.format(total - paid)}.`);
    return;
  }
  const salePayload = {
    customer: valueOf("saleCustomer"),
    payment: paymentsLabel(payments),
    payments,
    operator: session.name,
    seller: selectedSellerName(),
    items: structuredClone(cart),
    discount,
    total,
  };

  if (apiOnline) {
    try {
      const savedSale = await apiSend("/sales", salePayload);
      const sale = { ...savedSale, items: salePayload.items, payments };
      state.sales = [sale, ...(state.sales || [])];
      state.products = (state.products || []).map((product) => {
        const soldItem = salePayload.items.find((item) => item.id === product.id);
        return soldItem ? { ...product, stock: Math.max(0, Number(product.stock || 0) - Number(soldItem.qty || 0)) } : product;
      });
      state.cash.movements = [
        { id: uid("m"), shiftId: state.cash.shift?.id, saleId: sale.id, type: "Entrada", description: `Venda ${sale.id}`, amount: total, date: state.cash.shift?.businessDate || businessDate(), operator: session.name },
        ...(state.cash.movements || []),
      ];
      cart = [];
      ui.discount = 0;
      paymentRows = [{ method: "Pix", amount: "", details: "", installments: "" }];
      modal = simpleNoteEnabled() ? { type: "receipt", id: savedSale.id } : null;
      notify("Venda finalizada e salva no MySQL.", "success");
      render();
      return;
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  cart.forEach((item) => {
    const product = state.products.find((p) => p.id === item.id);
    if (product) product.stock -= item.qty;
  });
  const sale = {
    id: uid("sale"),
    date: state.cash.shift?.businessDate || businessDate(),
    status: "active",
    shiftId: state.cash.shift?.id,
    ...salePayload,
  };
  state.sales.push(sale);
  state.cash.movements.push({ id: uid("m"), type: "Entrada", description: `Venda ${sale.id}`, amount: total, date: sale.date });
  cart = [];
  ui.discount = 0;
  paymentRows = [{ method: "Pix", amount: "", details: "", installments: "" }];
  saveState();
  alert("Venda finalizada.");
  modal = simpleNoteEnabled() ? { type: "receipt", id: sale.id } : null;
  render();
}

async function saveProduct(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (apiOnline) {
    await runApiSave(modal.id ? `/products/${modal.id}` : "/products", data, modal.id ? "PUT" : "POST");
    return;
  }
  const payload = {
    id: modal.id || uid("p"),
    code: data.code,
    name: data.name,
    category: data.category,
    subcategory: data.subcategory,
    supplier: data.supplier,
    unit: data.unit,
    stock: Number(data.stock),
    min: Number(data.min),
    cost: Number(data.cost),
    price: Number(data.price),
    wholesalePrice: Number(data.wholesalePrice || 0),
    lot: data.lot,
    validity: data.validity,
  };
  if (modal.id) state.products = state.products.map((p) => (p.id === modal.id ? payload : p));
  else state.products.push(payload);
  finishSave();
}

async function deleteProduct(id) {
  if (!canDeleteProducts()) {
    alert("Apenas administrador ou gerente podem excluir produtos.");
    return;
  }
  const product = state.products.find((p) => p.id === id);
  if (!product) return;
  if (!confirm(`Excluir o produto ${product.name}? Esta acao nao apaga historico de vendas ja realizadas.`)) return;
  try {
    if (apiOnline) {
      await apiSend(`/products/${id}`, { operator: session.name, operatorRole: session.role }, "DELETE");
      state.products = state.products.filter((p) => p.id !== id);
    } else {
      state.products = state.products.filter((p) => p.id !== id);
      saveState();
    }
    notify("Produto excluido com sucesso.", "success");
    render();
  } catch (error) {
    notify(error.message, inferNotificationType(error.message));
  }
}

async function resetProducts() {
  if (!canDeleteProducts()) {
    alert("Apenas administrador ou gerente podem zerar produtos.");
    return;
  }
  const first = confirm("Tem certeza que deseja remover todos os produtos cadastrados? Esta acao deixa o estoque de venda vazio.");
  if (!first) return;
  const confirmation = prompt('Digite exatamente "ZERAR PRODUTOS" para confirmar.');
  if (confirmation !== "ZERAR PRODUTOS") {
    alert("Confirmacao cancelada.");
    return;
  }
  try {
    if (apiOnline) {
      await apiSend("/products/reset", { operator: session.name, operatorRole: session.role, confirmation });
      state.products = [];
    } else {
      state.products = [];
      saveState();
    }
    cart = [];
    alert("Produtos zerados. Cadastre o estoque novamente com codigos e informacoes corretas.");
    render();
  } catch (error) {
    notify(error.message, inferNotificationType(error.message));
  }
}

async function saveRepairPart(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const payload = {
    id: modal.id || uid("part"),
    code: data.code,
    name: data.name,
    category: data.category,
    compatibleModels: data.compatibleModels,
    supplier: data.supplier,
    unit: data.unit,
    stock: Number(data.stock || 0),
    min: Number(data.min || 0),
    cost: Number(data.cost || 0),
    location: data.location,
    notes: data.notes,
    active: true,
  };
  if (apiOnline) {
    await runApiSave(modal.id ? `/repair-parts/${modal.id}` : "/repair-parts", payload, modal.id ? "PUT" : "POST");
    return;
  }
  if (modal.id) state.repairParts = (state.repairParts || []).map((part) => (part.id === modal.id ? payload : part));
  else state.repairParts = [...(state.repairParts || []), payload];
  finishSave();
}

async function saveRepairPartMovement(event) {
  event.preventDefault();
  const part = (state.repairParts || []).find((item) => item.id === modal.id);
  if (!part) return;
  const data = Object.fromEntries(new FormData(event.target));
  const payload = { ...data, operator: session.name, qty: Number(data.qty || 1), unitCost: Number(data.unitCost || part.cost || 0) };
  if (apiOnline) {
    await runApiSave(`/repair-parts/${modal.id}/movements`, payload);
    return;
  }
  const delta = payload.type === "Entrada" ? payload.qty : -payload.qty;
  if (Number(part.stock || 0) + delta < 0) {
    alert("Estoque insuficiente para esta peca.");
    return;
  }
  part.stock = Number(part.stock || 0) + delta;
  state.repairPartMovements = [
    { id: uid("rpm"), partId: part.id, partName: part.name, serviceId: data.serviceId, type: data.type, qty: payload.qty, unitCost: payload.unitCost, description: data.description, operator: session.name, date: new Date().toISOString() },
    ...(state.repairPartMovements || []),
  ];
  finishSave();
}

async function saveStock(event) {
  event.preventDefault();
  const product = state.products.find((p) => p.id === modal.id);
  const data = Object.fromEntries(new FormData(event.target));
  if (apiOnline) {
    await runApiSave(`/products/${modal.id}/stock`, { ...data, operator: session.name });
    return;
  }
  const qty = Number(data.qty);
  product.stock += data.type === "Entrada" ? qty : -qty;
  if (product.stock < 0) product.stock = 0;
  state.cash.movements.push({
    id: uid("m"),
    type: data.type === "Entrada" ? "Saída" : "Entrada",
    description: `${data.description || "Movimento de estoque"} · ${product.name}`,
    amount: 0,
    date: today(),
  });
  finishSave();
}

async function saveService(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (apiOnline) {
    await runApiSave(modal.id ? `/services/${modal.id}` : "/services", { ...data, tech: data.tech || session.name }, modal.id ? "PUT" : "POST");
    return;
  }
  const payload = {
    id: modal.id || uid("s"),
    customer: data.customer,
    phone: data.phone,
    customerPhone: data.customerPhone,
    customerDocument: data.customerDocument,
    brand: data.brand,
    imei: data.imei,
    passwordInfo: data.passwordInfo,
    accessories: data.accessories,
    condition: data.condition,
    issue: data.issue,
    status: data.status,
    estimate: Number(data.estimate),
    laborCost: Number(data.laborCost || 0),
    partsCost: Number(data.partsCost || 0),
    priority: data.priority,
    warrantyDays: Number(data.warrantyDays || 90),
    diagnosis: data.diagnosis,
    solution: data.solution,
    parts: data.parts,
    notes: data.notes,
    openedAt: today(),
    tech: data.tech || session.name,
    events: [{ date: new Date().toISOString(), operator: session.name, type: modal.id ? "Atualizacao" : "Criacao", description: "OS salva" }],
  };
  if (modal.id) state.services = state.services.map((service) => (service.id === modal.id ? { ...service, ...payload, openedAt: service.openedAt, events: [...(service.events || []), ...payload.events] } : service));
  else state.services.push(payload);
  if (data.customer && !state.customers.some((c) => c.name.toLowerCase() === data.customer.toLowerCase())) {
    state.customers.push({ id: uid("c"), name: data.customer, phone: data.customerPhone || "", document: data.customerDocument || "" });
  }
  finishSave();
}

async function savePurchaseDocument(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const payload = { ...data, operator: session.name, purchaseValue: Number(data.purchaseValue || 0), quantity: Number(data.quantity || 1), warrantyMonths: Number(data.warrantyMonths || 6) };
  if (apiOnline) {
    await runApiSave(modal.id ? `/documents/${modal.id}` : "/documents", payload, modal.id ? "PUT" : "POST");
    return;
  }
  const document = { id: modal.id || uid("doc"), ...payload };
  if (modal.id) state.documents = (state.documents || []).map((item) => (item.id === modal.id ? document : item));
  else state.documents = [document, ...(state.documents || [])];
  if (data.customerName && !state.customers.some((c) => c.name.toLowerCase() === data.customerName.toLowerCase())) {
    state.customers.push({ id: uid("c"), name: data.customerName, phone: data.customerPhone || "", document: data.customerDocument || "" });
  }
  finishSave();
}

async function saveCustomer(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (apiOnline) {
    await runApiSave("/customers", data);
    return;
  }
  state.customers.push({ id: uid("c"), name: data.name, phone: data.phone, document: data.document });
  finishSave();
}

async function saveOperator(event) {
  event.preventDefault();
  if (session?.role !== "admin") {
    alert("Somente o administrador pode alterar operadores.");
    return;
  }
  const data = Object.fromEntries(new FormData(event.target));
  if (!["admin", "gerente", "vendedor", "tecnico"].includes(data.role)) {
    alert("Cargo invalido.");
    return;
  }
  if (apiOnline) {
    await runApiSave(modal.id ? `/users/${modal.id}` : "/users", data, modal.id ? "PUT" : "POST");
    return;
  }
  const payload = { id: modal.id || uid("u"), name: data.name, role: data.role, pin: data.pin, active: data.active !== "false" };
  if (modal.id) state.users = state.users.map((user) => (user.id === modal.id ? payload : user));
  else state.users.push(payload);
  finishSave();
}

async function deleteOperator(id) {
  if (session?.role !== "admin") {
    alert("Somente o administrador pode excluir operadores.");
    return;
  }
  if (id === session.id) {
    alert("Voce nao pode excluir o operador logado.");
    return;
  }
  const operator = state.users.find((user) => user.id === id);
  if (!operator) return;
  if (!confirm(`Excluir/bloquear o operador ${operator.name}?`)) return;
  if (apiOnline) {
    try {
      await apiSend(`/users/${id}`, {}, "DELETE");
      state.users = state.users.map((user) => (user.id === id ? { ...user, active: false } : user));
      render();
    } catch (error) {
      alert(error.message);
    }
    return;
  }
  const admins = state.users.filter((user) => user.role === "admin" && user.active);
  if (operator.role === "admin" && admins.length <= 1) {
    alert("Nao e possivel excluir o ultimo administrador ativo.");
    return;
  }
  operator.active = false;
  saveState();
  render();
}

async function savePermissions() {
  const roles = ["gerente", "vendedor", "tecnico"];
  const next = { ...state.permissions, admin: defaultPermissions.admin };
  for (const role of roles) {
    next[role] = Array.from(document.querySelectorAll(`input[data-role="${role}"]:checked`)).map((input) => input.dataset.module);
  }
  const nextSettings = { ...(state.settings || {}), "sales.cancel_operator_ids": "[]", "sales.cancel_by_operator": "false" };

  if (apiOnline) {
    try {
      for (const role of roles) {
        await apiSend("/permissions", { role, modules: next[role] });
      }
      await apiSend("/settings", nextSettings);
      await reloadState();
      alert("Permissoes salvas.");
      render();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  state.permissions = next;
  state.settings = nextSettings;
  saveState();
  alert("Permissoes salvas no modo demo.");
  render();
}

async function saveSettings(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (apiOnline) {
    await runApiSave("/settings", data);
    return;
  }
  state.settings = { ...(state.settings || {}), ...data };
  saveState();
  alert("Configuracoes salvas.");
  render();
}

async function downloadBackup() {
  try {
    const payload = apiOnline ? await api("/backup") : { exportedAt: new Date().toISOString(), data: state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `griffy-backup-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
}

async function cancelSale(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (apiOnline) {
    try {
      await apiSend(`/sales/${modal.id}/cancel`, { ...data, operator: session.name, operatorId: session.id, operatorRole: session.role });
      modal = null;
      await reloadState();
      alert("Venda cancelada.");
      render();
    } catch (error) {
      alert(error.message);
    }
    return;
  }
  const sale = state.sales.find((s) => s.id === modal.id);
  if (sale) {
    sale.status = "canceled";
    sale.cancelReason = data.reason;
  }
  finishSave();
}

async function saveMovement(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (apiOnline) {
    await runApiSave("/cash/movements", { ...data, operator: session.name });
    return;
  }
  state.cash.movements.push({ id: uid("m"), type: data.type, description: data.description, amount: Number(data.amount), date: state.cash.shift?.businessDate || businessDate() });
  finishSave();
}

async function openShift(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (apiOnline) {
    await runApiSave("/cash/open", { ...data, operator: session.name, businessDate: businessDate() });
    return;
  }
  state.cash.open = true;
  state.cash.shift = { id: uid("shift"), name: data.shiftName, operator: session.name, openingAmount: Number(data.openingAmount), businessDate: businessDate(), openedAt: new Date().toISOString(), status: "open" };
  state.cash.operator = session.name;
  state.cash.openingAmount = Number(data.openingAmount);
  state.cash.movements = [];
  finishSave();
}

async function closeShift(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const report = buildCashCloseReport(data);
  if (apiOnline) {
    try {
      const result = await apiSend("/cash/close", data);
      lastCloseReport = { ...report, ...result, closedAt: new Date().toISOString() };
      const closedShift = {
        ...(state.cash.shift || {}),
        status: "closed",
        closingAmount: Number(result.closingAmount || data.closingAmount || 0),
        expectedAmount: Number(result.expectedAmount || 0),
        differenceAmount: Number(result.differenceAmount || 0),
        closedAt: lastCloseReport.closedAt,
        notes: data.notes || "",
      };
      state.cash.shifts = [closedShift, ...(state.cash.shifts || []).filter((shift) => shift.id !== closedShift.id)].slice(0, 20);
      state.cash.open = false;
      state.cash.shift = null;
      state.cash.operator = null;
      state.cash.openingAmount = 0;
      state.cash.movements = [];
      modal = { type: "cashCloseReport" };
      notify(`Turno fechado. Diferenca: ${money.format(result.differenceAmount)}`, "success");
      render();
      return;
      alert(`Turno fechado. Diferença: ${money.format(result.differenceAmount)}`);
      render();
    } catch (error) {
      alert(error.message);
    }
    return;
  }
  const closing = Number(data.closingAmount || 0);
  const difference = closing - cashBalance();
  state.cash.shifts.unshift({ ...state.cash.shift, status: "closed", closingAmount: closing, expectedAmount: cashBalance(), differenceAmount: difference, closedAt: new Date().toISOString(), notes: data.notes });
  lastCloseReport = { ...report, closingAmount: closing, expectedAmount: cashBalance(), differenceAmount: difference, closedAt: new Date().toISOString() };
  state.cash.open = false;
  state.cash.shift = null;
  state.cash.operator = null;
  state.cash.openingAmount = 0;
  state.cash.movements = [];
  saveState();
  modal = { type: "cashCloseReport" };
  render();
  return;
  alert(`Turno fechado. Diferença: ${money.format(difference)}`);
}

async function changeServiceStatus(id, status) {
  if (apiOnline) {
    await apiSend(`/services/${id}/status`, { status, operator: session?.name || "" }, "PATCH");
    await reloadState();
    render();
    return;
  }
  const service = state.services.find((s) => s.id === id);
  if (service) {
    service.status = status;
    service.events = service.events || [];
    service.events.push({ date: new Date().toISOString(), operator: session?.name || "", type: "Status", description: `Status alterado para ${status}` });
  }
  saveState();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `griffy-store-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportMonthlyReport() {
  const month = reportMonth();
  const sales = salesForMonth(month);
  const shifts = closedCashShifts(month);
  const payload = {
    exportedAt: new Date().toISOString(),
    month,
    monthLabel: monthLabel(month),
    summary: {
      salesCount: sales.length,
      salesTotal: sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
      discounts: sales.reduce((sum, sale) => sum + Number(sale.discount || 0), 0),
      closedShifts: shifts.length,
      expectedTotal: shifts.reduce((sum, shift) => sum + Number(cashReportFromShift(shift).expectedAmount || 0), 0),
      closingTotal: shifts.reduce((sum, shift) => sum + Number(cashReportFromShift(shift).closingAmount || 0), 0),
      differenceTotal: shifts.reduce((sum, shift) => sum + Number(cashReportFromShift(shift).differenceAmount || 0), 0),
    },
    payments: paymentSummary(sales),
    sellers: sellerRanking(sales),
    shifts: shifts.map((shift) => ({ ...shift, report: cashReportFromShift(shift) })),
    sales,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `griffy-relatorio-${month}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function upsertById(list = [], item, prepend = false) {
  const source = Array.isArray(list) ? list : [];
  const index = source.findIndex((entry) => entry.id === item.id);
  if (index >= 0) return source.map((entry, current) => (current === index ? { ...entry, ...item } : entry));
  return prepend ? [item, ...source] : [...source, item];
}

function applyApiSave(path, payload, result, method = "POST") {
  const cleanPath = path.split("?")[0];
  if (/^\/products\/[^/]+\/stock$/.test(cleanPath)) {
    const productId = cleanPath.split("/")[2];
    const qty = Number(payload.qty || 0);
    const delta = payload.type === "Entrada" ? qty : -qty;
    state.products = (state.products || []).map((product) =>
      product.id === productId ? { ...product, stock: Math.max(0, Number(product.stock || 0) + delta) } : product,
    );
    return true;
  }
  if (cleanPath === "/products" || /^\/products\/[^/]+$/.test(cleanPath)) {
    state.products = upsertById(state.products, { ...result, stock: Number(result.stock || 0), min: Number(result.min || 0), cost: Number(result.cost || 0), price: Number(result.price || 0), wholesalePrice: Number(result.wholesalePrice || 0) }, method === "POST");
    return true;
  }
  if (/^\/repair-parts\/[^/]+\/movements$/.test(cleanPath)) {
    const partId = cleanPath.split("/")[2];
    state.repairParts = (state.repairParts || []).map((part) => (part.id === partId ? { ...part, stock: Number(result.stock || part.stock || 0) } : part));
    state.repairPartMovements = [{ ...result, partId, partName: state.repairParts.find((part) => part.id === partId)?.name || "", date: new Date().toISOString() }, ...(state.repairPartMovements || [])].slice(0, 100);
    return true;
  }
  if (cleanPath === "/repair-parts" || /^\/repair-parts\/[^/]+$/.test(cleanPath)) {
    state.repairParts = upsertById(state.repairParts, { ...result, stock: Number(result.stock || 0), min: Number(result.min || 0), cost: Number(result.cost || 0), active: result.active !== false }, method === "POST");
    return true;
  }
  if (cleanPath === "/services" || /^\/services\/[^/]+$/.test(cleanPath)) {
    const existing = (state.services || []).find((service) => service.id === result.id);
    state.services = upsertById(state.services, { ...existing, ...result, openedAt: existing?.openedAt || result.openedAt || businessDate(), events: existing?.events || [] }, method === "POST");
    return true;
  }
  if (cleanPath === "/documents" || /^\/documents\/[^/]+$/.test(cleanPath)) {
    state.documents = upsertById(state.documents, result, true);
    return true;
  }
  if (cleanPath === "/customers") {
    state.customers = upsertById(state.customers, result);
    return true;
  }
  if (cleanPath === "/users" || /^\/users\/[^/]+$/.test(cleanPath)) {
    state.users = upsertById(state.users, { ...result, active: result.active !== false }, method === "POST");
    return true;
  }
  if (cleanPath === "/settings") {
    state.settings = { ...(state.settings || {}), ...payload };
    return true;
  }
  if (cleanPath === "/cash/open") {
    state.cash.open = true;
    state.cash.shift = {
      id: result.id,
      name: result.shiftName || payload.shiftName || "Turno",
      operator: result.operator || payload.operator || session?.name || "",
      openingAmount: Number(result.openingAmount || payload.openingAmount || 0),
      businessDate: result.businessDate || payload.businessDate || businessDate(),
      openedAt: result.openedAt || new Date().toISOString(),
      status: "open",
    };
    state.cash.operator = state.cash.shift.operator;
    state.cash.openingAmount = state.cash.shift.openingAmount;
    state.cash.movements = [];
    return true;
  }
  if (cleanPath === "/cash/movements") {
    state.cash.movements = [
      { ...result, shiftId: state.cash.shift?.id, amount: Number(result.amount || payload.amount || 0), date: state.cash.shift?.businessDate || businessDate() },
      ...(state.cash.movements || []),
    ];
    return true;
  }
  return false;
}

async function issueFiscal(id) {
  if (!fiscalEnabled()) {
    alert("A nota simples esta ativa. Ative o fiscal nas configuracoes para emitir NF.");
    return;
  }
  if (!apiOnline) {
    alert("Emissao fiscal depende do app desktop conectado ao MySQL.");
    return;
  }
  try {
    const result = await apiSend(`/sales/${id}/fiscal`, {});
    alert(result.message || `Status fiscal: ${result.status}`);
  } catch (error) {
    alert(error.message);
  }
}

function finishSave() {
  modal = null;
  saveState();
  notify("Operacao salva com sucesso.", "success");
  render();
}

function successMessageForPath(path, method = "POST") {
  if (path.includes("/stock")) return "Estoque atualizado com sucesso.";
  if (path.includes("/repair-parts") && path.includes("/movements")) return "Movimento de peca registrado.";
  if (path.includes("/repair-parts")) return method === "PUT" ? "Peca atualizada com sucesso." : "Peca cadastrada com sucesso.";
  if (path.includes("/products")) return method === "PUT" ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.";
  if (path.includes("/services")) return method === "PUT" ? "Ordem de servico atualizada." : "Ordem de servico cadastrada.";
  if (path.includes("/documents")) return method === "PUT" ? "Documento atualizado com sucesso." : "Documento cadastrado com sucesso.";
  if (path.includes("/customers")) return "Cliente salvo com sucesso.";
  if (path.includes("/users")) return method === "PUT" ? "Operador atualizado com sucesso." : "Operador cadastrado com sucesso.";
  if (path.includes("/cash/movements")) return "Movimento de caixa registrado.";
  if (path.includes("/cash/open")) return "Caixa aberto com sucesso.";
  if (path.includes("/settings")) return "Configuracoes salvas.";
  return "Operacao concluida com sucesso.";
}

async function runApiSave(path, payload, method = "POST") {
  try {
    const result = await apiSend(path, payload, method);
    modal = null;
    if (!applyApiSave(path, payload, result, method)) await reloadState();
    notify(successMessageForPath(path, method), "success");
    render();
  } catch (error) {
    notify(error.message, inferNotificationType(error.message));
  }
}

function render() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    document.getElementById("app").innerHTML = app();
    const tasks = afterRenderTasks;
    afterRenderTasks = [];
    tasks.forEach((task) => task());
  });
}

function afterRender(task) {
  afterRenderTasks.push(task);
}

boot();
