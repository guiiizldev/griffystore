const businessZone = "America/Sao_Paulo";
// MySQL stores these DATETIME values in its session timezone; expose UTC instants
// and compare calendar days in the store's timezone without depending on Node's TZ.
const entryAtSql = "DATE_FORMAT(TIMESTAMPADD(SECOND, TIMESTAMPDIFF(SECOND, NOW(), UTC_TIMESTAMP()), entry_at), '%Y-%m-%dT%H:%i:%sZ')";
const entryBusinessDateSql = "DATE(TIMESTAMPADD(SECOND, TIMESTAMPDIFF(SECOND, NOW(), UTC_TIMESTAMP()) - 10800, entry_at))";

function clockParts(value) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: businessZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
}

function scheduleToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: businessZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validTimes(start, end) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  return typeof start === "string" && typeof end === "string" && time.test(start) && time.test(end) && end > start;
}

function regularSchedule(data, userId, date) {
  const row = data.schedules.filter((item) => item.user_id === userId && item.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  if (!row) return null;
  const workDays = row.work_days ? row.work_days.split(",").map(Number) : [];
  return { startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), effectiveFrom: row.effectiveFrom, workDays, workingDay: workDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay()), source: "regular" };
}

function effectiveSchedule(data, userId, date) {
  const override = data.overrides.find((item) => item.user_id === userId && item.date === date);
  return override ? { startTime: override.start_time.slice(0, 5), endTime: override.end_time.slice(0, 5), date, workingDay: true, source: "swap", swapId: override.swap_id } : regularSchedule(data, userId, date);
}

async function loadScheduleData(query, userId = "") {
  const where = userId ? " WHERE user_id = :userId" : "";
  const [schedules, overrides] = await Promise.all([
    query(`SELECT user_id, DATE_FORMAT(effective_from, '%Y-%m-%d') AS effectiveFrom, start_time, end_time, work_days FROM time_clock_schedules${where}`, { userId }),
    query(`SELECT user_id, DATE_FORMAT(schedule_date, '%Y-%m-%d') AS date, start_time, end_time, swap_id FROM time_clock_day_schedules${where}`, { userId }),
  ]);
  return { schedules, overrides };
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function completeAttendance(summary, data, employees, fromDate, toDate, tolerance = 10, now = new Date()) {
  const current = clockParts(now);
  const byDay = new Map(summary.filter((row) => row.date >= fromDate && row.date <= toDate).map((row) => [`${row.userId}:${row.date}`, { ...row }]));
  for (let day = new Date(`${fromDate}T12:00:00Z`); day.toISOString().slice(0, 10) <= toDate && day.toISOString().slice(0, 10) <= current.date; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    for (const user of employees) {
      if (user.active === 0) continue;
      const schedule = effectiveSchedule(data, user.id, date);
      if (!schedule?.workingDay) continue;
      const key = `${user.id}:${date}`;
      const row = byDay.get(key) || { userId: user.id, userName: user.name, date, firstIn: null, lastOut: null, breakStart: null, breakEnd: null, entries: [], lateMinutes: null, workedMinutes: null, incomplete: true, expectedStart: schedule.startTime, expectedEnd: schedule.endTime, scheduleSource: schedule.source };
      if (!row.firstIn) {
        const [hour, minute] = schedule.startTime.split(":").map(Number);
        const overdue = date < current.date || current.minutes > hour * 60 + minute + Number(tolerance);
        row.attendanceStatus = overdue ? "absence" : "awaiting";
        row.absenceReason = overdue ? "missing" : null;
      }
      byDay.set(key, row);
    }
  }
  return [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date) || a.userName.localeCompare(b.userName));
}

function mapSwap(row) {
  return {
    id: row.id, requesterId: row.requester_id, targetId: row.target_id,
    requesterName: row.requester_name, targetName: row.target_name, date: row.date,
    requesterStart: row.requester_start.slice(0, 5), requesterEnd: row.requester_end.slice(0, 5),
    targetStart: row.target_start.slice(0, 5), targetEnd: row.target_end.slice(0, 5),
    reason: row.reason, status: row.status === "pending" && row.date < scheduleToday() ? "expired" : row.status,
    createdAt: row.created_at, respondedAt: row.responded_at,
  };
}

async function loadSwaps(query, userId = "") {
  const rows = await query(`SELECT s.*, DATE_FORMAT(s.swap_date, '%Y-%m-%d') AS date,
    a.name AS requester_name, b.name AS target_name
    FROM time_clock_swaps s JOIN users a ON a.id = s.requester_id JOIN users b ON b.id = s.target_id
    ${userId ? "WHERE s.requester_id = :userId OR s.target_id = :userId" : ""}
    ORDER BY s.created_at DESC LIMIT 120`, { userId });
  return rows.map(mapSwap);
}

function registerScheduling(app, { query, db, requireRoleToken, uid }) {
  const route = (handler) => async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
      if (!error.status) console.error("Timeclock scheduling:", error.code || error.message);
      res.status(error.status || 500).json({ error: error.status ? error.message : "Nao foi possivel salvar. Tente novamente." });
    }
  };
  const auth = (req, roles) => {
    const user = requireRoleToken(req, roles);
    if (!user) throw httpError(roles ? 403 : 401, roles ? "Apenas administrador ou gerente." : "Sessao expirada.");
    return user;
  };
  const transaction = async (work) => {
    const connection = await db().getConnection();
    try {
      await connection.beginTransaction();
      const execute = async (sql, params = {}) => (await connection.execute(sql, params))[0];
      const result = await work(execute);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  };
  const lockEmployees = async (execute, requesterId, targetId) => {
    const employees = [];
    for (const id of [requesterId, targetId].sort()) {
      employees.push(...await execute("SELECT id, name, active, role FROM users WHERE id = :id FOR UPDATE", { id }));
    }
    if (employees.length !== 2 || employees.some((user) => !user.active || user.role === "caixa")) throw httpError(400, "Os dois funcionarios precisam estar ativos.");
  };
  const requireNoPunches = async (execute, requesterId, targetId, date) => {
    const punches = await execute(`SELECT id FROM time_clock_entries WHERE user_id IN (:requesterId, :targetId) AND ${entryBusinessDateSql} = :date LIMIT 1 FOR UPDATE`, { requesterId, targetId, date });
    if (punches.length) throw httpError(409, "A troca deve ser aceita antes de qualquer ponto dos dois funcionarios nesse dia.");
  };

  app.post("/api/timeclock/admin/schedules", route(async (req, res) => {
    const admin = auth(req, ["admin", "gerente"]);
    const { userId, startTime, endTime } = req.body;
    const workDays = req.body.workDays;
    const effectiveFrom = req.body.effectiveFrom || scheduleToday();
    if (!validDate(effectiveFrom) || effectiveFrom < scheduleToday()) throw httpError(400, "Escolha hoje ou uma data futura para iniciar o horario.");
    if (!validTimes(startTime, endTime)) throw httpError(400, "Informe entrada e saida validas. A saida deve ser depois da entrada, no mesmo dia.");
    if (!Array.isArray(workDays) || !workDays.length || workDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw httpError(400, "Selecione os dias de trabalho do funcionario.");
    await transaction(async (execute) => {
      const rows = await execute("SELECT id FROM users WHERE id = :userId AND role <> 'caixa' FOR UPDATE", { userId: userId || "" });
      if (!rows.length) throw httpError(404, "Funcionario nao encontrado.");
      const punches = await execute(`SELECT id FROM time_clock_entries WHERE user_id = :userId AND ${entryBusinessDateSql} >= :effectiveFrom LIMIT 1`, { userId, effectiveFrom });
      const existing = await execute("SELECT user_id FROM time_clock_schedules WHERE user_id = :userId AND effective_from <= :effectiveFrom LIMIT 1", { userId, effectiveFrom });
      if (punches.length && existing.length) throw httpError(409, "Ja existem pontos nesse periodo. Escolha uma data posterior para preservar o historico.");
      await execute(`INSERT INTO time_clock_schedules (user_id, effective_from, start_time, end_time, work_days, updated_by)
        VALUES (:userId, :effectiveFrom, :startTime, :endTime, :workDays, :updatedBy)
        ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), work_days = VALUES(work_days), updated_by = VALUES(updated_by)`,
      { userId, effectiveFrom, startTime, endTime, workDays: [...new Set(workDays)].sort().join(","), updatedBy: admin.id });
    });
    res.json({ ok: true });
  }));

  app.get("/api/timeclock/swaps/options", route(async (req, res) => {
    const user = auth(req);
    const date = String(req.query.date || scheduleToday());
    if (!validDate(date) || date < scheduleToday()) throw httpError(400, "Escolha hoje ou uma data futura.");
    const data = await loadScheduleData(query);
    const employees = await query("SELECT id, name, role FROM users WHERE active = 1 AND role <> 'caixa' ORDER BY name");
    res.json({ date, ownSchedule: effectiveSchedule(data, user.id, date),
      employees: employees.filter((item) => item.id !== user.id).map((item) => ({ ...item, schedule: effectiveSchedule(data, item.id, date) })) });
  }));

  app.get("/api/timeclock/swaps", route(async (req, res) => {
    const user = auth(req);
    res.json(await loadSwaps(query, user.id));
  }));

  app.post("/api/timeclock/swaps", route(async (req, res) => {
    const user = auth(req);
    const { targetId, date } = req.body;
    const reason = String(req.body.reason || "").trim();
    if (!validDate(date) || date < scheduleToday()) throw httpError(400, "Escolha hoje ou uma data futura.");
    if (!targetId || targetId === user.id) throw httpError(400, "Escolha outro funcionario.");
    if (!reason || reason.length > 255) throw httpError(400, "Informe um motivo de ate 255 caracteres.");
    const id = uid("swap");
    await transaction(async (execute) => {
      await lockEmployees(execute, user.id, targetId);
      await requireNoPunches(execute, user.id, targetId, date);
      const conflicts = await execute(`SELECT id FROM time_clock_swaps WHERE swap_date = :date AND status IN ('pending','accepted')
        AND (requester_id IN (:requesterId, :targetId) OR target_id IN (:requesterId, :targetId)) LIMIT 1`, { date, requesterId: user.id, targetId });
      if (conflicts.length) throw httpError(409, "Um dos funcionarios ja tem uma troca pendente ou aceita nesse dia.");
      const data = await loadScheduleData(execute);
      const own = regularSchedule(data, user.id, date);
      const target = regularSchedule(data, targetId, date);
      if (!own || !target) throw httpError(400, "O administrador precisa configurar o horario dos dois funcionarios.");
      if (!own.workingDay || !target.workingDay) throw httpError(400, "Os dois funcionarios precisam ter expediente na data da troca.");
      if (own.startTime === target.startTime && own.endTime === target.endTime) throw httpError(400, "Os dois funcionarios ja tem o mesmo horario.");
      await execute(`INSERT INTO time_clock_swaps (id, requester_id, target_id, swap_date, requester_start, requester_end, target_start, target_end, reason)
        VALUES (:id, :requesterId, :targetId, :date, :requesterStart, :requesterEnd, :targetStart, :targetEnd, :reason)`,
      { id, requesterId: user.id, targetId, date, requesterStart: own.startTime, requesterEnd: own.endTime, targetStart: target.startTime, targetEnd: target.endTime, reason });
    });
    res.status(201).json({ ok: true, id });
  }));

  app.post("/api/timeclock/swaps/:id/respond", route(async (req, res) => {
    const user = auth(req);
    const action = req.body.action;
    if (!["accept", "reject", "cancel"].includes(action)) throw httpError(400, "Resposta invalida.");
    const rows = await query("SELECT *, DATE_FORMAT(swap_date, '%Y-%m-%d') AS date FROM time_clock_swaps WHERE id = :id", { id: req.params.id });
    if (!rows.length) throw httpError(404, "Pedido nao encontrado.");
    const initial = rows[0];
    if (action === "cancel" ? initial.requester_id !== user.id : initial.target_id !== user.id) throw httpError(403, "Voce nao pode responder a este pedido.");
    await transaction(async (execute) => {
      await lockEmployees(execute, initial.requester_id, initial.target_id);
      const locked = await execute("SELECT *, DATE_FORMAT(swap_date, '%Y-%m-%d') AS date FROM time_clock_swaps WHERE id = :id FOR UPDATE", { id: initial.id });
      const swap = locked[0];
      if (!swap) throw httpError(404, "Pedido nao encontrado.");
      if (swap.status !== "pending") throw httpError(409, "Este pedido ja foi respondido.");
      if (swap.date < scheduleToday()) throw httpError(409, "O prazo deste pedido terminou.");
      if (action === "accept") {
        await requireNoPunches(execute, swap.requester_id, swap.target_id, swap.date);
        const data = await loadScheduleData(execute);
        const own = regularSchedule(data, swap.requester_id, swap.date);
        const target = regularSchedule(data, swap.target_id, swap.date);
        if (!own || !target || own.startTime !== swap.requester_start.slice(0, 5) || own.endTime !== swap.requester_end.slice(0, 5) || target.startTime !== swap.target_start.slice(0, 5) || target.endTime !== swap.target_end.slice(0, 5)) throw httpError(409, "Um horario mudou. Cancele este pedido e envie um novo.");
        if (!own.workingDay || !target.workingDay) throw httpError(409, "O expediente mudou. Cancele o pedido e envie outro para um dia de trabalho dos dois.");
        if (effectiveSchedule(data, swap.requester_id, swap.date)?.source === "swap" || effectiveSchedule(data, swap.target_id, swap.date)?.source === "swap") throw httpError(409, "Ja existe uma troca aceita nesse dia.");
        await execute(`INSERT INTO time_clock_day_schedules (user_id, schedule_date, start_time, end_time, swap_id)
          VALUES (:requesterId, :date, :targetStart, :targetEnd, :id), (:targetId, :date, :requesterStart, :requesterEnd, :id)`,
        { requesterId: swap.requester_id, targetId: swap.target_id, date: swap.date, targetStart: swap.target_start, targetEnd: swap.target_end, requesterStart: swap.requester_start, requesterEnd: swap.requester_end, id: swap.id });
      }
      await execute("UPDATE time_clock_swaps SET status = :status, responded_at = CURRENT_TIMESTAMP WHERE id = :id", { id: swap.id, status: { accept: "accepted", reject: "rejected", cancel: "canceled" }[action] });
    });
    res.json({ ok: true });
  }));
}

module.exports = { scheduleToday, clockParts, entryAtSql, entryBusinessDateSql, validDate, validTimes, regularSchedule, effectiveSchedule, completeAttendance, loadScheduleData, loadSwaps, registerScheduling };
