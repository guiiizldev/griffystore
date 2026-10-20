import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Search,
  ArrowUpRight,
  MessageCircle,
  Smartphone,
  MapPin,
  X,
  SlidersHorizontal,
  Upload,
  Download,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Check,
  RefreshCw,
} from "lucide-react";
import "./showcase.css";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const base = import.meta.env.VITE_API_BASE_URL || "";
const columns = [
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
const blank = () => ({
  model: "",
  storage: "",
  color: "",
  condition: "",
  price: "",
  quantity: 1,
  image: "",
  notes: "",
});
async function api(path, token, options = {}) {
  const response = await fetch(`${base}/api/storefront${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Nao foi possivel carregar a vitrine.");
  return data;
}
function chat(config, device) {
  const digits = String(config.whatsapp || config.phone || "").replace(
    /\D/g,
    "",
  );
  const phone = digits && !digits.startsWith("55") ? `55${digits}` : digits;
  const message = device
    ? `Ola! Vi na vitrine da Griffy Store: ${device.model}, ${device.storage}, ${device.color || "cores sob consulta"}, ${device.condition}, por ${money.format(device.price)}. Ainda esta disponivel?`
    : "Ola! Gostaria de consultar os aparelhos disponiveis na Griffy Store.";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
function DevicePhoto({ device }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [device.image]);
  return (
    <div className="device-photo">
      {device.image && !broken ? (
        <img
          src={device.image}
          alt={`${device.model} - ${device.imageKind === "reference" ? "imagem ilustrativa do modelo" : device.color}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="device-photo-missing">
          <Smartphone size={48} />
          <span>{device.model}</span>
          <small>Foto indisponivel</small>
        </div>
      )}
      {device.imageKind === "reference" && !broken ? (
        <small className="photo-reference">Imagem ilustrativa do modelo</small>
      ) : null}
    </div>
  );
}
function DeviceDetails({ device, config, close }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="device-dialog"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby="device-title"
    >
      <div className="device-dialog-inner">
        <button
          className="showcase-icon"
          type="button"
          title="Fechar detalhes"
          aria-label="Fechar detalhes"
          onClick={close}
        >
          <X />
        </button>
        <DevicePhoto device={device} />
        <div className="device-detail-copy">
          <span className="device-condition">{device.condition}</span>
          <h2 id="device-title">{device.model}</h2>
          <p className="device-detail-price">{money.format(device.price)}</p>
          <dl>
            {[
              ["Armazenamento", device.storage],
              ["Cor", device.color || "Cores sob consulta"],
              ["Condicao", device.condition],
              ["Disponibilidade", "Em estoque"],
              ...(device.battery !== null && device.battery !== undefined
                ? [["Saude da bateria", `${device.battery}%`]]
                : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {device.notes ? <p className="device-notes">{device.notes}</p> : null}
          <a
            className="btn primary"
            href={chat(config, device)}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> Tenho interesse
          </a>
        </div>
      </div>
    </dialog>
  );
}
export function DeviceShowcase({ config }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("");
  const [storage, setStorage] = useState("");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setDevices(await api("/devices"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(
    () =>
      devices
        .filter(
          (device) =>
            `${device.model} ${device.color} ${device.storage}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()) &&
            (!condition || device.condition === condition) &&
            (!storage || device.storage === storage),
        )
        .sort((a, b) =>
          sort === "low"
            ? a.price - b.price
            : sort === "high"
              ? b.price - a.price
              : sort === "name"
                ? a.model.localeCompare(b.model, "pt-BR")
                : new Date(b.updatedAt) - new Date(a.updatedAt),
        ),
    [devices, query, condition, storage, sort],
  );
  return (
    <main className="device-showcase">
      <section className="showcase-heading">
        <div className="container">
          <div className="showcase-title">
            <div>
              <span className="showcase-kicker">VITRINE ONLINE</span>
              <h1>Aparelhos disponiveis</h1>
              <p>
                Seu proximo smartphone esta aqui. Escolha o seu e fale com a
                nossa equipe.
              </p>
            </div>
            <span className="showcase-location">
              <MapPin size={18} /> Penha, Rio de Janeiro
            </span>
          </div>
          <div className="showcase-assurances">
            <span>
              <Check size={15} /> Lacrados e seminovos
            </span>
            <span>
              <MapPin size={15} /> Loja fisica na Penha
            </span>
            <span>
              <MessageCircle size={15} /> Atendimento pelo WhatsApp
            </span>
          </div>
        </div>
      </section>
      <section className="container showcase-content">
        <div className="showcase-toolbar">
          <label className="showcase-search">
            <Search size={19} />
            <input
              type="search"
              aria-label="Buscar aparelho"
              placeholder="Busque modelo, memoria ou cor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="showcase-sort">
            <SlidersHorizontal size={17} />
            <select
              aria-label="Ordenar aparelhos"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Mais recentes</option>
              <option value="low">Menor preco</option>
              <option value="high">Maior preco</option>
              <option value="name">Nome A-Z</option>
            </select>
          </label>
        </div>
        <div className="showcase-filters">
          <div role="group" aria-label="Condicao do aparelho">
            {["", "Lacrado", "Novo", "Seminovo"].map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={condition === value}
                className={condition === value ? "selected" : ""}
                onClick={() => setCondition(value)}
              >
                {value || "Todos os aparelhos"}
              </button>
            ))}
          </div>
          <select
            aria-label="Armazenamento"
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
          >
            <option value="">Todas as memorias</option>
            {Array.from(new Set(devices.map((d) => d.storage))).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="showcase-result">
          <span>
            {loading
              ? "Carregando aparelhos..."
              : `${filtered.length} aparelho${filtered.length === 1 ? "" : "s"} disponive${filtered.length === 1 ? "l" : "is"}`}
          </span>
          {query || condition || storage ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCondition("");
                setStorage("");
              }}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
        {error ? (
          <div className="showcase-empty" role="alert">
            <p>{error}</p>
            <button className="btn ghost" type="button" onClick={load}>
              <RefreshCw size={18} /> Tentar novamente
            </button>
          </div>
        ) : loading ? (
          <div className="device-grid" aria-busy="true">
            {[1, 2, 3, 4].map((id) => (
              <div className="device-skeleton" key={id} />
            ))}
          </div>
        ) : (
          <div className="device-grid">
            {filtered.map((device) => (
              <article className="device-card" key={device.id}>
                <button
                  type="button"
                  className="device-open"
                  onClick={() => setSelected(device)}
                  aria-label={`Ver detalhes de ${device.model}`}
                >
                  <DevicePhoto device={device} />
                </button>
                <div className="device-card-copy">
                  <div className="device-card-tags">
                    <span>{device.condition}</span>
                    <span className="device-available">Em estoque</span>
                  </div>
                  <h2>{device.model}</h2>
                  <p className="device-variant">
                    {device.storage} <span>/</span>{" "}
                    {device.color || "Cores sob consulta"}
                  </p>
                  <strong className="device-price">
                    {money.format(device.price)}
                  </strong>
                  <div className="device-card-actions">
                    <a
                      className="btn primary"
                      href={chat(config, device)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={17} /> Tenho interesse
                    </a>
                    <button
                      type="button"
                      className="showcase-icon"
                      title="Ver detalhes"
                      aria-label={`Detalhes de ${device.model}`}
                      onClick={() => setSelected(device)}
                    >
                      <ArrowUpRight size={19} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && !filtered.length ? (
          <div className="showcase-empty">
            <Smartphone size={35} />
            <h2>
              {devices.length
                ? "Nenhum aparelho com esses filtros"
                : "Novos aparelhos em breve"}
            </h2>
            <p>
              {devices.length
                ? "Experimente outro modelo, memoria ou condicao."
                : "Consulte nossa equipe para saber o que chegou na loja."}
            </p>
            <a
              className="btn ghost"
              href={chat(config)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} /> Consultar disponibilidade
            </a>
          </div>
        ) : null}
      </section>
      {selected ? (
        <DeviceDetails
          device={selected}
          config={config}
          close={() => setSelected(null)}
        />
      ) : null}
    </main>
  );
}
export function ShowcaseAdmin({ token }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState([]);
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  async function load(includeDraft = false) {
    try {
      setDevices(await api("/admin/devices", token));
      if (includeDraft) {
        const draft = await api("/admin/devices/draft", token);
        setText(draft.text || "");
      }
    } catch (e) {
      setStatus(e.message);
    }
  }
  useEffect(() => {
    load(true);
  }, [token]);
  function update(index, field, value) {
    setRows((current) =>
      current.map((row, i) =>
        i === index
          ? { ...row, input: { ...row.input, [field]: value }, error: "" }
          : row,
      ),
    );
    setChecked(false);
  }
  async function preview(fromDraft = false) {
    setBusy(true);
    setStatus("");
    try {
      const source = fromDraft
        ? Papa.unparse(
            rows.map((row) => row.input),
            { columns, delimiter: ";" },
          )
        : text;
      const result = await api("/admin/devices/preview", token, {
        method: "POST",
        body: JSON.stringify({ text: source }),
      });
      const nextRows = result.rows.map((row, index) => ({
        ...row,
        warning: fromDraft ? rows[index]?.warning || row.warning : row.warning,
        needsReview: fromDraft ? rows[index]?.needsReview : row.needsReview,
        reviewed: fromDraft ? rows[index]?.reviewed : false,
        input: {
          ...blank(),
          ...row.input,
          ...(fromDraft && rows[index]?.input.id
            ? { id: rows[index].input.id }
            : {}),
        },
      }));
      setRows(nextRows);
      setChecked(
        nextRows.length > 0 &&
          nextRows.every(
            (row) => !row.error && (!row.needsReview || row.reviewed),
          ),
      );
      setStatus(
        result.rows.some((row) => row.error)
          ? "Existem dados para corrigir antes da publicacao."
          : `${result.rows.length} aparelhos revisados.`,
      );
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!checked) return;
    setBusy(true);
    try {
      const result = await api("/admin/devices/publish", token, {
        method: "POST",
        body: JSON.stringify({ devices: rows.map((row) => row.input) }),
      });
      setStatus(`${result.count} aparelhos publicados na vitrine.`);
      setRows([]);
      setText("");
      setChecked(false);
      await load();
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(device) {
    setBusy(true);
    try {
      await api(`/admin/devices/${device.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ active: !device.active }),
      });
      await load();
      setStatus(device.active ? "Aparelho ocultado." : "Aparelho publicado.");
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  function template() {
    const csv =
      "modelo;memoria;cor;condicao;preco;quantidade;imagem;observacoes\niPhone 13;128GB;Preto;Seminovo;2.499,00;1;;\niPhone 15;256GB;Azul;Lacrado;4.999,00;2;;";
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-vitrine-griffy.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function file(event) {
    const selected = event.target.files[0];
    if (!selected) return;
    if (selected.size > 200000) {
      setStatus("Arquivo maior que 200 KB.");
      return;
    }
    setText(await selected.text());
    setRows([]);
    setChecked(false);
    setStatus("Lista carregada.");
  }
  return (
    <section
      className="showcase-admin"
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          e.target.tagName === "INPUT" &&
          e.target.type !== "file"
        )
          e.preventDefault();
      }}
    >
      <div className="showcase-admin-heading">
        <div>
          <span className="section-kicker">APARELHOS DA LOJA</span>
          <h2>Gerenciar vitrine</h2>
        </div>
        <a
          className="btn ghost"
          href="/"
          target="_blank"
          rel="noreferrer"
        >
          <Eye size={18} /> Ver vitrine
        </a>
      </div>
      <div className="showcase-admin-metrics">
        <div>
          <strong>
            {devices.filter((d) => d.active && d.quantity > 0).length}
          </strong>
          <span>anuncios visiveis</span>
        </div>
        <div>
          <strong>{devices.filter((d) => !d.active).length}</strong>
          <span>anuncios ocultos</span>
        </div>
      </div>
      <h3>Importar lista de aparelhos</h3>
      <div className="showcase-import-actions">
        <label className="btn ghost">
          <Upload size={17} /> Selecionar CSV ou TXT
          <input
            type="file"
            accept=".csv,.txt,text/plain,text/csv"
            onChange={file}
            disabled={busy}
          />
        </label>
        <button type="button" className="btn ghost" onClick={template}>
          <Download size={17} /> Modelo CSV
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() => {
            setRows((old) => [...old, { input: blank(), error: "" }]);
            setChecked(false);
          }}
        >
          <Plus size={17} /> Adicionar aparelho
        </button>
      </div>
      <label>
        Lista de aparelhos
        <textarea
          rows="5"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setChecked(false);
          }}
          placeholder="modelo;memoria;cor;condicao;preco;quantidade;imagem;observacoes"
        />
      </label>
      <button
        className="btn primary"
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => preview(false)}
      >
        <SlidersHorizontal size={17} /> Ler lista
      </button>
      {status ? (
        <p className="showcase-admin-status" role="status">
          {status}
        </p>
      ) : null}
      {rows.length ? (
        <section className="showcase-review">
          <h3>Revisao da publicacao</h3>
          <div className="showcase-bulk-review">
            <label>
              Condicao dos aparelhos sem informacao
              <select
                value=""
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value) {
                    setRows((current) =>
                      current.map((row) => ({
                        ...row,
                        input: {
                          ...row.input,
                          condition: row.input.condition || value,
                        },
                      })),
                    );
                    setChecked(false);
                  }
                }}
              >
                <option value="">Definir condicao da lista</option>
                <option>Seminovo</option>
                <option>Lacrado</option>
                <option>Novo</option>
              </select>
            </label>
            <label className="review-confirm">
              <input
                type="checkbox"
                checked={rows.every((row) => !row.needsReview || row.reviewed)}
                onChange={(event) => {
                  setRows((current) =>
                    current.map((row) => ({
                      ...row,
                      reviewed: event.target.checked,
                    })),
                  );
                  setChecked(false);
                }}
              />{" "}
              Conferi precos, cores, quantidade e disponibilidade
            </label>
          </div>
          {rows.map((row, index) => (
            <div className="showcase-review-row" key={index}>
              <div className="showcase-review-heading">
                <strong>Aparelho {index + 1}</strong>
                <button
                  type="button"
                  className="showcase-icon"
                  title="Remover da revisao"
                  aria-label={`Remover aparelho ${index + 1}`}
                  onClick={() => {
                    setRows((old) => old.filter((_, i) => i !== index));
                    setChecked(false);
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="showcase-review-fields">
                {[
                  ["model", "Modelo"],
                  ["storage", "Memoria"],
                  ["color", "Cor"],
                  ["price", "Preco (R$)"],
                  ["quantity", "Quantidade"],
                  ["battery", "Bateria (%) - opcional"],
                ].map(([field, label]) => (
                  <label key={field}>
                    {label}
                    <input
                      value={row.input[field] ?? ""}
                      type={field === "quantity" ? "number" : "text"}
                      inputMode={field === "price" ? "decimal" : undefined}
                      min={field === "quantity" ? "0" : undefined}
                      onChange={(e) => update(index, field, e.target.value)}
                      disabled={
                        busy ||
                        Boolean(
                          row.input.id &&
                            ["model", "storage", "color"].includes(field),
                        )
                      }
                    />
                  </label>
                ))}
                <label>
                  Condicao
                  <select
                    value={row.input.condition}
                    onChange={(e) => update(index, "condition", e.target.value)}
                    disabled={busy || Boolean(row.input.id)}
                  >
                    <option value="">Nao informada</option>
                    <option>Lacrado</option>
                    <option>Novo</option>
                    <option>Seminovo</option>
                  </select>
                </label>
                <label className="review-wide">
                  Foto (URL HTTPS)
                  <input
                    type="url"
                    value={row.input.image || ""}
                    onChange={(e) => update(index, "image", e.target.value)}
                    placeholder="Automatica quando o modelo e reconhecido"
                    disabled={busy}
                  />
                </label>
                <label className="review-wide">
                  Observacoes
                  <textarea
                    rows="2"
                    value={row.input.notes || ""}
                    onChange={(e) => update(index, "notes", e.target.value)}
                    disabled={busy}
                  />
                </label>
              </div>
              {row.device ? (
                <div className="review-photo">
                  <DevicePhoto device={row.device} />
                  <span>
                    {row.device.model} ·{" "}
                    {row.device.imageKind === "reference"
                      ? "Foto ilustrativa automatica"
                      : row.device.imageKind === "custom"
                        ? "Foto informada"
                        : "Sem foto"}
                  </span>
                </div>
              ) : null}
              {row.error ? <p className="review-warning">{row.error}</p> : null}
              {row.warning ? (
                <p className="review-warning">{row.warning}</p>
              ) : null}
            </div>
          ))}
          <div className="showcase-import-actions">
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => preview(true)}
            >
              <RefreshCw size={17} /> Revisar dados
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={publish}
              disabled={busy || !checked}
            >
              <Check size={17} /> Publicar {rows.length} aparelhos
            </button>
          </div>
        </section>
      ) : null}
      <h3>Aparelhos cadastrados</h3>
      <div className="showcase-admin-list">
        {devices.map((device) => (
          <div key={device.id}>
            <div>
              <strong>
                {device.model} · {device.storage}
              </strong>
              <span>
                {device.color || "Cores sob consulta"} · {device.condition} ·{" "}
                {money.format(device.price)} · {device.quantity} un.
              </span>
              <small>
                {device.active && device.quantity > 0
                  ? "Visivel"
                  : device.active
                    ? "Sem estoque"
                    : "Oculto"}
              </small>
            </div>
            <div className="showcase-list-actions">
              <button
                type="button"
                className="showcase-icon"
                disabled={busy}
                title="Editar aparelho"
                aria-label={`Editar ${device.model}`}
                onClick={() => {
                  setRows([
                    {
                      input: {
                        ...device,
                        image:
                          device.imageKind === "reference" ? "" : device.image,
                      },
                      error: "",
                    },
                  ]);
                  setChecked(false);
                  setStatus("Aparelho carregado para revisao.");
                  document
                    .querySelector(".showcase-review")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Pencil size={17} />
              </button>
              <button
                type="button"
                className="showcase-icon"
                disabled={busy}
                title={device.active ? "Ocultar aparelho" : "Publicar aparelho"}
                aria-label={
                  device.active
                    ? `Ocultar ${device.model}`
                    : `Publicar ${device.model}`
                }
                onClick={() => toggle(device)}
              >
                {device.active ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      {!devices.length ? (
        <p className="muted-count">Nenhum aparelho cadastrado na vitrine.</p>
      ) : null}
    </section>
  );
}
