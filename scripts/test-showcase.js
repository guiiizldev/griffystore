const assert = require("node:assert/strict");
const {
  parseList,
  validateDevice,
  registerShowcase,
} = require("../src/server/showcase");
const sample = {
  model: "iPhone 13",
  storage: "128GB",
  color: "Preto",
  condition: "Seminovo",
  price: "2.499,00",
  quantity: 2,
  battery: 86,
};
assert.equal(validateDevice(sample).price, 2499);
assert.equal(validateDevice(sample).battery, 86);
assert.equal(validateDevice(sample).imageKind, "reference");
assert.equal(
  validateDevice({ ...sample, image: validateDevice(sample).image }).imageKind,
  "reference",
);
assert.equal(
  validateDevice({ ...sample, model: "IPHONE 13", storage: "128G" }).key,
  validateDevice(sample).key,
);
for (const price of ["1,2,3", "-10", "Infinity", 0, NaN])
  assert.throws(() => validateDevice({ ...sample, price }));
assert.throws(() => validateDevice({ ...sample, quantity: -1 }));
assert.throws(() => validateDevice({ ...sample, battery: 101 }));
assert.throws(() =>
  validateDevice({ ...sample, image: "javascript:alert(1)" }),
);
assert.throws(() =>
  validateDevice({ ...sample, image: "http://localhost/private" }),
);
assert.equal(
  validateDevice({ ...sample, model: "Modelo desconhecido" }).imageKind,
  "missing",
  "Never use another model's image",
);
const csv =
  'modelo;memoria;cor;condicao;preco;quantidade;observacoes\niPhone 13;128GB;Preto;Seminovo;"2.499,00";2;"Teste; com separador"';
assert.equal(parseList(csv)[0].device.notes, "Teste; com separador");
assert.equal(
  parseList(csv + "\niPhone 13;128GB;Preto;Seminovo;2500;1;")[1].device,
  null,
  "Duplicates need review",
);
const chat = parseList(
  "Lista atualizada\nR$2500\niPhone 13 128G\n\u{1f535}84%\nR$4200\niPhone 15 Pro 128GB 4100\n\u26aa100%\u274c\niPhone 17 pro Max 256gb\nFinal Troca\n\u{1f7e0} R$7500/7400 T: R$7900\n\u{1f535} R$7600/7500 T: R$8000",
);
assert.equal(chat.length, 4);
assert.equal(chat[0].input.battery, "84");
assert.equal(chat[0].input.price, 2500);
assert.equal(chat[0].input.condition, "", "Do not guess condition");
assert.equal(
  chat[1].input.price,
  "",
  "Do not choose one of conflicting prices",
);
assert.match(chat[1].warning, /disponibilidade/);
assert.equal(chat[2].input.price, "");
assert.match(chat[2].warning, /7500 \/ 7400/);
assert.ok(
  !chat[2].warning.includes("7900"),
  "Do not use trade-in prices as retail prices",
);
assert.ok(chat.every((row) => row.needsReview));
console.log(
  "Showcase parser: CSV, WhatsApp, battery, duplicate detection, ambiguous prices and exact-model images passed.",
);

async function integration() {
  const mysql = require("mysql2/promise");
  const express = require("express");
  const { statements } = require("../src/server/schema");
  const database = `griffy_showcase_test_${Date.now()}`;
  const root = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
  });
  let pool, server;
  try {
    await root.query(`CREATE DATABASE \`${database}\``);
    pool = mysql.createPool({
      host: "127.0.0.1",
      user: "root",
      password: "",
      database,
      namedPlaceholders: true,
      connectionLimit: 5,
    });
    const query = async (sql, params = {}) =>
      (await pool.execute(sql, params))[0];
    await query(
      "CREATE TABLE users (id VARCHAR(40) PRIMARY KEY,role VARCHAR(20),active INT)",
    );
    await query(
      "CREATE TABLE app_settings (setting_key VARCHAR(120) PRIMARY KEY, setting_value LONGTEXT)",
    );
    await query(
      "INSERT INTO users VALUES ('a','admin',1),('b','vendedor',1),('c','admin',0)",
    );
    await query(
      statements.find((sql) =>
        sql.startsWith("CREATE TABLE IF NOT EXISTS storefront_devices ("),
      ),
    );
    const app = express();
    app.use(express.json());
    registerShowcase(app, {
      query,
      db: () => pool,
      requireRoleToken: (req, roles = []) => {
        const id = req.get("X-Test-User");
        const role = id === "b" ? "vendedor" : "admin";
        return id && (!roles.length || roles.includes(role))
          ? { id, role }
          : null;
      },
    });
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const request = async (
      path,
      user,
      method = "GET",
      body,
      expected = 200,
    ) => {
      const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/storefront${path}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(user ? { "X-Test-User": user } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      const data = await response.json();
      assert.equal(response.status, expected, JSON.stringify(data));
      return data;
    };
    await request("/admin/devices", "b", "GET", null, 403);
    await request("/admin/devices", "c", "GET", null, 403);
    await request("/admin/devices", null, "GET", null, 403);
    await request("/admin/devices/preview", "a", "POST", { text: csv });
    assert.equal((await request("/admin/devices/draft", "a")).text, csv);
    await request("/admin/devices/draft", "b", "GET", null, 403);
    await request("/admin/devices/publish", "a", "POST", { devices: [sample] });
    assert.equal((await request("/admin/devices/draft", "a")).text, "");
    await request("/admin/devices/publish", "a", "POST", {
      devices: [{ ...sample, price: 2600 }],
    });
    const devices = await request("/devices");
    assert.equal(devices.length, 1);
    assert.equal(devices[0].price, 2600);
    assert.equal(
      devices[0].quantity,
      2,
      "Import replaces listed quantity, never adds duplicate stock",
    );
    await request(
      "/admin/devices/publish",
      "a",
      "POST",
      {
        devices: [
          { ...sample, price: 2700 },
          { ...sample, color: "Azul", quantity: -1 },
        ],
      },
      400,
    );
    assert.equal(
      (await request("/devices"))[0].price,
      2600,
      "Invalid batch cannot partially publish",
    );
    await request(`/admin/devices/${devices[0].id}`, "a", "PATCH", {
      active: false,
    });
    assert.equal((await request("/devices")).length, 0);
    await request("/admin/devices/publish", "a", "POST", {
      devices: [{ ...sample, quantity: 0 }],
    });
    assert.equal(
      (await request("/devices")).length,
      0,
      "Out-of-stock devices are hidden",
    );
    assert.equal((await request("/admin/devices", "a")).length, 1);
    console.log(
      "MySQL/API showcase: administrator-only publication, idempotency, validation, visibility and zero-stock filtering passed.",
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    await root.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await root.end();
  }
}
if (process.env.SHOWCASE_INTEGRATION === "1")
  integration().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
