const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const select = { value: "", disabled: true, innerHTML: "" };
const submit = { disabled: true };
const feedback = { textContent: "" };
const preview = { hidden: true, innerHTML: "" };
const ownLabel = { textContent: "" };
const elements = {
  '[name="swapDate"]': { value: "2026-10-02" },
  '[name="targetId"]': select,
  '.swap-form button[type="submit"]': submit,
  '.swap-selection-feedback': feedback,
  '.swap-own-schedule': ownLabel,
};
const form = { elements: { targetId: select }, querySelector: (selector) => ({ '.swap-selection-feedback': feedback, '.swap-selection-preview': preview, 'button[type="submit"]': submit })[selector] };
elements['.swap-form'] = form;
const context = vm.createContext({
  console, Intl, Date, URL, AbortController,
  setTimeout, clearTimeout, setInterval: () => {},
  localStorage: { getItem: () => null }, navigator: { onLine: true },
  window: { addEventListener: () => {} },
  document: { addEventListener: () => {}, querySelector: (selector) => elements[selector] },
});
// Load the actual browser functions without starting authentication or network boot.
vm.runInContext(fs.readFileSync(require.resolve("../timeclock/app.js"), "utf8").replace(/\nboot\(\);\s*$/, ""), context);
const own = { startTime: "09:00", endTime: "18:00", source: "regular", workingDay: true };
const other = { startTime: "10:00", endTime: "19:00", source: "regular", workingDay: true };
async function load(ownSchedule, colleagueSchedule) {
  select.value = "b";
  context.fetch = async () => ({ ok: true, json: async () => ({ ownSchedule, employees: [{ id: "b", name: "Julio", schedule: colleagueSchedule }] }) });
  vm.runInContext('currentTab = "swaps";', context);
  await vm.runInContext("loadSwapOptions()", context);
  assert.equal(select.disabled, false, "List remains usable even when a schedule prevents submission");
}
async function run() {
  await load(null, other);
  assert.match(feedback.textContent, /configurar seu horario/);
  assert.equal(submit.disabled, true);
  await load(own, null);
  assert.match(feedback.textContent, /horario deste colega/);
  await load(own, { ...other, workingDay: false });
  assert.match(feedback.textContent, /folga/);
  await load({ ...own, source: "swap" }, other);
  assert.match(feedback.textContent, /troca aceita/);
  await load(own, own);
  assert.match(feedback.textContent, /mesmo horario/);
  await load(own, other);
  assert.equal(submit.disabled, false);
  assert.equal(preview.hidden, false);
  assert.match(preview.innerHTML, /10:00 - 19:00/);
  select.value = "";
  vm.runInContext("updateSwapSelection()", context);
  assert.equal(submit.disabled, true);
  assert.match(feedback.textContent, /Selecione o colega/);
  context.fetch = async () => { throw new Error("Falha no carregamento"); };
  await vm.runInContext("loadSwapOptions()", context);
  assert.match(ownLabel.textContent, /Falha no carregamento/);
  assert.match(feedback.textContent, /Atualizar pedidos/);
  await load(own, other);
  assert.equal(submit.disabled, false, "Retry recovers the selector");
  console.log("Swap selector: missing schedules, days off, accepted swaps, preview and load-error recovery passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
