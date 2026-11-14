import { SESSION_COOKIE, buildSetCookieHeader, shouldUseSecureCookie } from '@/lib/auth'

export async function POST(request) {
  const cookieHeader = buildSetCookieHeader(SESSION_COOKIE, '', {
    maxAge: 0,
    secure: shouldUseSecureCookie(request),
  })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieHeader },
  })
}
