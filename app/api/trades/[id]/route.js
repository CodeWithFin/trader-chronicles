import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    const rows = await sql.query(
      `SELECT * FROM backtest_entries WHERE id = $1 AND user_id = $2`,
      [params.id, user.id]
    )
    const data = rows?.[0]
    if (!data) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sql = getSql()

    let currentResult = body.result
    if (body.pnlAbsolute !== undefined && body.result === undefined) {
      const cur = await sql.query(
        `SELECT result FROM backtest_entries WHERE id = $1 AND user_id = $2`,
        [params.id, user.id]
      )
      currentResult = cur?.[0]?.result
    }

    const fields = []
    const values = []
    let idx = 1

    const push = (col, val) => {
      fields.push(`${col} = $${idx}`)
      values.push(val)
      idx += 1
    }

    if (body.dateTime !== undefined) push('date_time', body.dateTime)
    if (body.endDate !== undefined) push('end_date', body.endDate)
    if (body.assetPair !== undefined) push('asset_pair', body.assetPair)
    if (body.direction !== undefined) push('direction', body.direction)
    if (body.entryPrice !== undefined) push('entry_price', body.entryPrice)
    if (body.exitPrice !== undefined) push('exit_price', body.exitPrice)
    if (body.stopLossPrice !== undefined) push('stop_loss_price', body.stopLossPrice)
    if (body.riskPerTrade !== undefined) push('risk_per_trade', body.riskPerTrade)
    if (body.result !== undefined) push('result', body.result)

    if (body.pnlAbsolute !== undefined) {
      let correctedPnl = parseFloat(body.pnlAbsolute)
      const resultToUse = body.result !== undefined ? body.result : currentResult
      if (resultToUse === 'Loss' && correctedPnl > 0) correctedPnl = -Math.abs(correctedPnl)
      else if (resultToUse === 'Win' && correctedPnl < 0) correctedPnl = Math.abs(correctedPnl)
      push('pnl_absolute', correctedPnl)
    }

    if (body.rMultiple !== undefined) push('r_multiple', body.rMultiple)
    if (body.strategyUsed !== undefined) push('strategy_used', body.strategyUsed)
    if (body.setupTags !== undefined) push('setup_tags', Array.isArray(body.setupTags) ? body.setupTags : [])
    if (body.notes !== undefined) push('notes', body.notes)
    if (body.screenshotUrl !== undefined) push('screenshot_url', body.screenshotUrl)

    if (fields.length === 0) {
      const existing = await sql.query(
        `SELECT * FROM backtest_entries WHERE id = $1 AND user_id = $2`,
        [params.id, user.id]
      )
      if (!existing?.[0]) {
        return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
      }
      return NextResponse.json(existing[0])
    }

    values.push(params.id, user.id)
    const query = `
      UPDATE backtest_entries SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND user_id = $${idx + 1}
      RETURNING *
    `
    const rows = await sql.query(query, values)
    const data = rows?.[0]
    if (!data) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    const rows = await sql.query(
      `DELETE FROM backtest_entries WHERE id = $1 AND user_id = $2 RETURNING id`,
      [params.id, user.id]
    )
    if (!rows?.length) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Trade deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
