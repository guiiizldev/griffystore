const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const vm = require("node:vm");
const source = fs.readFileSync("src/server/api.js", "utf8");
const context = vm.createContext({ http, https: require("node:https"), URL });
vm.runInContext(source.slice(source.indexOf("function fetchJson("), source.indexOf("async function loadUpdateManifest(")), context);
(async () => {
  const server = http.createServer((req, res) => {
    if (req.url === "/redirect") { res.writeHead(302, { Location: "/manifest" }); res.end(); }
    else if (req.url === "/loop") { res.writeHead(302, { Location: "/loop" }); res.end(); }
    else if (req.url === "/missing") { res.writeHead(404); res.end(); }
    else if (req.url === "/invalid") res.end("invalid JSON");
    else res.end(JSON.stringify({ version: "0.2.1" }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await context.fetchJson(`${base}/redirect`)).version, "0.2.1");
    await assert.rejects(context.fetchJson(`${base}/loop`));
    await assert.rejects(context.fetchJson(`${base}/missing`));
    await assert.rejects(context.fetchJson(`${base}/invalid`));
    console.log("Update manifest: redirects, redirect loop, missing release and invalid JSON passed.");
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
