import { cookies } from 'next/headers'
import BacktestLogClient from '@/components/BacktestLogClient'
import { getSessionUser } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { selectUserBacktestsPreview } from '@/lib/backtests'

export const dynamic = 'force-dynamic'

export default async function BacktestingPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  let initialEntries = []
  if (user) {
    const sql = getSql()
    initialEntries = await selectUserBacktestsPreview(sql, user.id, 50)
  }

  return <BacktestLogClient initialEntries={initialEntries} session={session} />
}
