require("dotenv").config();
const { query, closeDb } = require("../src/server/database");

const updates = [
  ["PELÃCULAS", "PELÍCULAS"],
  ["PEL?CULAS", "PELÍCULAS"],
  ["PELÃCULA DE CÃ‚MERA", "PELÍCULA DE CÂMERA"],
  ["MAQUININHA DE APARAR PÃ‰", "MAQUININHA DE APARAR PÉ"],
  ["LUZ PARA VÃDEO", "LUZ PARA VÍDEO"],
  ["PERFUMES ÃRABES", "PERFUMES ÁRABES"],
  ["BOLSA A PROVA D'ÃGUA", "BOLSA A PROVA D'ÁGUA"],
];

(async () => {
  for (const [bad, good] of updates) {
    await query("UPDATE products SET category = ? WHERE category = ?", [good, bad]);
    await query("INSERT IGNORE INTO categories (name) VALUES (?)", [good]);
    await query("DELETE FROM categories WHERE name = ?", [bad]);
  }

  await query("INSERT IGNORE INTO categories (name) SELECT DISTINCT category FROM products");
  await query(
    `DELETE c
     FROM categories c
     LEFT JOIN products p ON p.category = c.name
     WHERE p.id IS NULL AND c.name IN (${updates.map(() => "?").join(",")})`,
    updates.map(([bad]) => bad),
  );

  const rows = await query(
    "SELECT category, COUNT(*) AS produtos, SUM(stock) AS estoque FROM products GROUP BY category ORDER BY produtos DESC",
  );
  console.log(JSON.stringify(rows, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
