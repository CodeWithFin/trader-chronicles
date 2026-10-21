import postgres from 'postgres'
import { neon } from '@neondatabase/serverless'

let sqlSingleton

export function getSql() {
  if (!sqlSingleton) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')

    if (url.includes('neon.tech')) {
      // Neon uses HTTP per-query — neon() has a native .query(text, params) method
      const neonFn = neon(url)
      sqlSingleton = {
        query: (text, params = []) => neonFn.query(text, params),
      }
    } else {
      // Local / Docker PostgreSQL — porsager/postgres (raw TCP)
      const sslMode = url.includes('sslmode=require') || url.includes('ssl=true')
      const sql = postgres(url, sslMode ? { ssl: 'require' } : {})
      sql.query = (text, params) => sql.unsafe(text, params ?? [])
      sqlSingleton = sql
    }
  }
  return sqlSingleton
}
