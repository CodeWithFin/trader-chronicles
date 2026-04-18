import { cookies } from 'next/headers'
import TradersClient from '@/components/TradersClient'
import { getSessionUser } from '@/lib/auth'
import { fetchPublicTraderStats } from '@/lib/public-traders'

export const dynamic = 'force-dynamic'

export default async function TradersPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  const rawTraders = await fetchPublicTraderStats()
  const traders = (rawTraders || []).map((row) => ({
    id: row.id,
    username: row.username,
    totalTrades: row.total_trades,
    winRate: row.win_rate,
    bestAssetPair: row.best_asset_pair,
    joinedAt: row.joined_at,
  }))

  return <TradersClient initialTraders={traders} session={session} />
}
