import dns from 'dns'
import net from 'net'
import { neon } from '@neondatabase/serverless'

/**
 * Prefer IPv4 for outbound DB HTTPS. On WSL2, Node's dual-stack Happy Eyeballs
 * often races unreachable IPv6 (ENETUNREACH) and times out with fetch failed /
 * ETIMEDOUT even when Neon is healthy over IPv4.
 */
function preferIpv4ForNeonFetch() {
  try {
    dns.setDefaultResultOrder('ipv4first')
  } catch {
    /* older Node */
  }
  if (typeof net.setDefaultAutoSelectFamily === 'function') {
    net.setDefaultAutoSelectFamily(false)
  }
}

preferIpv4ForNeonFetch()

/**
 * Neon connection strings sometimes include channel_binding=require, which can
 * break Node/undici fetch-based clients; strip it for compatibility.
 */
export function normalizeDatabaseUrl(connectionString) {
  if (!connectionString) return connectionString
  try {
    const u = new URL(connectionString.replace(/^postgresql:/i, 'http:'))
    u.searchParams.delete('channel_binding')
    return u.toString().replace(/^http:/i, 'postgresql:')
  } catch {
    return connectionString.replace(/[&?]channel_binding=[^&]*/g, '').replace(/\?$/, '')
  }
}

let sqlSingleton

export function getSql() {
  if (!sqlSingleton) {
    const url = normalizeDatabaseUrl(process.env.DATABASE_URL)
    if (!url) {
      throw new Error('DATABASE_URL is not set')
    }
    sqlSingleton = neon(url)
  }
  return sqlSingleton
}
