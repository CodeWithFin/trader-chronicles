import { NextResponse } from 'next/server'
import { fetchPublicTraderStats } from '@/lib/public-traders'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const data = await fetchPublicTraderStats()
    const profile = (data || []).find((row) => row.id === id)
    if (!profile) {
      return NextResponse.json({ error: 'Trader not found' }, { status: 404 })
    }
    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      totalTrades: profile.total_trades,
      winRate: profile.win_rate,
      bestAssetPair: profile.best_asset_pair,
      joinedAt: profile.joined_at,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
