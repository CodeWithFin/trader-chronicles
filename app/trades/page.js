import { cookies } from 'next/headers'
import TradeLogClient from '@/components/TradeLogClient'
import { getSessionUser } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { selectUserTradesPreview } from '@/lib/trades-schema-fallback'

export const dynamic = 'force-dynamic'

export default async function TradesPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  let initialTrades = []
  if (user) {
    const sql = getSql()
    initialTrades = await selectUserTradesPreview(sql, user.id, 50)
  }

  return <TradeLogClient initialTrades={initialTrades} session={session} />
}
