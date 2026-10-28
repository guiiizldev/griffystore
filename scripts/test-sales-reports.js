const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const { reportRange, registerSalesReports } = require("../src/server/sales-reports");
assert.deepEqual(reportRange("day", "2026-10-28"), { from: "2026-10-28", to: "2026-10-29" });
assert.deepEqual(reportRange("month", "2026-12"), { from: "2026-12-01", to: "2027-01-01" });
assert.deepEqual(reportRange("day", "2028-02-29"), { from: "2028-02-29", to: "2028-03-01" });
for (const date of ["2026-02-29", "2026-04-31", "invalid", "2026-10-28' OR 1=1"]) assert.equal(reportRange("day", date), null);
assert.equal(reportRange("month", "2026-13"), null);

const source = fs.readFileSync("app.js", "utf8");
const context = vm.createContext({ state: { sales: [
  { id: "today", shiftId: "current", date: "2026-10-28", status: "active" },
  { id: "yesterday", shiftId: "previous", date: "2026-10-27", status: "active" },
  { id: "other-turn", shiftId: "other", date: "2026-10-28", status: "active" },
  { id: "legacy-old", date: "2026-10-01", status: "active" },
  { id: "legacy-today", date: "2026-10-28", status: "active" },
  { id: "cancelled", shiftId: "current", date: "2026-10-28", status: "canceled" },
], cash: { shift: { id: "current", businessDate: "2026-10-28" } } }, periodReport: { data: null } });
vm.runInContext(source.slice(source.indexOf("function salesForShift("), source.indexOf("function cashReportFromShift(")), context);
vm.runInContext(source.slice(source.indexOf("function shiftSales("), source.indexOf("function daySales(")), context);
assert.equal(JSON.stringify(context.shiftSales().map(sale => sale.id)), JSON.stringify(["today", "legacy-today"]));
context.state.cash.shift = null;
assert.equal(context.shiftSales().length, 0, "Closed cash must not include all historical sales");

(async () => {
  let handler;
  const queries = [];
  const shifts = Array.from({ length: 31 }, (_, index) => ({ id: `shift${index}` }));
  registerSalesReports({ get: (_path, fn) => { handler = fn; } }, {
    query: async (sql, params) => {
      queries.push({ sql, params });
      assert.doesNotMatch(sql, /LIMIT 20|LIMIT 1200/);
      if (sql.startsWith("SELECT * FROM sales")) return [{ id: "s", total: "20", status: "active" }, { id: "cancel", status: "canceled" }];
      if (sql.includes("FROM sale_items")) return [{ sale_id: "s", product_id: "p", product_name: "Cabo", qty: "2", price: "10" }];
      if (sql.includes("FROM sale_payments")) return [{ sale_id: "s", method: "Dinheiro", amount: "25" }];
      if (sql.includes("FROM cash_shifts")) return shifts;
      return [{ id: "m", shift_id: "shift1", type: "Saida", amount: "18" }];
    }, mapSale: row => row, mapShift: row => row,
  });
  let result;
  const response = { set() { return this; }, json(body) { result = body; return this; }, status(code) { this.code = code; return this; } };
  await handler({ query: { type: "month", period: "2026-10" } }, response, error => { throw error; });
  assert.equal(queries.length, 5);
  assert.ok(queries.every(({ params }) => params.from === "2026-10-01" && params.to === "2026-11-01"));
  assert.equal(result.shifts.length, 31, "Monthly reports must not be truncated to 20 shifts");
  assert.equal(result.sales[0].items[0].qty, 2);
  assert.equal(result.sales[0].payments[0].amount, 25);
  assert.equal(result.sales[1].status, "canceled");
  assert.equal(result.movements[0].amount, 18);
  await handler({ query: { type: "day", period: "2026-02-30" } }, response, error => { throw error; });
  assert.equal(response.code, 400);
  console.log("Sales reports: day/month boundaries, shift isolation, legacy dates, item/payment details and complete monthly history passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
