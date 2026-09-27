'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import SignalCard from './SignalCard'

const SESSIONS = [
  {
    id: 'asian',
    name: 'Asian Session',
    timeRange: '19:00 – 22:00 EST',
    icon: '🌏',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    glowColor: 'rgba(99,102,241,0.15)',
    activeColor: '#818cf8',
  },
  {
    id: 'london',
    name: 'London Session',
    timeRange: '04:00 – 09:00 EST',
    icon: '🇬🇧',
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    glowColor: 'rgba(59,130,246,0.15)',
    activeColor: '#60a5fa',
  },
  {
    id: 'newyork',
    name: 'New York Session',
    timeRange: '09:30 – 13:00 EST',
    icon: '🗽',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    glowColor: 'rgba(245,158,11,0.15)',
    activeColor: '#fbbf24',
  },
]

/**
 * Determine which session(s) are currently active based on EST time.
 */
function getActiveSessionIds() {
  const now = new Date()
  // Convert to EST (UTC-5)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const est = new Date(utc - 5 * 3600000)
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const time = hours * 60 + minutes

  const active = []
  // Asian: 19:00 – 22:00 EST
  if (time >= 19 * 60 && time < 22 * 60) active.push('asian')
  // London: 04:00 – 09:00 EST
  if (time >= 4 * 60 && time < 9 * 60) active.push('london')
  // New York: 09:30 – 13:00 EST
  if (time >= 9 * 60 + 30 && time < 13 * 60) active.push('newyork')

  return active
}

export default function SessionSignals({ wsRef }) {
  const [signalsBySession, setSignalsBySession] = useState({
    asian: [],
    london: [],
    newyork: [],
  })
  const [activeSessions, setActiveSessions] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)

  /* ── Track active sessions ───────────────────────────────────────── */
  useEffect(() => {
    setActiveSessions(getActiveSessionIds())
    const interval = setInterval(() => {
      setActiveSessions(getActiveSessionIds())
    }, 30000) // re-check every 30s
    return () => clearInterval(interval)
  }, [])

  /* ── Listen for signal pushes over WebSocket ─────────────────────── */
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
        }
      } catch {
        /* ignore non-JSON frames */
      }
    }

    const ws = wsRef.current
    ws.addEventListener('message', onMessage)
    return () => ws.removeEventListener('message', onMessage)
  }, [wsRef])

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="fc-heading text-2xl text-ink">CRT Session Signals</h2>
          <p className="text-brown text-sm mt-1">
            5 automated signals generated per trading session · 1.5R risk-to-reward ratio
          </p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-muted font-medium">
            Last updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Three-column session grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SESSIONS.map((session) => {
          const isActive = activeSessions.includes(session.id)
          const signals = signalsBySession[session.id] || []

          return (
            <div
              key={session.id}
              className="fc-card p-5 space-y-4 flex flex-col transition-all duration-200"
              style={{
                boxShadow: isActive
                  ? `inset 0 0 0 2px var(--grass), 0 4px 20px rgba(0, 201, 120, 0.08)`
                  : 'inset 0 0 0 1px var(--stone)',
              }}
            >
              {/* Session header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--stone)]">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{ background: session.gradient }}
                >
                  {session.icon}
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
                  <p className="text-xs text-muted font-medium">{session.timeRange}</p>
                </div>
                <span
                  className={`ml-auto fc-badge ${
                    isActive ? 'fc-badge-win' : 'fc-badge-tag'
                  } text-xs px-2.5 py-0.5`}
                >
                  {isActive ? 'ACTIVE' : 'CLOSED'}
                </span>
              </div>

              {/* Signal cards list */}
              <div className="space-y-3 flex-1">
                {signals.length > 0 ? (
                  signals.map((sig, i) => <SignalCard key={i} signal={sig} index={i} />)
                ) : (
                  <div className="fc-surface py-10 px-4 text-center rounded-[10px] my-auto">
                    <div className="text-3xl mb-2 opacity-50">{session.icon}</div>
                    <p className="text-charcoal font-medium text-sm">
                      {isActive ? 'Waiting for signals…' : 'Session closed'}
                    </p>
                    <p className="text-muted text-xs mt-1">
                      Signals automatically broadcast at session open
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
