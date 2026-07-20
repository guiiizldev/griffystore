const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

let products = [];
let config = {};
let cart = JSON.parse(localStorage.getItem("griffy-web-cart") || "[]");
const apiBaseUrl = (window.GRIFFY_STORE_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

const grid = document.getElementById("productGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const categoryChips = document.getElementById("categoryChips");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const productCount = document.getElementById("productCount");

function saveCart() {
  localStorage.setItem("griffy-web-cart", JSON.stringify(cart));
}

function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function whatsappUrl(text) {
  const phone = normalizePhone(config.whatsapp || config.phone);
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

function productImage(product) {
  if (!product.cover) return "./assets/griffy-symbol.png";
  if (/^https?:\/\//i.test(product.cover)) return product.cover;
  return `${apiBaseUrl}${product.cover.startsWith("/") ? product.cover : `/${product.cover}`}`;
}

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

function currentTheme() {
  const forced = config.theme || window.GRIFFY_STORE_CONFIG?.THEME || "auto";
  if (forced !== "auto") return forced;
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month === 11 && day >= 20) return "black-friday";
  if (month === 12) return "natal";
  if (month === 6 && day <= 15) return "namorados";
  if (month === 5 && day <= 15) return "maes";
  return "default";
}

function applyTheme() {
  document.body.dataset.theme = currentTheme();
  const promo = config.promo || window.GRIFFY_STORE_CONFIG?.PROMO || {};
  const promoBar = document.getElementById("promoBar");
  if (!promoBar) return;
  if (!promo.enabled) {
    promoBar.hidden = true;
    return;
  }
  document.getElementById("promoTitle").textContent = promo.title || "Promocao Griffy Store";
  document.getElementById("promoText").textContent = promo.text || "Ofertas especiais por tempo limitado.";
  document.getElementById("promoLink").textContent = promo.buttonText || "Ver ofertas";
  document.getElementById("promoLink").href = promo.target || "#catalogo";
  promoBar.hidden = false;
}

function filteredProducts() {
  if (!searchInput || !categorySelect) return products;
  const q = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  const list = products.filter((product) => {
    const text = `${product.name} ${product.category} ${product.code || ""}`.toLowerCase();
    return (!q || text.includes(q)) && (!category || product.category === category);
  });
  return sortProducts(list);
}

function sortProducts(list) {
  const mode = sortSelect?.value || "featured";
  return [...list].sort((a, b) => {
    if (mode === "name") return a.name.localeCompare(b.name, "pt-BR");
    if (mode === "price-asc") return Number(a.price || 0) - Number(b.price || 0);
    if (mode === "price-desc") return Number(b.price || 0) - Number(a.price || 0);
    if (mode === "stock-desc") return Number(b.stock || 0) - Number(a.stock || 0);
    const aPriority = /iphone|jbl|watch|carregador|fone/i.test(a.name) ? 1 : 0;
    const bPriority = /iphone|jbl|watch|carregador|fone/i.test(b.name) ? 1 : 0;
    return bPriority - aPriority || a.name.localeCompare(b.name, "pt-BR");
  });
}

function productMessage(product) {
  return `Ola, tenho interesse no produto ${product.name} (${money.format(Number(product.price || 0))}).`;
}

function renderProducts() {
  if (!grid || !emptyState) return;
  const list = filteredProducts();
  emptyState.hidden = list.length > 0;
  if (productCount) productCount.textContent = `${list.length} produto(s) encontrado(s)`;
  grid.innerHTML = list
    .map(
      (product) => `
      <article class="product-card">
        <div class="product-art">
          <span class="product-badge">${product.category || "Produto"}</span>
          <span class="stock-badge">${Number(product.stock || 0)} un.</span>
          <img src="${productImage(product)}" alt="${product.name}" />
        </div>
        <small>${product.category}</small>
        <h3>${product.name}</h3>
        <div class="price">${money.format(Number(product.price || 0))}</div>
        <div class="product-actions">
          <button class="btn primary" type="button" onclick="addToCart('${product.id}')">Adicionar</button>
          <a class="whatsapp-mini" href="${whatsappUrl(productMessage(product))}" target="_blank" rel="noreferrer" aria-label="Comprar pelo WhatsApp">W</a>
        </div>
      </article>`,
    )
    .join("");
}

function renderCategories() {
  if (!categorySelect || !categoryChips) return;
  const categories = Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort();
  categorySelect.innerHTML = '<option value="">Todas categorias</option>' + categories.map((category) => `<option>${category}</option>`).join("");
  categoryChips.innerHTML = ['<button class="category-chip active" type="button" data-category="">Todas</button>']
    .concat(categories.slice(0, 12).map((category) => `<button class="category-chip" type="button" data-category="${category}">${category}</button>`))
    .join("");
  categoryChips.querySelectorAll(".category-chip").forEach((button) => {
    button.addEventListener("click", () => {
      categorySelect.value = button.dataset.category || "";
      syncCategoryChips();
      renderProducts();
    });
  });
}

function syncCategoryChips() {
  if (!categoryChips || !categorySelect) return;
  const selected = categorySelect.value;
  categoryChips.querySelectorAll(".category-chip").forEach((button) => {
    button.classList.toggle("active", (button.dataset.category || "") === selected);
  });
}

function addToCart(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  const item = cart.find((row) => row.id === id);
  if (item) item.qty += 1;
  else cart.push({ id: product.id, name: product.name, price: Number(product.price || 0), qty: 1 });
  saveCart();
  renderCart();
  openCart();
}

function setQty(id, delta) {
  const item = cart.find((row) => row.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((row) => row.id !== id);
  saveCart();
  renderCart();
}

function total() {
  return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
}

function renderCart() {
  if (!cartCount || !cartTotal || !cartItems) return;
  cartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
  cartTotal.textContent = money.format(total());
  cartItems.innerHTML = cart.length
    ? cart
        .map(
          (item) => `
          <div class="cart-row">
            <div><strong>${item.name}</strong><br><small>${money.format(item.price)} cada</small></div>
            <div class="qty">
              <button type="button" onclick="setQty('${item.id}', -1)">-</button>
              <strong>${item.qty}</strong>
              <button type="button" onclick="setQty('${item.id}', 1)">+</button>
            </div>
          </div>`,
        )
        .join("")
    : '<div class="empty">Seu carrinho esta vazio.</div>';
}

function openCart() {
  if (!drawer || !overlay) return;
  drawer.classList.add("open");
  overlay.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  if (!drawer || !overlay) return;
  drawer.classList.remove("open");
  overlay.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function orderMessage(formData = null, orderId = "") {
  const lines = [
    `Pedido Griffy Store${orderId ? ` #${orderId}` : ""}`,
    "",
    ...cart.map((item) => `${item.qty}x ${item.name} - ${money.format(item.qty * item.price)}`),
    "",
    `Total: ${money.format(total())}`,
  ];
  if (formData) {
    lines.push("", `Cliente: ${formData.get("customerName")}`, `Telefone: ${formData.get("customerPhone")}`, `Entrega: ${formData.get("deliveryType")}`);
    if (formData.get("address")) lines.push(`Endereco: ${formData.get("address")}`);
    if (formData.get("notes")) lines.push(`Obs: ${formData.get("notes")}`);
  }
  return lines.join("\n");
}

async function sendOrder(event) {
  event.preventDefault();
  if (!cart.length) {
    alert("Adicione pelo menos um produto ao carrinho.");
    return;
  }
  const formData = new FormData(event.target);
  const payload = {
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    deliveryType: formData.get("deliveryType"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    items: cart.map(({ id, qty }) => ({ id, qty })),
  };
  try {
    const response = await fetch(apiUrl("/api/storefront/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Nao foi possivel enviar o pedido.");
    window.open(whatsappUrl(orderMessage(formData, body.id)), "_blank");
    cart = [];
    saveCart();
    renderCart();
    closeCart();
    alert("Pedido enviado para o sistema.");
  } catch (error) {
    alert(error.message);
  }
}

async function loadStore() {
  applyTheme();
  config = await fetch(apiUrl("/api/storefront/config")).then((response) => response.json()).catch(() => ({}));
  applyTheme();
  if (grid) products = await fetch(apiUrl("/api/storefront/products?limit=500")).then((response) => response.json()).catch(() => []);
  const storeContact = document.getElementById("storeContact");
  if (storeContact) storeContact.textContent = config.phone ? `WhatsApp: ${config.phone}` : "Fale com nossa equipe pelo WhatsApp.";
  const salesPhone = document.getElementById("salesPhone");
  if (salesPhone && (config.whatsapp || config.phone)) salesPhone.textContent = config.whatsapp || config.phone;
  const contactText = "Ola, vim pela loja virtual da Griffy Store.";
  for (const id of ["whatsappHero", "serviceWhatsapp", "contactWhatsapp", "headerWhatsapp"]) {
    const link = document.getElementById(id);
    if (link) link.href = whatsappUrl(contactText);
  }
  renderCategories();
  renderProducts();
  renderCart();
}

document.getElementById("cartButton")?.addEventListener("click", openCart);
document.getElementById("closeCart")?.addEventListener("click", closeCart);
document.getElementById("overlay")?.addEventListener("click", closeCart);
document.getElementById("orderForm")?.addEventListener("submit", sendOrder);
document.getElementById("whatsappCart")?.addEventListener("click", () => {
  if (!cart.length) {
    alert("Adicione pelo menos um produto ao carrinho.");
    return;
  }
  window.open(whatsappUrl(orderMessage()), "_blank");
});
searchInput?.addEventListener("input", renderProducts);
categorySelect?.addEventListener("change", () => {
  syncCategoryChips();
  renderProducts();
});
sortSelect?.addEventListener("change", renderProducts);
document.getElementById("clearFilters")?.addEventListener("click", () => {
  searchInput.value = "";
  categorySelect.value = "";
  sortSelect.value = "featured";
  syncCategoryChips();
  renderProducts();
});

loadStore();
