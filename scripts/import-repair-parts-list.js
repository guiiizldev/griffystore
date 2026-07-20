const fs = require("fs");
const path = require("path");
const { db, closeDb } = require("../src/server/database");

function uid(prefix) {
  return `${prefix}${Date.now()}${Math.random().toString(16).slice(2, 7)}`;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\uFEFF/g, "")
    .replace(/Ã|Á/g, "A")
    .replace(/Ã‰|É/g, "E")
    .replace(/Ã|Í/g, "I")
    .replace(/Ã“|Ó/g, "O")
    .replace(/Ãš|Ú/g, "U")
    .replace(/Ã£|ã/g, "a")
    .replace(/Ã§|ç/g, "c")
    .replace(/âŒ|❌/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

function parseQty(rawLine) {
  const line = cleanText(rawLine).toLowerCase();
  if (/(^|[\s-])x($|[\s-])/.test(line) || line.includes("â") || line.includes("❌")) return 0;
  const match = cleanText(rawLine).match(/-\s*(\d+)\b|\s+(\d+)\s*$/);
  return match ? Number(match[1] || match[2] || 0) : 0;
}

function stripQty(rawLine) {
  const line = cleanText(rawLine);
  if (/-\s*(x|âŒ|❌|\d+)\b.*$/i.test(line)) {
    return line.replace(/-\s*(x|âŒ|❌|\d+)\b.*$/i, "").trim();
  }
  return line.replace(/\s+\d+\s*$/i, "").trim();
}

function titlePhone(value) {
  return cleanText(value)
    .replace(/^iphone/i, "iPhone")
    .replace(/\bpmx\b/gi, "Pro Max")
    .replace(/(\d)(pro)\b/gi, "$1 Pro")
    .replace(/\bpro\b/gi, "Pro")
    .replace(/\bold\b/gi, "OLED")
    .replace(/\boled\b/gi, "OLED")
    .replace(/\binc\b/gi, "Inc")
    .replace(/\bca\b/gi, "CA")
    .replace(/\bsa\b/gi, "SA")
    .replace(/\bi\b/g, "I")
    .replace(/\bo\b/g, "O")
    .replace(/\s*\/\s*/g, "/");
}

function partName(section, brand, item) {
  const normalized = titlePhone(item);
  if (section === "BATERIAS") return `Bateria ${normalized}`;
  if (section === "TELAS IPHONE") return `Tela ${normalized}`;
  return `Tela ${brand} ${normalized}`;
}

function parseList(content) {
  const rows = [];
  let section = "";
  let brand = "";

  for (const raw of content.split(/\r?\n/)) {
    const line = cleanText(raw);
    if (!line) continue;
    const upper = line.toUpperCase();

    if (upper === "BATERIAS") {
      section = "BATERIAS";
      brand = "Apple";
      continue;
    }
    if (upper === "TELAS") {
      section = "TELAS IPHONE";
      brand = "Apple";
      continue;
    }
    if (upper === "TELAS ANDROID") {
      section = "TELAS ANDROID";
      brand = "";
      continue;
    }
    if (/^MOTOROLA:?$/i.test(line) || /^SAMSUNG:?$/i.test(line) || /^XIAOMI:?$/i.test(line)) {
      brand = line.replace(":", "").toUpperCase();
      continue;
    }
    if (!section) continue;

    const qty = parseQty(line);
    const item = stripQty(line);
    if (!item) continue;

    rows.push({
      id: uid("part"),
      code: null,
      name: partName(section, brand || "Android", item),
      category: section,
      compatibleModels: section === "TELAS ANDROID" ? `${brand} ${titlePhone(item)}`.trim() : titlePhone(item),
      supplier: "",
      unit: "unidade",
      stock: qty,
      min: 1,
      cost: 0,
      location: "",
      notes: `Importado da lista de pecas de reparo. Estoque informado: ${qty}.`,
      active: 1,
    });
  }

  return rows;
}

async function upsertPart(connection, part) {
  const [existing] = await connection.execute("SELECT id FROM repair_parts WHERE name = ? AND category = ? LIMIT 1", [part.name, part.category]);
  if (existing.length) {
    await connection.execute(
      `UPDATE repair_parts
       SET compatible_models = ?, unit = ?, stock = ?, min_stock = ?, notes = ?, active = 1
       WHERE id = ?`,
      [part.compatibleModels, part.unit, part.stock, part.min, part.notes, existing[0].id],
    );
    return { action: "updated", id: existing[0].id };
  }

  await connection.execute(
    `INSERT INTO repair_parts
     (id, code, name, category, compatible_models, supplier, unit, stock, min_stock, cost, location, notes, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [part.id, part.code, part.name, part.category, part.compatibleModels, part.supplier, part.unit, part.stock, part.min, part.cost, part.location, part.notes, part.active],
  );
  return { action: "inserted", id: part.id };
}

async function main() {
  const file = process.argv[2] || path.join("D:", "griffystore", "lista pecas reparo.txt");
  const content = fs.readFileSync(file, "utf8");
  const parts = parseList(content);
  const connection = db();
  let inserted = 0;
  let updated = 0;

  for (const part of parts) {
    const result = await upsertPart(connection, part);
    if (result.action === "inserted") inserted += 1;
    else updated += 1;
  }

  console.log(`Pecas processadas: ${parts.length}`);
  console.log(`Inseridas: ${inserted}`);
  console.log(`Atualizadas: ${updated}`);
  const totalStock = parts.reduce((sum, part) => sum + part.stock, 0);
  console.log(`Estoque total importado: ${totalStock}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closeDb);
