'use client'

import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { endOfDay, format, parseISO, startOfDay } from 'date-fns'
import { useChartPalette } from '@/components/useChartPalette'

function fmtMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '$0.00'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function FinancialPerformanceChart({ startingBalance = 10000, points = [], scopeLabel = '' }) {
  const palette = useChartPalette()
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [view, setView] = useState('balance')

  useEffect(() => {
    if (!points.length) {
      setRangeStart('')
      setRangeEnd('')
      return
    }
    const times = points.map((p) => new Date(p.time).getTime())
    const min = new Date(Math.min(...times))
    const max = new Date(Math.max(...times))
    setRangeStart(format(min, 'yyyy-MM-dd'))
    setRangeEnd(format(max, 'yyyy-MM-dd'))
  }, [points])

  const bounds = useMemo(() => {
    if (!points.length) return { min: '', max: '' }
    const times = points.map((p) => new Date(p.time).getTime())
    return {
      min: format(new Date(Math.min(...times)), 'yyyy-MM-dd'),
      max: format(new Date(Math.max(...times)), 'yyyy-MM-dd'),
    }
  }, [points])

  const filteredPoints = useMemo(() => {
    if (!points.length) return []
    const rs = rangeStart ? startOfDay(parseISO(rangeStart)).getTime() : null
    const re = rangeEnd ? endOfDay(parseISO(rangeEnd)).getTime() : null
    return points.filter((p) => {
      const t = new Date(p.time).getTime()
      if (rs !== null && t < rs) return false
      if (re !== null && t > re) return false
      return true
    })
  }, [points, rangeStart, rangeEnd])

  const chartData = useMemo(() => {
    return filteredPoints.map((p) => ({
      ts: new Date(p.time).getTime(),
      balanceStep: view === 'balance' ? p.balance : p.profit,
      equitySmooth: view === 'balance' ? p.balance : p.profit,
    }))
  }, [filteredPoints, view])

  const legendNames =
    view === 'balance'
      ? { step: 'Balance', smooth: 'Equity' }
      : { step: 'Realized P&L', smooth: 'Running net' }

  return (
    <div className="fc-card p-6 md:p-12 mb-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="fc-heading text-2xl">Financial Performance</h2>
          {scopeLabel ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#ff3e00]">Scope: {scopeLabel}</p>
          ) : null}
          <p className="mt-1 text-sm text-brown">
            Realized balance steps at each closed trade; smooth line tracks the same path between closes (journal
            approximation of equity).
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="fp-start">
              Start date
            </label>
            <input
              id="fp-start"
              type="date"
              min={bounds.min || undefined}
              max={bounds.max || undefined}
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="fc-input fc-input-sm"
            />
            <span className="text-muted">→</span>
            <label className="sr-only" htmlFor="fp-end">
              End date
            </label>
            <input
              id="fp-end"
              type="date"
              min={bounds.min || undefined}
              max={bounds.max || undefined}
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="fc-input fc-input-sm"
            />
          </div>

          <div className="flex gap-1 fc-surface p-1">
            <button
              type="button"
              onClick={() => setView('balance')}
              className={`fc-btn fc-btn-sm ${view === 'balance' ? 'fc-btn-primary' : 'fc-btn-ghost'}`}
            >
              Balance
            </button>
            <button
              type="button"
              onClick={() => setView('profit')}
              className={`fc-btn fc-btn-sm ${view === 'profit' ? 'fc-btn-primary' : 'fc-btn-ghost'}`}
            >
              Profit
            </button>
          </div>
        </div>
      </div>

      {!points.length ? (
        <div className="rounded-[10px] fc-surface py-16 text-center text-brown">
          Log trades to see balance and equity over time.
        </div>
      ) : chartData.length < 2 ? (
        <div className="rounded-[10px] fc-surface py-16 text-center text-brown">
          No data in this date range.
        </div>
      ) : (
        <div className="rounded-[10px] fc-surface p-4 md:p-6">
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-brown">
            <span className="inline-flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white shadow-card" aria-hidden />
                {legendNames.step}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00ca48]" aria-hidden />
                {legendNames.smooth}
              </span>
            </span>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                type="number"
                dataKey="ts"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
                stroke={palette.axis}
                tick={{ fill: palette.tickMuted, fontSize: 11 }}
                tickLine={{ stroke: palette.grid }}
              />
              <YAxis
                tickFormatter={(v) => fmtMoney(v)}
                stroke={palette.axis}
                tick={{ fill: palette.tickMuted, fontSize: 11 }}
                tickLine={{ stroke: palette.grid }}
                width={72}
              />
              <Tooltip
                labelFormatter={(ts) => format(new Date(ts), 'MMM d, yyyy · h:mm a')}
                formatter={(value, name) => [
                  fmtMoney(value),
                  name === 'balanceStep' ? legendNames.step : name === 'equitySmooth' ? legendNames.smooth : name,
                ]}
                contentStyle={{
                  backgroundColor: palette.tooltipBg,
                  border: `1px solid ${palette.tooltipBorder}`,
                  borderRadius: 10,
                  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                  fontSize: 12,
                  color: palette.tooltipLabel,
                }}
                labelStyle={{ color: palette.tooltipLabel, fontWeight: 600, marginBottom: 4 }}
              />
              <Line
                type="stepAfter"
                dataKey="balanceStep"
                name="balanceStep"
                stroke={palette.line}
                strokeWidth={2}
                dot={{ r: 3, fill: palette.dotFill, stroke: palette.line, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="equitySmooth"
                name="equitySmooth"
                stroke="#00ca48"
                strokeWidth={2}
                dot={{ r: 3, fill: '#00ca48', stroke: '#0a7a3d', strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <p className="mt-3 text-center text-[11px] text-muted">
            {`Starting notional balance ${fmtMoney(startingBalance)} · Values use closed-trade P&L only.`}
          </p>
        </div>
      )}
    </div>
  )
}
