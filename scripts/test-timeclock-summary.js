const assert = require("node:assert/strict");
const { timeClockSummary } = require("../src/server/api");

function entry(type, hour, minute, day = 30) {
  return { id: `${type}-${hour}-${minute}`, user_id: "employee", user_name: "Funcionario", entry_type: type, entry_at: new Date(2026, 8, day, hour, minute) };
}

for (const [hour, minute, expected] of [[8, 59, "on-time"], [9, 0, "on-time"], [9, 1, "late"], [9, 10, "late"], [9, 11, "absence"]]) {
  assert.equal(timeClockSummary([entry("Entrada", hour, minute)])[0].attendanceStatus, expected);
}
const day = timeClockSummary([
  entry("Saida", 18, 0), entry("Entrada", 10, 0), entry("Intervalo fim", 13, 0),
  entry("Intervalo inicio", 12, 0), entry("Entrada", 9, 0),
])[0];
assert.equal(day.lateMinutes, 0, "Use earliest entry even with descending records");
assert.equal(day.workedMinutes, 480, "Exclude completed break from worked hours");
assert.equal(day.incomplete, false);
assert.equal(timeClockSummary([entry("Saida", 18, 0)])[0].attendanceStatus, "missing");
assert.equal(timeClockSummary([entry("Entrada", 9, 0)])[0].workedMinutes, null);
assert.equal(timeClockSummary([entry("Entrada", 9, 0), entry("Intervalo inicio", 12, 0), entry("Saida", 18, 0)])[0].workedMinutes, null);
assert.equal(timeClockSummary([entry("Entrada", 10, 5)], "10:00", 5)[0].attendanceStatus, "late");
assert.equal(timeClockSummary([entry("Entrada", 10, 6)], "10:00", 5)[0].attendanceStatus, "absence");
assert.equal(timeClockSummary([entry("Entrada", 9, 0, 29), entry("Entrada", 9, 0, 30)])[0].date, "2026-09-30");
console.log("Timeclock summary: boundary times, ordering, breaks and pending records passed.");
