const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");
const frontend = fs.readFileSync("app.js", "utf8");
const backend = fs.readFileSync("src/server/api.js", "utf8");

async function client() {
  let resolveSale;
  let calls = 0;
  let fail = false;
  const requests = [];
  const context = vm.createContext({
    cart: [{ id: "p", name: "Produto", price: 10, qty: 1 }],
    checkoutBusy: false, checkoutRequest: null, lastCartClick: null,
    state: { cash: { open: true, shift: { id: "shift" }, movements: [] }, products: [{ id: "p", stock: 10 }], sales: [] },
    session: { name: "Ana" }, ui: {}, apiOnline: true, paymentRows: [],
    crypto, structuredClone, render() {}, notify() {}, alert() {},
    valueOf: () => "", cartTotal: () => 10,
    normalizedPayments: () => [{ method: "Dinheiro", amount: 10 }],
    paymentsLabel: () => "Dinheiro", selectedSellerName: () => "Ana",
    simpleNoteEnabled: () => false, businessDate: () => "2026-10-26", uid: () => "movement",
    apiSend: async (path, body) => {
      calls++; requests.push(structuredClone(body));
      if (fail) throw new Error("Network timeout");
      return new Promise(resolve => { resolveSale = resolve; });
    },
  });
  vm.runInContext(frontend.slice(frontend.indexOf("async function checkout()"), frontend.indexOf("async function saveProduct(")), context);
  const first = context.checkout();
  await context.checkout();
  assert.equal(calls, 1, "Concurrent clicks must send only once");
  resolveSale({ id: "sale1" }); await first;
  await context.checkout();
  assert.equal(calls, 1, "Empty cart must not create a sale");
  context.cart = [{ id: "p", name: "Produto", price: 10, qty: 1 }];
  fail = true;
  await context.checkout(); await context.checkout();
  assert.equal(requests[1].requestId, requests[2].requestId, "Retry must reuse sale identity");
  assert.notEqual(requests[0].requestId, requests[1].requestId, "New sale must get a new identity");
  context.checkoutBusy = false;
  vm.runInContext(frontend.slice(frontend.indexOf("function addCart("), frontend.indexOf("function addBySearch(")), context);
  context.addCart("p", { detail: 1 });
  context.addCart("p", { detail: 1 });
  context.addCart("p", { detail: 2 });
  assert.equal(context.cart[0].qty, 2, "Double-click across render must add only one unit");
}

async function server() {
  let handler;
  const saved = new Map();
  let stockUpdates = 0;
  let movements = 0;
  let queue = Promise.resolve();
  const context = {
    app: { post: (_path, fn) => { handler = fn; } }, crypto,
    getOpenShift: async () => ({ id: "shift", business_date: "2026-10-26" }),
    today: () => "2026-10-26", formatDate: x => x, businessDate: () => "2026-10-26", uid: () => crypto.randomUUID(),
    db: () => ({ getConnection: async () => {
      let unlock;
      return {
        beginTransaction: async () => {},
        execute: async (sql, params) => {
          if (sql.includes("FOR UPDATE")) {
            const previous = queue;
            queue = new Promise(resolve => { unlock = resolve; });
            await previous;
          } else if (sql.startsWith("SELECT id, shift_id FROM sales")) return [saved.has(params.id) ? [saved.get(params.id)] : []];
          else if (sql.includes("INSERT INTO sales (")) saved.set(params.id, { id: params.id, shift_id: params.shiftId });
          else if (sql.startsWith("UPDATE products")) stockUpdates++;
          else if (sql.includes("INSERT INTO cash_movements")) movements++;
          return [[]];
        },
        commit: async () => { unlock?.(); unlock = null; },
        rollback: async () => { unlock?.(); unlock = null; }, release() {},
      };
    } }),
  };
  vm.runInNewContext(backend.slice(backend.indexOf('  app.post("/api/sales",'), backend.indexOf('  app.post("/api/sales/:id/cancel",')), context);
  const request = async requestId => {
    let result;
    await handler({ body: { requestId, operator: "Ana", total: 10, items: [{ id: "p", name: "Produto", qty: 1, price: 10 }] } }, {
      json: body => { result = body; }, status: () => { throw new Error("Unexpected rejection"); },
    });
    return result;
  };
  const id = crypto.randomUUID();
  const [first, second] = await Promise.all([request(id), request(id)]);
  assert.equal(first.id, second.id);
  assert.equal(second.alreadyRecorded, true);
  assert.equal(saved.size, 1); assert.equal(stockUpdates, 1); assert.equal(movements, 1);
  await request(crypto.randomUUID());
  assert.equal(saved.size, 2, "An identical but intentional new sale must be allowed");
}

client().then(server).then(() => console.log("Sales: double click, concurrent checkout, empty cart, retry identity and single stock/cash write passed.")).catch(error => { console.error(error); process.exitCode = 1; });
