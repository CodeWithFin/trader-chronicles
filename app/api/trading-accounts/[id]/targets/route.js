import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { getTradingAccountForUser, normalizeStartingBalance } from '@/lib/trading-accounts'
import {
  ensureAccountTargets,
  computeTargetProgress,
  getPeriodBounds,
  suggestTargetPercents,
  normalizeTargetPercent,
} from '@/lib/account-targets'
import {
  isTradingAccountsSchemaMissingError,
  isAccountTargetsSchemaMissingError,
  ACCOUNT_TARGETS_MIGRATION_HELP,
} from '@/lib/trades-schema-fallback'

export const dynamic = 'force-dynamic'

async function loadOwnedAccount(sql, params, user) {
  const account = await getTradingAccountForUser(sql, params.id, user.id)
  if (!account) {
    return { errorResponse: NextResponse.json({ error: 'Trading account not found' }, { status: 404 }) }
  }
  return { account }
}

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    const { account, errorResponse } = await loadOwnedAccount(sql, params, user)
    if (errorResponse) return errorResponse

    const target = await ensureAccountTargets(sql, account.id, account.starting_balance)

    const now = new Date()
    const { weekStart, monthStart } = getPeriodBounds(now)
    const rangeStart = weekStart < monthStart ? weekStart : monthStart

    const trades = await sql.query(
      `SELECT pnl_absolute, result, date_time FROM backtest_entries
       WHERE account_id = $1 AND date_time >= $2 AND date_time <= $3`,
      [account.id, rangeStart.toISOString(), now.toISOString()]
    )

    const startingBalance = normalizeStartingBalance(account.starting_balance)
    const progress = computeTargetProgress({ target, startingBalance, trades: trades || [], now })

    return NextResponse.json({
      accountId: account.id,
      startingBalance,
      weeklyTargetPercent: Number(target.weekly_target_percent),
      monthlyTargetPercent: Number(target.monthly_target_percent),
      suggested: suggestTargetPercents(startingBalance),
      weekly: progress.weekly,
      monthly: progress.monthly,
    })
  } catch (error) {
    if (isAccountTargetsSchemaMissingError(error) || isTradingAccountsSchemaMissingError(error)) {
      return NextResponse.json({
        migrationRequired: true,
        migrationMessage: ACCOUNT_TARGETS_MIGRATION_HELP,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    const { account, errorResponse } = await loadOwnedAccount(sql, params, user)
    if (errorResponse) return errorResponse

    const existing = await ensureAccountTargets(sql, account.id, account.starting_balance)
    const body = await request.json()

    let weeklyTargetPercent
    let monthlyTargetPercent

    if (body.reset) {
      const suggested = suggestTargetPercents(account.starting_balance)
      weeklyTargetPercent = suggested.weeklyTargetPercent
      monthlyTargetPercent = suggested.monthlyTargetPercent
    } else {
      weeklyTargetPercent =
        body.weeklyTargetPercent !== undefined
          ? normalizeTargetPercent(body.weeklyTargetPercent, existing.weekly_target_percent)
          : existing.weekly_target_percent
      monthlyTargetPercent =
        body.monthlyTargetPercent !== undefined
          ? normalizeTargetPercent(body.monthlyTargetPercent, existing.monthly_target_percent)
          : existing.monthly_target_percent
    }

    const rows = await sql.query(
      `UPDATE account_targets
       SET weekly_target_percent = $1, monthly_target_percent = $2, updated_at = TIMEZONE('utc'::text, NOW())
       WHERE account_id = $3
       RETURNING id, account_id, weekly_target_percent, monthly_target_percent, updated_at`,
      [weeklyTargetPercent, monthlyTargetPercent, account.id]
    )

    return NextResponse.json(rows?.[0] || existing)
  } catch (error) {
    if (isAccountTargetsSchemaMissingError(error) || isTradingAccountsSchemaMissingError(error)) {
      return NextResponse.json({ error: ACCOUNT_TARGETS_MIGRATION_HELP }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
