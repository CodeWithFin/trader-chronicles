import { neon } from '@neondatabase/serverless'

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
