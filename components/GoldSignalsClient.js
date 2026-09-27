'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import GoldChart from '@/components/GoldChart'
import SessionSignals from '@/components/SessionSignals'

const WS_URL = process.env.NEXT_PUBLIC_SIGNALS_WS_URL || 'ws://127.0.0.1:3001'
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 10

export default function GoldSignalsClient() {
  const wsRef = useRef(null)
  const [wsStatus, setWsStatus] = useState('disconnected') // disconnected | connecting | connected
  const [activeSignals, setActiveSignals] = useState([])
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef(null)

  /* ── WebSocket connection with reconnection ─────────────────────── */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setWsStatus('connecting')

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.addEventListener('open', () => {
      setWsStatus('connected')
      reconnectAttempts.current = 0
    })

    ws.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        // Capture latest signal set for chart overlays
        if (msg.type === 'signals' && Array.isArray(msg.signals)) {
          setActiveSignals(msg.signals)
        }
      } catch {
        /* ignore */
      }
    })

    ws.addEventListener('close', () => {
      setWsStatus('disconnected')
      wsRef.current = null
      // Attempt reconnection
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    })

    ws.addEventListener('error', () => {
      ws.close()
    })
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-white font-semibold text-2xl tracking-tight" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              Gold (XAU/USD) Signals
            </h1>
            <span
              className="fc-badge text-[10px] font-bold tracking-wider"
              style={{ background: 'rgba(250,204,21,0.12)', color: '#facc15' }}
            >
              CRT
            </span>
          </div>
          <p className="text-zinc-500 text-[13px]">
            Candle Range Theory signals pushed at each session open · 1.5R risk-to-reward
          </p>
        </div>

        {/* WebSocket connection indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            {wsStatus === 'connected' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{
                background:
                  wsStatus === 'connected'
                    ? '#22c55e'
                    : wsStatus === 'connecting'
                    ? '#fbbf24'
                    : '#ef4444',
              }}
            />
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {wsStatus === 'connected'
              ? 'Live'
              : wsStatus === 'connecting'
              ? 'Connecting…'
              : 'Offline'}
          </span>
        </div>
      </div>

      {/* Chart */}
      <GoldChart wsRef={wsRef} signals={activeSignals} />

      {/* Session signals */}
      <SessionSignals wsRef={wsRef} />
    </div>
  )
}
