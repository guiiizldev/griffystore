const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config();
if (process.env.GRIFFY_CONFIG_DIR) {
  require("dotenv").config({ path: path.join(process.env.GRIFFY_CONFIG_DIR, ".env"), override: true });
}

const config = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "griffy_store",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
};

let pool;

function db() {
  if (!pool) pool = mysql.createPool(config);
  return pool;
}

async function query(sql, params = {}) {
  const [rows] = await db().execute(sql, params);
  return rows;
}

async function closeDb() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { db, query, closeDb, config };
