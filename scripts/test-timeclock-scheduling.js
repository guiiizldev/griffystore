const assert = require("node:assert/strict");
const { validDate, validTimes, scheduleToday, regularSchedule, effectiveSchedule, completeAttendance, loadScheduleData, registerScheduling } = require("../src/server/timeclock-scheduling");
const { timeClockSummary } = require("../src/server/api");

const data = {
  schedules: [
    { user_id: "a", effectiveFrom: "2026-01-01", start_time: "09:00:00", end_time: "18:00:00" },
    { user_id: "a", effectiveFrom: "2026-11-01", start_time: "10:00:00", end_time: "19:00:00" },
    { user_id: "b", effectiveFrom: "2026-01-01", start_time: "12:00:00", end_time: "21:00:00" },
  ],
  overrides: [{ user_id: "a", date: "2026-10-02", start_time: "12:00:00", end_time: "21:00:00", swap_id: "swap1" }],
};
data.schedules.forEach((row) => { row.work_days = "0,1,2,3,4,5,6"; });
assert.equal(validDate("2026-02-30"), false);
assert.equal(validDate("2028-02-29"), true);
assert.equal(validTimes("09:00", "18:00"), true);
assert.equal(validTimes("25:00", "18:00"), false);
assert.equal(validTimes("18:00", "09:00"), false);
assert.equal(regularSchedule(data, "a", "2026-10-02").startTime, "09:00");
assert.equal(effectiveSchedule(data, "a", "2026-10-02").startTime, "12:00");
assert.equal(effectiveSchedule(data, "a", "2026-10-03").startTime, "09:00", "Revert automatically next day");
assert.equal(effectiveSchedule(data, "a", "2026-11-01").startTime, "10:00", "Future schedule is date-bound");
assert.equal(effectiveSchedule(data, "unknown", "2026-10-02"), null);
const entry = (user, day, hour, minute) => ({ user_id: user, user_name: user, entry_type: "Entrada", entry_at: new Date(`2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`) });
const resolve = (user, date) => effectiveSchedule(data, user, date);
assert.equal(timeClockSummary([entry("a", 2, 12, 0)], "09:00", 10, resolve)[0].lateMinutes, 0);
assert.equal(timeClockSummary([entry("a", 3, 9, 11)], "09:00", 10, resolve)[0].attendanceStatus, "absence");
assert.equal(timeClockSummary([entry("b", 2, 12, 10)], "09:00", 10, resolve)[0].attendanceStatus, "late");
assert.equal(timeClockSummary([entry("unknown", 2, 9, 0)], "09:00", 10, resolve)[0].attendanceStatus, "unconfigured");
const employees = [{ id: "a", name: "Ana", active: 1 }];
const attendance = (scheduleData, date, time) => completeAttendance([], scheduleData, employees, date, date, 10, new Date(`${date}T${time}:00-03:00`));
const pendingData = { schedules: data.schedules, overrides: [] };
assert.equal(attendance(pendingData, "2026-10-02", "09:10")[0].attendanceStatus, "awaiting");
assert.equal(attendance(pendingData, "2026-10-02", "09:11")[0].absenceReason, "missing", "Without acceptance, absence uses own normal schedule");
assert.equal(attendance(data, "2026-10-02", "09:11")[0].attendanceStatus, "awaiting", "Accepted swap uses the later start");
assert.equal(attendance(data, "2026-10-03", "09:11")[0].absenceReason, "missing", "Next day returns to habitual schedule");
const offData = { schedules: data.schedules.map((row) => ({ ...row, work_days: "1,2,3,4" })), overrides: [] };
assert.equal(attendance(offData, "2026-10-02", "21:00").length, 0, "No false absences on days off");
assert.equal(timeClockSummary([entry("a", 2, 12, 0)], "09:00", 10, (user, date) => effectiveSchedule(offData, user, date))[0].attendanceStatus, "off");
assert.equal(completeAttendance([], data, employees, "2026-10-03", "2026-10-03", 10, new Date("2026-10-02T21:00:00-03:00")).length, 0, "Future days are not absences");
console.log("Individual schedules: effective dates, swaps, next-day restoration and punctuality passed.");

async function integration() {
  const mysql = require("mysql2/promise");
  const express = require("express");
  const { statements } = require("../src/server/schema");
  // Explicit loopback connection: this test never uses the application's database credentials.
  const database = `griffy_timeclock_test_${Date.now()}`;
  const root = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", password: "" });
  let pool, server;
  try {
    await root.query(`CREATE DATABASE \`${database}\``);
    pool = mysql.createPool({ host: "127.0.0.1", port: 3306, user: "root", password: "", database, namedPlaceholders: true, connectionLimit: 5 });
    const query = async (sql, params = {}) => (await pool.execute(sql, params))[0];
    await query("CREATE TABLE users (id VARCHAR(40) PRIMARY KEY, name VARCHAR(120), role VARCHAR(20), active INT DEFAULT 1)");
    await query("CREATE TABLE time_clock_entries (id VARCHAR(40) PRIMARY KEY, user_id VARCHAR(40), entry_at DATETIME)");
    for (const name of ["time_clock_schedules", "time_clock_swaps", "time_clock_day_schedules"]) {
      await query(statements.find((sql) => sql.startsWith(`CREATE TABLE IF NOT EXISTS ${name} (`)));
    }
    for (const [id, name, role] of [["admin", "Admin", "admin"], ["a", "Ana", "vendedor"], ["b", "Julio", "tecnico"], ["c", "Maria", "vendedor"]]) {
      await query("INSERT INTO users (id, name, role) VALUES (:id,:name,:role)", { id, name, role });
    }
    const app = express();
    app.use(express.json());
    const people = await query("SELECT * FROM users");
    registerScheduling(app, { query, db: () => pool, uid: () => require("node:crypto").randomUUID(),
      requireRoleToken: (req, roles) => { const user = people.find((item) => item.id === req.get("X-Test-User")); return user && (!roles || roles.includes(user.role)) ? user : null; } });
    server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
    const request = async (user, path, body, expected) => {
      if (path === "/admin/schedules" && body.workDays === undefined) body.workDays = [0, 1, 2, 3, 4, 5, 6];
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/timeclock${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Test-User": user }, body: JSON.stringify(body) });
      const result = await response.json();
      if (expected) assert.equal(response.status, expected, JSON.stringify(result));
      return { status: response.status, ...result };
    };
    const date = (days) => new Date(Date.parse(`${scheduleToday()}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
    for (const [id, start, end] of [["a", "09:00", "18:00"], ["b", "10:00", "19:00"], ["c", "11:00", "20:00"]]) {
      await request("admin", "/admin/schedules", { userId: id, startTime: start, endTime: end, effectiveFrom: date(0) }, 200);
    }
    await request("a", "/admin/schedules", { userId: "a", startTime: "09:00", endTime: "18:00" }, 403);
    await request("admin", "/admin/schedules", { userId: "a", startTime: "09:00", endTime: "18:00", workDays: [] }, 400);
    await request("a", "/swaps", { targetId: "a", date: date(1), reason: "Teste" }, 400);
    await request("a", "/swaps", { targetId: "b", date: date(-1), reason: "Teste" }, 400);
    await request("a", "/swaps", { targetId: "b", date: date(1), reason: "" }, 400);
    const swap = await request("a", "/swaps", { targetId: "b", date: date(1), reason: "Consulta" }, 201);
    assert.equal((await loadScheduleData(query)).overrides.length, 0, "Pending swap does not change schedules");
    await request("admin", `/swaps/${swap.id}/respond`, { action: "accept" }, 403);
    await request("a", `/swaps/${swap.id}/respond`, { action: "accept" }, 403);
    await request("b", `/swaps/${swap.id}/respond`, { action: "accept" }, 200);
    const accepted = await loadScheduleData(query);
    assert.equal(effectiveSchedule(accepted, "a", date(1)).startTime, "10:00");
    assert.equal(effectiveSchedule(accepted, "b", date(1)).startTime, "09:00");
    assert.equal(effectiveSchedule(accepted, "a", date(2)).startTime, "09:00");
    assert.equal(accepted.overrides.length, 2, "Both schedules are saved atomically");
    await request("b", `/swaps/${swap.id}/respond`, { action: "accept" }, 409);
    await request("c", "/swaps", { targetId: "a", date: date(1), reason: "Conflito" }, 409);
    const canceled = await request("a", "/swaps", { targetId: "b", date: date(2), reason: "Cancelar" }, 201);
    await request("a", `/swaps/${canceled.id}/respond`, { action: "cancel" }, 200);
    const rejected = await request("a", "/swaps", { targetId: "b", date: date(2), reason: "Recusar" }, 201);
    await request("b", `/swaps/${rejected.id}/respond`, { action: "reject" }, 200);
    const changed = await request("a", "/swaps", { targetId: "b", date: date(3), reason: "Mudanca" }, 201);
    await request("admin", "/admin/schedules", { userId: "b", startTime: "12:00", endTime: "21:00", effectiveFrom: date(3) }, 200);
    await request("b", `/swaps/${changed.id}/respond`, { action: "accept" }, 409);
    const punched = await request("a", "/swaps", { targetId: "b", date: date(4), reason: "Ponto" }, 201);
    await query("INSERT INTO time_clock_entries (id,user_id,entry_at) VALUES ('punch','b',:at)", { at: `${date(4)} 12:00:00` });
    await request("b", `/swaps/${punched.id}/respond`, { action: "accept" }, 409);
    await request("c", "/swaps", { targetId: "b", date: date(4), reason: "Ja tem ponto" }, 409);
    await request("admin", "/admin/schedules", { userId: "b", startTime: "09:00", endTime: "18:00", effectiveFrom: date(4) }, 409);
    const simultaneous = await Promise.all([
      request("a", "/swaps", { targetId: "b", date: date(6), reason: "Simultaneo A" }),
      request("c", "/swaps", { targetId: "b", date: date(6), reason: "Simultaneo C" }),
    ]);
    assert.deepEqual(simultaneous.map((item) => item.status).sort(), [201, 409]);
    const offDay = date(8);
    const weekday = new Date(`${offDay}T12:00:00Z`).getUTCDay();
    await request("admin", "/admin/schedules", { userId: "c", startTime: "11:00", endTime: "20:00", effectiveFrom: offDay, workDays: [(weekday + 1) % 7] }, 200);
    await request("a", "/swaps", { targetId: "c", date: offDay, reason: "Folga" }, 400);
    console.log("MySQL integration: permissions, acceptance, cancel/reject, conflicts, punches, schedule changes and concurrent requests passed.");
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    await root.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await root.end();
  }
}

if (process.env.TIMECLOCK_INTEGRATION === "1") integration().catch((error) => { console.error(error); process.exitCode = 1; });
