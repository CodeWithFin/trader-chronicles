import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSql } from '@/lib/db'
import { SESSION_COOKIE, sessionCookieOptions, signSessionToken } from '@/lib/auth'
import { responseFromPgError } from '@/lib/pg-errors'
import { isTradingAccountsSchemaMissingError } from '@/lib/trades-schema-fallback'

export async function POST(request) {
  try {
    const body = await request.json()
    const username = String(body.username || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: 'Username must be between 3 and 30 characters' }, { status: 400 })
    }
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const sql = getSql()

    const [created] = await sql`
      INSERT INTO users (username, email, password_hash)
      VALUES (${username}, ${email}, ${password_hash})
      RETURNING id, email, username
    `

    try {
      await sql`
        INSERT INTO trading_accounts (user_id, label, kind, starting_balance, sort_order)
        VALUES (${created.id}, ${'Primary'}, ${'other'}, ${10000}, ${0})
      `
    } catch (e) {
      if (!isTradingAccountsSchemaMissingError(e)) throw e
      console.warn(
        'signup: trading_accounts not migrated; user created without default trading account. Run neon/migrations/001_trading_accounts.sql'
      )
    }

    const token = await signSessionToken({
      id: String(created.id),
      email: created.email,
      username: created.username,
    })

    const res = NextResponse.json({
      ok: true,
      user: { id: created.id, email: created.email, username: created.username },
    })
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return res
  } catch (e) {
    const msg = e.message || ''
    if (msg.includes('unique') || msg.includes('duplicate') || e?.code === '23505') {
      return NextResponse.json(
        { error: 'An account with this email or username already exists' },
        { status: 409 }
      )
    }
    const mapped = responseFromPgError(e, 'Signup failed')
    console.error('Signup error:', e)
    return NextResponse.json(mapped.json, { status: mapped.status })
  }
}
