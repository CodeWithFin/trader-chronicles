import { NextResponse } from 'next/server'
import { fetchPublicTraderStats } from '@/lib/public-traders'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchPublicTraderStats()
    const entries = (data || []).map((row) => ({
      id: row.id,
      username: row.username,
      totalTrades: row.total_trades,
      winRate: row.win_rate,
      bestAssetPair: row.best_asset_pair,
      joinedAt: row.joined_at,
    }))
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch leaderboard',
        details:
          error.message ||
          'Run neon/schema.sql in the Neon SQL Editor (including get_public_trader_stats).',
      },
      { status: 500 }
    )
  }
}
