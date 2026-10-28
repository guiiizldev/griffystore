function reportRange(type, period) {
  if (type === "month" && /^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    const [year, month] = period.split("-").map(Number);
    return { from: `${period}-01`, to: `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01` };
  }
  if (type === "day" && /^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const date = new Date(`${period}T12:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === period) {
      date.setUTCDate(date.getUTCDate() + 1);
      return { from: period, to: date.toISOString().slice(0, 10) };
    }
  }
  return null;
}

function registerSalesReports(app, { query, mapSale, mapShift }) {
  app.get("/api/reports/period", async (req, res, next) => {
    const type = String(req.query.type || "day");
    const period = String(req.query.period || "");
    const range = reportRange(type, period);
    if (!range) return res.status(400).json({ error: "Periodo do relatorio invalido." });
    try {
      const [sales, items, payments, shifts, movements] = await Promise.all([
        query("SELECT * FROM sales WHERE sale_date >= :from AND sale_date < :to ORDER BY created_at DESC, id DESC", range),
        query("SELECT i.* FROM sale_items i JOIN sales s ON s.id=i.sale_id WHERE s.sale_date >= :from AND s.sale_date < :to ORDER BY i.id", range),
        query("SELECT p.* FROM sale_payments p JOIN sales s ON s.id=p.sale_id WHERE s.sale_date >= :from AND s.sale_date < :to ORDER BY p.id", range),
        query("SELECT * FROM cash_shifts WHERE business_date >= :from AND business_date < :to ORDER BY opened_at DESC", range),
        query(`SELECT m.id,m.shift_id,m.sale_id,m.type,m.description,m.amount,m.movement_date AS date,m.operator
          FROM cash_movements m LEFT JOIN cash_shifts c ON c.id=m.shift_id
          WHERE (c.business_date >= :from AND c.business_date < :to)
             OR (m.shift_id IS NULL AND m.movement_date >= :from AND m.movement_date < :to)
          ORDER BY m.movement_date DESC,m.id DESC`, range),
      ]);
      const bySale = (rows) => {
        const result = new Map();
        for (const row of rows) {
          if (!result.has(row.sale_id)) result.set(row.sale_id, []);
          result.get(row.sale_id).push(row);
        }
        return result;
      };
      const itemGroups = bySale(items), paymentGroups = bySale(payments);
      res.set("Cache-Control", "no-store").json({ type, period, ...range,
        sales: sales.map((row) => ({ ...mapSale(row),
          items: (itemGroups.get(row.id) || []).map((item) => ({ id: item.product_id, name: item.product_name, qty: Number(item.qty), price: Number(item.price) })),
          payments: (paymentGroups.get(row.id) || []).map((payment) => ({ method: payment.method, amount: Number(payment.amount), details: payment.details, installments: payment.installments })),
        })),
        shifts: shifts.map(mapShift),
        movements: movements.map((movement) => ({ ...movement, shiftId: movement.shift_id, saleId: movement.sale_id, amount: Number(movement.amount) })),
      });
    } catch (error) { next(error); }
  });
}

module.exports = { reportRange, registerSalesReports };
