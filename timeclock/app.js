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
let currentTab = "punch";
let selectedEmployee = "";
let selectedMonth = localMonth();
let adminLoading = false;

function localMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function dayLabel(date) {
  return String(date).split("-").reverse().join("/");
}

function duration(minutes) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
}

function clock(value) {
  return value ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
}

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
  currentTab = "punch";
  selectedEmployee = "";
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

async function updateFaceProfile() {
  statusText = "Abrindo camera para atualizar facial...";
  render();
  try {
    const photoData = await captureSelfie();
    const result = await api("/timeclock/profile/face", { method: "POST", body: JSON.stringify({ photoData }) });
    me = {
      ...(me || {}),
      profile: {
        ...(me?.profile || {}),
        facePhotoData: result.facePhotoData,
        faceUpdatedAt: result.faceUpdatedAt,
      },
    };
    statusText = "Facial atualizado com sucesso.";
    evidenceText = "Nova selfie de referencia salva na conta.";
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
  return guidedSelfieCapture(stream);
}

function guidedSelfieCapture(stream) {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement("div");
    overlay.className = "selfie-overlay";
    overlay.innerHTML = `
      <section class="selfie-dialog">
        <div class="selfie-head">
          <h2>Centralize o rosto</h2>
          <p>Use boa luz, olhe para a camera e mantenha o rosto dentro da moldura.</p>
        </div>
        <div class="selfie-frame">
          <video class="selfie-video" autoplay playsinline muted></video>
          <span class="face-guide" aria-hidden="true"></span>
        </div>
        <div class="selfie-actions">
          <button class="ghost" type="button" data-action="cancel">Cancelar</button>
          <button class="primary" type="button" data-action="capture">Usar foto</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);

    const video = overlay.querySelector("video");
    video.srcObject = stream;

    const cleanup = () => {
      stream.getTracks().forEach((track) => track.stop());
      overlay.remove();
    };

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      cleanup();
      reject(new Error("Captura cancelada."));
    });

    overlay.querySelector('[data-action="capture"]').addEventListener("click", async () => {
      try {
        if (!video.videoWidth || !video.videoHeight) {
          await new Promise((resolveReady) => setTimeout(resolveReady, 300));
        }
        const canvas = document.createElement("canvas");
        canvas.width = 720;
        canvas.height = 900;
        const context = canvas.getContext("2d");
        const sourceRatio = video.videoWidth / Math.max(1, video.videoHeight);
        const targetRatio = canvas.width / canvas.height;
        let sx = 0;
        let sy = 0;
        let sw = video.videoWidth;
        let sh = video.videoHeight;
        if (sourceRatio > targetRatio) {
          sw = video.videoHeight * targetRatio;
          sx = (video.videoWidth - sw) / 2;
        } else {
          sh = video.videoWidth / targetRatio;
          sy = (video.videoHeight - sh) / 2;
        }
        context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL("image/jpeg", 0.82);
        cleanup();
        resolve(photo);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });

    video.play().catch((error) => {
      cleanup();
      reject(error);
    });
  });
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
  if (adminLoading) return;
  const month = document.getElementById("month")?.value || selectedMonth;
  selectedMonth = month;
  currentTab = "admin";
  adminLoading = true;
  adminSummary = null;
  statusText = "Carregando resumo...";
  render();
  try {
    adminSummary = await api(`/timeclock/admin/summary?month=${encodeURIComponent(month)}`);
    if (!selectedEmployee) selectedEmployee = adminSummary.employees?.[0]?.id || adminSummary.summary?.[0]?.userId || "";
    statusText = "Resumo atualizado.";
  } catch (error) {
    statusText = error.message;
  }
  adminLoading = false;
  render();
}

function loginView() {
  return `<section class="login">
    <div class="brand">
      <img src="logo.png" alt="Griffy Store" />
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
        <img src="logo.png" alt="Griffy Store" />
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
          <h1>${currentTab === "admin" ? "Gestao de ponto" : "Meu ponto"}</h1>
          <p>${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>
      </header>
      <nav class="tabs" aria-label="Areas do ponto">
        ${tabButton("punch", "Registrar")}
        ${tabButton("account", "Minha conta")}
        ${tabButton("history", "Historico")}
        ${canAdmin ? `<button class="${currentTab === "admin" ? "active" : ""}" type="button" onclick="loadAdminSummary()">Equipe</button>` : ""}
      </nav>
      ${statusText ? `<div class="notice">${statusText}</div>` : ""}
      ${evidenceText ? `<div class="notice ok">${evidenceText}</div>` : ""}
      ${currentTab === "admin" && canAdmin ? adminView() : currentTab === "account" ? accountView() : currentTab === "history" ? historyView(entries, summary) : punchView(entries, summary)}
    </main>
  </section>`;
}

function tabButton(id, label) {
  return `<button class="${currentTab === id ? "active" : ""}" type="button" onclick="currentTab='${id}'; render()">${label}</button>`;
}

function punchView(entries, summary) {
  return `<section class="tab-page">
    <div class="actions">
      ${[
        { type: "Entrada", label: "Entrada" },
        { type: "Intervalo inicio", label: "Inicio intervalo" },
        { type: "Intervalo fim", label: "Fim intervalo" },
        { type: "Saida", label: "Saida" },
      ].map((item) => `<button class="punch-action" type="button" onclick="punch('${item.type}')"><span>${item.label}</span></button>`).join("")}
    </div>
    <div class="notice">
      Ao bater ponto, o sistema registra selfie, GPS, aparelho e IP para validacao administrativa.
    </div>
    <div class="grid">
      <section class="panel">
        <h2>Ultimas batidas</h2>
        ${entries.length ? entries.slice(0, 6).map(entryRow).join("") : `<div class="empty">Nenhuma batida registrada.</div>`}
      </section>
      <section class="panel">
        <h2>Pontualidade</h2>
        ${summary.length ? summary.slice(0, 6).map(summaryRow).join("") : `<div class="empty">Sem resumo ainda.</div>`}
      </section>
    </div>
  </section>`;
}

function accountView() {
  const profile = me?.profile || {};
  return `<section class="account-grid">
    <article class="panel account-card">
      <div>
        <h2>Minha conta</h2>
        <p>Dados do funcionario conectado ao ponto.</p>
      </div>
      <div class="profile-lines">
        <div><span>Nome</span><strong>${session.name}</strong></div>
        <div><span>Cargo</span><strong>${roleName(session.role)}</strong></div>
        <div><span>Facial</span><strong>${profile.faceUpdatedAt ? `Atualizado em ${moneylessDate.format(new Date(profile.faceUpdatedAt))}` : "Nao cadastrado"}</strong></div>
      </div>
    </article>
    <article class="panel face-card">
      <h2>Facial de referencia</h2>
      <div class="face-preview">
        ${profile.facePhotoData ? `<img src="${profile.facePhotoData}" alt="Facial de referencia" />` : `<span>Sem facial cadastrado</span>`}
      </div>
      <button class="primary" type="button" onclick="updateFaceProfile()">Atualizar facial</button>
      <p>Use uma foto frontal, com boa luz e o rosto centralizado.</p>
    </article>
  </section>`;
}

function historyView(entries, summary) {
  return `<section class="grid">
    <section class="panel">
      <h2>Pontos batidos</h2>
      ${entries.length ? entries.map(entryRow).join("") : `<div class="empty">Nenhuma batida registrada.</div>`}
    </section>
    <section class="panel">
      <h2>Resumo dos dias</h2>
      ${summary.length ? summary.map(summaryRow).join("") : `<div class="empty">Sem resumo ainda.</div>`}
    </section>
  </section>`;
}

function summaryRow(day) {
  return `<div class="row"><span>${dayLabel(day.date)}</span>${attendanceBadge(day)}</div>`;
}

function attendanceBadge(day) {
  const status = day.attendanceStatus || (day.lateMinutes === null ? "missing" : day.lateMinutes === 0 ? "on-time" : day.lateMinutes <= 10 ? "late" : "absence");
  const text = { missing: "Sem entrada", "on-time": "No horario", late: `${day.lateMinutes} min atraso`, absence: `Falta por atraso (${day.lateMinutes} min)` }[status];
  return `<strong class="attendance-badge ${status}"><i aria-hidden="true"></i>${text}</strong>`;
}

function exportAttendance() {
  const rows = (adminSummary?.summary || []).filter((row) => row.userId === selectedEmployee);
  const csvCell = (value) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
  const lines = [["Funcionario", "Data", "Entrada", "Saida", "Atraso (min)", "Horas apuradas", "Situacao"], ...rows.map((day) => [day.userName, dayLabel(day.date), clock(day.firstIn), clock(day.lastOut), day.lateMinutes, day.workedMinutes === null ? "Pendente" : duration(day.workedMinutes), { "on-time": "No horario", late: "Atraso", absence: "Falta por atraso", missing: "Sem entrada" }[day.attendanceStatus]])];
  const url = URL.createObjectURL(new Blob(["\uFEFF", lines.map((line) => line.map(csvCell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ponto-${selectedMonth}-${selectedEmployee}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const allRows = adminSummary?.summary || [];
  const employees = adminSummary?.employees || users;
  const employee = employees.find((item) => item.id === selectedEmployee);
  const rows = allRows.filter((row) => row.userId === selectedEmployee);
  const entries = (adminSummary?.entries || []).filter((entry) => entry.userId === selectedEmployee).sort((a, b) => new Date(b.at) - new Date(a.at));
  const totalLate = rows.reduce((sum, row) => sum + (row.lateMinutes || 0), 0);
  const worked = rows.reduce((sum, row) => sum + (row.workedMinutes || 0), 0);
  return `<section class="admin tab-page" aria-busy="${adminLoading}">
    <div class="admin-head">
      <div>
        <h2>Acompanhamento da equipe</h2>
        <p>${employees.length} funcionarios &middot; ${allRows.length} dias registrados</p>
      </div>
      <div class="admin-tools">
        <label>Periodo<input id="month" type="month" value="${selectedMonth}" onchange="loadAdminSummary()" ${adminLoading ? "disabled" : ""} /></label>
        <button class="secondary" type="button" onclick="exportAttendance()" ${rows.length ? "" : "disabled"}>Exportar CSV</button>
      </div>
    </div>
    <label class="employee-filter">Funcionario
      <select onchange="selectedEmployee=this.value; render()">${employees.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedEmployee ? "selected" : ""}>${escapeHtml(item.name)} - ${escapeHtml(roleName(item.role))}${item.active === 0 ? " (Inativo)" : ""}</option>`).join("")}</select>
    </label>
    <div class="employee-heading"><div class="avatar">${escapeHtml((employee?.name || "?").slice(0, 1).toUpperCase())}</div><div><h2>${escapeHtml(employee?.name || "Selecione um funcionario")}</h2><p>${escapeHtml(roleName(employee?.role || ""))}</p></div></div>
    <div class="metrics">
      <article><span>Dias registrados</span><strong>${rows.length}</strong></article>
      <article><span>Atrasos / faltas por atraso</span><strong>${rows.filter((day) => day.attendanceStatus === "late").length} / ${rows.filter((day) => day.attendanceStatus === "absence").length}</strong></article>
      <article><span>Atraso acumulado</span><strong>${duration(totalLate)}</strong></article>
      <article><span>Horas apuradas</span><strong>${duration(worked)}</strong></article>
    </div>
    <div class="attendance-grid">
      <section class="attendance-section"><h2>Pontualidade</h2><p>Entrada prevista: ${escapeHtml(adminSummary?.settings?.["timeclock.start_time"] || "09:00")}</p>
        <div class="attendance-legend"><span class="on-time">No horario</span><span class="late">Atraso ate ${escapeHtml(adminSummary?.settings?.["timeclock.late_tolerance_minutes"] ?? 10)} min</span><span class="absence">Falta por atraso</span></div>
        ${rows.length ? rows.map((day) => `<details class="attendance-day"><summary><span>${dayLabel(day.date)}</span>${attendanceBadge(day)}</summary><div class="day-details"><div><span>Entrada</span><strong>${clock(day.firstIn)}</strong></div><div><span>Saida</span><strong>${clock(day.lastOut)}</strong></div><div><span>Horas apuradas</span><strong>${day.workedMinutes === null ? "Pendente" : duration(day.workedMinutes)}</strong></div><div><span>Marcacoes</span><strong>${day.entries?.length || 0}</strong></div></div>${day.incomplete ? `<p class="pending">Marcacoes incompletas</p>` : ""}</details>`).join("") : `<div class="empty">Sem marcacoes neste periodo.</div>`}
      </section>
      <section class="attendance-section"><h2>Marcacoes e evidencias</h2><p>${entries.length} registros no periodo</p>
        ${entries.length ? entries.map((entry) => `<details class="evidence-item" data-entry-id="${escapeHtml(entry.id)}"><summary><span>${escapeHtml(entry.type)}<small>${moneylessDate.format(new Date(entry.at))}</small></span><span class="${entry.locationStatus === "Fora do raio" ? "absence" : "muted"}">${escapeHtml(entry.locationStatus || "Sem local")}</span></summary><div class="evidence-detail"><div class="evidence-photo"><span>Foto</span></div><div><p>Distancia: ${entry.distanceMeters == null ? "Indisponivel" : `${entry.distanceMeters} m`}</p><p>Precisao GPS: ${entry.accuracy == null ? "Indisponivel" : `${Math.round(entry.accuracy)} m`}</p>${entry.latitude != null && entry.longitude != null ? `<a href="https://www.google.com/maps?q=${Number(entry.latitude)},${Number(entry.longitude)}" target="_blank" rel="noopener noreferrer">Ver localizacao</a>` : ""}</div></div></details>`).join("") : `<div class="empty">Sem evidencias neste periodo.</div>`}
      </section>
    </div>
    <details class="admin-settings"><summary>Configuracoes de jornada e local</summary>
    <form class="settings-grid" onsubmit="saveTimeSettings(event)">
      <label>Entrada prevista<input name="startTime" type="time" required value="${escapeHtml(adminSummary?.settings?.["timeclock.start_time"] || "09:00")}" /></label>
      <label>Limite de atraso (min)<input name="lateToleranceMinutes" type="number" min="0" max="120" required value="${escapeHtml(adminSummary?.settings?.["timeclock.late_tolerance_minutes"] ?? 10)}" /></label>
      <label>Latitude<input name="storeLatitude" value="${escapeHtml(adminSummary?.settings?.["timeclock.store_latitude"] || "")}" placeholder="-22.0000000" /></label>
      <label>Longitude<input name="storeLongitude" value="${escapeHtml(adminSummary?.settings?.["timeclock.store_longitude"] || "")}" placeholder="-43.0000000" /></label>
      <label>Raio permitido em metros<input name="allowedRadiusMeters" type="number" min="10" value="${escapeHtml(adminSummary?.settings?.["timeclock.allowed_radius_meters"] || "150")}" /></label>
      <button type="button" onclick="fillCurrentLocation()">Usar local atual</button>
      <button type="submit">Salvar configuracoes</button>
    </form>
    </details>
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
    statusText = "Configuracoes do ponto salvas.";
    await loadAdminSummary();
  } catch (error) {
    statusText = error.message;
    render();
  }
}

function render() {
  document.getElementById("app").innerHTML = session ? employeeView() : loginView();
}

document.addEventListener("toggle", async (event) => {
  const detail = event.target;
  if (!detail.matches?.(".evidence-item") || !detail.open || detail.dataset.loaded) return;
  const photo = detail.querySelector(".evidence-photo");
  detail.dataset.loaded = "loading";
  photo.textContent = "Carregando foto...";
  try {
    const result = await api(`/timeclock/admin/evidence/${encodeURIComponent(detail.dataset.entryId)}`);
    photo.textContent = "";
    if (result.photoData) {
      const img = document.createElement("img");
      img.src = result.photoData;
      img.alt = "Selfie da marcacao";
      photo.appendChild(img);
    } else photo.textContent = "Sem foto";
    detail.dataset.loaded = "yes";
  } catch (error) {
    photo.textContent = error.message;
    delete detail.dataset.loaded;
  }
}, true);

boot();
