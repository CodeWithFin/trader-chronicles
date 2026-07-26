import { cookies } from 'next/headers'
import BacktestAnalyticsClient from '@/components/BacktestAnalyticsClient'
import { calculateAnalytics } from '@/lib/analytics'
import { getSessionUser } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { isBacktestSchemaMissingError } from '@/lib/backtests'

export const dynamic = 'force-dynamic'

export default async function BacktestAnalyticsPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  let initialData = null
  if (user) {
    const sql = getSql()
    try {
      const entries = await sql.query(
        `SELECT * FROM backtest_trades WHERE user_id = $1 ORDER BY date_time ASC`,
        [user.id]
      )
      initialData = calculateAnalytics(entries || [])
    } catch (e) {
      if (!isBacktestSchemaMissingError(e)) throw e
      initialData = calculateAnalytics([])
    }
  }

  return <BacktestAnalyticsClient initialData={initialData} session={session} />
}
