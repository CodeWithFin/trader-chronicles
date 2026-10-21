import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { getTradingAccountForUser } from '@/lib/trading-accounts'
import { roundPnl } from '@/lib/pnl-money'

export const dynamic = 'force-dynamic'

async function authenticateRequest(request, sql, accountId) {
  // Try cookie-based auth first (web app)
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  if (user) {
    const account = await getTradingAccountForUser(sql, accountId, user.id)
    if (account) {
      return { userId: user.id, account, authType: 'cookie' }
    }
  }

  // Try Bearer token auth (sync agent)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const account = await sql.query(
      `SELECT id, user_id, label FROM trading_accounts WHERE id = $1 AND auth_token = $2`,
      [accountId, token]
    )
    if (account.length > 0) {
      return { userId: account[0].user_id, account: account[0], authType: 'token' }
    }
  }

  return null
}

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const sql = getSql()

    // Try both auth methods
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)

    let account = null
    if (user) {
      account = await getTradingAccountForUser(sql, id, user.id)
    }

    // If no cookie auth, try token auth
    if (!account) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const rows = await sql.query(
          `SELECT id, user_id, label, mt_account_number, mt_broker_server, mt_platform, last_synced_at
           FROM trading_accounts WHERE id = $1 AND auth_token = $2`,
          [id, token]
        )
        if (rows.length > 0) {
          account = rows[0]
        }
      }
    }

    if (!account) {
      return NextResponse.json({ error: 'Trading account not found or unauthorized' }, { status: 404 })
    }

    const apiEndpoint = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trading-accounts/${id}/sync`

    return NextResponse.json({
      accountId: id,
      apiEndpoint,
      mtAccountNumber: account.mt_account_number,
      mtBrokerServer: account.mt_broker_server,
      mtPlatform: account.mt_platform || 'mt5',
      lastSyncedAt: account.last_synced_at,
      setupInstructions: {
        step1: 'Download the Trader Chronicles Sync Agent from your Trader Chronicles dashboard',
        step2: 'Install and run the Sync Agent on your computer (Windows/Mac/Linux)',
        step3: 'Enter your MT5 login credentials in the Sync Agent',
        step4: 'Enter the API Endpoint and Auth Token below in the Sync Agent',
        step5: 'The Sync Agent will automatically connect to MT5 and sync trades',
        apiEndpoint,
        accountId: id,
        authToken: account.auth_token,
      },
      syncAgentDownloadUrls: {
        windows: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sync-agent/TraderChroniclesSync.exe`,
        macos: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sync-agent/TraderChroniclesSync.dmg`,
        linux: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sync-agent/TraderChroniclesSync.AppImage`,
        source: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sync-agent/`,
      },
    })
  } catch (error) {
    console.error('Sync info error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get sync info' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const sql = getSql()

    // Authenticate request
    const auth = await authenticateRequest(request, sql, id)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, account } = auth

    // Check if this is a request from the sync agent (sending trades)
    const body = await request.json()

    // If body contains trades array, it's from the sync agent/EA
    if (body.trades && Array.isArray(body.trades)) {
      return await receiveTradesFromEA(id, body.trades, userId)
    }

    // Manual sync trigger from web app - return setup instructions
    return NextResponse.json({
      success: false,
      message: 'Use the Trader Chronicles Sync Agent for automatic trade synchronization.',
      setupInstructions: {
        step1: 'Download the Sync Agent from your Trader Chronicles dashboard',
        step2: 'Run the Sync Agent on your computer with MT5 installed',
        step3: 'Configure MT5 connection and API settings in the Sync Agent',
        step4: 'The Sync Agent will automatically fetch and sync trades',
        apiEndpoint: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trading-accounts/${id}/sync`,
        accountId: id,
      },
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}

// Helper function to receive trades from sync agent/EA
async function receiveTradesFromEA(accountId, trades, userId) {
  const sql = getSql()

  // Verify account belongs to user
  const account = await getTradingAccountForUser(sql, accountId, userId)
  if (!account) {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
  }

  const results = []

  for (const trade of trades) {
    // Validate required fields
    if (!trade.dateTime || !trade.assetPair || !trade.direction ||
        trade.entryPrice === undefined || trade.exitPrice === undefined ||
        !trade.result || trade.pnlAbsolute === undefined) {
      results.push({ success: false, trade, error: 'Missing required fields' })
      continue
    }

    // Check for duplicate (same account, date, asset, entry/exit prices)
    const existing = await sql.query(
      `SELECT id FROM backtest_entries 
       WHERE account_id = $1 AND date_time = $2 AND asset_pair = $3 
       AND entry_price = $4 AND exit_price = $5`,
      [accountId, trade.dateTime, trade.assetPair, trade.entryPrice, trade.exitPrice]
    )

    if (existing.length > 0) {
      results.push({ success: false, trade, error: 'Duplicate trade', existingId: existing[0].id })
      continue
    }

    let correctedPnl = roundPnl(trade.pnlAbsolute)
    if (trade.result === 'Loss' && correctedPnl > 0) {
      correctedPnl = roundPnl(-Math.abs(correctedPnl))
    } else if (trade.result === 'Win' && correctedPnl < 0) {
      correctedPnl = roundPnl(Math.abs(correctedPnl))
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
        userId,
        accountId,
        trade.dateTime,
        trade.endDate || trade.dateTime,
        trade.assetPair.trim(),
        trade.direction,
        roundPnl(trade.entryPrice),
        roundPnl(trade.exitPrice),
        roundPnl(parseFloat(trade.stopLossPrice) || 0),
        roundPnl(parseFloat(trade.riskPerTrade) || 0),
        trade.result,
        correctedPnl,
        roundPnl(parseFloat(trade.rMultiple) || 0),
        trade.strategyUsed || '',
        trade.setupTags || [],
        trade.notes || '',
        trade.screenshotUrl || '',
      ]
    )

    results.push({ success: true, trade: rows[0] })
  }

  // Update last_synced_at
  await sql.query(
    `UPDATE trading_accounts SET last_synced_at = TIMEZONE('utc'::text, NOW()) WHERE id = $1`,
    [accountId]
  )

  const successCount = results.filter(r => r.success).length

  return NextResponse.json({
    success: true,
    synced: successCount,
    results,
    message: `Successfully synced ${successCount} new trades!`
  })
}