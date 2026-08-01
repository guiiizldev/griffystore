const { query, closeDb } = require("../src/server/database");

async function main() {
  if (process.argv[2] !== "--confirm") {
    throw new Error("Use: node scripts/reset-sale-products.js --confirm");
  }

  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const backupTable = `products_backup_${stamp}`;
  const beforeRows = await query("SELECT COUNT(*) AS total FROM products");
  const before = Number(beforeRows[0]?.total || 0);

  await query(`CREATE TABLE ${backupTable} AS SELECT * FROM products`);
  await query("DELETE FROM products");

  const afterRows = await query("SELECT COUNT(*) AS total FROM products");
  const repairRows = await query("SELECT COUNT(*) AS total FROM repair_parts");

  console.log(`Produtos de venda antes: ${before}`);
  console.log(`Produtos de venda depois: ${Number(afterRows[0]?.total || 0)}`);
  console.log(`Backup criado: ${backupTable}`);
  console.log(`Pecas de assistencia preservadas: ${Number(repairRows[0]?.total || 0)}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
