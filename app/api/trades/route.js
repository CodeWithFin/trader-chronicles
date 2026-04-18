import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const SORT_COLUMNS = new Set(['date_time', 'asset_pair', 'result', 'pnl_absolute', 'created_at'])

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assetPair = searchParams.get('assetPair')
    const strategyUsed = searchParams.get('strategyUsed')
    const resultFilter = searchParams.get('result')
    const setupTag = searchParams.get('setupTag')
    const sortByRaw = searchParams.get('sortBy') || 'date_time'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC'
    const sortBy = SORT_COLUMNS.has(sortByRaw) ? sortByRaw : 'date_time'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const sql = getSql()
    const conditions = ['user_id = $1']
    const params = [user.id]
    let n = 2

    if (assetPair) {
      conditions.push(`asset_pair ILIKE $${n}`)
      params.push(`%${assetPair}%`)
      n += 1
    }
    if (strategyUsed) {
      conditions.push(`strategy_used ILIKE $${n}`)
      params.push(`%${strategyUsed}%`)
      n += 1
    }
    if (resultFilter) {
      conditions.push(`result = $${n}`)
      params.push(resultFilter)
      n += 1
    }
    if (setupTag) {
      conditions.push(`$${n} = ANY(setup_tags)`)
      params.push(setupTag)
      n += 1
    }

    const whereClause = conditions.join(' AND ')
    const countQuery = `SELECT COUNT(*)::int AS c FROM backtest_entries WHERE ${whereClause}`
    const countRows = await sql.query(countQuery, params)
    const total = countRows?.[0]?.c ?? 0

    const dataQuery = `SELECT * FROM backtest_entries WHERE ${whereClause} ORDER BY ${sortBy} ${sortOrder} OFFSET $${n} LIMIT $${n + 1}`
    const dataParams = [...params, offset, limit]
    const trades = await sql.query(dataQuery, dataParams)

    return NextResponse.json({
      trades: trades || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to continue.' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.dateTime) {
      return NextResponse.json({ error: 'Date/Time is required' }, { status: 400 })
    }
    if (!body.assetPair || !body.assetPair.trim()) {
      return NextResponse.json({ error: 'Asset/Symbol is required' }, { status: 400 })
    }
    if (!body.direction || !['Long', 'Short'].includes(body.direction)) {
      return NextResponse.json({ error: 'Direction must be Long or Short' }, { status: 400 })
    }
    if (body.entryPrice === undefined || body.entryPrice === null || isNaN(parseFloat(body.entryPrice))) {
      return NextResponse.json({ error: 'Valid entry price is required' }, { status: 400 })
    }
    if (body.exitPrice === undefined || body.exitPrice === null || isNaN(parseFloat(body.exitPrice))) {
      return NextResponse.json({ error: 'Valid exit price is required' }, { status: 400 })
    }
    if (!body.result || !['Win', 'Loss'].includes(body.result)) {
      return NextResponse.json({ error: 'Result must be Win or Loss' }, { status: 400 })
    }
    if (body.pnlAbsolute === undefined || body.pnlAbsolute === null || isNaN(parseFloat(body.pnlAbsolute))) {
      return NextResponse.json({ error: 'Valid P&L amount is required' }, { status: 400 })
    }

    const {
      dateTime,
      endDate,
      assetPair,
      direction,
      entryPrice,
      exitPrice,
      stopLossPrice = 0,
      riskPerTrade = 0,
      result,
      pnlAbsolute,
      rMultiple = 0,
      strategyUsed = '',
      setupTags = [],
      notes = '',
      screenshotUrl = '',
    } = body

    let correctedPnl = parseFloat(pnlAbsolute)
    if (result === 'Loss' && correctedPnl > 0) {
      correctedPnl = -Math.abs(correctedPnl)
    } else if (result === 'Win' && correctedPnl < 0) {
      correctedPnl = Math.abs(correctedPnl)
    }

    const tags = Array.isArray(setupTags) ? setupTags : []

    const sql = getSql()
    const rows = await sql.query(
      `INSERT INTO backtest_entries (
        user_id, date_time, end_date, asset_pair, direction,
        entry_price, exit_price, stop_loss_price, risk_per_trade,
        result, pnl_absolute, r_multiple, strategy_used, setup_tags, notes, screenshot_url
      ) VALUES (
        $1, $2::timestamptz, $3::timestamptz, $4, $5,
        $6, $7, $8, $9, $10, $11, $12, $13, $14::text[], $15, $16
      ) RETURNING *`,
      [
        user.id,
        dateTime,
        endDate || dateTime,
        assetPair.trim(),
        direction,
        parseFloat(entryPrice),
        parseFloat(exitPrice),
        parseFloat(stopLossPrice) || 0,
        parseFloat(riskPerTrade) || 0,
        result,
        correctedPnl,
        parseFloat(rMultiple) || 0,
        strategyUsed || '',
        tags,
        notes || '',
        screenshotUrl || '',
      ]
    )

    const data = rows?.[0]
    if (!data) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: error.message || 'Server error occurred' }, { status: 500 })
  }
}
