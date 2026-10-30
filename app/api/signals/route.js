import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { fetchPublicSignals, createSignal } from '@/lib/signals'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const signals = await fetchPublicSignals({ status })
    return NextResponse.json({ signals: signals.map(serializeSignal) })
  } catch (e) {
    console.error('GET /api/signals error:', e)
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { assetPair, direction, entryPrice, stopLoss, takeProfit, notes } = body

    if (!assetPair?.trim()) return NextResponse.json({ error: 'Asset/pair is required' }, { status: 400 })
    if (!['Long', 'Short'].includes(direction)) return NextResponse.json({ error: 'Direction must be Long or Short' }, { status: 400 })

    const signal = await createSignal({
      userId: user.id,
      assetPair: assetPair.trim(),
      direction,
      entryPrice: entryPrice ? parseFloat(entryPrice) : null,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      notes: notes || '',
    })

    return NextResponse.json({ signal: serializeSignal(signal) }, { status: 201 })
  } catch (e) {
    console.error('POST /api/signals error:', e)
    return NextResponse.json({ error: 'Failed to create signal' }, { status: 500 })
  }
}

function serializeSignal(s) {
  return {
    id: s.id,
    user_id: s.user_id,
    username: s.username || null,
    asset_pair: s.asset_pair,
    direction: s.direction,
    entry_price: s.entry_price != null ? Number(s.entry_price) : null,
    stop_loss: s.stop_loss != null ? Number(s.stop_loss) : null,
    take_profit: s.take_profit != null ? Number(s.take_profit) : null,
    status: s.status,
    notes: s.notes || '',
    created_at: s.created_at,
    resolved_at: s.resolved_at || null,
  }
}
