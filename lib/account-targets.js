import { startOfWeek, startOfMonth } from 'date-fns'
import { roundPnl } from '@/lib/pnl-money'
import { getCorrectedPnl } from '@/lib/analytics'

/**
 * Suggested weekly/monthly profit targets as a percent of account size.
 * Smaller accounts get higher percent targets (easier to hit meaningful $ amounts
 * while still being disciplined); larger accounts get more conservative targets.
 */
export function suggestTargetPercents(startingBalance) {
  const bal = Number(startingBalance)
  const balance = Number.isFinite(bal) && bal > 0 ? bal : 0

  if (balance <= 5000) return { weeklyTargetPercent: 5, monthlyTargetPercent: 15 }
  if (balance <= 25000) return { weeklyTargetPercent: 3, monthlyTargetPercent: 10 }
  if (balance <= 100000) return { weeklyTargetPercent: 2, monthlyTargetPercent: 7 }
  return { weeklyTargetPercent: 1.5, monthlyTargetPercent: 5 }
}

/** Parse/clamp a user-provided target percent from the API. */
export function normalizeTargetPercent(value, fallback) {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  const clamped = Math.min(n, 100)
  return Math.round(clamped * 100) / 100
}

/**
 * Returns the row from account_targets for this account, creating one with
 * suggested defaults if it doesn't exist yet.
 */
export async function ensureAccountTargets(sql, accountId, startingBalance) {
  const existing = await sql.query(
    `SELECT id, account_id, weekly_target_percent, monthly_target_percent, updated_at
     FROM account_targets WHERE account_id = $1`,
    [accountId]
  )
  if (existing?.[0]) return existing[0]

  const { weeklyTargetPercent, monthlyTargetPercent } = suggestTargetPercents(startingBalance)
  const inserted = await sql.query(
    `INSERT INTO account_targets (account_id, weekly_target_percent, monthly_target_percent)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id) DO UPDATE SET account_id = EXCLUDED.account_id
     RETURNING id, account_id, weekly_target_percent, monthly_target_percent, updated_at`,
    [accountId, weeklyTargetPercent, monthlyTargetPercent]
  )
  return inserted?.[0]
}

/** Start-of-week (Monday) and start-of-month boundaries for "current period" progress. */
export function getPeriodBounds(now = new Date()) {
  return {
    weekStart: startOfWeek(now, { weekStartsOn: 1 }),
    monthStart: startOfMonth(now),
  }
}

function buildPeriod({ percent, startingBalance, periodStart, trades }) {
  const targetAmount = roundPnl((Number(startingBalance) || 0) * (Number(percent) || 0) / 100)
  const pnl = roundPnl(trades.reduce((sum, t) => sum + getCorrectedPnl(t), 0))
  const progressPercent = targetAmount > 0 ? Math.max(0, (pnl / targetAmount) * 100) : 0
  const hit = targetAmount > 0 && pnl >= targetAmount

  return {
    periodStart: periodStart.toISOString(),
    targetAmount,
    pnl,
    progressPercent,
    hit,
  }
}

/**
 * Computes weekly/monthly progress for an account from its already-fetched trades
 * (trades must at least cover back to min(weekStart, monthStart)).
 */
export function computeTargetProgress({ target, startingBalance, trades, now = new Date() }) {
  const { weekStart, monthStart } = getPeriodBounds(now)

  const weeklyTrades = trades.filter((t) => new Date(t.date_time) >= weekStart)
  const monthlyTrades = trades.filter((t) => new Date(t.date_time) >= monthStart)

  return {
    weekly: buildPeriod({
      percent: target.weekly_target_percent,
      startingBalance,
      periodStart: weekStart,
      trades: weeklyTrades,
    }),
    monthly: buildPeriod({
      percent: target.monthly_target_percent,
      startingBalance,
      periodStart: monthStart,
      trades: monthlyTrades,
    }),
  }
}
