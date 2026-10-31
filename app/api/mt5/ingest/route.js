import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { roundPnl } from '@/lib/pnl-money'
import { ensureTradingAccountForUser } from '@/lib/trading-accounts'

export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

    const sql = getSql()
    const [user] = await sql`SELECT id FROM users WHERE mt5_api_key = ${apiKey}`
    if (!user) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

    const body = await request.json()
    const {
      ticket,
      symbol,
      direction,      // 'Long' or 'Short' (EA sends this directly)
      open_time,      // ISO string or unix seconds
      close_time,
      open_price,
      close_price,
      stop_loss = 0,
      profit,
      volume = 0,
      comment = '',
    } = body

    if (!symbol || !direction || !open_price || !close_price || profit === undefined) {
      return NextResponse.json({ error: 'Missing required fields: symbol, direction, open_price, close_price, profit' }, { status: 400 })
    }

    if (!['Long', 'Short'].includes(direction)) {
      return NextResponse.json({ error: 'direction must be Long or Short' }, { status: 400 })
    }

    const pnl = roundPnl(parseFloat(profit))
    const result = pnl >= 0 ? 'Win' : 'Loss'

    const openTs = typeof open_time === 'number'
      ? new Date(open_time * 1000).toISOString()
      : open_time
    const closeTs = typeof close_time === 'number'
      ? new Date(close_time * 1000).toISOString()
      : (close_time || open_time)

    const accountId = await ensureTradingAccountForUser(sql, user.id)

    const notes = [
      comment ? `Comment: ${comment}` : '',
      volume ? `Volume: ${volume} lots` : '',
    ].filter(Boolean).join(' | ')

    const [trade] = await sql`
      INSERT INTO backtest_entries (
        user_id, account_id, mt5_ticket,
        date_time, end_date, asset_pair, direction,
        entry_price, exit_price, stop_loss_price,
        result, pnl_absolute, notes
      ) VALUES (
        ${user.id}, ${accountId}, ${ticket ?? null},
        ${openTs}::timestamptz, ${closeTs}::timestamptz,
        ${symbol.trim()}, ${direction},
        ${roundPnl(parseFloat(open_price))}, ${roundPnl(parseFloat(close_price))},
        ${roundPnl(parseFloat(stop_loss) || 0)},
        ${result}, ${pnl}, ${notes}
      )
      ON CONFLICT (user_id, mt5_ticket) WHERE mt5_ticket IS NOT NULL
      DO NOTHING
      RETURNING id
    `

    if (!trade) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'duplicate ticket' })
    }

    return NextResponse.json({ ok: true, id: trade.id }, { status: 201 })
  } catch (e) {
    console.error('MT5 ingest error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
