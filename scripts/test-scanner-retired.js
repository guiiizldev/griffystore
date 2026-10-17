const assert = require("node:assert/strict");
const { createApp } = require("../src/server/api");
async function run() {
  const server = await new Promise((resolve) => { const s = createApp({ publicMode: true }).listen(0, "127.0.0.1", () => resolve(s)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const [path, method] of [["/scanner/", "GET"], ["/scanner/app.js", "GET"], ["/api/barcode-scans", "POST"], ["/api/barcode-scans/consume", "POST"]]) {
      const response = await fetch(base + path, { method });
      assert.equal(response.status, 410);
      assert.match((await response.json()).error, /desativado/);
    }
    assert.equal((await fetch(base + "/api/health")).status, 200);
    assert.equal((await fetch(base + "/ponto/")).status, 200);
    const source = require("node:fs").readFileSync(require.resolve("../app.js"), "utf8");
    assert.ok(source.includes('name="code"'), "Keep product barcode input");
    assert.ok(source.includes("function addBySearch()"), "Keep physical-reader product lookup");
    assert.ok(!source.includes("pullMobileScan") && !source.includes("pullScanToProductCode"));
    console.log("Scanner retired: page and API return 410; health, timeclock and physical-reader input preserved.");
  } finally { await new Promise((resolve) => server.close(resolve)); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
