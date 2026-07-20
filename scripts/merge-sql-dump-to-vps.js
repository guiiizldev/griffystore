const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const dumpPath = process.argv[2] || "database/griffy_store.sql";
const sourceDatabase = process.env.MYSQL_DATABASE || "griffy_store";
const tempPrefix = `import_${Date.now()}_`;

const config = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  multipleStatements: true,
};

const mergeTables = [
  "app_settings",
  "cash_movements",
  "cash_shifts",
  "categories",
  "customers",
  "products",
  "role_permissions",
  "sales",
  "sale_items",
  "sale_payments",
  "services",
  "service_events",
  "users",
];

async function columns(connection, database, table) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [database, table],
  );
  return rows.map((row) => row.name);
}

async function main() {
  const resolvedDump = path.resolve(dumpPath);
  if (!fs.existsSync(resolvedDump)) throw new Error(`Dump nao encontrado: ${resolvedDump}`);

  const connection = await mysql.createConnection(config);
  try {
    await connection.query(`USE \`${sourceDatabase}\``);
    console.log(`Criando tabelas temporarias com prefixo ${tempPrefix}...`);
    for (const table of mergeTables) {
      await connection.query(`DROP TABLE IF EXISTS \`${tempPrefix}${table}\``);
    }

    console.log(`Importando ${resolvedDump} para tabelas temporarias...`);
    let dumpSql = fs.readFileSync(resolvedDump, "utf8");
    for (const table of mergeTables) {
      dumpSql = dumpSql.replaceAll(`\`${table}\``, `\`${tempPrefix}${table}\``);
    }
    dumpSql = dumpSql.replace(/CONSTRAINT `([^`]+)`/g, (_match, name) => `CONSTRAINT \`${tempPrefix}${name}\``);
    await connection.query(dumpSql);

    console.log(`Mesclando tabelas em ${sourceDatabase}...`);
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of mergeTables) {
      const tempTable = `${tempPrefix}${table}`;
      const sourceColumns = await columns(connection, sourceDatabase, tempTable);
      const targetColumns = await columns(connection, sourceDatabase, table);
      if (!sourceColumns.length || !targetColumns.length) {
        console.log(`Pulando ${table}: tabela ausente.`);
        continue;
      }
      const common = targetColumns.filter((column) => sourceColumns.includes(column));
      if (!common.length) {
        console.log(`Pulando ${table}: sem colunas em comum.`);
        continue;
      }
      const list = common.map((column) => `\`${column}\``).join(", ");
      await connection.query(`DELETE FROM \`${sourceDatabase}\`.\`${table}\``);
      await connection.query(`INSERT INTO \`${sourceDatabase}\`.\`${table}\` (${list}) SELECT ${list} FROM \`${sourceDatabase}\`.\`${tempTable}\``);
      console.log(`Atualizada: ${table} (${common.length} coluna(s))`);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    for (const table of mergeTables.slice().reverse()) {
      await connection.query(`DROP TABLE IF EXISTS \`${tempPrefix}${table}\``);
    }
    console.log("Merge concluido.");
  } catch (error) {
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
      for (const table of mergeTables.slice().reverse()) {
        await connection.query(`DROP TABLE IF EXISTS \`${tempPrefix}${table}\``);
      }
    } catch (_cleanupError) {
      // Best-effort cleanup.
    }
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
