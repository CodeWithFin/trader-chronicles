import { cookies } from 'next/headers'
import TradeLogClient from '@/components/TradeLogClient'
import { getSessionUser } from '@/lib/auth'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function TradesPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  let initialTrades = []
  if (user) {
    const sql = getSql()
    initialTrades = await sql.query(
      `SELECT * FROM backtest_entries WHERE user_id = $1 ORDER BY date_time DESC LIMIT 50`,
      [user.id]
    )
  }

  return <TradeLogClient initialTrades={initialTrades} session={session} />
}
