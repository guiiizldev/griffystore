const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/server/public.js"), "utf8");

async function startup({ migrationError, listenError } = {}) {
  const exits = [];
  const errors = [];
  let listening = false;
  let onError;
  const server = {
    on(event, handler) {
      assert.equal(event, "error");
      onError = handler;
    },
    listen() {
      if (listenError) onError(listenError);
      else listening = true;
    },
  };
  vm.runInNewContext(source, {
    require(name) {
      if (name === "http") return { createServer: () => server };
      if (name === "./api") return { createApp: () => ({}) };
      if (name === "./schema") return { migrate: async () => {
        if (migrationError) throw migrationError;
      } };
      throw new Error(`Unexpected import: ${name}`);
    },
    process: { env: {}, exit: (code) => exits.push(code) },
    console: { log() {}, error: (error) => errors.push(error) },
  });
  await new Promise((resolve) => setImmediate(resolve));
  return { exits, errors, listening };
}

(async () => {
  assert.deepEqual(await startup(), { exits: [], errors: [], listening: true });
  const dbError = new Error("connect ECONNREFUSED 127.0.0.1:3306");
  assert.deepEqual(await startup({ migrationError: dbError }), {
    exits: [1], errors: [dbError], listening: false,
  });
  const portError = new Error("listen EADDRINUSE");
  assert.deepEqual(await startup({ listenError: portError }), {
    exits: [1], errors: [portError], listening: false,
  });
  console.log("Public startup: successful listen and fatal database/listen failures passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
