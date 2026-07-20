import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_THEMES = [
  { id: "default", name: "Padrao Griffy", primary: "#fed400", accent: "#141207", success: "#25d366", glow: "rgba(246, 206, 0, 0.25)", builtIn: true },
  { id: "black-friday", name: "Black Friday", primary: "#fed400", accent: "#1a1100", success: "#25d366", glow: "rgba(254, 212, 0, 0.32)", builtIn: true },
  { id: "natal", name: "Natal", primary: "#f2c230", accent: "#071a11", success: "#16a34a", glow: "rgba(22, 163, 74, 0.22)", builtIn: true },
  { id: "namorados", name: "Dia dos Namorados", primary: "#ffcc4d", accent: "#220713", success: "#25d366", glow: "rgba(255, 77, 133, 0.22)", builtIn: true },
  { id: "maes", name: "Dia das Maes", primary: "#f7c948", accent: "#1c1226", success: "#25d366", glow: "rgba(190, 128, 255, 0.2)", builtIn: true },
];

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function whatsappUrl(config, text) {
  const phone = normalizePhone(config.whatsapp || config.phone);
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

function autoTheme(theme) {
  if (theme && theme !== "auto") return theme;
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month === 11 && day >= 20) return "black-friday";
  if (month === 12) return "natal";
  if (month === 6 && day <= 15) return "namorados";
  if (month === 5 && day <= 15) return "maes";
  return "default";
}

function allThemes(config = {}) {
  const custom = Array.isArray(config.themes) ? config.themes : [];
  const merged = DEFAULT_THEMES.map((theme) => ({ ...theme, ...(custom.find((item) => item.id === theme.id) || {}) }));
  const customOnly = custom.filter((theme) => !DEFAULT_THEMES.some((item) => item.id === theme.id));
  return [...merged, ...customOnly];
}

function activeThemeObject(config = {}) {
  const id = autoTheme(config.theme);
  return allThemes(config).find((theme) => theme.id === id) || DEFAULT_THEMES[0];
}

function applyThemeVariables(theme) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary || "#fed400");
  root.style.setProperty("--accent", theme.accent || "#141207");
  root.style.setProperty("--success", theme.success || "#25d366");
  root.style.setProperty("--shadow-glow", `0 0 80px ${theme.glow || "rgba(246, 206, 0, 0.25)"}`);
}

function productImage(product) {
  if (!product.cover) return "/store-assets/griffy-symbol.png";
  if (/^https?:\/\//i.test(product.cover)) return product.cover;
  return product.cover.startsWith("/") ? product.cover : `/${product.cover}`;
}

function useStoreConfig() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  async function loadConfig() {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/storefront/config"));
      setConfig(await response.json());
    } catch (_error) {
      setConfig({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    document.body.dataset.theme = autoTheme(config.theme);
    applyThemeVariables(activeThemeObject(config));
  }, [config.theme, config.themes]);

  return { config, loading, reloadConfig: loadConfig };
}

function Header({ config, cartCount, onCart }) {
  const path = window.location.pathname;
  const contactText = "Ola, vim pela loja virtual da Griffy Store.";
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="/">
          <img src="/store-assets/logo-lovable.png" alt="GRIFFY STORE" />
        </a>
        <nav>
          <a className={path === "/" ? "active" : ""} href="/">Inicio</a>
          <a className={path.startsWith("/catalogo") ? "active" : ""} href="/catalogo">Catalogo</a>
          <a href="/#acessorios">Acessorios</a>
          <a href="/#assistencia">Assistencia</a>
          <a href="/#contato">Contato</a>
        </nav>
        <div className="header-actions">
          <a className="admin-link" href="/admin">Administrador</a>
          <a className="btn primary compact" href={whatsappUrl(config, contactText)} target="_blank" rel="noreferrer">WhatsApp</a>
          {onCart ? (
            <button className="cart-button" type="button" onClick={onCart}>Carrinho <span>{cartCount}</span></button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function PromoBar({ promo }) {
  if (!promo?.enabled) return null;
  return (
    <div className="promo-bar">
      <div className="container promo-inner">
        <div><strong>{promo.title || "Promocao Griffy Store"}</strong><span>{promo.text || "Ofertas especiais por tempo limitado."}</span></div>
        <a className="btn primary compact" href={promo.target || "/catalogo"}>{promo.buttonText || "Ver ofertas"}</a>
      </div>
    </div>
  );
}

function Home({ config }) {
  const contactText = "Ola, vim pela loja virtual da Griffy Store.";
  return (
    <main>
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-shade" />
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">Loja oficial - Penha, Rio de Janeiro</span>
            <h1>Ha mais de 10 anos<br /><strong>conectando tecnologia,</strong><br />confianca e qualidade.</h1>
            <p>Venda de iPhones, Androids, assistencia tecnica especializada e acessorios com atendimento de excelencia.</p>
            <div className="hero-actions">
              <a className="btn primary" href="/catalogo">Ver catalogo</a>
              <a className="btn ghost" href={whatsappUrl(config, contactText)} target="_blank" rel="noreferrer">Falar no WhatsApp</a>
            </div>
            <div className="stats-grid">
              <div className="glass-card"><strong>10+ anos</strong><span>de mercado</span></div>
              <div className="glass-card"><strong>+25 mil</strong><span>clientes atendidos</span></div>
              <div className="glass-card"><strong>Loja fisica</strong><span>na Penha, RJ</span></div>
              <div className="glass-card"><strong>Garantia</strong><span>produtos e servicos</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container about-grid">
          <div>
            <span className="section-kicker">Quem somos</span>
            <h2>Uma decada de paixao por tecnologia</h2>
            <p>A GRIFFY STORE e referencia em smartphones, acessorios e assistencia tecnica no Rio de Janeiro.</p>
            <ul className="check-list">
              <li>Smartphones novos e seminovos com garantia</li>
              <li>Assistencia tecnica para todas as marcas</li>
              <li>Acessorios premium e originais</li>
              <li>Compra, venda e troca de aparelhos</li>
            </ul>
          </div>
          <div className="about-cards">
            <article className="glass-card large"><strong>10+ anos</strong><span>de mercado</span></article>
            <article className="glass-card large"><strong>+25 mil</strong><span>clientes atendidos</span></article>
            <article className="glass-card large"><strong>Penha, RJ</strong><span>loja fisica</span></article>
            <article className="glass-card large"><strong>Garantia</strong><span>em produtos e servicos</span></article>
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-kicker">Servicos</span>
              <h2>Tudo para o seu smartphone em um so lugar</h2>
            </div>
            <a className="btn ghost" href="/catalogo">Explorar produtos</a>
          </div>
          <div className="service-grid">
            <article className="service-card">
              <img src="/store-assets/hero-iphone.jpg" alt="" />
              <h3>iPhones e Androids</h3>
              <p>Aparelhos novos, seminovos, compra, venda e troca.</p>
            </article>
            <article className="service-card" id="acessorios">
              <img src="/store-assets/accessories.jpg" alt="" />
              <h3>Acessorios</h3>
              <p>Capas, peliculas, carregadores, fones, smart watches e muito mais.</p>
            </article>
            <article className="service-card" id="assistencia">
              <img src="/store-assets/repair.jpg" alt="" />
              <h3>Assistencia tecnica</h3>
              <p>Diagnostico, reparos, troca de tela, bateria e manutencao especializada.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="featured-cta">
        <div className="container cta-panel">
          <div>
            <span className="section-kicker">Loja online</span>
            <h2>Catalogo conectado ao estoque da Griffy Store</h2>
            <p>Consulte produtos disponiveis e envie o pedido direto pelo WhatsApp da loja.</p>
          </div>
          <a className="btn primary" href="/catalogo">Abrir catalogo</a>
        </div>
      </section>

      <Contact config={config} />
    </main>
  );
}

function Contact({ config }) {
  return (
    <section className="contact-section" id="contato">
      <div className="container contact-grid">
        <div>
          <span className="section-kicker">Contato</span>
          <h2>Visite nossa loja</h2>
          <ul className="contact-list">
            <li>{config.address || "Rua Maragogi, no 27 - Penha, Rio de Janeiro / RJ"}</li>
            <li>Vendas: <strong>{config.whatsapp || config.phone || "(21) 97983-4256"}</strong></li>
            <li>Assistencia: <strong>(21) 99044-9832</strong></li>
            <li>griffystoreoficial01@gmail.com</li>
            <li>Segunda: 10h as 19h</li>
            <li>Terca a Sabado: 09h as 21h</li>
          </ul>
          <a className="btn primary" href={whatsappUrl(config, "Ola, vim pela loja virtual da Griffy Store.")} target="_blank" rel="noreferrer">Iniciar conversa</a>
        </div>
        <iframe src="https://www.google.com/maps?q=Rua+Maragogi,+27,+Penha,+Rio+de+Janeiro&output=embed" title="Localizacao GRIFFY STORE" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
    </section>
  );
}

function Catalog({ config }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("featured");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("griffy-web-cart") || "[]"));

  useEffect(() => {
    fetch(apiUrl("/api/storefront/products?limit=500"))
      .then((response) => response.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const openCart = () => setDrawerOpen(true);
    document.addEventListener("griffy-open-cart", openCart);
    return () => document.removeEventListener("griffy-open-cart", openCart);
  }, []);

  useEffect(() => {
    localStorage.setItem("griffy-web-cart", JSON.stringify(cart));
  }, [cart]);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(), [products]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((product) => {
      const text = `${product.name} ${product.category} ${product.code || ""}`.toLowerCase();
      return (!q || text.includes(q)) && (!category || product.category === category);
    });
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "price-asc") return Number(a.price || 0) - Number(b.price || 0);
      if (sort === "price-desc") return Number(b.price || 0) - Number(a.price || 0);
      if (sort === "stock-desc") return Number(b.stock || 0) - Number(a.stock || 0);
      const aPriority = /iphone|jbl|watch|carregador|fone/i.test(a.name) ? 1 : 0;
      const bPriority = /iphone|jbl|watch|carregador|fone/i.test(b.name) ? 1 : 0;
      return bPriority - aPriority || a.name.localeCompare(b.name, "pt-BR");
    });
  }, [products, query, category, sort]);

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      return [...current, { id: product.id, name: product.name, price: Number(product.price || 0), qty: 1 }];
    });
    setDrawerOpen(true);
  }

  return (
    <>
      <main className="catalog-page">
        <section className="catalog-shell">
          <div className="container">
            <div className="catalog-toolbar">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produtos..." />
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">Destaques</option>
                <option value="name">Nome A-Z</option>
                <option value="price-asc">Menor preco</option>
                <option value="price-desc">Maior preco</option>
                <option value="stock-desc">Mais estoque</option>
              </select>
            </div>
            <div className="filter-row">
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Todas categorias</option>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
              <div className="category-chips">
                <button className={`category-chip ${!category ? "active" : ""}`} type="button" onClick={() => setCategory("")}>Todas</button>
                {categories.slice(0, 12).map((item) => (
                  <button className={`category-chip ${category === item ? "active" : ""}`} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>
                ))}
              </div>
            </div>
            <div className="catalog-meta">
              <p className="muted-count">{filtered.length} produto(s) encontrado(s)</p>
              <button className="link-button" type="button" onClick={() => { setQuery(""); setCategory(""); setSort("featured"); }}>Limpar filtros</button>
            </div>
            <div className="product-grid">
              {filtered.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-art">
                    <span className="product-badge">{product.category || "Produto"}</span>
                    <span className="stock-badge">{Number(product.stock || 0)} un.</span>
                    <img src={productImage(product)} alt={product.name} />
                  </div>
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <div className="price">{money.format(Number(product.price || 0))}</div>
                  <div className="product-actions">
                    <button className="btn primary" type="button" onClick={() => addToCart(product)}>Adicionar</button>
                    <a className="whatsapp-mini" href={whatsappUrl(config, `Ola, tenho interesse no produto ${product.name} (${money.format(Number(product.price || 0))}).`)} target="_blank" rel="noreferrer">W</a>
                  </div>
                </article>
              ))}
            </div>
            {!filtered.length ? <div className="empty">Nenhum produto encontrado com esses filtros.</div> : null}
          </div>
        </section>
      </main>
      <CartDrawer config={config} cart={cart} setCart={setCart} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

function CartDrawer({ config, cart, setCart, open, onClose }) {
  const [checkoutStatus, setCheckoutStatus] = useState("");
  const [lastOrder, setLastOrder] = useState(null);
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  useEffect(() => {
    if (cart.length) setLastOrder(null);
  }, [cart.length]);

  function setQty(id, delta) {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item)).filter((item) => item.qty > 0));
  }

  function orderMessage(formData = null, orderId = "") {
    const lines = [`Pedido Griffy Store${orderId ? ` #${orderId}` : ""}`, "", ...cart.map((item) => `${item.qty}x ${item.name} - ${money.format(item.qty * item.price)}`), "", `Total: ${money.format(total)}`];
    if (formData) {
      lines.push("", `Cliente: ${formData.get("customerName")}`, `Telefone: ${formData.get("customerPhone")}`, `Entrega: ${formData.get("deliveryType")}`);
      if (formData.get("customerDocument")) lines.push(`Documento: ${formData.get("customerDocument")}`);
      if (formData.get("paymentMethod")) lines.push(`Pagamento: ${formData.get("paymentMethod")}`);
      if (formData.get("address")) lines.push(`Endereco: ${formData.get("address")}`);
      if (formData.get("notes")) lines.push(`Obs: ${formData.get("notes")}`);
    }
    return lines.join("\n");
  }

  async function sendOrder(event) {
    event.preventDefault();
    if (!cart.length) {
      setCheckoutStatus("Adicione pelo menos um produto ao carrinho.");
      return;
    }
    setCheckoutStatus("Enviando pedido...");
    setLastOrder(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      customerName: formData.get("customerName"),
      customerPhone: formData.get("customerPhone"),
      customerDocument: formData.get("customerDocument"),
      deliveryType: formData.get("deliveryType"),
      paymentMethod: formData.get("paymentMethod"),
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
      window.open(whatsappUrl(config, orderMessage(formData, body.id)), "_blank");
      setCart([]);
      setLastOrder({ id: body.id, total: body.total });
      setCheckoutStatus("Pedido enviado para o sistema.");
      event.currentTarget.reset();
    } catch (error) {
      setCheckoutStatus(error.message);
    }
  }

  return (
    <>
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head">
          <h2>Carrinho</h2>
          <button type="button" onClick={onClose}>Fechar</button>
        </div>
        <div className="cart-items">
          {lastOrder ? (
            <div className="checkout-success">
              <strong>Pedido recebido</strong>
              <span>Codigo {lastOrder.id}</span>
              <span>Total {money.format(lastOrder.total || 0)}</span>
            </div>
          ) : null}
          {cart.length ? cart.map((item) => (
            <div className="cart-row" key={item.id}>
              <div><strong>{item.name}</strong><br /><small>{money.format(item.price)} cada</small></div>
              <div className="qty">
                <button type="button" onClick={() => setQty(item.id, -1)}>-</button>
                <strong>{item.qty}</strong>
                <button type="button" onClick={() => setQty(item.id, 1)}>+</button>
              </div>
            </div>
          )) : <div className="empty">Seu carrinho esta vazio.</div>}
        </div>
        <form className="order-form" onSubmit={sendOrder}>
          <label>Nome<input name="customerName" required /></label>
          <label>Telefone<input name="customerPhone" required /></label>
          <label>CPF/CNPJ<input name="customerDocument" placeholder="Opcional" /></label>
          <label>Entrega
            <select name="deliveryType">
              <option>Retirada</option>
              <option>Entrega</option>
            </select>
          </label>
          <label>Pagamento
            <select name="paymentMethod">
              <option>Pix</option>
              <option>Dinheiro</option>
              <option>Cartao de credito</option>
              <option>Cartao de debito</option>
              <option>A combinar</option>
            </select>
          </label>
          <label>Endereco<textarea name="address" placeholder="Opcional para retirada" /></label>
          <label>Observacao<textarea name="notes" placeholder="Opcional" /></label>
          <div className="cart-total"><span>Total</span><strong>{money.format(total)}</strong></div>
          {checkoutStatus ? <div className="checkout-status">{checkoutStatus}</div> : null}
          <button className="btn primary" type="submit" disabled={!cart.length}>Enviar pedido</button>
          <button className="btn ghost" type="button" onClick={() => window.open(whatsappUrl(config, orderMessage()), "_blank")}>Enviar pelo WhatsApp</button>
        </form>
      </aside>
      <button className={`overlay ${open ? "open" : ""}`} type="button" aria-label="Fechar carrinho" onClick={onClose} />
    </>
  );
}

function Admin({ config, reloadConfig }) {
  const [token, setToken] = useState(() => localStorage.getItem("griffy-site-admin-token") || "");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [section, setSection] = useState("dashboard");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState("Todos");
  const [orderSearch, setOrderSearch] = useState("");
  const [form, setForm] = useState({
    theme: "auto",
    themes: DEFAULT_THEMES,
    promoEnabled: false,
    promoTitle: "",
    promoText: "",
    promoButtonText: "",
    promoTarget: "/catalogo",
    whatsapp: "",
    instagram: "",
    address: "",
  });

  useEffect(() => {
    const themes = allThemes(config);
    setForm({
      theme: config.theme || "auto",
      themes,
      promoEnabled: Boolean(config.promo?.enabled),
      promoTitle: config.promo?.title || "",
      promoText: config.promo?.text || "",
      promoButtonText: config.promo?.buttonText || "",
      promoTarget: config.promo?.target || "/catalogo",
      whatsapp: config.whatsapp || "",
      instagram: config.instagram || "",
      address: config.address || "",
    });
    setSelectedTheme(themes[0]?.id || "default");
  }, [config]);

  const selectedThemeData = form.themes.find((theme) => theme.id === selectedTheme) || form.themes[0] || DEFAULT_THEMES[0];
  const visibleOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = orderFilter === "Todos" || order.status === orderFilter;
      const text = `${order.id} ${order.customerName} ${order.customerPhone} ${order.address || ""}`.toLowerCase();
      return matchesStatus && (!search || text.includes(search));
    });
  }, [orders, orderFilter, orderSearch]);

  async function loadOrders(currentToken = token) {
    if (!currentToken) return;
    try {
      const response = await fetch(apiUrl("/api/storefront/admin/orders"), {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Nao foi possivel carregar pedidos.");
      setOrders(body);
    } catch (error) {
      if (error.message.includes("Sessao")) {
        localStorage.removeItem("griffy-site-admin-token");
        setToken("");
      }
      setStatus(error.message);
    }
  }

  useEffect(() => {
    if (token) loadOrders(token);
  }, [token]);

  function updateTheme(id, field, value) {
    setForm({
      ...form,
      themes: form.themes.map((theme) => (theme.id === id ? { ...theme, [field]: value } : theme)),
    });
  }

  function addTheme() {
    const id = `tema-${Date.now()}`;
    const theme = { id, name: "Novo tema", primary: "#fed400", accent: "#111111", success: "#25d366", glow: "rgba(254, 212, 0, 0.25)", builtIn: false };
    setForm({ ...form, themes: [...form.themes, theme], theme: id });
    setSelectedTheme(id);
    setSection("themes");
  }

  function duplicateTheme(theme) {
    const id = `${theme.id}-copia-${Date.now()}`;
    const copy = { ...theme, id, name: `${theme.name || theme.id} copia`, builtIn: false };
    setForm({ ...form, themes: [...form.themes, copy], theme: id });
    setSelectedTheme(id);
  }

  function removeTheme(id) {
    if (DEFAULT_THEMES.some((theme) => theme.id === id)) {
      setStatus("Temas padrao podem ser editados, mas nao removidos.");
      return;
    }
    const nextThemes = form.themes.filter((theme) => theme.id !== id);
    setForm({ ...form, themes: nextThemes, theme: form.theme === id ? "auto" : form.theme });
    setSelectedTheme(nextThemes[0]?.id || "default");
  }

  async function login(event) {
    event.preventDefault();
    setStatus("Entrando...");
    try {
      const response = await fetch(apiUrl("/api/storefront/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Nao foi possivel entrar.");
      localStorage.setItem("griffy-site-admin-token", body.token);
      setToken(body.token);
      setPin("");
      setStatus("Acesso liberado.");
      await loadOrders(body.token);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    setStatus("Salvando...");
    try {
      const response = await fetch(apiUrl("/api/storefront/admin/config"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          theme: form.theme,
          themes: form.themes,
          promo: {
            enabled: form.promoEnabled,
            title: form.promoTitle,
            text: form.promoText,
            buttonText: form.promoButtonText,
            target: form.promoTarget || "/catalogo",
          },
          whatsapp: form.whatsapp,
          instagram: form.instagram,
          address: form.address,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Nao foi possivel salvar.");
      await reloadConfig();
      setStatus("Configuracoes salvas com sucesso.");
    } catch (error) {
      if (error.message.includes("Sessao")) {
        localStorage.removeItem("griffy-site-admin-token");
        setToken("");
      }
      setStatus(error.message);
    }
  }

  async function updateOrderStatus(id, nextStatus) {
    setStatus("Atualizando pedido...");
    try {
      const response = await fetch(apiUrl(`/api/storefront/admin/orders/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Nao foi possivel atualizar o pedido.");
      await loadOrders();
      setStatus("Pedido atualizado.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="admin-main wp-admin">
        {!token ? (
          <section className="container admin-login-shell">
          <form className="admin-card admin-login-card" onSubmit={login}>
            <div className="form-section">
              <h2>Acesso seguro</h2>
              <p>Entre com o PIN de administrador para gerenciar temas, promocao e dados do site.</p>
              <label>PIN do administrador<input value={pin} onChange={(event) => setPin(event.target.value)} type="password" required autoComplete="current-password" /></label>
            </div>
            <div className="admin-actions">
              <span>{status}</span>
              <button className="btn primary" type="submit">Entrar</button>
            </div>
          </form>
          </section>
        ) : (
          <form className="wp-shell" onSubmit={save}>
            <aside className="wp-sidebar">
              <img src="/store-assets/logo-lovable.png" alt="GRIFFY STORE" />
              <button type="button" className={section === "dashboard" ? "active" : ""} onClick={() => setSection("dashboard")}>Painel</button>
              <button type="button" className={section === "orders" ? "active" : ""} onClick={() => setSection("orders")}>Pedidos</button>
              <button type="button" className={section === "themes" ? "active" : ""} onClick={() => setSection("themes")}>Temas</button>
              <button type="button" className={section === "promo" ? "active" : ""} onClick={() => setSection("promo")}>Promocao</button>
              <button type="button" className={section === "contact" ? "active" : ""} onClick={() => setSection("contact")}>Contato</button>
              <a href="/" target="_blank" rel="noreferrer">Ver site</a>
            </aside>
            <section className="wp-content">
              <header className="wp-top">
                <div>
                  <span className="section-kicker">Administracao do site</span>
                  <h1>Painel da loja virtual</h1>
                </div>
                <div className="admin-button-row">
                  <button className="btn ghost" type="button" onClick={() => { localStorage.removeItem("griffy-site-admin-token"); setToken(""); }}>Sair</button>
                  <button className="btn primary" type="submit">Salvar alteracoes</button>
                </div>
              </header>

              {section === "dashboard" ? (
                <div className="wp-dashboard">
                  <article className="wp-stat"><span>Tema ativo</span><strong>{form.theme === "auto" ? "Automatico" : allThemes({ themes: form.themes }).find((theme) => theme.id === form.theme)?.name || form.theme}</strong></article>
                  <article className="wp-stat"><span>Pedidos novos</span><strong>{orders.filter((order) => order.status === "Novo").length}</strong></article>
                  <article className="wp-stat"><span>Temas cadastrados</span><strong>{form.themes.length}</strong></article>
                  <article className="wp-stat"><span>Promocao</span><strong>{form.promoEnabled ? "Ativa" : "Desativada"}</strong></article>
                  <div className="wp-card wide">
                    <h2>Publicacao</h2>
                    <p>Use este painel para trocar campanhas sazonais, criar temas comemorativos e manter o contato do site atualizado sem alterar produtos no sistema desktop.</p>
                    <div className="admin-actions"><span>{status}</span><button className="btn primary" type="submit">Salvar agora</button></div>
                  </div>
                </div>
              ) : null}

              {section === "orders" ? (
                <div className="wp-card orders-card">
                  <div className="wp-card-head">
                    <h2>Pedidos online</h2>
                    <button className="btn ghost" type="button" onClick={() => loadOrders()}>Atualizar</button>
                  </div>
                  <div className="order-toolbar">
                    <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Buscar cliente, telefone ou codigo" />
                    <select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}>
                      {["Todos", "Novo", "Em atendimento", "Separado", "Concluido", "Cancelado"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  {!visibleOrders.length ? (
                    <div className="empty">Nenhum pedido online recebido ainda.</div>
                  ) : (
                    <div className="orders-list">
                      {visibleOrders.map((order) => (
                        <article className="order-panel" key={order.id}>
                          <div className="order-head">
                            <div>
                              <strong>{order.customerName}</strong>
                              <span>{order.id} - {new Date(order.createdAt).toLocaleString("pt-BR")} - {order.customerPhone}</span>
                            </div>
                            <select value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>
                              {["Novo", "Em atendimento", "Separado", "Concluido", "Cancelado"].map((item) => <option key={item}>{item}</option>)}
                            </select>
                          </div>
                          <div className="order-items">
                            {order.items.map((item) => (
                              <div key={item.id}><span>{item.qty}x {item.productName}</span><strong>{money.format(item.qty * item.price)}</strong></div>
                            ))}
                          </div>
                          <div className="order-foot">
                            <span>{order.deliveryType}{order.paymentMethod ? ` - ${order.paymentMethod}` : ""}{order.address ? ` - ${order.address}` : ""}</span>
                            <strong>{money.format(order.total)}</strong>
                          </div>
                          {order.notes ? <p>{order.notes}</p> : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {section === "themes" ? (
                <div className="wp-themes">
                  <div className="wp-card">
                    <div className="wp-card-head">
                      <h2>Temas</h2>
                      <button className="btn primary" type="button" onClick={addTheme}>Novo tema</button>
                    </div>
                    <label>Tema ativo
                      <select value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })}>
                        <option value="auto">Automatico por data</option>
                        {form.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name || theme.id}</option>)}
                      </select>
                    </label>
                    <div className="theme-list">
                      {form.themes.map((theme) => (
                        <button type="button" key={theme.id} className={selectedTheme === theme.id ? "active" : ""} onClick={() => setSelectedTheme(theme.id)}>
                          <span style={{ background: theme.primary }} />
                          {theme.name || theme.id}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="wp-card theme-editor">
                    <div className="wp-card-head">
                      <h2>Editar tema</h2>
                      <div className="admin-button-row">
                        <button className="btn ghost" type="button" onClick={() => duplicateTheme(selectedThemeData)}>Duplicar</button>
                        <button className="btn ghost" type="button" onClick={() => removeTheme(selectedThemeData.id)}>Excluir</button>
                      </div>
                    </div>
                    <label>Nome<input value={selectedThemeData.name || ""} onChange={(event) => updateTheme(selectedThemeData.id, "name", event.target.value)} /></label>
                    <div className="split-fields">
                      <label>Cor principal<input type="color" value={selectedThemeData.primary || "#fed400"} onChange={(event) => updateTheme(selectedThemeData.id, "primary", event.target.value)} /></label>
                      <label>Fundo de destaque<input type="color" value={selectedThemeData.accent || "#141207"} onChange={(event) => updateTheme(selectedThemeData.id, "accent", event.target.value)} /></label>
                      <label>WhatsApp/sucesso<input type="color" value={selectedThemeData.success || "#25d366"} onChange={(event) => updateTheme(selectedThemeData.id, "success", event.target.value)} /></label>
                      <label>Brilho<input value={selectedThemeData.glow || "rgba(254, 212, 0, 0.25)"} onChange={(event) => updateTheme(selectedThemeData.id, "glow", event.target.value)} /></label>
                    </div>
                    <div className="theme-preview" style={{ "--preview-primary": selectedThemeData.primary, "--preview-accent": selectedThemeData.accent, "--preview-success": selectedThemeData.success }}>
                      <span>Preview</span>
                      <strong>{selectedThemeData.name}</strong>
                      <button type="button">Botao</button>
                    </div>
                  </div>
                </div>
              ) : null}

              {section === "promo" ? (
                <div className="wp-card">
                  <h2>Barra promocional</h2>
                  <label className="switch-row"><input checked={form.promoEnabled} onChange={(event) => setForm({ ...form, promoEnabled: event.target.checked })} type="checkbox" /> Mostrar barra promocional</label>
                  <label>Titulo<input value={form.promoTitle} onChange={(event) => setForm({ ...form, promoTitle: event.target.value })} /></label>
                  <label>Texto<textarea value={form.promoText} onChange={(event) => setForm({ ...form, promoText: event.target.value })} /></label>
                  <div className="split-fields">
                    <label>Texto do botao<input value={form.promoButtonText} onChange={(event) => setForm({ ...form, promoButtonText: event.target.value })} /></label>
                    <label>Destino do botao<input value={form.promoTarget} onChange={(event) => setForm({ ...form, promoTarget: event.target.value })} /></label>
                  </div>
                </div>
              ) : null}

              {section === "contact" ? (
                <div className="wp-card">
                  <h2>Contato e loja</h2>
                  <div className="split-fields">
                    <label>WhatsApp<input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></label>
                    <label>Instagram<input value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} /></label>
                  </div>
                  <label>Endereco<textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
                </div>
              ) : null}
              <div className="wp-status">{status}</div>
            </section>
          </form>
        )}
    </main>
  );
}

function Footer({ config }) {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <img src="/store-assets/logo-lovable.png" alt="GRIFFY STORE" />
          <p>Ha mais de 10 anos conectando voce a melhor tecnologia.</p>
        </div>
        <div>
          <strong>Navegacao</strong>
          <a href="/">Inicio</a>
          <a href="/catalogo">Catalogo</a>
          <a href="/#assistencia">Assistencia</a>
          <a href="/#contato">Contato</a>
        </div>
        <div>
          <strong>Contato</strong>
          <span>{config.address || "Rua Maragogi, no 27 - Penha"}</span>
          <span>{config.whatsapp || config.phone || "Fale com nossa equipe pelo WhatsApp."}</span>
          <span>griffystoreoficial01@gmail.com</span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  const { config, reloadConfig } = useStoreConfig();
  const [cartCount, setCartCount] = useState(() => JSON.parse(localStorage.getItem("griffy-web-cart") || "[]").reduce((sum, item) => sum + item.qty, 0));
  const path = window.location.pathname;
  const isCatalog = path.startsWith("/catalogo");
  const isAdmin = path.startsWith("/admin");

  useEffect(() => {
    const timer = setInterval(() => {
      setCartCount(JSON.parse(localStorage.getItem("griffy-web-cart") || "[]").reduce((sum, item) => sum + item.qty, 0));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <PromoBar promo={config.promo} />
      <Header config={config} cartCount={cartCount} onCart={isCatalog ? () => document.dispatchEvent(new CustomEvent("griffy-open-cart")) : null} />
      {isAdmin ? <Admin config={config} reloadConfig={reloadConfig} /> : isCatalog ? <Catalog config={config} /> : <Home config={config} />}
      {!isAdmin ? <Footer config={config} /> : null}
      {!isAdmin ? <a className="whatsapp-fab" href={whatsappUrl(config, "Ola, vim pela loja virtual da Griffy Store.")} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp">W</a> : null}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
