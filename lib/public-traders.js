import { getSql } from '@/lib/db'

/** Same data shape as the former Supabase RPC `get_public_trader_stats`. */
export async function fetchPublicTraderStats() {
  const sql = getSql()
  return sql`SELECT * FROM get_public_trader_stats()`
}

/**
 * Public trade list for a leaderboard profile. Omits private fields
 * (notes, screenshots, risk settings) — only outcome-facing data.
 */
export async function fetchPublicTraderTrades(userId) {
  if (!userId) return []
  const sql = getSql()
  return sql`
    SELECT
      id,
      date_time,
      end_date,
      asset_pair,
      direction,
      result,
      pnl_absolute,
      r_multiple,
      strategy_used,
      setup_tags
    FROM backtest_entries
    WHERE user_id = ${userId}
    ORDER BY date_time DESC
  `
}
