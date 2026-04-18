import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { roundPnl } from '@/lib/pnl-money'
import { ensureTradingAccountForUser, getTradingAccountForUser } from '@/lib/trading-accounts'
import { isTradingAccountsSchemaMissingError } from '@/lib/trades-schema-fallback'

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
    const accountIdFilter = searchParams.get('accountId')
    const sortByRaw = searchParams.get('sortBy') || 'date_time'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC'
    const sortBy = SORT_COLUMNS.has(sortByRaw) ? sortByRaw : 'date_time'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const sql = getSql()
    const conditions = ['b.user_id = $1']
    const params = [user.id]
    let n = 2

    if (accountIdFilter) {
      const acct = await getTradingAccountForUser(sql, accountIdFilter, user.id)
      if (!acct) {
        return NextResponse.json({ error: 'Trading account not found' }, { status: 404 })
      }
      conditions.push(`b.account_id = $${n}`)
      params.push(accountIdFilter)
      n += 1
    }

    if (assetPair) {
      conditions.push(`b.asset_pair ILIKE $${n}`)
      params.push(`%${assetPair}%`)
      n += 1
    }
    if (strategyUsed) {
      conditions.push(`b.strategy_used ILIKE $${n}`)
      params.push(`%${strategyUsed}%`)
      n += 1
    }
    if (resultFilter) {
      conditions.push(`b.result = $${n}`)
      params.push(resultFilter)
      n += 1
    }
    if (setupTag) {
      conditions.push(`$${n} = ANY(b.setup_tags)`)
      params.push(setupTag)
      n += 1
    }

    const whereClause = conditions.join(' AND ')
    const sortColumn = sortBy.includes('.') ? sortBy : `b.${sortBy}`
    const countQuery = `SELECT COUNT(*)::int AS c FROM backtest_entries b WHERE ${whereClause}`
    const dataQuery = `SELECT b.*, a.label AS account_label FROM backtest_entries b
      LEFT JOIN trading_accounts a ON a.id = b.account_id
      WHERE ${whereClause} ORDER BY ${sortColumn} ${sortOrder} OFFSET $${n} LIMIT $${n + 1}`
    const dataParams = [...params, offset, limit]

    let countRows
    let trades
    try {
      countRows = await sql.query(countQuery, params)
      trades = await sql.query(dataQuery, dataParams)
    } catch (e) {
      if (!isTradingAccountsSchemaMissingError(e)) throw e
      if (accountIdFilter) {
        return NextResponse.json(
          {
            error:
              'Account filters need the trading_accounts migration. In Neon SQL Editor, run neon/migrations/001_trading_accounts.sql from this repo.',
          },
          { status: 503 }
        )
      }
      const legacyWhere = whereClause.replace(/\bb\./g, '')
      const legacySort = sortColumn.replace(/^b\./, '')
      countRows = await sql.query(
        `SELECT COUNT(*)::int AS c FROM backtest_entries WHERE ${legacyWhere}`,
        params
      )
      trades = await sql.query(
        `SELECT *, NULL::text AS account_label FROM backtest_entries WHERE ${legacyWhere} ORDER BY ${legacySort} ${sortOrder} OFFSET $${n} LIMIT $${n + 1}`,
        dataParams
      )
    }

    const total = countRows?.[0]?.c ?? 0

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

    let correctedPnl = roundPnl(pnlAbsolute)
    if (result === 'Loss' && correctedPnl > 0) {
      correctedPnl = roundPnl(-Math.abs(correctedPnl))
    } else if (result === 'Win' && correctedPnl < 0) {
      correctedPnl = roundPnl(Math.abs(correctedPnl))
    }

    const tags = Array.isArray(setupTags) ? setupTags : []

    const sql = getSql()

    let tradingAccountId = body.accountId || body.account_id
    if (tradingAccountId) {
      const acct = await getTradingAccountForUser(sql, tradingAccountId, user.id)
      if (!acct) {
        return NextResponse.json({ error: 'Invalid trading account' }, { status: 400 })
      }
    } else {
      tradingAccountId = await ensureTradingAccountForUser(sql, user.id)
    }

    const rows = await sql.query(
      `INSERT INTO backtest_entries (
        user_id, account_id, date_time, end_date, asset_pair, direction,
        entry_price, exit_price, stop_loss_price, risk_per_trade,
        result, pnl_absolute, r_multiple, strategy_used, setup_tags, notes, screenshot_url
      ) VALUES (
        $1, $2, $3::timestamptz, $4::timestamptz, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14, $15::text[], $16, $17
      ) RETURNING *`,
      [
        user.id,
        tradingAccountId,
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
