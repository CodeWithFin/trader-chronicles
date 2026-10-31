import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getSql()
  const [row] = await sql`SELECT mt5_api_key FROM users WHERE id = ${user.id}`
  return NextResponse.json({ key: row?.mt5_api_key ?? null })
}

export async function POST() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getSql()
  const [row] = await sql`
    UPDATE users SET mt5_api_key = gen_random_uuid()
    WHERE id = ${user.id}
    RETURNING mt5_api_key
  `
  return NextResponse.json({ key: row.mt5_api_key })
}
