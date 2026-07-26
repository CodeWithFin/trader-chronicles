import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { roundPnl } from '@/lib/pnl-money'
import { BACKTESTING_MIGRATION_HELP, isBacktestSchemaMissingError } from '@/lib/backtests'

const SORT_COLUMNS = new Set(['date_time', 'asset_pair', 'result', 'pnl_absolute', 'strategy_name', 'created_at'])

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const strategyName = searchParams.get('strategyName')
    const assetPair = searchParams.get('assetPair')
    const resultFilter = searchParams.get('result')
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

    if (strategyName) {
      conditions.push(`strategy_name = $${n}`)
      params.push(strategyName)
      n += 1
    }
    if (assetPair) {
      conditions.push(`asset_pair ILIKE $${n}`)
      params.push(`%${assetPair}%`)
      n += 1
    }
    if (resultFilter) {
      conditions.push(`result = $${n}`)
      params.push(resultFilter)
      n += 1
    }

    const whereClause = conditions.join(' AND ')
    const countQuery = `SELECT COUNT(*)::int AS c FROM backtest_trades WHERE ${whereClause}`
    const dataQuery = `SELECT * FROM backtest_trades WHERE ${whereClause} ORDER BY ${sortBy} ${sortOrder} OFFSET $${n} LIMIT $${n + 1}`
    const dataParams = [...params, offset, limit]

    let countRows
    let entries
    let strategyRows
    try {
      countRows = await sql.query(countQuery, params)
      entries = await sql.query(dataQuery, dataParams)
      strategyRows = await sql.query(
        `SELECT DISTINCT strategy_name FROM backtest_trades WHERE user_id = $1 ORDER BY strategy_name ASC`,
        [user.id]
      )
    } catch (e) {
      if (isBacktestSchemaMissingError(e)) {
        return NextResponse.json({ error: BACKTESTING_MIGRATION_HELP }, { status: 503 })
      }
      throw e
    }

    const total = countRows?.[0]?.c ?? 0

    return NextResponse.json({
      entries: entries || [],
      strategies: (strategyRows || []).map((r) => r.strategy_name).filter(Boolean),
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

    if (!body.strategyName || !String(body.strategyName).trim()) {
      return NextResponse.json({ error: 'Strategy name is required' }, { status: 400 })
    }
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
    const pnlParsed = roundPnl(body.pnlAbsolute)
    if (
      body.pnlAbsolute === undefined ||
      body.pnlAbsolute === null ||
      body.pnlAbsolute === '' ||
      !Number.isFinite(pnlParsed)
    ) {
      return NextResponse.json({ error: 'Valid P&L amount is required' }, { status: 400 })
    }

    const {
      strategyName,
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
      setupTags = [],
      notes = '',
      screenshotUrl = '',
    } = body

    let correctedPnl = roundPnl(pnlAbsolute)
    if (result === 'Loss' && correctedPnl > 0) {
      correctedPnl = roundPnl(-Math.abs(correctedPnl))
    } else if (result === 'Win' && correctedPnl < 0) {
      correctedPnl = roundPnl(Math.abs(correctedPnl))
    }

    const tags = Array.isArray(setupTags) ? setupTags : []
    const strategy = String(strategyName).trim()

    const sql = getSql()

    let rows
    try {
      rows = await sql.query(
        `INSERT INTO backtest_trades (
          user_id, strategy_name, date_time, end_date, asset_pair, direction,
          entry_price, exit_price, stop_loss_price, risk_per_trade,
          result, pnl_absolute, r_multiple, strategy_used, setup_tags, notes, screenshot_url
        ) VALUES (
          $1, $2, $3::timestamptz, $4::timestamptz, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14, $15::text[], $16, $17
        ) RETURNING *`,
        [
          user.id,
          strategy,
          dateTime,
          endDate || dateTime,
          assetPair.trim(),
          direction,
          roundPnl(entryPrice),
          roundPnl(exitPrice),
          roundPnl(parseFloat(stopLossPrice) || 0),
          roundPnl(parseFloat(riskPerTrade) || 0),
          result,
          correctedPnl,
          roundPnl(parseFloat(rMultiple) || 0),
          strategy,
          tags,
          notes || '',
          screenshotUrl || '',
        ]
      )
    } catch (e) {
      if (isBacktestSchemaMissingError(e)) {
        return NextResponse.json({ error: BACKTESTING_MIGRATION_HELP }, { status: 503 })
      }
      throw e
    }

    const data = rows?.[0]
    if (!data) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Backtest create error:', error)
    return NextResponse.json({ error: error.message || 'Server error occurred' }, { status: 500 })
  }
}
