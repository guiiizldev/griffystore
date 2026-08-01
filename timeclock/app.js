const apiBase = "/api";
const tokenKey = "griffy-timeclock-token";
const moneylessDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

let users = [];
let session = JSON.parse(localStorage.getItem("griffy-timeclock-user") || "null");
let token = localStorage.getItem(tokenKey) || "";
let me = null;
let adminSummary = null;
let statusText = "";

function roleName(role) {
  return { admin: "Administrador", gerente: "Gerente", vendedor: "Vendedor", tecnico: "Tecnico" }[role] || role;
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Falha na comunicacao.");
  return body;
}

async function boot() {
  users = await api("/timeclock/users").catch(() => []);
  if (token) await loadMe().catch(logout);
  render();
}

async function login(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const result = await api("/timeclock/login", { method: "POST", body: JSON.stringify(data) });
    token = result.token;
    session = result.user;
    localStorage.setItem(tokenKey, token);
    localStorage.setItem("griffy-timeclock-user", JSON.stringify(session));
    await loadMe();
  } catch (error) {
    statusText = error.message;
  }
  render();
}

function logout() {
  token = "";
  session = null;
  me = null;
  adminSummary = null;
  localStorage.removeItem(tokenKey);
  localStorage.removeItem("griffy-timeclock-user");
}

async function loadMe() {
  me = await api("/timeclock/me");
}

async function punch(type) {
  statusText = "Registrando ponto...";
  render();
  try {
    await api("/timeclock/punch", { method: "POST", body: JSON.stringify({ type, source: "web" }) });
    statusText = `${type} registrado.`;
    await loadMe();
  } catch (error) {
    statusText = error.message;
  }
  render();
}

async function loadAdminSummary() {
  const month = document.getElementById("month")?.value || new Date().toISOString().slice(0, 7);
  statusText = "Carregando resumo...";
  render();
  try {
    adminSummary = await api(`/timeclock/admin/summary?month=${encodeURIComponent(month)}`);
    statusText = "Resumo atualizado.";
  } catch (error) {
    statusText = error.message;
  }
  render();
}

function loginView() {
  return `<section class="login">
    <div class="brand">
      <img src="/assets/logoretangular-enhanced.png" alt="Griffy Store" />
      <h1>Ponto Griffy Store</h1>
      <p>Registro de entrada, intervalo e saida dos funcionarios.</p>
    </div>
    <form class="panel" onsubmit="login(event)">
      <label>Funcionario
        <select name="userId" required>
          ${users.map((user) => `<option value="${user.id}">${user.name} - ${roleName(user.role)}</option>`).join("")}
        </select>
      </label>
      <label>PIN
        <input name="pin" type="password" inputmode="numeric" autocomplete="current-password" required />
      </label>
      <button type="submit">Entrar</button>
      ${statusText ? `<span class="status">${statusText}</span>` : ""}
    </form>
  </section>`;
}

function employeeView() {
  const entries = me?.entries || [];
  const summary = me?.summary || [];
  const canAdmin = ["admin", "gerente"].includes(session?.role);
  return `<section class="shell">
    <aside>
      <img src="/assets/logoretangular-enhanced.png" alt="Griffy Store" />
      <strong>${session.name}</strong>
      <span>${roleName(session.role)}</span>
      <button type="button" onclick="logout(); render()">Sair</button>
    </aside>
    <main>
      <header>
        <div>
          <h1>Meu ponto</h1>
          <p>${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>
        ${canAdmin ? `<button type="button" onclick="loadAdminSummary()">Painel admin</button>` : ""}
      </header>
      <div class="actions">
        ${["Entrada", "Intervalo inicio", "Intervalo fim", "Saida"].map((type) => `<button type="button" onclick="punch('${type}')">${type}</button>`).join("")}
      </div>
      ${statusText ? `<div class="notice">${statusText}</div>` : ""}
      <div class="grid">
        <section class="panel">
          <h2>Ultimas batidas</h2>
          ${entries.length ? entries.slice(0, 12).map((entry) => `<div class="row"><span>${entry.type}</span><strong>${moneylessDate.format(new Date(entry.at))}</strong></div>`).join("") : `<div class="empty">Nenhuma batida registrada.</div>`}
        </section>
        <section class="panel">
          <h2>Pontualidade</h2>
          ${summary.length ? summary.slice(0, 8).map((day) => `<div class="row"><span>${day.date}</span><strong>${day.lateMinutes ? `${day.lateMinutes} min atraso` : "No horario"}</strong></div>`).join("") : `<div class="empty">Sem resumo ainda.</div>`}
        </section>
      </div>
      ${adminSummary ? adminView() : ""}
    </main>
  </section>`;
}

function adminView() {
  const month = adminSummary?.month || new Date().toISOString().slice(0, 7);
  const rows = adminSummary?.summary || [];
  return `<section class="panel admin">
    <div class="admin-head">
      <div>
        <h2>Painel administrativo</h2>
        <p>Resumo mensal de pontualidade por funcionario.</p>
      </div>
      <input id="month" type="month" value="${month}" onchange="loadAdminSummary()" />
    </div>
    <table>
      <thead><tr><th>Funcionario</th><th>Data</th><th>Entrada</th><th>Saida</th><th>Atraso</th><th>Minutos</th></tr></thead>
      <tbody>
        ${rows.map((row) => `<tr>
          <td>${row.userName}</td>
          <td>${row.date}</td>
          <td>${row.firstIn ? new Date(row.firstIn).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
          <td>${row.lastOut ? new Date(row.lastOut).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
          <td>${row.lateMinutes || 0}</td>
          <td>${row.workedMinutes || "-"}</td>
        </tr>`).join("") || `<tr><td colspan="6">Sem registros neste mes.</td></tr>`}
      </tbody>
    </table>
  </section>`;
}

function render() {
  document.getElementById("app").innerHTML = session ? employeeView() : loginView();
}

boot();
