'use client'

import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { endOfDay, format, parseISO, startOfDay } from 'date-fns'

function fmtMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '$0.00'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function FinancialPerformanceChart({ startingBalance = 10000, points = [], scopeLabel = '' }) {
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
    <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-12">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-black">Financial Performance</h2>
          {scopeLabel ? (
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#ea580c]">Scope: {scopeLabel}</p>
          ) : null}
          <p className="mt-1 text-sm text-zinc-600">
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
              className="rounded-md border-2 border-black bg-white px-3 py-2 text-sm font-medium text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:border-[#ea580c] focus:outline-none"
            />
            <span className="text-zinc-500">→</span>
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
              className="rounded-md border-2 border-black bg-white px-3 py-2 text-sm font-medium text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:border-[#ea580c] focus:outline-none"
            />
          </div>

          <div className="flex rounded-md border-2 border-black p-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
              type="button"
              onClick={() => setView('balance')}
              className={`rounded px-4 py-2 text-xs font-bold uppercase transition-colors ${
                view === 'balance' ? 'bg-[#ea580c] text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              Balance
            </button>
            <button
              type="button"
              onClick={() => setView('profit')}
              className={`rounded px-4 py-2 text-xs font-bold uppercase transition-colors ${
                view === 'profit' ? 'bg-[#ea580c] text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              Profit
            </button>
          </div>
        </div>
      </div>

      {!points.length ? (
        <div className="rounded-lg border-2 border-zinc-200 bg-zinc-50 py-16 text-center text-zinc-600">
          Log trades to see balance and equity over time.
        </div>
      ) : chartData.length < 2 ? (
        <div className="rounded-lg border-2 border-zinc-200 bg-zinc-50 py-16 text-center text-zinc-600">
          No data in this date range.
        </div>
      ) : (
        <div className="rounded-lg border-2 border-zinc-200 bg-zinc-50 p-4 md:p-6">
          <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-zinc-600">
            <span className="inline-flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-black bg-white" aria-hidden />
                {legendNames.step}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden />
                {legendNames.smooth}
              </span>
            </span>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                type="number"
                dataKey="ts"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
                stroke="#111827"
                tick={{ fill: '#374151', fontSize: 11 }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis
                tickFormatter={(v) => fmtMoney(v)}
                stroke="#111827"
                tick={{ fill: '#374151', fontSize: 11 }}
                tickLine={{ stroke: '#d1d5db' }}
                width={72}
              />
              <Tooltip
                labelFormatter={(ts) => format(new Date(ts), 'MMM d, yyyy · h:mm a')}
                formatter={(value, name) => [
                  fmtMoney(value),
                  name === 'balanceStep' ? legendNames.step : name === 'equitySmooth' ? legendNames.smooth : name,
                ]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #000',
                  borderRadius: 0,
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 12,
                }}
                labelStyle={{ color: '#111827', fontWeight: 700, marginBottom: 4 }}
              />
              <Line
                type="stepAfter"
                dataKey="balanceStep"
                name="balanceStep"
                stroke="#111827"
                strokeWidth={2}
                dot={{ r: 3, fill: '#fff', stroke: '#111827', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="equitySmooth"
                name="equitySmooth"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981', stroke: '#065f46', strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <p className="mt-3 text-center text-[11px] text-zinc-500">
            {`Starting notional balance ${fmtMoney(startingBalance)} · Values use closed-trade P&L only.`}
          </p>
        </div>
      )}
    </div>
  )
}
