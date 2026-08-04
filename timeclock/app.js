const apiBase = "/api";
const tokenKey = "griffy-timeclock-token";
const moneylessDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

let users = [];
let session = JSON.parse(localStorage.getItem("griffy-timeclock-user") || "null");
let token = localStorage.getItem(tokenKey) || "";
let me = null;
let adminSummary = null;
let statusText = "";
let evidenceText = "";

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
  statusText = "Coletando selfie e localizacao...";
  render();
  try {
    const evidence = await collectEvidence();
    await api("/timeclock/punch", { method: "POST", body: JSON.stringify({ type, source: "web", ...evidence }) });
    statusText = `${type} registrado.`;
    evidenceText = "Selfie e localizacao salvas.";
    await loadMe();
  } catch (error) {
    statusText = error.message;
  }
  render();
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este celular nao liberou GPS no navegador."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

async function captureSelfie() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera indisponivel neste navegador.");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 450));
    const canvas = document.createElement("canvas");
    const width = 420;
    const ratio = video.videoHeight / Math.max(1, video.videoWidth);
    canvas.width = width;
    canvas.height = Math.round(width * ratio);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function collectEvidence() {
  const [position, photoData] = await Promise.all([getPosition(), captureSelfie()]);
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    photoData,
    deviceInfo: navigator.userAgent,
  };
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
      <button class="primary" type="submit">Entrar</button>
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
      <div class="aside-brand">
        <img src="/assets/logoretangular-enhanced.png" alt="Griffy Store" />
      </div>
      <div class="user-card">
        <strong>${session.name}</strong>
        <span>${roleName(session.role)}</span>
      </div>
      <button class="ghost" type="button" onclick="logout(); render()">Sair</button>
    </aside>
    <main>
      <header>
        <div>
          <h1>Meu ponto</h1>
          <p>${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>
        ${canAdmin ? `<button class="secondary" type="button" onclick="loadAdminSummary()">Painel admin</button>` : ""}
      </header>
      <div class="actions">
        ${["Entrada", "Intervalo inicio", "Intervalo fim", "Saida"].map((type) => `<button class="punch-action" type="button" onclick="punch('${type}')"><span>${type}</span></button>`).join("")}
      </div>
      <div class="notice">
        Ao bater ponto, o sistema registra selfie, GPS, aparelho e IP para validacao administrativa.
      </div>
      ${statusText ? `<div class="notice">${statusText}</div>` : ""}
      ${evidenceText ? `<div class="notice ok">${evidenceText}</div>` : ""}
      <div class="grid">
        <section class="panel">
          <h2>Ultimas batidas</h2>
          ${entries.length ? entries.slice(0, 12).map(entryRow).join("") : `<div class="empty">Nenhuma batida registrada.</div>`}
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

function entryRow(entry) {
  return `<div class="entry-card">
    ${entry.photoData ? `<img src="${entry.photoData}" alt="Selfie do ponto" />` : ""}
    <div>
      <strong>${entry.type}</strong>
      <span>${moneylessDate.format(new Date(entry.at))}</span>
      <small>${entry.locationStatus || "Sem local"}${entry.distanceMeters !== null && entry.distanceMeters !== undefined ? ` - ${entry.distanceMeters}m` : ""}</small>
    </div>
  </div>`;
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
    <div class="table-wrap">
      <table>
        <thead><tr><th>Funcionario</th><th>Data</th><th>Entrada</th><th>Saida</th><th>Atraso</th><th>Local</th><th>Foto</th></tr></thead>
        <tbody>
          ${rows.map((row) => {
          const firstEntry = (adminSummary.entries || []).find((entry) => entry.userId === row.userId && String(entry.at).slice(0, 10) === row.date && entry.type === "Entrada");
          return `<tr>
          <td>${row.userName}</td>
          <td>${row.date}</td>
          <td>${row.firstIn ? new Date(row.firstIn).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
          <td>${row.lastOut ? new Date(row.lastOut).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
          <td>${row.lateMinutes || 0}</td>
          <td>${firstEntry?.locationStatus || "-"}${firstEntry?.distanceMeters ? ` (${firstEntry.distanceMeters}m)` : ""}</td>
          <td>${firstEntry?.photoData ? `<img class="thumb" src="${firstEntry.photoData}" alt="Selfie" />` : "-"}</td>
        </tr>`;
        }).join("") || `<tr><td colspan="7">Sem registros neste mes.</td></tr>`}
        </tbody>
      </table>
    </div>
    <form class="settings-grid" onsubmit="saveTimeSettings(event)">
      <h3>Local permitido</h3>
      <label>Latitude<input name="storeLatitude" value="${adminSummary.settings?.["timeclock.store_latitude"] || ""}" placeholder="-22.0000000" /></label>
      <label>Longitude<input name="storeLongitude" value="${adminSummary.settings?.["timeclock.store_longitude"] || ""}" placeholder="-43.0000000" /></label>
      <label>Raio permitido em metros<input name="allowedRadiusMeters" type="number" min="10" value="${adminSummary.settings?.["timeclock.allowed_radius_meters"] || "150"}" /></label>
      <button type="button" onclick="fillCurrentLocation()">Usar local atual</button>
      <button type="submit">Salvar local</button>
    </form>
  </section>`;
}

async function fillCurrentLocation() {
  try {
    const position = await getPosition();
    document.querySelector('input[name="storeLatitude"]').value = position.coords.latitude.toFixed(7);
    document.querySelector('input[name="storeLongitude"]').value = position.coords.longitude.toFixed(7);
  } catch (error) {
    statusText = error.message;
    render();
  }
}

async function saveTimeSettings(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/timeclock/admin/settings", { method: "POST", body: JSON.stringify(data) });
    statusText = "Local do ponto salvo.";
    await loadAdminSummary();
  } catch (error) {
    statusText = error.message;
    render();
  }
}

function render() {
  document.getElementById("app").innerHTML = session ? employeeView() : loginView();
}

boot();
