import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getSql } from '@/lib/db'
import MT5SetupClient from '@/components/MT5SetupClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  if (!user) redirect('/login')

  const sql = getSql()
  const [row] = await sql`SELECT mt5_api_key FROM users WHERE id = ${user.id}`
  const apiKey = row?.mt5_api_key ?? null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="fc-heading-lg text-3xl mb-1">Settings</h1>
        <p className="text-brown text-sm">Configure your MT5 auto-import and account preferences.</p>
      </div>

      <MT5SetupClient initialKey={apiKey} serverUrl={appUrl} />
    </div>
  )
}
