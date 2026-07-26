import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function DELETE(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const strategyName = searchParams.get('strategyName')

    const sql = getSql()
    let rows
    if (strategyName) {
      rows = await sql.query(
        `DELETE FROM backtest_trades WHERE user_id = $1 AND strategy_name = $2 RETURNING id`,
        [user.id, strategyName]
      )
    } else {
      rows = await sql.query(
        `DELETE FROM backtest_trades WHERE user_id = $1 RETURNING id`,
        [user.id]
      )
    }

    return NextResponse.json({
      message: 'Backtest entries deleted successfully',
      deletedCount: rows?.length || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
