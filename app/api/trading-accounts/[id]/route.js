import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { getTradingAccountForUser, normalizeStartingBalance } from '@/lib/trading-accounts'
import {
  isTradingAccountsSchemaMissingError,
  TRADING_ACCOUNTS_MIGRATION_HELP,
} from '@/lib/trades-schema-fallback'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function generateAuthToken() {
  return 'tc_' + crypto.randomBytes(32).toString('hex')
}

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const sql = getSql()
    const acct = await getTradingAccountForUser(sql, id, user.id)
    if (!acct) {
      return NextResponse.json({ error: 'Trading account not found' }, { status: 404 })
    }

    // Build dynamic update query
    const updates = []
    const values = [id, user.id]
    let paramIndex = 3

    if (body.label !== undefined) {
      const label = String(body.label || '').trim()
      if (!label || label.length > 80) {
        return NextResponse.json({ error: 'Label is required (max 80 characters)' }, { status: 400 })
      }
      updates.push(`label = $${paramIndex}`)
      values.push(label)
      paramIndex++
    }

    if (body.kind !== undefined) {
      const kind = ['eval', 'funded', 'live', 'other'].includes(body.kind) ? body.kind : 'other'
      updates.push(`kind = $${paramIndex}`)
      values.push(kind)
      paramIndex++
    }

    if (body.startingBalance !== undefined) {
      const startingBalance = normalizeStartingBalance(body.startingBalance, 10000)
      updates.push(`starting_balance = $${paramIndex}`)
      values.push(startingBalance)
      paramIndex++
    }

    if (body.sortOrder !== undefined) {
      const sortOrder = Number.isFinite(parseInt(body.sortOrder, 10)) ? parseInt(body.sortOrder, 10) : 0
      updates.push(`sort_order = $${paramIndex}`)
      values.push(sortOrder)
      paramIndex++
    }

    // MT4/MT5 fields
    if (body.mtAccountNumber !== undefined) {
      const mtAccountNumber = body.mtAccountNumber ? String(body.mtAccountNumber).trim() : null
      updates.push(`mt_account_number = $${paramIndex}`)
      values.push(mtAccountNumber)
      paramIndex++
    }

    if (body.mtBrokerServer !== undefined) {
      const mtBrokerServer = body.mtBrokerServer ? String(body.mtBrokerServer).trim() : null
      updates.push(`mt_broker_server = $${paramIndex}`)
      values.push(mtBrokerServer)
      paramIndex++
    }

    if (body.mtPassword !== undefined) {
      const mtPassword = body.mtPassword ? String(body.mtPassword).trim() : null
      updates.push(`mt_password = $${paramIndex}`)
      values.push(mtPassword)
      paramIndex++
    }

    if (body.mtPlatform !== undefined) {
      const mtPlatform = ['mt4', 'mt5'].includes(body.mtPlatform) ? body.mtPlatform : null
      updates.push(`mt_platform = $${paramIndex}`)
      values.push(mtPlatform)
      paramIndex++
    }

    // Auth token generation
    if (body.generateAuthToken === true) {
      const token = generateAuthToken()
      updates.push(`auth_token = $${paramIndex}, auth_token_created_at = TIMEZONE('utc'::text, NOW())`)
      values.push(token)
      paramIndex++
    }

    if (body.revokeAuthToken === true) {
      updates.push(`auth_token = NULL, auth_token_created_at = NULL`)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = TIMEZONE('utc'::text, NOW())`)

    const query = `
      UPDATE trading_accounts
      SET ${updates.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING id, label, kind, starting_balance, sort_order, mt_account_number, mt_broker_server, mt_platform, last_synced_at, auth_token, auth_token_created_at, created_at
    `

    const rows = await sql.query(query, values)
    const row = rows?.[0]
    if (!row) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json(row)
  } catch (error) {
    if (isTradingAccountsSchemaMissingError(error)) {
      return NextResponse.json({ error: TRADING_ACCOUNTS_MIGRATION_HELP }, { status: 503 })
    }
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

    const { id } = await params

    const sql = getSql()
    const acct = await getTradingAccountForUser(sql, id, user.id)
    if (!acct) {
      return NextResponse.json({ error: 'Trading account not found' }, { status: 404 })
    }

    // Check if account has trades
    const tradeCount = await sql.query(
      `SELECT COUNT(*)::int AS c FROM backtest_entries WHERE account_id = $1`,
      [id]
    )

    if (tradeCount[0]?.c > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing trades. Delete or reassign trades first.' },
        { status: 400 }
      )
    }

    await sql.query(`DELETE FROM trading_accounts WHERE id = $1 AND user_id = $2`, [id, user.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isTradingAccountsSchemaMissingError(error)) {
      return NextResponse.json({ error: TRADING_ACCOUNTS_MIGRATION_HELP }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}