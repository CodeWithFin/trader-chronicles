import { NextResponse } from 'next/server'
import { SESSION_COOKIE, buildSetCookieHeader } from '@/lib/auth'

export async function POST() {
  const cookieHeader = buildSetCookieHeader(SESSION_COOKIE, '', { maxAge: 0 })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieHeader },
  })
}
