'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * GoldChart — XAU/USD candlestick chart powered by lightweight-charts.
 *
 * Props:
 *   wsRef        – shared React ref to the WebSocket instance (created by the parent page)
 *   signals      – array of signal objects to render price-line overlays
 *   onChartReady – optional callback when the chart is first mounted
 */
export default function GoldChart({ wsRef, signals = [], onChartReady }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const priceLinesRef = useRef([])

  /* ── initialise chart ─────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false

    async function init() {
      const { createChart, CandlestickSeries, CrosshairMode } = await import('lightweight-charts')
      if (cancelled || !containerRef.current) return

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 420,
        layout: {
          background: { color: '#0e0e10' },
          textColor: '#a1a1aa',
          fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.03)' },
          horzLines: { color: 'rgba(255,255,255,0.03)' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.08)',
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.08)',
          timeVisible: true,
          secondsVisible: false,
        },
      })

      const seriesOptions = {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      }

      const candleSeries = typeof chart.addSeries === 'function' && CandlestickSeries
        ? chart.addSeries(CandlestickSeries, seriesOptions)
        : chart.addCandlestickSeries(seriesOptions)

      /* ── seed with placeholder historical candles ────────────────── */
      const now = Math.floor(Date.now() / 1000)
      const seedData = generateSeedCandles(now, 120) // 120 candles
      candleSeries.setData(seedData)

      chartRef.current = chart
      seriesRef.current = candleSeries

      if (onChartReady) onChartReady()

      /* ── handle resize ──────────────────────────────────────────── */
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width })
        }
      })
      ro.observe(containerRef.current)

      return () => {
        ro.disconnect()
        chart.remove()
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [onChartReady])

  /* ── listen for live candle updates over WebSocket ─────────────── */
  useEffect(() => {
    if (!wsRef?.current) return

    function onMessage(evt) {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'candle' && seriesRef.current) {
          seriesRef.current.update(msg.data)
        }
      } catch {
        /* ignore non-JSON frames */
      }
    }

    const ws = wsRef.current
    ws.addEventListener('message', onMessage)
    return () => ws.removeEventListener('message', onMessage)
  }, [wsRef])

  /* ── draw signal price-lines on the chart ──────────────────────── */
  useEffect(() => {
    if (!seriesRef.current) return

    // Clear old price lines
    priceLinesRef.current.forEach((pl) => {
      try {
        seriesRef.current.removePriceLine(pl)
      } catch {
        /* already removed */
      }
    })
    priceLinesRef.current = []

    // Draw new price lines from signals
    signals.forEach((sig) => {
      if (!sig.entry || !sig.stopLoss || !sig.takeProfit) return

      const entryLine = seriesRef.current.createPriceLine({
        price: sig.entry,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `Entry ${sig.direction === 'LONG' ? '▲' : '▼'}`,
      })
      const slLine = seriesRef.current.createPriceLine({
        price: sig.stopLoss,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      })
      const tpLine = seriesRef.current.createPriceLine({
        price: sig.takeProfit,
        color: '#22c55e',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'TP',
      })

      priceLinesRef.current.push(entryLine, slLine, tpLine)
    })
  }, [signals])

  return (
    <div className="fc-card overflow-hidden" style={{ background: '#0e0e10' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #facc15, #d97706)' }}
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
          </svg>
        </span>
        <div>
          <h3 className="text-white font-semibold text-sm tracking-tight">XAU / USD</h3>
          <p className="text-[11px] text-zinc-500">Gold Spot · 1-min</p>
        </div>
        <span className="ml-auto fc-badge text-[10px]" style={{ background: 'rgba(250,204,21,0.12)', color: '#facc15' }}>
          LIVE
        </span>
      </div>

      {/* Chart container */}
      <div ref={containerRef} id="gold-chart-container" className="w-full" />
    </div>
  )
}

/* ── helper: generate realistic seed candles ────────────────────── */
function generateSeedCandles(nowUnix, count) {
  const candles = []
  const interval = 60 // 1-min candles
  let price = 2340 + Math.random() * 30

  for (let i = count; i > 0; i--) {
    const time = nowUnix - i * interval
    const volatility = 0.8 + Math.random() * 1.2
    const open = price
    const close = open + (Math.random() - 0.48) * volatility
    const high = Math.max(open, close) + Math.random() * volatility * 0.6
    const low = Math.min(open, close) - Math.random() * volatility * 0.6
    candles.push({
      time,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
    })
    price = close
  }

  return candles
}
