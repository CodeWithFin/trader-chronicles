import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { getTradingAccountForUser, normalizeStartingBalance } from '@/lib/trading-accounts'

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    const existing = await getTradingAccountForUser(sql, params.id, user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Trading account not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates = []
    const values = []
    let idx = 1

    if (body.label !== undefined) {
      const label = String(body.label || '').trim()
      if (!label || label.length > 80) {
        return NextResponse.json({ error: 'Invalid label' }, { status: 400 })
      }
      updates.push(`label = $${idx}`)
      values.push(label)
      idx += 1
    }

    if (body.kind !== undefined) {
      if (!['eval', 'funded', 'live', 'other'].includes(body.kind)) {
        return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
      }
      updates.push(`kind = $${idx}`)
      values.push(body.kind)
      idx += 1
    }

    if (body.startingBalance !== undefined) {
      updates.push(`starting_balance = $${idx}`)
      values.push(normalizeStartingBalance(body.startingBalance, existing.starting_balance))
      idx += 1
    }

    if (body.sortOrder !== undefined) {
      const so = parseInt(body.sortOrder, 10)
      updates.push(`sort_order = $${idx}`)
      values.push(Number.isFinite(so) ? so : 0)
      idx += 1
    }

    if (updates.length === 0) {
      return NextResponse.json(existing)
    }

    values.push(params.id, user.id)
    const query = `
      UPDATE trading_accounts SET ${updates.join(', ')}
      WHERE id = $${idx} AND user_id = $${idx + 1}
      RETURNING id, label, kind, starting_balance, sort_order, created_at
    `
    const rows = await sql.query(query, values)
    return NextResponse.json(rows?.[0] || existing)
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
    const existing = await getTradingAccountForUser(sql, params.id, user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Trading account not found' }, { status: 404 })
    }

    const countRows = await sql.query(
      `SELECT COUNT(*)::int AS c FROM backtest_entries WHERE account_id = $1`,
      [params.id]
    )
    const count = countRows?.[0]?.c ?? 0
    if (count > 0) {
      return NextResponse.json(
        { error: `This account has ${count} trade(s). Move or delete them before removing the account.` },
        { status: 409 }
      )
    }

    const others = await sql.query(
      `SELECT COUNT(*)::int AS c FROM trading_accounts WHERE user_id = $1`,
      [user.id]
    )
    if ((others?.[0]?.c ?? 0) <= 1) {
      return NextResponse.json({ error: 'You must keep at least one trading account.' }, { status: 409 })
    }

    await sql.query(`DELETE FROM trading_accounts WHERE id = $1 AND user_id = $2`, [params.id, user.id])
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
