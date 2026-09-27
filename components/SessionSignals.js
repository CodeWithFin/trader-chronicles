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
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg tracking-tight">CRT Session Signals</h2>
          <p className="text-zinc-500 text-[13px] mt-0.5">
            5 signals per session · 1.5R risk-to-reward
          </p>
        </div>
        {lastUpdated && (
          <span className="text-[11px] text-zinc-600">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Three-column session grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SESSIONS.map((session) => {
          const isActive = activeSessions.includes(session.id)
          const signals = signalsBySession[session.id] || []

          return (
            <div
              key={session.id}
              className="rounded-xl overflow-hidden transition-all duration-300"
              style={{
                background: '#111113',
                boxShadow: isActive
                  ? `inset 0 0 0 1px ${session.activeColor}33, 0 0 30px ${session.glowColor}`
                  : 'inset 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              {/* Session header */}
              <div className="p-4 flex items-center gap-3 border-b border-white/[0.04]">
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ background: session.gradient }}
                >
                  {session.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-sm font-semibold truncate">{session.name}</h3>
                    {isActive && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span
                          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                          style={{ background: session.activeColor }}
                        />
                        <span
                          className="relative inline-flex rounded-full h-2 w-2"
                          style={{ background: session.activeColor }}
                        />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono">{session.timeRange}</p>
                </div>
                <span
                  className="ml-auto fc-badge text-[10px]"
                  style={{
                    background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? '#4ade80' : '#52525b',
                  }}
                >
                  {isActive ? 'ACTIVE' : 'CLOSED'}
                </span>
              </div>

              {/* Signal cards */}
              <div className="p-3 space-y-2 max-h-[560px] overflow-y-auto">
                {signals.length > 0 ? (
                  signals.map((sig, i) => <SignalCard key={i} signal={sig} index={i} />)
                ) : (
                  <div className="py-10 text-center">
                    <div className="text-2xl mb-2 opacity-30">{session.icon}</div>
                    <p className="text-zinc-600 text-[12px]">
                      {isActive ? 'Waiting for signals…' : 'Session closed'}
                    </p>
                    <p className="text-zinc-700 text-[11px] mt-1">
                      Signals push at session open
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
