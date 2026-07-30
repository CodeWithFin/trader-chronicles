import { NextResponse } from 'next/server'
import { fetchPublicTraderStats, fetchPublicTraderTrades } from '@/lib/public-traders'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const data = await fetchPublicTraderStats()
    const profile = (data || []).find((row) => row.id === id)
    if (!profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const rawTrades = await fetchPublicTraderTrades(id)
    const trades = (rawTrades || []).map((row) => ({
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
    }))
    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      totalTrades: profile.total_trades,
      winRate: profile.win_rate,
      totalPnl: profile.total_pnl != null ? Number(profile.total_pnl) : 0,
      bestAssetPair: profile.best_asset_pair,
      joinedAt: profile.joined_at,
      trades,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
