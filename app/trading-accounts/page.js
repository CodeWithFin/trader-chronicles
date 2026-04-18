import { cookies } from 'next/headers'
import TradingAccountsClient from '@/components/TradingAccountsClient'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function TradingAccountsPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  return <TradingAccountsClient session={session} />
}
