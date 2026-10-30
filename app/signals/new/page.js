'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function NewSignalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [assetPair, setAssetPair] = useState('')
  const [direction, setDirection] = useState('Long')
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login')
        } else {
          setCheckingAuth(false)
        }
      })
      .catch(() => router.push('/login'))
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assetPair,
          direction,
          entryPrice: entryPrice || null,
          stopLoss: stopLoss || null,
          takeProfit: takeProfit || null,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post signal')
      router.push('/signals')
    } catch (err) {
      setError(err.message || 'Failed to post signal')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <>
        <Navbar />
        <div className="fc-page max-w-xl">
          <div className="fc-card p-8 text-center text-brown">Checking authentication...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="fc-page max-w-xl">
        <div className="fc-card p-8 md:p-12">
          <h1 className="fc-heading-lg text-3xl md:text-4xl mb-2">Post Signal</h1>
          <p className="text-brown mb-8">Share a trade idea with the community.</p>

          {error && <div className="fc-banner fc-banner-error mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="fc-label">Asset / Pair</label>
              <input
                type="text"
                value={assetPair}
                onChange={(e) => setAssetPair(e.target.value)}
                required
                placeholder="e.g. EURUSD, XAUUSD, AAPL"
                className="fc-input"
              />
            </div>

            <div>
              <label className="fc-label">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="fc-input"
              >
                <option value="Long">Long (Buy)</option>
                <option value="Short">Short (Sell)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="fc-label">Entry Price</label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  step="0.00001"
                  min="0"
                  placeholder="Optional"
                  className="fc-input"
                />
              </div>
              <div>
                <label className="fc-label">Stop Loss</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  step="0.00001"
                  min="0"
                  placeholder="Optional"
                  className="fc-input"
                />
              </div>
              <div>
                <label className="fc-label">Take Profit</label>
                <input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  step="0.00001"
                  min="0"
                  placeholder="Optional"
                  className="fc-input"
                />
              </div>
            </div>

            <div>
              <label className="fc-label">Notes / Analysis</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Why are you taking this trade? Key levels, confluence, etc."
                className="fc-input resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="fc-btn fc-btn-primary flex-1 text-base py-3.5"
              >
                {loading ? 'Posting...' : 'Post Signal'}
              </button>
              <Link href="/signals" className="fc-btn fc-btn-secondary text-base py-3.5">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
