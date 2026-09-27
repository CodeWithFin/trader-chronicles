import Navbar from '@/components/Navbar'
import GoldSignalsClient from '@/components/GoldSignalsClient'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth'

export const metadata = {
  title: 'Gold (XAU/USD) Signals — Trader Chronicles',
  description:
    'Live CRT (Candle Range Theory) trading signals for Gold XAU/USD across Asian, London, and New York sessions with 1.5R risk-to-reward.',
}

export default async function GoldSignalsPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  return (
    <div style={{ background: '#09090b' }} className="min-h-screen">
      <Navbar initialSession={session} />
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <GoldSignalsClient />
      </main>
    </div>
  )
}
