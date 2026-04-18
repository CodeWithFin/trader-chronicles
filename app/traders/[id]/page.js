import { cookies } from 'next/headers'
import TraderProfileClient from '@/components/TraderProfileClient'
import { getSessionUser } from '@/lib/auth'
import { fetchPublicTraderStats } from '@/lib/public-traders'

export const dynamic = 'force-dynamic'

export default async function TraderProfilePage({ params }) {
  const { id } = params
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  let profile = null
  try {
    const rawProfile = await fetchPublicTraderStats()
    const row = (rawProfile || []).find((t) => t.id === id)
    if (row) {
      profile = {
        id: row.id,
        username: row.username,
        totalTrades: row.total_trades,
        winRate: row.win_rate,
        bestAssetPair: row.best_asset_pair,
        joinedAt: row.joined_at,
      }
    }
  } catch (e) {
    console.error('Error fetching profile:', e)
  }

  return <TraderProfileClient profile={profile} session={session} />
}
