import postgres from 'postgres'

let sqlSingleton

/**
 * Standard PostgreSQL client (TCP) via `postgres`.
 * Supports both:
 *   - tagged templates: await sql`SELECT * FROM users WHERE id = ${id}`
 *   - parameterized:    await sql.query('SELECT * FROM users WHERE id = $1', [id])
 */
export function getSql() {
  if (!sqlSingleton) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL is not set')
    }

    const sslMode = url.includes('sslmode=require') || url.includes('ssl=true')
    const sql = postgres(url, sslMode ? { ssl: 'require' } : {})
    sql.query = (text, params) => sql.unsafe(text, params ?? [])
    sqlSingleton = sql
  }
  return sqlSingleton
}
