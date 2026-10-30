import { cookies } from 'next/headers'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import SignalFeedClient from '@/components/SignalFeedClient'
import { getSessionUser } from '@/lib/auth'
import { fetchPublicSignals } from '@/lib/signals'

export const dynamic = 'force-dynamic'

function serializeSignal(s) {
  return {
    id: s.id,
    user_id: s.user_id,
    username: s.username || null,
    asset_pair: s.asset_pair,
    direction: s.direction,
    entry_price: s.entry_price != null ? Number(s.entry_price) : null,
    stop_loss: s.stop_loss != null ? Number(s.stop_loss) : null,
    take_profit: s.take_profit != null ? Number(s.take_profit) : null,
    status: s.status,
    notes: s.notes || '',
    created_at: s.created_at,
    resolved_at: s.resolved_at || null,
  }
}

export default async function SignalsPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  const session = user ? { user } : null

  let signals = []
  try {
    const rows = await fetchPublicSignals({ limit: 100 })
    signals = rows.map(serializeSignal)
  } catch (e) {
    console.error('Error fetching signals:', e)
  }

  const activeCount = signals.filter((s) => s.status === 'active').length
  const closedCount = signals.filter((s) => s.status === 'closed').length
  const stoppedCount = signals.filter((s) => s.status === 'stopped').length
  const accuracy = closedCount + stoppedCount > 0
    ? Math.round((closedCount / (closedCount + stoppedCount)) * 100)
    : null

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar initialSession={session} />
      <div className="fc-page max-w-3xl">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="fc-heading-lg text-4xl md:text-5xl mb-2">Signals</h1>
            <p className="text-brown">Live trade ideas from the community.</p>
          </div>
          {user && (
            <Link href="/signals/new" className="fc-btn fc-btn-primary">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post Signal
            </Link>
          )}
        </div>

        {signals.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="fc-card p-4 text-center">
              <div className="text-2xl font-semibold text-ink">{activeCount}</div>
              <div className="text-xs text-muted uppercase mt-1">Active</div>
            </div>
            <div className="fc-card p-4 text-center">
              <div className="text-2xl font-semibold text-ink">{signals.length}</div>
              <div className="text-xs text-muted uppercase mt-1">Total</div>
            </div>
            <div className="fc-card p-4 text-center">
              <div className={`text-2xl font-semibold ${accuracy != null ? (accuracy >= 50 ? 'fc-text-pos' : 'fc-text-neg') : 'text-ink'}`}>
                {accuracy != null ? `${accuracy}%` : '—'}
              </div>
              <div className="text-xs text-muted uppercase mt-1">Accuracy</div>
            </div>
          </div>
        )}

        <SignalFeedClient
          initialSignals={signals}
          currentUserId={user?.id || null}
        />
      </div>
    </div>
  )
}
