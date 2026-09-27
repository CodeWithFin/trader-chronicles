'use client'

import { useState, useEffect } from 'react'
import SignalCard from './SignalCard'

const SESSIONS = [
  {
    id: 'asian',
    name: 'Asian Session',
    timeRange: '19:00 – 22:00 EST',
    tag: 'ASIA',
    accentColor: '#6366f1',
    openTime: '19:00 EST',
  },
  {
    id: 'london',
    name: 'London Session',
    timeRange: '04:00 – 09:00 EST',
    tag: 'LDN',
    accentColor: '#0086fc',
    openTime: '04:00 EST',
  },
  {
    id: 'newyork',
    name: 'New York Session',
    timeRange: '09:30 – 13:00 EST',
    tag: 'NYC',
    accentColor: '#ff3e00',
    openTime: '09:30 EST',
  },
]

function getSessionState(sessionId) {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const est = new Date(utc - 5 * 3600000) // EST (UTC-5)
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const currentMinutes = hours * 60 + minutes

  const ranges = {
    asian: { start: 19 * 60, end: 22 * 60 },
    london: { start: 4 * 60, end: 9 * 60 },
    newyork: { start: 9 * 60 + 30, end: 13 * 60 },
  }

  const range = ranges[sessionId]
  if (!range) return 'UPCOMING'

  if (currentMinutes >= range.start && currentMinutes < range.end) {
    return 'ACTIVE'
  } else if (currentMinutes >= range.end) {
    return 'CLOSED'
  } else {
    return 'UPCOMING'
  }
}

export default function SessionSignals({ wsRef }) {
  const [signalsBySession, setSignalsBySession] = useState({
    asian: [],
    london: [],
    newyork: [],
  })
  const [sessionStates, setSessionStates] = useState({
    asian: 'UPCOMING',
    london: 'UPCOMING',
    newyork: 'UPCOMING',
  })
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const updateStates = () => {
      setSessionStates({
        asian: getSessionState('asian'),
        london: getSessionState('london'),
        newyork: getSessionState('newyork'),
      })
    }
    updateStates()
    const interval = setInterval(updateStates, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!wsRef?.current) return

    function onMessage(evt) {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'signals' && msg.session && Array.isArray(msg.signals)) {
          setSignalsBySession((prev) => ({
            ...prev,
            [msg.session]: msg.signals,
          }))
          setLastUpdated(new Date())
        } else if (msg.retainedSignals) {
          setSignalsBySession((prev) => ({
            ...prev,
            ...msg.retainedSignals,
          }))
        }
      } catch {
        /* ignore non-JSON */
      }
    }

    const ws = wsRef.current
    ws.addEventListener('message', onMessage)
    return () => ws.removeEventListener('message', onMessage)
  }, [wsRef])

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--stone)]">
        <div>
          <h2 className="fc-heading text-2xl text-ink">CRT Session Setups &amp; Results</h2>
          <p className="text-brown text-sm mt-1">
            High-quality 60+ pips Candle Range Theory setups broadcast at session open and evaluated upon completion.
          </p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-muted font-medium">
            Live updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Three-column session grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SESSIONS.map((session) => {
          const state = sessionStates[session.id] || 'UPCOMING'
          const isActive = state === 'ACTIVE'
          const isClosed = state === 'CLOSED'
          const signals = signalsBySession[session.id] || []

          const wins = signals.filter((s) => s.status === 'WIN').length
          const losses = signals.filter((s) => s.status === 'LOSS').length
          const totalEvaluated = wins + losses
          const winRate = totalEvaluated > 0 ? Math.round((wins / totalEvaluated) * 100) : 0

          return (
            <div
              key={session.id}
              className="fc-card p-5 space-y-4 flex flex-col transition-all duration-200 bg-white"
              style={{
                boxShadow: isActive
                  ? `inset 0 0 0 2px var(--grass), 0 4px 20px rgba(0, 201, 120, 0.08)`
                  : 'inset 0 0 0 1px var(--stone)',
              }}
            >
              {/* Session header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--stone)]">
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white tracking-wider font-mono"
                  style={{ background: session.accentColor }}
                >
                  {session.tag}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="fc-heading text-base text-ink truncate">{session.name}</h3>
                    {isActive && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--grass)] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--grass)]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted font-mono">{session.timeRange}</p>
                </div>
                <div className="ml-auto text-right">
                  <span
                    className={`fc-badge ${
                      isActive
                        ? 'fc-badge-win'
                        : isClosed
                        ? 'fc-badge-tag'
                        : 'fc-badge-neutral'
                    } text-xs px-2.5 py-0.5 block mb-1`}
                  >
                    {state}
                  </span>
                  {totalEvaluated > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-charcoal">
                      {wins}W - {losses}L ({winRate}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Signal cards list */}
              <div className="space-y-3 flex-1">
                {signals.length > 0 ? (
                  signals.map((sig, i) => <SignalCard key={sig.id || i} signal={sig} index={i} />)
                ) : (
                  <div className="fc-surface py-12 px-4 text-center rounded-[10px] my-auto space-y-2 border border-[var(--stone)]">
                    <div className="text-xs font-mono font-bold text-charcoal uppercase tracking-wider">
                      {isActive
                        ? 'Analysing Session Open…'
                        : isClosed
                        ? 'Session Ended'
                        : `Opens at ${session.openTime}`}
                    </div>
                    <p className="text-muted text-xs leading-relaxed max-w-xs mx-auto">
                      {isActive
                        ? 'Scanning 30m, 1h, and 2h liquidity sweeps for 60+ pips CRT setups.'
                        : isClosed
                        ? 'Session complete. Setups evaluated.'
                        : 'Market session has not started yet. High-quality 60+ pips setups will automatically broadcast at session open.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
