import { cookies } from 'next/headers'
import LeaderboardClient from '@/components/LeaderboardClient'
import { getSessionUser } from '@/lib/auth'
import { fetchPublicTraderStats } from '@/lib/public-traders'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  const rawTraders = await fetchPublicTraderStats()
  const entries = (rawTraders || []).map((row) => ({
    id: row.id,
    username: row.username,
    totalTrades: row.total_trades,
    winRate: row.win_rate,
    bestAssetPair: row.best_asset_pair,
    joinedAt: row.joined_at,
  }))

  return <LeaderboardClient initialEntries={entries} session={session} />
}
