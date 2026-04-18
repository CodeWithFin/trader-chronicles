import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSql } from '@/lib/db'
import { SESSION_COOKIE, sessionCookieOptions, signSessionToken } from '@/lib/auth'
import { responseFromPgError } from '@/lib/pg-errors'

export async function POST(request) {
  try {
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const sql = getSql()
    const [user] = await sql`
      SELECT id, email, username, password_hash
      FROM users
      WHERE email = ${email}
    `

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await signSessionToken({
      id: String(user.id),
      email: user.email,
      username: user.username,
    })

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } })
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return res
  } catch (e) {
    const mapped = responseFromPgError(e, 'Login failed')
    console.error('Login error:', e)
    return NextResponse.json(mapped.json, { status: mapped.status })
  }
}
