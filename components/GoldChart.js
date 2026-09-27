'use client'

import { useState, useEffect, useRef } from 'react'

const TIMEFRAMES = [
  { id: '1m', label: '1m', intervalSeconds: 60, title: '1-Minute' },
  { id: '5m', label: '5m', intervalSeconds: 300, title: '5-Minute' },
  { id: '15m', label: '15m', intervalSeconds: 900, title: '15-Minute' },
  { id: '1h', label: '1h', intervalSeconds: 3600, title: '1-Hour' },
  { id: '4h', label: '4h', intervalSeconds: 14400, title: '4-Hour' },
  { id: '1d', label: '1D', intervalSeconds: 86400, title: 'Daily' },
]

/**
 * GoldChart — XAU/USD candlestick chart with interactive timeframe selector.
 */
export default function GoldChart({ wsRef, signals = [], onChartReady }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const priceLinesRef = useRef([])

  const [timeframe, setTimeframe] = useState('1m')

  const activeTfObj = TIMEFRAMES.find((tf) => tf.id === timeframe) || TIMEFRAMES[0]

  /* ── initialise chart ─────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false

    async function init() {
      const { createChart, CandlestickSeries, CrosshairMode } = await import('lightweight-charts')
      if (cancelled || !containerRef.current) return

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 440,
        layout: {
          background: { color: '#111113' },
          textColor: '#a1a1aa',
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
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
        upColor: '#00c978',
        downColor: '#ff2b3a',
        borderDownColor: '#ff2b3a',
        borderUpColor: '#00c978',
        wickDownColor: '#ff2b3a',
        wickUpColor: '#00c978',
      }

      const candleSeries =
        typeof chart.addSeries === 'function' && CandlestickSeries
          ? chart.addSeries(CandlestickSeries, seriesOptions)
          : chart.addCandlestickSeries(seriesOptions)

      const now = Math.floor(Date.now() / 1000)
      const seedData = generateSeedCandles(now, 120, activeTfObj.intervalSeconds)
      candleSeries.setData(seedData)

      chartRef.current = chart
      seriesRef.current = candleSeries

      if (onChartReady) onChartReady()

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

  /* ── update candles when timeframe changes ────────────────────────── */
  useEffect(() => {
    if (!seriesRef.current) return
    const now = Math.floor(Date.now() / 1000)
    const seedData = generateSeedCandles(now, 120, activeTfObj.intervalSeconds)
    seriesRef.current.setData(seedData)
  }, [timeframe, activeTfObj.intervalSeconds])

  /* ── real-time candle tick generator & WS listener ─────────────── */
  useEffect(() => {
    let currentCandle = null
    let timer = null

    const interval = activeTfObj.intervalSeconds

    const startLocalTickStream = () => {
      timer = setInterval(() => {
        if (!seriesRef.current) return
        const now = Math.floor(Date.now() / 1000)
        const candleTime = Math.floor(now / interval) * interval

        if (!currentCandle || candleTime > currentCandle.time) {
          const prevClose = currentCandle ? currentCandle.close : 2375.14
          currentCandle = {
            time: candleTime,
            open: prevClose,
            high: prevClose,
            low: prevClose,
            close: prevClose,
          }
        }

        const delta = (Math.random() - 0.49) * (0.45 * Math.sqrt(interval / 60))
        const newClose = +(currentCandle.close + delta).toFixed(2)
        currentCandle.close = newClose
        currentCandle.high = Math.max(currentCandle.high, newClose)
        currentCandle.low = Math.min(currentCandle.low, newClose)

        seriesRef.current.update(currentCandle)
      }, 1000)
    }

    startLocalTickStream()

    if (!wsRef?.current) {
      return () => clearInterval(timer)
    }

    function onMessage(evt) {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'candle' && seriesRef.current && msg.data && timeframe === '1m') {
          seriesRef.current.update(msg.data)
        }
      } catch {
        /* ignore non-JSON */
      }
    }

    const ws = wsRef.current
    ws.addEventListener('message', onMessage)
    return () => {
      clearInterval(timer)
      ws.removeEventListener('message', onMessage)
    }
  }, [wsRef, timeframe, activeTfObj.intervalSeconds])

  /* ── draw signal price-lines on the chart ──────────────────────── */
  useEffect(() => {
    if (!seriesRef.current) return

    priceLinesRef.current.forEach((pl) => {
      try {
        seriesRef.current.removePriceLine(pl)
      } catch {
        /* already removed */
      }
    })
    priceLinesRef.current = []

    signals.forEach((sig) => {
      if (!sig.entry || !sig.stopLoss || !sig.takeProfit) return

      const entryLine = seriesRef.current.createPriceLine({
        price: sig.entry,
        color: '#0086fc',
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `Entry ${sig.direction === 'LONG' ? 'BUY' : 'SELL'}`,
      })
      const slLine = seriesRef.current.createPriceLine({
        price: sig.stopLoss,
        color: '#ff2b3a',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      })
      const tpLine = seriesRef.current.createPriceLine({
        price: sig.takeProfit,
        color: '#00c978',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'TP',
      })

      priceLinesRef.current.push(entryLine, slLine, tpLine)
    })
  }, [signals])

  return (
    <div className="fc-card p-6 space-y-4 bg-white">
      {/* Header + Timeframe Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[var(--stone)]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#ffcd6c' }}
          >
            <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
            </svg>
          </div>
          <div>
            <h3 className="fc-heading text-xl">XAU / USD</h3>
            <p className="text-xs text-brown font-mono">
              Gold Spot · {activeTfObj.title} Candlesticks
            </p>
          </div>
        </div>

        {/* Timeframe Selector Buttons */}
        <div className="flex items-center gap-1.5 fc-surface p-1 rounded-lg border border-[var(--stone)] self-start sm:self-auto">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-all ${
                timeframe === tf.id
                  ? 'bg-[var(--ink)] text-white shadow-sm'
                  : 'text-charcoal hover:bg-[var(--stone)]'
              }`}
            >
              {tf.label}
            </button>
          ))}
          <span className="ml-2 fc-badge fc-badge-win text-[11px] px-2.5 py-0.5 font-semibold">
            LIVE
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} id="gold-chart-container" className="w-full rounded-lg overflow-hidden" />
    </div>
  )
}

/* ── helper: generate seed candles for specific timeframe interval ─ */
function generateSeedCandles(nowUnix, count, intervalSeconds = 60) {
  const candles = []
  let price = 2372 + Math.random() * 5

  for (let i = count; i > 0; i--) {
    const time = Math.floor((nowUnix - i * intervalSeconds) / intervalSeconds) * intervalSeconds
    const volatility = (0.8 + Math.random() * 1.2) * Math.sqrt(intervalSeconds / 60)
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
