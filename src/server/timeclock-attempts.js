const { entryAtSql, entryBusinessDateSql } = require("./timeclock-scheduling");
const { coordinate } = require("./timeclock-location");
const punchTypes = ["Entrada", "Intervalo inicio", "Intervalo fim", "Saida"];
function mapAttempt(row) {
  return { id: row.id, userId: row.user_id, userName: row.user_name, type: row.entry_type, at: row.entry_at,
    status: row.status, reason: row.reason, entryId: row.entry_id,
    latitude: row.latitude, longitude: row.longitude, accuracy: row.accuracy };
}
async function beginAttempt(query, uid, user, type) {
  const id = uid("ta");
  await query("INSERT INTO time_clock_attempts (id,user_id,user_name,entry_type) VALUES (:id,:userId,:userName,:type)", { id, userId: user.id, userName: user.name, type });
  return mapAttempt((await query(`SELECT *, ${entryAtSql} AS entry_at FROM time_clock_attempts WHERE id=:id`, { id }))[0]);
}
async function failAttempt(query, id, userId, reason, body = {}) {
  await query(`UPDATE time_clock_attempts SET status='failed',reason=:reason,latitude=:latitude,longitude=:longitude,accuracy=:accuracy
    WHERE id=:id AND user_id=:userId AND status='processing'`, { id, userId, reason: String(reason || "Tentativa nao concluida").slice(0, 255),
    latitude: coordinate(body.latitude, 90), longitude: coordinate(body.longitude, 180), accuracy: coordinate(body.accuracy, 99999999) });
  const rows = await query(`SELECT *, ${entryAtSql} AS entry_at FROM time_clock_attempts WHERE id=:id AND user_id=:userId`, { id, userId });
  return rows[0] ? mapAttempt(rows[0]) : null;
}
async function loadAttempts(query, { userId, fromDate, month }) {
  const where = userId ? `user_id=:userId AND ${entryBusinessDateSql} >= :fromDate` : `DATE_FORMAT(${entryBusinessDateSql}, '%Y-%m')=:month`;
  return (await query(`SELECT *, ${entryAtSql} AS entry_at FROM time_clock_attempts WHERE ${where} ORDER BY entry_at DESC`, { userId: userId || "", fromDate: fromDate || "", month: month || "" })).map(mapAttempt);
}
function registerAttempts(app, { query, uid, requireRoleToken }) {
  const route = (handler) => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
  app.get("/api/timeclock/admin/errors", route(async (req, res) => {
    if (!requireRoleToken(req, ["admin"])) return res.status(403).json({ error: "Apenas administrador pode consultar os logs de erro." });
    const month = String(req.query.month || "");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: "Mes invalido." });
    const rows = await query(`SELECT *, ${entryAtSql} AS entry_at FROM time_clock_attempts
      WHERE DATE_FORMAT(${entryBusinessDateSql}, '%Y-%m')=:month AND (status='failed' OR (status='processing' AND entry_at < NOW() - INTERVAL 2 MINUTE))
      ORDER BY entry_at DESC LIMIT 200`, { month });
    res.json({ logs: rows.map(mapAttempt) });
  }));
  app.post("/api/timeclock/attempts", route(async (req, res) => {
    const user = requireRoleToken(req);
    if (!user) return res.status(401).json({ error: "Sessao expirada." });
    const type = req.body.type;
    if (!punchTypes.includes(type)) return res.status(400).json({ error: "Tipo de ponto invalido." });
    res.status(201).json(await beginAttempt(query, uid, user, type));
  }));
  app.post("/api/timeclock/attempts/:id/fail", route(async (req, res) => {
    const user = requireRoleToken(req);
    if (!user) return res.status(401).json({ error: "Sessao expirada." });
    const attempt = await failAttempt(query, req.params.id, user.id, req.body.reason);
    if (!attempt) return res.status(404).json({ error: "Tentativa nao encontrada." });
    res.json(attempt);
  }));
}
module.exports = { punchTypes, mapAttempt, beginAttempt, failAttempt, loadAttempts, registerAttempts };
