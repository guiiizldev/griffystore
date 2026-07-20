const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });
  try {
    const [settings] = await connection.query(
      "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('store.name','store.phone','store.cnpj','store.address') ORDER BY setting_key",
    );
    const [users] = await connection.query("SELECT id, name, role, pin, active FROM users ORDER BY name");
    const [cols] = await connection.query(
      "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchase_documents' ORDER BY ORDINAL_POSITION",
      [process.env.MYSQL_DATABASE],
    );
    const [perms] = await connection.query("SELECT role_name, module_key, allowed FROM role_permissions WHERE module_key = 'documents' ORDER BY role_name");
    const [counts] = await connection.query(
      "SELECT (SELECT COUNT(*) FROM products) products, (SELECT COUNT(*) FROM sales) sales, (SELECT COUNT(*) FROM purchase_documents) documents, (SELECT COUNT(*) FROM users) users",
    );
    console.log(JSON.stringify({ settings, users, purchaseDocumentColumns: cols.map((row) => row.name), documentPermissions: perms, counts: counts[0] }, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
