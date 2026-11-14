export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import TargetsWidget from '@/components/TargetsWidget'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth'

export default async function Dashboard() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  return (
    <>
      <Navbar initialSession={session} />
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        <section className="w-full relative mb-16 md:mb-24 text-center max-w-3xl mx-auto">
          <h1 className="fc-display text-5xl sm:text-6xl md:text-7xl mb-6">
            Your trading, <span className="text-[#ff3e00]">journaled</span>.
          </h1>
          <p className="text-lg md:text-xl text-brown leading-relaxed max-w-xl mx-auto">
            Log your trades, track performance, and analyze your trading activity with comprehensive data
            visualization and analytics.
          </p>
        </section>

        <TargetsWidget />

        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 mb-16">
          <Link href="/settings" className="fc-card fc-card-hover p-8 flex flex-col">
            <div className="mb-6 w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: '#64c6ff' }}>
              <svg className="w-6 h-6 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="fc-heading text-xl mb-2">MT5 Auto-Import</h3>
            <p className="text-[15px] text-brown leading-relaxed flex-grow">
              Connect your MT5 terminal to automatically log every closed trade to your journal.
            </p>
          </Link>

          <Link href="/backtesting" className="fc-card fc-card-hover p-8 flex flex-col">
            <div className="mb-6 w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: '#ffcd6c' }}>
              <svg className="w-6 h-6 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="fc-heading text-xl mb-2">Backtesting</h3>
            <p className="text-[15px] text-brown leading-relaxed flex-grow">
              Test your strategies on historical data and review past performance.
            </p>
          </Link>

          <Link href="/analytics" className="fc-card fc-card-hover p-8 flex flex-col">
            <div className="mb-6 w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: '#00c978' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="fc-heading text-xl mb-2">Analytics</h3>
            <p className="text-[15px] text-brown leading-relaxed flex-grow">
              Analyze your trading performance with win rates, P&amp;L metrics, equity curves, and daily activity.
            </p>
          </Link>
        </section>

        <section className="w-full flex justify-center pb-8">
          <Link
            href="/analytics"
            className="fc-btn fc-btn-primary w-full max-w-2xl py-6 text-xl gap-4"
          >
            View analytics
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </Link>
        </section>
      </div>
    </>
  )
}
