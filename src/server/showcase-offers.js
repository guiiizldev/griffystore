function cleanLine(value) {
  return value.replace(/[*_~]/g, "").trim();
}

function offerMoney(value) {
  let text = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  const warnings = [];
  if (/^\d{1,3}(?::\d{3})+(?:,\d{1,3})?$/.test(text)) {
    text = text.replace(/:/g, ".");
    warnings.push("Separador de milhar corrigido: confira o preco.");
  }
  if (/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,3}$/.test(text)) {
    const [integer, fraction] = text.split(",");
    if (fraction.length === 3 && !fraction.endsWith("0")) return null;
    if (fraction.length !== 2) warnings.push("Casas decimais ajustadas: confira o preco.");
    text = integer.replace(/\./g, "") + "." + fraction.padEnd(2, "0").slice(0, 2);
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || Number(text) <= 0) return null;
  return { value: Number(text), warnings };
}

function offerModel(value) {
  const match = /^(?:iphone\s*)?(\d{1,2}e?|air|duo)(?:\s+(pro\s*max|pm|pro|plus|mini))?\s+((?:(?:e\s*sim)\s+)*)(\d{1,4})\s*(gb?|tb)?\b(.*)$/i.exec(value);
  if (!match) return null;
  const generation = /^(air|duo)$/i.test(match[1]) ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : match[1].toLowerCase();
  const suffix = match[2] ? { pm: "Pro Max", promax: "Pro Max", pro: "Pro", plus: "Plus", mini: "Mini" }[match[2].replace(/\s/g, "").toLowerCase()] : "";
  return { model: `iPhone ${generation}${suffix ? ` ${suffix}` : ""}`, storage: `${match[4]}${/^tb$/i.test(match[5] || "") ? "TB" : "GB"}`, notes: [match[3].trim(), match[6].trim()].filter(Boolean).join(" ") };
}

function offerColor(value) {
  const match = /^(preto|branco|azul|rosa|verde|laranja|silver|prata|gold|dourado|natural|lavanda|bord[o\u00f4]|amarelo|roxo|vermelho)(?:\s*\(([^)]+)\))?\s*$/i.exec(value);
  if (!match) return null;
  const token = match[1].toLowerCase();
  const color = token[0].toUpperCase() + token.slice(1);
  const quantity = match[2] && /^\d+$/.test(match[2]) ? Number(match[2]) : undefined;
  const detail = quantity === undefined ? match[2] || "" : "";
  return { color: /grafite/i.test(detail) ? `${color} (${detail})` : color, quantity, notes: /grafite/i.test(detail) ? "" : detail };
}

function offerList(text) {
  const rows = [];
  let condition = "", current = null, previous = null;
  const finish = () => {
    if (!current) return;
    const batteries = [...new Set(current.batteries)];
    const batteryNotes = batteries.length > 1 ? `Baterias informadas: ${batteries.map(value => `${value}%`).join(", ")}. Consultar unidade.` : "";
    const variants = [...current.variants, ...current.colors.map(color => ({ ...color, price: "", previousPrice: "" }))];
    for (const variant of variants.length ? variants : [{ price: "", color: "" }]) {
      const warning = ["Quantidade inicial 1: confirme disponibilidade.", ...current.warnings, ...(variant.warnings || [])];
      if (batteries.length > 1) warning.push("Varias baterias sem vinculo com uma cor: informe a unidade ou mantenha os valores nas observacoes.");
      rows.push({ line: current.line, input: {
        model: current.model, storage: current.storage, condition: current.condition,
        color: variant.color || "", price: variant.price, previousPrice: variant.previousPrice ?? "",
        quantity: variant.quantity ?? 1, battery: batteries.length === 1 ? batteries[0] : "",
        notes: [...current.notes, variant.notes || "", batteryNotes].filter(Boolean).join(". "),
      }, warning: [...new Set(warning)].join(" "), needsReview: true });
    }
    current = null;
  };
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = cleanLine(raw);
    if (!line) return;
    if (/^[-\u2013\u2014\s]{3,}$/.test(line)) { finish(); previous = null; return; }
    if (/^(seminovos|lacrados|novos)$/i.test(line)) {
      finish(); previous = null;
      condition = { seminovos: "Seminovo", lacrados: "Lacrado", novos: "Novo" }[line.toLowerCase()];
      return;
    }
    const reference = /^de\s*:\s*(.*)$/i.exec(line);
    if (reference) {
      previous = reference[1] ? offerMoney(reference[1]) || { value: "", warnings: ["Preco anterior invalido na origem: confira o campo De."] } : null;
      return;
    }
    const model = offerModel(line);
    if (model) {
      finish();
      current = { ...model, condition: /\blacrado\b/i.test(line) ? "Lacrado" : /\bseminovo\b/i.test(line) ? "Seminovo" : condition,
        notes: model.notes ? [model.notes] : [], variants: [], colors: [], batteries: [], warnings: [], line: index + 1 };
      if (/\bcpo\b/i.test(line)) current.warnings.push("CPO informado: confira condicao, origem e garantia.");
      return;
    }
    if (!current) return;
    const batteries = [...line.matchAll(/\b(\d{1,3})\s*%/g)];
    if (batteries.length && line.replace(/\b\d{1,3}\s*%/g, "").trim() === "") {
      current.batteries.push(...batteries.map(match => Number(match[1])));
      return;
    }
    const color = offerColor(line);
    if (color) { current.colors.push(color); return; }
    const price = offerMoney(line);
    if (price) {
      const colors = current.colors.length ? current.colors : current.variants.length ? null : [{}];
      if (!colors) { current.warnings.push(`Preco sem cor ou modelo associado: ${line}. Confira a lista.`); return; }
      for (const variant of colors) current.variants.push({ ...variant, price: price.value, previousPrice: previous?.value ?? "", warnings: [...price.warnings, ...(previous?.warnings || [])] });
      current.colors = [];
      return;
    }
    if (/^(?:R\$\s*)?[\d.,:]+$/.test(line)) {
      current.warnings.push(`Preco invalido na origem: ${line}. Preencha o preco manualmente.`);
      return;
    }
    current.notes.push(line);
  });
  finish();
  if (!rows.length || rows.length > 500) throw new Error("Nao foram encontrados aparelhos na lista (limite: 500).");
  return rows;
}

module.exports = { offerList, offerModel, offerMoney };
