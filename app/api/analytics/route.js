import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { calculateAnalytics } from '@/lib/analytics'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    const trades = await sql.query(
      `SELECT * FROM backtest_entries WHERE user_id = $1 ORDER BY date_time ASC`,
      [user.id]
    )

    const analyticsResults = calculateAnalytics(trades || [])
    return NextResponse.json(analyticsResults)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
