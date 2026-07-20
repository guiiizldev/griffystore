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
    const [tables] = await connection.query(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('repair_parts','repair_part_movements') ORDER BY TABLE_NAME",
      [process.env.MYSQL_DATABASE],
    );
    const [perms] = await connection.query("SELECT role_name, module_key, allowed FROM role_permissions WHERE module_key = 'parts' ORDER BY role_name");
    console.log(JSON.stringify({ tables, perms }, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
