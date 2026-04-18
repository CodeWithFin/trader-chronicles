import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { SESSION_COOKIE } from '@/lib/auth-constants'

function getAuthSecretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) return null
  return new TextEncoder().encode(secret)
}

export async function middleware(request) {
  let sessionPayload = null
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const key = getAuthSecretKey()

  if (token && key) {
    try {
      const { payload } = await jwtVerify(token, key)
      sessionPayload = payload
    } catch {
      sessionPayload = null
    }
  }

  const hasSession = Boolean(sessionPayload?.sub)

  if (
    !hasSession &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/trades') ||
      request.nextUrl.pathname.startsWith('/analytics') ||
      request.nextUrl.pathname.startsWith('/trading-accounts'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
