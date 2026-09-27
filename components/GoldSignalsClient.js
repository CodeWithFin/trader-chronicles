'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import GoldChart from '@/components/GoldChart'
import SessionSignals from '@/components/SessionSignals'

const WS_URL = process.env.NEXT_PUBLIC_SIGNALS_WS_URL || 'ws://127.0.0.1:3002'
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
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2 border-b border-[var(--stone)]">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="fc-display text-4xl sm:text-5xl md:text-6xl">
              Gold (XAU/USD) <span className="text-[#ff3e00]">Signals</span>
            </h1>
            <span className="fc-badge fc-badge-neutral text-xs px-3 py-1 font-semibold">
              CRT Strategy
            </span>
          </div>
          <p className="text-brown text-base sm:text-lg max-w-2xl leading-relaxed">
            Candle Range Theory signals pushed at session opens with automated 1.5R risk-to-reward target levels.
          </p>
        </div>

        {/* WebSocket connection status indicator */}
        <div className="fc-surface px-4 py-2 flex items-center gap-2.5 shrink-0 self-start sm:self-auto border border-[var(--stone)]">
          <span className="relative flex h-2.5 w-2.5">
            {wsStatus === 'connected' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--grass)] opacity-75" />
            )}
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{
                background:
                  wsStatus === 'connected'
                    ? 'var(--grass)'
                    : wsStatus === 'connecting'
                    ? 'var(--honey)'
                    : 'var(--alert)',
              }}
            />
          </span>
          <span className="text-xs font-semibold text-charcoal">
            {wsStatus === 'connected'
              ? 'Live Feed Connected'
              : wsStatus === 'connecting'
              ? 'Connecting…'
              : 'Server Offline'}
          </span>
        </div>
      </div>

      {/* Live Candlestick Chart */}
      <GoldChart wsRef={wsRef} signals={activeSignals} />

      {/* CRT Session Signals Grid */}
      <SessionSignals wsRef={wsRef} />
    </div>
  )
}
