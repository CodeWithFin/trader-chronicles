import { SignJWT, jwtVerify } from 'jose'
import { SESSION_COOKIE } from '@/lib/auth-constants'

export { SESSION_COOKIE }

function getSecretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET must be set and at least 16 characters')
  }
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(payload) {
  const { id, email, username } = payload
  return new SignJWT({ email, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
}

export async function verifySessionToken(token) {
  const { payload } = await jwtVerify(token, getSecretKey())
  return {
    id: payload.sub,
    email: payload.email,
    username: payload.username,
  }
}

export async function getSessionUser(cookieStore) {
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    return await verifySessionToken(token)
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    maxAge: 60 * 60 * 24 * 7,
  }
}

// Build the raw Set-Cookie header string directly — bypasses Next.js's
// automatic Secure-flag injection which triggers on non-loopback IPs.
export function buildSetCookieHeader(name, value, { maxAge, path = '/', sameSite = 'lax' } = {}) {
  const secure = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'
  const expires = maxAge != null ? new Date(Date.now() + maxAge * 1000).toUTCString() : undefined
  let header = `${name}=${value}; Path=${path}; SameSite=${sameSite}; HttpOnly`
  if (maxAge != null) header += `; Max-Age=${maxAge}`
  if (expires) header += `; Expires=${expires}`
  if (secure) header += '; Secure'
  return header
}
