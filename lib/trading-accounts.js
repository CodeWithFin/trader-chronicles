import { roundPnl } from '@/lib/pnl-money'

/**
 * Returns the user's first trading account id, or null if none exist.
 */
export async function ensureTradingAccountForUser(sql, userId) {
  const existing = await sql.query(
    `SELECT id FROM trading_accounts WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC LIMIT 1`,
    [userId]
  )
  return existing?.[0]?.id ?? null
}

export async function getTradingAccountForUser(sql, accountId, userId) {
  const rows = await sql.query(
    `SELECT id, label, kind, starting_balance, sort_order
     FROM trading_accounts WHERE id = $1 AND user_id = $2`,
    [accountId, userId]
  )
  return rows?.[0] ?? null
}

/** Parse numeric starting_balance from DB (string). */
export function normalizeStartingBalance(value, fallback = 10000) {
  const n = typeof value === 'number' ? value : parseFloat(value)
  const r = roundPnl(n)
  return Number.isFinite(r) && r >= 0 ? r : fallback
}
