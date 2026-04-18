/**
 * Detects PostgreSQL errors when trading_accounts / account_id are not migrated yet.
 */
export function isTradingAccountsSchemaMissingError(error) {
  const code = error?.code
  const msg = String(error?.message || '')
  if (code === '42P01' && /trading_accounts/i.test(msg)) return true
  if (code === '42703' && /account_id/i.test(msg)) return true
  return false
}

/**
 * Initial trade log SSR: prefer join with labels; fall back to legacy table only.
 */
export async function selectUserTradesPreview(sql, userId, limit = 50) {
  const joined = `SELECT b.*, a.label AS account_label
    FROM backtest_entries b
    LEFT JOIN trading_accounts a ON a.id = b.account_id
    WHERE b.user_id = $1 ORDER BY b.date_time DESC LIMIT $2`
  try {
    return await sql.query(joined, [userId, limit])
  } catch (e) {
    if (!isTradingAccountsSchemaMissingError(e)) throw e
    return await sql.query(
      `SELECT * FROM backtest_entries WHERE user_id = $1 ORDER BY date_time DESC LIMIT $2`,
      [userId, limit]
    )
  }
}
