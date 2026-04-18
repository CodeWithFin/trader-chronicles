import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { calculateAnalytics, FINANCIAL_STARTING_BALANCE } from '@/lib/analytics'
import { getTradingAccountForUser, normalizeStartingBalance } from '@/lib/trading-accounts'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    const sql = getSql()

    let trades
    let financialStartingBalance = FINANCIAL_STARTING_BALANCE

    if (accountId) {
      const acct = await getTradingAccountForUser(sql, accountId, user.id)
      if (!acct) {
        return NextResponse.json({ error: 'Trading account not found' }, { status: 404 })
      }
      financialStartingBalance = normalizeStartingBalance(acct.starting_balance)
      trades = await sql.query(
        `SELECT * FROM backtest_entries WHERE user_id = $1 AND account_id = $2 ORDER BY date_time ASC`,
        [user.id, accountId]
      )
    } else {
      trades = await sql.query(
        `SELECT * FROM backtest_entries WHERE user_id = $1 ORDER BY date_time ASC`,
        [user.id]
      )
    }

    const analyticsResults = calculateAnalytics(trades || [], { financialStartingBalance })
    return NextResponse.json(analyticsResults)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
