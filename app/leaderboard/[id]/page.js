import { cookies } from 'next/headers'
import TraderProfileClient from '@/components/TraderProfileClient'
import { getSessionUser } from '@/lib/auth'
import { fetchPublicTraderStats, fetchPublicTraderTrades } from '@/lib/public-traders'

export const dynamic = 'force-dynamic'

function serializeTrade(row) {
  return {
    id: row.id,
    date_time: row.date_time,
    end_date: row.end_date,
    asset_pair: row.asset_pair,
    direction: row.direction,
    result: row.result,
    pnl_absolute: row.pnl_absolute != null ? Number(row.pnl_absolute) : 0,
    r_multiple: row.r_multiple != null ? Number(row.r_multiple) : 0,
    strategy_used: row.strategy_used || '',
    setup_tags: Array.isArray(row.setup_tags) ? row.setup_tags : [],
  }
}

export default async function LeaderboardProfilePage({ params }) {
  const { id } = params
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  let profile = null
  let trades = []
  try {
    const rawProfile = await fetchPublicTraderStats()
    const row = (rawProfile || []).find((t) => t.id === id)
    if (row) {
      profile = {
        id: row.id,
        username: row.username,
        totalTrades: row.total_trades,
        winRate: row.win_rate,
        totalPnl: row.total_pnl != null ? Number(row.total_pnl) : 0,
        bestAssetPair: row.best_asset_pair,
        joinedAt: row.joined_at,
      }
      const rawTrades = await fetchPublicTraderTrades(id)
      trades = (rawTrades || []).map(serializeTrade)
    }
  } catch (e) {
    console.error('Error fetching profile:', e)
  }

  return <TraderProfileClient profile={profile} trades={trades} session={session} />
}
