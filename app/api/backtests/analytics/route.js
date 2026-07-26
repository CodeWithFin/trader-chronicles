import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { calculateAnalytics } from '@/lib/analytics'
import { BACKTESTING_MIGRATION_HELP, isBacktestSchemaMissingError } from '@/lib/backtests'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const strategyName = searchParams.get('strategyName')

    const sql = getSql()

    let entries
    try {
      if (strategyName) {
        entries = await sql.query(
          `SELECT * FROM backtest_trades WHERE user_id = $1 AND strategy_name = $2 ORDER BY date_time ASC`,
          [user.id, strategyName]
        )
      } else {
        entries = await sql.query(
          `SELECT * FROM backtest_trades WHERE user_id = $1 ORDER BY date_time ASC`,
          [user.id]
        )
      }
    } catch (e) {
      if (isBacktestSchemaMissingError(e)) {
        return NextResponse.json({ error: BACKTESTING_MIGRATION_HELP }, { status: 503 })
      }
      throw e
    }

    const analyticsResults = calculateAnalytics(entries || [])
    return NextResponse.json(analyticsResults)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
