import { getSql } from '@/lib/db'

/** Same data shape as the former Supabase RPC `get_public_trader_stats`. */
export async function fetchPublicTraderStats() {
  const sql = getSql()
  return sql`SELECT * FROM get_public_trader_stats()`
}
