/**
 * Helpers for the backtesting module. Backtest records live in
 * public.backtest_trades and are kept fully separate from normal/live trades
 * (which live in public.backtest_entries despite its legacy name).
 */

export const BACKTESTING_MIGRATION_HELP =
  'Backtesting setup required: in Neon, open the SQL Editor and run neon/migrations/002_backtesting.sql from this repository (or apply neon/schema.sql on a fresh database). Then refresh this page.'

/** Detects the PostgreSQL "table does not exist" error for backtest_trades. */
export function isBacktestSchemaMissingError(error) {
  const code = error?.code
  const msg = String(error?.message || '')
  return code === '42P01' && /backtest_trades/i.test(msg)
}

/**
 * Initial backtest log SSR select. Returns [] when the table is not migrated
 * yet so the page can render with a helpful empty state instead of crashing.
 */
export async function selectUserBacktestsPreview(sql, userId, limit = 50) {
  try {
    return await sql.query(
      `SELECT * FROM backtest_trades WHERE user_id = $1 ORDER BY date_time DESC LIMIT $2`,
      [userId, limit]
    )
  } catch (e) {
    if (!isBacktestSchemaMissingError(e)) throw e
    return []
  }
}
