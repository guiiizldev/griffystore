const { query, closeDb } = require("../src/server/database");

function toNumber(value) {
  return Number(value || 0);
}

async function main() {
  const shiftRows = await query(
    "SELECT * FROM cash_shifts WHERE status = 'closed' ORDER BY closed_at DESC, opened_at DESC LIMIT 1",
  );
  const shift = shiftRows[0];
  if (!shift) {
    console.log("Nenhum caixa fechado encontrado.");
    return;
  }

  const saleRows = await query(
    `SELECT
       s.id,
       s.total,
       CASE
         WHEN COUNT(sp.sale_id) = 0 THEN s.total
         ELSE COALESCE(SUM(sp.amount), 0)
       END AS received_total
     FROM sales s
     LEFT JOIN sale_payments sp ON sp.sale_id = s.id
     WHERE s.shift_id = :shiftId AND COALESCE(s.status, 'active') <> 'canceled'
     GROUP BY s.id, s.total`,
    { shiftId: shift.id },
  );

  const movementRows = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'Entrada' THEN amount ELSE 0 END), 0) AS entradas,
       COALESCE(SUM(CASE WHEN type <> 'Entrada' THEN amount ELSE 0 END), 0) AS saidas
     FROM cash_movements
     WHERE shift_id = :shiftId
       AND sale_id IS NULL
       AND description NOT LIKE 'Venda %'
       AND LOWER(description) NOT LIKE '%cancelamento%'`,
    { shiftId: shift.id },
  );

  const received = saleRows.reduce((sum, sale) => sum + toNumber(sale.received_total), 0);
  const expected = received + toNumber(movementRows[0].entradas) - toNumber(movementRows[0].saidas);
  const closing = toNumber(shift.closing_amount);
  const difference = closing - expected;

  await query(
    `UPDATE cash_shifts
        SET expected_amount = :expected,
            difference_amount = :difference
      WHERE id = :shiftId`,
    { expected, difference, shiftId: shift.id },
  );

  console.log(`Caixa corrigido: ${shift.id}`);
  console.log(`Resultado anterior: R$ ${toNumber(shift.expected_amount).toFixed(2)}`);
  console.log(`Resultado correto: R$ ${expected.toFixed(2)}`);
  console.log(`Em caixa: R$ ${closing.toFixed(2)}`);
  console.log(`Diferenca: R$ ${difference.toFixed(2)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
