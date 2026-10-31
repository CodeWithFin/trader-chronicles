import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSql } from '@/lib/db'
import { SESSION_COOKIE, buildSetCookieHeader, signSessionToken } from '@/lib/auth'
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

    const cookieHeader = buildSetCookieHeader(SESSION_COOKIE, token, { maxAge: 60 * 60 * 24 * 7 })
    return new Response(
      JSON.stringify({ ok: true, token, user: { id: user.id, email: user.email, username: user.username } }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieHeader } }
    )
  } catch (e) {
    const mapped = responseFromPgError(e, 'Login failed')
    console.error('Login error:', e)
    return NextResponse.json(mapped.json, { status: mapped.status })
  }
}
