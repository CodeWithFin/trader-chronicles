import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { ensureTradingAccountForUser, normalizeStartingBalance } from '@/lib/trading-accounts'
import {
  isTradingAccountsSchemaMissingError,
  TRADING_ACCOUNTS_MIGRATION_HELP,
} from '@/lib/trades-schema-fallback'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function generateAuthToken() {
  return 'tc_' + crypto.randomBytes(32).toString('hex')
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    await ensureTradingAccountForUser(sql, user.id)

    const rows = await sql.query(
      `SELECT id, label, kind, starting_balance, sort_order, mt_account_number, mt_broker_server, mt_platform, last_synced_at, auth_token, auth_token_created_at, created_at
       FROM trading_accounts WHERE user_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [user.id]
    )

    return NextResponse.json({ accounts: rows || [] })
  } catch (error) {
    if (isTradingAccountsSchemaMissingError(error)) {
      return NextResponse.json({
        accounts: [],
        migrationRequired: true,
        migrationMessage: TRADING_ACCOUNTS_MIGRATION_HELP,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const label = String(body.label || '').trim()
    if (!label || label.length > 80) {
      return NextResponse.json({ error: 'Label is required (max 80 characters)' }, { status: 400 })
    }

    const kind = ['eval', 'funded', 'live', 'other'].includes(body.kind) ? body.kind : 'other'
    const startingBalance = normalizeStartingBalance(body.startingBalance, 10000)
    const sortOrder = Number.isFinite(parseInt(body.sortOrder, 10)) ? parseInt(body.sortOrder, 10) : 0

    // MT4/MT5 fields
    const mtAccountNumber = body.mtAccountNumber ? String(body.mtAccountNumber).trim() : null
    const mtBrokerServer = body.mtBrokerServer ? String(body.mtBrokerServer).trim() : null
    const mtPassword = body.mtPassword ? String(body.mtPassword).trim() : null
    const mtPlatform = ['mt4', 'mt5'].includes(body.mtPlatform) ? body.mtPlatform : null

    // Auto-generate a sync token when MT credentials are provided
    const hasMtCredentials = !!(mtAccountNumber && mtBrokerServer && mtPassword)
    const authToken = hasMtCredentials ? generateAuthToken() : null
    const authTokenCreatedAt = authToken ? new Date().toISOString() : null

    const sql = getSql()
    const rows = await sql.query(
      `INSERT INTO trading_accounts (user_id, label, kind, starting_balance, sort_order, mt_account_number, mt_broker_server, mt_password, mt_platform, auth_token, auth_token_created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, label, kind, starting_balance, sort_order, mt_account_number, mt_broker_server, mt_platform, last_synced_at, auth_token, auth_token_created_at, created_at`,
      [user.id, label, kind, startingBalance, sortOrder, mtAccountNumber, mtBrokerServer, mtPassword, mtPlatform, authToken, authTokenCreatedAt]
    )

    const row = rows?.[0]
    if (!row) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    if (isTradingAccountsSchemaMissingError(error)) {
      return NextResponse.json({ error: TRADING_ACCOUNTS_MIGRATION_HELP }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}