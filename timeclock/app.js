const apiBase = "/api";
const tokenKey = "griffy-timeclock-token";
const storeTimezone = "America/Sao_Paulo";
const moneylessDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: storeTimezone });

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
let captureBusy = false;
let installPrompt = null;
let swapOptions = null;
let swapLoading = false;
let swapBusy = false;
let swapOptionsRequest = 0;

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function switchTab(tab) {
  if (captureBusy || swapBusy) return;
  statusText = "";
  evidenceText = "";
  if (tab === "admin") {
    window.scrollTo(0, 0);
    return loadAdminSummary();
  }
  if (tab === "swaps") {
    currentTab = tab;
    window.scrollTo(0, 0);
    return refreshSwaps();
  }
  currentTab = tab;
  render();
  window.scrollTo(0, 0);
}

function updateClock() {
  const element = document.getElementById("live-clock");
  if (element) element.textContent = clock(new Date());
}

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
  return value ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: storeTimezone }) : "--:--";
}

function roleName(role) {
  return { admin: "Administrador", gerente: "Gerente", vendedor: "Vendedor", tecnico: "Tecnico" }[role] || role;
}

async function api(path, options = {}) {
  if (!navigator.onLine) throw new Error("Sem conexao. Conecte-se para registrar ou consultar o ponto.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...options,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || "Falha na comunicacao.");
      error.status = response.status;
      throw error;
    }
    return body;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("A conexao demorou demais. Tente novamente.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function boot() {
  users = await api("/timeclock/users").catch((error) => { statusText = error.message; return []; });
  if (token) await loadMe().catch((error) => {
    if (error.status === 401) logout();
    statusText = error.message;
  });
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
  statusText = "";
  evidenceText = "";
  swapOptions = null;
  swapOptionsRequest++;
  localStorage.removeItem(tokenKey);
  localStorage.removeItem("griffy-timeclock-user");
}

async function loadMe() {
  me = await api("/timeclock/me");
}

async function punch(type) {
  if (captureBusy) return;
  if (!navigator.onLine) {
    statusText = "Sem conexao. O ponto precisa ser confirmado pela loja.";
    render();
    return;
  }
  if (!me?.schedule) {
    statusText = "Solicite ao administrador a configuracao do seu horario.";
    render();
    return;
  }
  captureBusy = true;
  evidenceText = "";
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
  captureBusy = false;
  render();
}

async function updateFaceProfile() {
  if (captureBusy) return;
  if (!navigator.onLine) {
    statusText = "Conecte-se para atualizar sua foto.";
    render();
    return;
  }
  captureBusy = true;
  evidenceText = "";
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
  captureBusy = false;
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
      <section class="selfie-dialog" role="dialog" aria-modal="true" aria-labelledby="selfie-title">
        <div class="selfie-head">
          <h2 id="selfie-title">Centralize o rosto</h2>
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
    document.body.classList.add("capturing");

    const video = overlay.querySelector("video");
    const captureButton = overlay.querySelector('[data-action="capture"]');
    captureButton.disabled = true;
    video.addEventListener("loadeddata", () => { captureButton.disabled = false; }, { once: true });
    video.srcObject = stream;

    const cleanup = () => {
      stream.getTracks().forEach((track) => track.stop());
      overlay.remove();
      document.body.classList.remove("capturing");
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
  const positionResult = getPosition().then((position) => ({ position }), (error) => ({ error }));
  const photoData = await captureSelfie();
  const result = await positionResult;
  if (result.error) throw result.error;
  const position = result.position;
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
    <div class="connection-notice" ${navigator.onLine ? "hidden" : ""} role="status">${icon("wifi-off")} Sem conexao com a loja</div>
    <div class="brand">
      <img src="logo.png" alt="Griffy Store" />
      <span class="eyebrow">PORTAL DO COLABORADOR</span>
      <h1>Seu dia comeca aqui.</h1>
      <p>Acesse sua jornada na Griffy Store.</p>
    </div>
    <form class="panel" onsubmit="login(event)">
      <label>Funcionario
        <select name="userId" required>
          <option value="">Selecione seu nome</option>
          ${users.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} - ${roleName(user.role)}</option>`).join("")}
        </select>
      </label>
      <label>PIN
        <input name="pin" type="password" inputmode="numeric" autocomplete="current-password" required />
      </label>
      <button class="primary" type="submit">Entrar ${icon("arrow-right")}</button>
      ${statusText ? `<span class="status">${statusText}</span>` : ""}
    </form>
    <div class="login-footer">${icon("shield-check")} Ponto Griffy Store</div>
  </section>`;
}

function employeeView() {
  const entries = me?.entries || [];
  const summary = me?.summary || [];
  const canAdmin = ["admin", "gerente"].includes(session?.role);
  return `<section class="shell">
    <div class="app-topbar">
      <div class="aside-brand">
        <img src="logo.png" alt="Griffy Store" />
      </div>
      <div class="user-card">
        <strong>Ponto</strong>
        <span>Griffy Store</span>
      </div>
      <button class="avatar account-shortcut" type="button" title="Minha conta" aria-label="Minha conta" onclick="switchTab('account')">${escapeHtml(session.name.slice(0, 1).toUpperCase())}</button>
    </div>
    <div class="connection-notice" ${navigator.onLine ? "hidden" : ""} role="status">${icon("wifi-off")} Sem conexao com a loja</div>
    <main class="app-content">
      <header class="page-header">
        <div>
          <span class="eyebrow">${currentTab === "punch" ? `OLA, ${escapeHtml(session.name.split(" ")[0].toUpperCase())}` : "GRIFFY STORE"}</span>
          <h1>${{ punch: "Minha jornada", history: "Meu historico", account: "Minha conta", admin: "Minha equipe", swaps: "Trocas de horario" }[currentTab]}</h1>
          <p>${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>
      </header>
      ${statusText ? `<div class="notice ${evidenceText ? "ok" : ""}" role="status">${icon(evidenceText ? "circle-check" : "info")}<span>${escapeHtml(statusText)}</span></div>` : ""}
      ${currentTab === "admin" && canAdmin ? adminView() : currentTab === "swaps" ? swapsView() : currentTab === "account" ? accountView() : currentTab === "history" ? historyView(entries, summary) : punchView(entries, summary)}
    </main>
    <nav class="tabs bottom-nav" aria-label="Areas do ponto">
      ${tabButton("punch", "Ponto", "clock-3")}
      ${tabButton("history", "Historico", "calendar-days")}
      ${tabButton("swaps", "Trocas", "arrow-left-right")}
      ${canAdmin ? tabButton("admin", "Equipe", "users-round") : ""}
      ${tabButton("account", "Conta", "user-round")}
    </nav>
  </section>`;
}

function tabButton(id, label, symbol) {
  return `<button class="${currentTab === id ? "active" : ""}" type="button" ${currentTab === id ? 'aria-current="page"' : ""} onclick="switchTab('${id}')" ${captureBusy || swapBusy ? "disabled" : ""}>${icon(symbol)}<span>${label}</span></button>`;
}

async function refreshSwaps() {
  swapLoading = true;
  swapOptions = null;
  swapOptionsRequest++;
  render();
  try { await loadMe(); }
  catch (error) { statusText = error.message; }
  swapLoading = false;
  render();
  if (currentTab === "swaps") await loadSwapOptions();
}

async function loadSwapOptions() {
  const date = document.querySelector('[name="swapDate"]')?.value;
  if (!date) return;
  const request = ++swapOptionsRequest;
  swapOptions = null;
  const select = document.querySelector('[name="targetId"]');
  const previous = select?.value;
  if (select) { select.disabled = true; select.innerHTML = '<option value="">Carregando horarios...</option>'; }
  const submit = document.querySelector('.swap-form button[type="submit"]');
  if (submit) submit.disabled = true;
  const feedback = document.querySelector('.swap-selection-feedback');
  if (feedback) feedback.textContent = "Carregando horarios...";
  try {
    const options = await api(`/timeclock/swaps/options?date=${encodeURIComponent(date)}`);
    if (request !== swapOptionsRequest || currentTab !== "swaps") return;
    swapOptions = options;
    select.innerHTML = '<option value="">Escolha um colega</option>' + options.employees.map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.name)} - ${employee.schedule ? employee.schedule.workingDay === false ? "Folga" : `${employee.schedule.startTime} / ${employee.schedule.endTime}${employee.schedule.source === "swap" ? " (Ja tem troca)" : ""}` : "Sem horario definido"}</option>`).join("");
    if (options.employees.some((employee) => employee.id === previous)) select.value = previous;
    select.disabled = false;
    document.querySelector('.swap-own-schedule').textContent = options.ownSchedule ? options.ownSchedule.workingDay === false ? "Voce esta de folga neste dia." : `Seu horario em ${dayLabel(date)}: ${options.ownSchedule.startTime} - ${options.ownSchedule.endTime}${options.ownSchedule.source === "swap" ? " (troca aceita)" : ""}` : "Seu horario precisa ser configurado pelo administrador.";
    updateSwapSelection();
  } catch (error) {
    if (request !== swapOptionsRequest || currentTab !== "swaps") return;
    document.querySelector('.swap-own-schedule').textContent = error.message;
    select.innerHTML = '<option value="">Horarios indisponiveis</option>';
    if (feedback) feedback.textContent = "Toque em Atualizar pedidos para tentar novamente.";
  }
}

function updateSwapSelection() {
  const form = document.querySelector('.swap-form');
  if (!form || !swapOptions) return;
  const colleague = swapOptions.employees.find((employee) => employee.id === form.elements.targetId.value);
  const own = swapOptions.ownSchedule;
  let message = "";
  if (!own) message = "O administrador precisa configurar seu horario em Equipe.";
  else if (own.workingDay === false) message = "Escolha um dia em que voce tenha expediente.";
  else if (own.source === "swap") message = "Voce ja tem uma troca aceita nesta data. Escolha outro dia.";
  else if (!swapOptions.employees.length) message = "Nenhum outro funcionario ativo disponivel.";
  else if (!colleague) message = "Selecione o colega para conferir os horarios.";
  else if (!colleague.schedule) message = "O administrador precisa configurar o horario deste colega em Equipe.";
  else if (colleague.schedule.workingDay === false) message = "Este colega esta de folga. Escolha outro colega ou dia.";
  else if (colleague.schedule.source === "swap") message = "Este colega ja tem uma troca aceita nesta data.";
  else if (own.startTime === colleague.schedule.startTime && own.endTime === colleague.schedule.endTime) message = "Voces ja tem o mesmo horario nesta data.";
  form.querySelector('.swap-selection-feedback').textContent = message;
  const preview = form.querySelector('.swap-selection-preview');
  preview.hidden = Boolean(message);
  preview.innerHTML = message ? "" : `<div class="swap-person"><span>Seu horario apos o aceite</span><strong>${colleague.schedule.startTime} - ${colleague.schedule.endTime}</strong></div><div class="swap-person"><span>${escapeHtml(colleague.name)} apos o aceite</span><strong>${own.startTime} - ${own.endTime}</strong></div>`;
  form.querySelector('button[type="submit"]').disabled = Boolean(message) || swapBusy;
}

async function requestSwap(event) {
  event.preventDefault();
  if (swapBusy || !swapOptions) return;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  swapBusy = true;
  event.currentTarget.querySelector('button[type="submit"]').disabled = true;
  try {
    await api("/timeclock/swaps", { method: "POST", body: JSON.stringify({ date: data.swapDate, targetId: data.targetId, reason: data.reason }) });
    statusText = "Pedido enviado. A troca so vale depois do aceite do colega.";
    evidenceText = "ok";
  } catch (error) { statusText = error.message; evidenceText = ""; }
  swapBusy = false;
  await refreshSwaps();
}

async function respondSwap(button) {
  if (swapBusy) return;
  swapBusy = true;
  button.closest('.swap-card').querySelectorAll('button').forEach((item) => { item.disabled = true; });
  try {
    await api(`/timeclock/swaps/${encodeURIComponent(button.dataset.swapId)}/respond`, { method: "POST", body: JSON.stringify({ action: button.dataset.action }) });
    statusText = { accept: "Troca aceita. Os horarios valem apenas na data do pedido.", reject: "Pedido recusado.", cancel: "Pedido cancelado." }[button.dataset.action];
    evidenceText = "ok";
  } catch (error) { statusText = error.message; evidenceText = ""; }
  swapBusy = false;
  await refreshSwaps();
}

function swapCard(swap, actionable = true) {
  const labels = { pending: "Aguardando aceite", accepted: "Aceita", rejected: "Recusada", canceled: "Cancelada", expired: "Expirada" };
  const incoming = swap.targetId === session.id;
  const pending = swap.status === "pending" && actionable;
  const responseButton = (action, label, symbol) => `<button type="button" class="${action === "accept" ? "primary" : "secondary"}" data-swap-id="${escapeHtml(swap.id)}" data-action="${action}" onclick="respondSwap(this)" ${swapBusy ? "disabled" : ""}>${icon(symbol)} ${label}</button>`;
  return `<article class="swap-card"><div class="swap-head"><strong>${dayLabel(swap.date)}</strong><span class="swap-status ${swap.status}">${labels[swap.status] || swap.status}</span></div>
    <div class="swap-person"><span>${escapeHtml(swap.requesterName)}</span><strong>${swap.requesterStart} - ${swap.requesterEnd} ${icon("arrow-right")} ${swap.targetStart} - ${swap.targetEnd}</strong></div>
    <div class="swap-person"><span>${escapeHtml(swap.targetName)}</span><strong>${swap.targetStart} - ${swap.targetEnd} ${icon("arrow-right")} ${swap.requesterStart} - ${swap.requesterEnd}</strong></div>
    <p>${escapeHtml(swap.reason)}</p>
    ${pending ? `<div class="swap-actions">${incoming ? responseButton("reject", "Recusar", "x") + responseButton("accept", "Aceitar", "check") : responseButton("cancel", "Cancelar pedido", "x")}</div>` : ""}
  </article>`;
}

function swapsView() {
  const date = me?.scheduleDate || new Date().toLocaleDateString("en-CA");
  const swaps = me?.swaps || [];
  const inbox = swaps.filter((swap) => swap.status === "pending" && swap.targetId === session.id);
  const rest = swaps.filter((swap) => !inbox.includes(swap));
  return `<section class="tab-page swaps-page">
    <section><div class="section-heading"><h2>Pedidos recebidos</h2><span>${inbox.length} pendentes</span><button class="icon-button secondary" type="button" aria-label="Atualizar pedidos" title="Atualizar pedidos" onclick="refreshSwaps()" ${swapBusy || swapLoading ? "disabled" : ""}>${icon("refresh-cw")}</button></div>${inbox.map((swap) => swapCard(swap)).join("") || `<div class="empty">Nenhum pedido aguardando seu aceite.</div>`}</section>
    <details class="admin-settings" open><summary>Solicitar troca por um dia</summary><form class="settings-grid swap-form" onsubmit="requestSwap(event)">
      <label>Dia da troca<input name="swapDate" type="date" value="${date}" min="${date}" required onchange="loadSwapOptions()" /></label>
      <div class="swap-own-schedule muted">Carregando horarios...</div>
      <label>Trocar com<select name="targetId" required disabled onchange="updateSwapSelection()"><option value="">Carregando...</option></select></label>
      <p class="swap-selection-feedback muted" aria-live="polite"></p>
      <div class="swap-selection-preview" hidden></div>
      <label>Motivo<textarea name="reason" rows="3" maxlength="255" required placeholder="Motivo do pedido"></textarea></label>
      <button type="submit" disabled>${icon("send")} Enviar pedido</button>
    </form></details>
    <section><h2>Historico de pedidos</h2>${rest.map((swap) => swapCard(swap)).join("") || `<div class="empty">Nenhum pedido enviado.</div>`}</section>
  </section>`;
}

async function saveEmployeeSchedule(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  data.workDays = new FormData(form).getAll("workDays").map(Number);
  form.querySelector('button[type="submit"]').disabled = true;
  try {
    await api("/timeclock/admin/schedules", { method: "POST", body: JSON.stringify(data) });
    await loadMe();
    await loadAdminSummary();
    statusText = "Horario individual salvo.";
    evidenceText = "ok";
    render();
  } catch (error) {
    statusText = error.message;
    evidenceText = "";
    render();
  }
}

function punchView(entries, summary) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: storeTimezone });
  const todayEntries = entries.filter((entry) => new Date(entry.at).toLocaleDateString("en-CA", { timeZone: storeTimezone }) === today);
  const latest = todayEntries[0];
  const status = latest?.type === "Saida" ? "Jornada encerrada" : latest?.type === "Intervalo inicio" ? "Em intervalo" : latest ? "Jornada em andamento" : "Aguardando entrada";
  return `<section class="tab-page">
    <div class="journey-clock"><div><span class="eyebrow">AGORA</span><strong id="live-clock">${clock(new Date())}</strong></div><span class="journey-state ${latest ? "started" : ""}"><i></i>${status}</span></div>
    <div class="schedule-strip">${icon("calendar-clock")}<div><span>Horario de hoje${me?.schedule?.source === "swap" ? " - troca aceita" : ""}</span><strong>${me?.schedule ? me.schedule.workingDay === false ? "Folga" : `${me.schedule.startTime} - ${me.schedule.endTime}` : "Horario nao configurado"}</strong></div></div>
    <div class="section-heading"><h2>Registrar ponto</h2><span>${todayEntries.length} hoje</span></div>
    <div class="actions">
      ${[
        { type: "Entrada", label: "Entrada", icon: "log-in", note: "Iniciar jornada" },
        { type: "Intervalo inicio", label: "Intervalo", icon: "coffee", note: "Iniciar pausa" },
        { type: "Intervalo fim", label: "Retorno", icon: "rotate-ccw", note: "Voltar da pausa" },
        { type: "Saida", label: "Saida", icon: "log-out", note: "Encerrar jornada" },
      ].map((item) => `<button class="punch-action" type="button" onclick="punch('${item.type}')" ${captureBusy ? "disabled" : ""}>${icon(item.icon)}<span>${item.label}</span><small>${item.note}</small></button>`).join("")}
    </div>
    <div class="verification-line">${icon("scan-face")} Selfie <span></span>${icon("map-pin")} Localizacao</div>
    <div class="grid">
      <section class="panel">
        <div class="section-heading"><h2>Ultimos registros</h2><button class="text-button" onclick="switchTab('history')" type="button">Ver todos ${icon("chevron-right")}</button></div>
        ${entries.length ? entries.slice(0, 3).map(entryRow).join("") : `<div class="empty">${icon("clock-3")}<span>Nenhuma batida registrada.</span></div>`}
      </section>
      <section class="panel">
        <h2>Pontualidade</h2>
        ${summary.length ? summary.slice(0, 3).map(summaryRow).join("") : `<div class="empty">Sem resumo ainda.</div>`}
      </section>
    </div>
  </section>`;
}

function accountView() {
  const profile = me?.profile || {};
  return `<section class="account-grid">
    <article class="panel account-card">
      <div>
        <div class="account-identity"><span class="avatar">${escapeHtml(session.name.slice(0, 1).toUpperCase())}</span><div><h2>${escapeHtml(session.name)}</h2><p>${roleName(session.role)}</p></div></div>
      </div>
      <div class="profile-lines">
        <div><span>Nome</span><strong>${escapeHtml(session.name)}</strong></div>
        <div><span>Cargo</span><strong>${roleName(session.role)}</strong></div>
        <div><span>Horario habitual</span><strong>${me?.regularSchedule ? `${me.regularSchedule.startTime} - ${me.regularSchedule.endTime}` : "Nao configurado"}</strong></div>
        <div><span>Facial</span><strong>${profile.faceUpdatedAt ? `Atualizado em ${moneylessDate.format(new Date(profile.faceUpdatedAt))}` : "Nao cadastrado"}</strong></div>
      </div>
    </article>
    <article class="panel face-card">
      <h2>Facial de referencia</h2>
      <div class="face-preview">
        ${profile.facePhotoData ? `<img src="${escapeHtml(profile.facePhotoData)}" alt="Facial de referencia" />` : `<span>${icon("scan-face")} Sem facial cadastrado</span>`}
      </div>
      <button class="primary" type="button" onclick="updateFaceProfile()" ${captureBusy ? "disabled" : ""}>${icon("camera")} Atualizar facial</button>
    </article>
    <div class="account-actions">${installPrompt ? `<button class="secondary" type="button" onclick="installApp()">${icon("download")} Instalar aplicativo</button>` : ""}<button class="logout-button" type="button" onclick="logout(); render()">${icon("log-out")} Sair da conta</button></div>
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
  const text = { missing: "Sem entrada", awaiting: "Aguardando entrada", off: "Folga", unconfigured: "Sem horario definido", "on-time": "No horario", late: `${day.lateMinutes} min atraso`, absence: day.absenceReason === "missing" ? "Falta (sem entrada)" : `Falta por atraso (${day.lateMinutes} min)` }[status];
  return `<strong class="attendance-badge ${status}"><i aria-hidden="true"></i>${text}</strong>`;
}

function exportAttendance() {
  const rows = (adminSummary?.summary || []).filter((row) => row.userId === selectedEmployee);
  const csvCell = (value) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
  const lines = [["Funcionario", "Data", "Entrada prevista", "Saida prevista", "Origem do horario", "Entrada", "Saida", "Atraso (min)", "Horas apuradas", "Situacao"], ...rows.map((day) => [day.userName, dayLabel(day.date), day.expectedStart, day.expectedEnd, day.scheduleSource === "swap" ? "Troca aceita" : "Habitual", clock(day.firstIn), clock(day.lastOut), day.lateMinutes, day.workedMinutes === null ? "Pendente" : duration(day.workedMinutes), { "on-time": "No horario", late: "Atraso", absence: day.absenceReason === "missing" ? "Falta (sem entrada)" : "Falta por atraso", awaiting: "Aguardando entrada", off: "Folga", missing: "Sem entrada", unconfigured: "Sem horario definido" }[day.attendanceStatus]])];
  const url = URL.createObjectURL(new Blob(["\uFEFF", lines.map((line) => line.map(csvCell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ponto-${selectedMonth}-${selectedEmployee}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function entryRow(entry) {
  return `<div class="entry-card">
    <span class="entry-symbol ${entry.type === "Saida" ? "exit" : ""}">${icon({ Entrada: "log-in", Saida: "log-out", "Intervalo inicio": "coffee", "Intervalo fim": "rotate-ccw" }[entry.type] || "clock-3")}</span>
    <div>
      <strong>${escapeHtml(entry.type)}</strong>
      <span>${new Date(entry.at).toLocaleDateString("pt-BR", { timeZone: storeTimezone })}</span>
      <small>${escapeHtml(entry.locationStatus || "Sem local")}</small>
    </div>
    <strong class="entry-time">${clock(entry.at)}</strong>
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
        <p>${employees.length} funcionarios &middot; ${allRows.length} dias apurados</p>
      </div>
      <div class="admin-tools">
        <label>Periodo<input id="month" type="month" value="${selectedMonth}" onchange="loadAdminSummary()" ${adminLoading ? "disabled" : ""} /></label>
        <button class="icon-button secondary" type="button" title="Exportar CSV" aria-label="Exportar CSV" onclick="exportAttendance()" ${rows.length ? "" : "disabled"}>${icon("download")}</button>
      </div>
    </div>
    <label class="employee-filter">Funcionario
      <select onchange="selectedEmployee=this.value; render()">${employees.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedEmployee ? "selected" : ""}>${escapeHtml(item.name)} - ${escapeHtml(roleName(item.role))}${item.active === 0 ? " (Inativo)" : ""}</option>`).join("")}</select>
    </label>
    <div class="employee-heading"><div class="avatar">${escapeHtml((employee?.name || "?").slice(0, 1).toUpperCase())}</div><div><h2>${escapeHtml(employee?.name || "Selecione um funcionario")}</h2><p>${escapeHtml(roleName(employee?.role || ""))}</p></div></div>
    ${employee ? `<details class="admin-settings employee-schedule" ${employee.schedule ? "" : "open"}><summary>Horario habitual ${employee.schedule ? `${employee.schedule.startTime} - ${employee.schedule.endTime}` : "Nao configurado"}</summary>
      <form class="settings-grid" onsubmit="saveEmployeeSchedule(event)">
        <input name="userId" type="hidden" value="${escapeHtml(employee.id)}" />
        <div class="time-fields"><label>Entrada<input name="startTime" type="time" required value="${employee.schedule?.startTime || ""}" /></label><label>Saida<input name="endTime" type="time" required value="${employee.schedule?.endTime || ""}" /></label></div>
        <fieldset class="work-days"><legend>Dias de trabalho</legend>${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((name, index) => `<label><input type="checkbox" name="workDays" value="${index}" ${employee.schedule?.workDays?.includes(index) ? "checked" : ""} /><span>${name}</span></label>`).join("")}</fieldset>
        <label>Valido a partir de<input name="effectiveFrom" type="date" min="${adminSummary?.scheduleDate || ""}" value="${adminSummary?.scheduleDate || ""}" required /></label>
        <button type="submit">${icon("save")} Salvar horario</button>
      </form>
      ${(employee.scheduledChanges || []).map((change) => `<div class="row"><span>A partir de ${dayLabel(change.effectiveFrom)}</span><strong>${change.startTime} - ${change.endTime}</strong></div>`).join("")}
    </details>` : ""}
    <div class="metrics">
      <article><span>Dias registrados</span><strong>${rows.filter((day) => day.entries?.length).length}</strong></article>
      <article><span>Atrasos / faltas</span><strong>${rows.filter((day) => day.attendanceStatus === "late").length} / ${rows.filter((day) => day.attendanceStatus === "absence").length}</strong></article>
      <article><span>Atraso acumulado</span><strong>${duration(totalLate)}</strong></article>
      <article><span>Horas apuradas</span><strong>${duration(worked)}</strong></article>
    </div>
    <div class="attendance-grid">
      <section class="attendance-section"><h2>Pontualidade</h2><p>Horario habitual: ${employee?.schedule ? `${employee.schedule.startTime} - ${employee.schedule.endTime}` : "Nao configurado"}</p>
        <div class="attendance-legend"><span class="on-time">No horario</span><span class="late">Atraso ate ${escapeHtml(adminSummary?.settings?.["timeclock.late_tolerance_minutes"] ?? 10)} min</span><span class="absence">Falta</span></div>
        ${rows.length ? rows.map((day) => `<details class="attendance-day"><summary><span>${dayLabel(day.date)}</span>${attendanceBadge(day)}</summary><div class="day-details"><div><span>Entrada prevista</span><strong>${day.expectedStart || "Nao configurada"}</strong></div><div><span>Saida prevista</span><strong>${day.expectedEnd || "Nao configurada"}</strong></div><div><span>Entrada</span><strong>${clock(day.firstIn)}</strong></div><div><span>Saida</span><strong>${clock(day.lastOut)}</strong></div><div><span>Horas apuradas</span><strong>${day.workedMinutes === null ? "Pendente" : duration(day.workedMinutes)}</strong></div><div><span>Marcacoes</span><strong>${day.entries?.length || 0}</strong></div></div>${day.scheduleSource === "swap" ? `<p class="swap-note">Troca de horario aceita</p>` : ""}${day.incomplete ? `<p class="pending">Marcacoes incompletas</p>` : ""}</details>`).join("") : `<div class="empty">Sem marcacoes neste periodo.</div>`}
      </section>
      <section class="attendance-section"><h2>Marcacoes e evidencias</h2><p>${entries.length} registros no periodo</p>
        ${entries.length ? entries.map((entry) => `<details class="evidence-item" data-entry-id="${escapeHtml(entry.id)}"><summary><span>${escapeHtml(entry.type)}<small>${moneylessDate.format(new Date(entry.at))}</small></span><span class="${entry.locationStatus === "Fora do raio" ? "absence" : "muted"}">${escapeHtml(entry.locationStatus || "Sem local")}</span></summary><div class="evidence-detail"><div class="evidence-photo"><span>Foto</span></div><div><p>Distancia: ${entry.distanceMeters == null ? "Indisponivel" : `${entry.distanceMeters} m`}</p><p>Precisao GPS: ${entry.accuracy == null ? "Indisponivel" : `${Math.round(entry.accuracy)} m`}</p>${entry.latitude != null && entry.longitude != null ? `<a href="https://www.google.com/maps?q=${Number(entry.latitude)},${Number(entry.longitude)}" target="_blank" rel="noopener noreferrer">Ver localizacao</a>` : ""}</div></div></details>`).join("") : `<div class="empty">Sem evidencias neste periodo.</div>`}
      </section>
    </div>
    <section class="attendance-section"><h2>Trocas deste funcionario</h2>${(adminSummary?.swaps || []).filter((swap) => swap.requesterId === selectedEmployee || swap.targetId === selectedEmployee).map((swap) => swapCard(swap, false)).join("") || `<div class="empty">Nenhum pedido de troca.</div>`}</section>
    <details class="admin-settings"><summary>Configuracoes de jornada e local</summary>
    <form class="settings-grid" onsubmit="saveTimeSettings(event)">
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
  window.lucide?.createIcons();
}

async function installApp() {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  render();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  if (currentTab === "account") render();
});
window.addEventListener("appinstalled", () => { installPrompt = null; if (currentTab === "account") render(); });
for (const event of ["online", "offline"]) window.addEventListener(event, () => {
  const banner = document.querySelector(".connection-notice");
  if (banner) banner.hidden = navigator.onLine;
});
setInterval(updateClock, 1000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});

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
