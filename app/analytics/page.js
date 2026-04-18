import { cookies } from 'next/headers'
import AnalyticsClient from '@/components/AnalyticsClient'
import { calculateAnalytics } from '@/lib/analytics'
import { getSessionUser } from '@/lib/auth'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  let initialData = null
  if (user) {
    const sql = getSql()
    const trades = await sql.query(
      `SELECT * FROM backtest_entries WHERE user_id = $1 ORDER BY date_time ASC`,
      [user.id]
    )
    initialData = calculateAnalytics(trades || [])
  }

  return <AnalyticsClient initialData={initialData} session={session} />
}
