import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/sync/bootstrap
// Called by the EA/sync-agent with Authorization: Bearer <token>
// Returns account config so the agent doesn't need to know the account ID upfront.
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.substring(7).trim()
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const sql = getSql()
    const rows = await sql.query(
      `SELECT id, label, mt_account_number, mt_broker_server, mt_platform, last_synced_at
       FROM trading_accounts WHERE auth_token = $1`,
      [token]
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401 })
    }

    const account = rows[0]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      accountId: account.id,
      accountLabel: account.label,
      syncEndpoint: `${appUrl}/api/trading-accounts/${account.id}/sync`,
      mtAccountNumber: account.mt_account_number,
      mtBrokerServer: account.mt_broker_server,
      mtPlatform: account.mt_platform || 'mt5',
      lastSyncedAt: account.last_synced_at,
    })
  } catch (error) {
    console.error('Bootstrap error:', error)
    return NextResponse.json({ error: 'Bootstrap failed' }, { status: 500 })
  }
}
