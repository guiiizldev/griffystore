const apiBaseUrl = (window.GRIFFY_STORE_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
const form = document.getElementById("siteAdminForm");
const statusEl = document.getElementById("adminStatus");

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

async function loadConfig() {
  try {
    const config = await fetch(apiUrl("/api/storefront/config")).then((response) => response.json());
    form.theme.value = config.theme || "auto";
    form.promoEnabled.checked = Boolean(config.promo?.enabled);
    form.promoTitle.value = config.promo?.title || "";
    form.promoText.value = config.promo?.text || "";
    form.promoButtonText.value = config.promo?.buttonText || "";
    form.promoTarget.value = config.promo?.target || "./catalogo.html";
    form.whatsapp.value = config.whatsapp || "";
    form.instagram.value = config.instagram || "";
    form.address.value = config.address || "";
    document.body.dataset.theme = config.theme && config.theme !== "auto" ? config.theme : "default";
  } catch (_error) {
    setStatus("Nao foi possivel carregar a configuracao do site.", "error");
  }
}

async function saveConfig(event) {
  event.preventDefault();
  const data = new FormData(form);
  const payload = {
    adminPin: data.get("adminPin"),
    theme: data.get("theme"),
    promo: {
      enabled: data.get("promoEnabled") === "on",
      title: data.get("promoTitle"),
      text: data.get("promoText"),
      buttonText: data.get("promoButtonText"),
      target: data.get("promoTarget") || "./catalogo.html",
    },
    whatsapp: data.get("whatsapp"),
    instagram: data.get("instagram"),
    address: data.get("address"),
  };
  setStatus("Salvando...");
  try {
    const response = await fetch(apiUrl("/api/storefront/admin/config"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Nao foi possivel salvar.");
    form.adminPin.value = "";
    setStatus("Configuracoes salvas com sucesso.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

form.addEventListener("submit", saveConfig);
loadConfig();
