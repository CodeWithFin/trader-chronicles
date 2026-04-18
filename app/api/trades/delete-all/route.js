import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    const rows = await sql.query(
      `DELETE FROM backtest_entries WHERE user_id = $1 RETURNING id`,
      [user.id]
    )

    return NextResponse.json({
      message: 'All trades deleted successfully',
      deletedCount: rows?.length || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
