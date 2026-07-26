'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import { useChartPalette } from '@/components/useChartPalette'

// Dynamically import charts to reduce initial bundle size
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })

const ContributionGraph = dynamic(() => import('@/components/ContributionGraph'), { ssr: false })
const TradingCalendar = dynamic(() => import('@/components/TradingCalendar'), { ssr: false })
const FinancialPerformanceChart = dynamic(() => import('@/components/FinancialPerformanceChart'), { ssr: false })

export default function AnalyticsClient({ initialData = null, session = null }) {
  const palette = useChartPalette()
  const [analytics, setAnalytics] = useState(initialData)
  const [accounts, setAccounts] = useState([])
  const [accountFilter, setAccountFilter] = useState('')
  const [loading, setLoading] = useState(!(initialData != null))
  const [error, setError] = useState('')
  const [graphMode, setGraphMode] = useState('activity') // 'activity' | 'pnl'
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetch('/api/trading-accounts', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAccounts(Array.isArray(d.accounts) ? d.accounts : []))
      .catch(() => setAccounts([]))
  }, [])

  useEffect(() => {
    fetchAnalytics(!(initialData != null && accountFilter === ''))
  }, [accountFilter])

  const fetchAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      const qs = accountFilter ? `?accountId=${encodeURIComponent(accountFilter)}` : ''
      const response = await fetch(`/api/analytics${qs}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch analytics')

      const data = await response.json()
      setAnalytics(data)
      setError('')
    } catch (err) {
      setError('Failed to fetch analytics')
      console.error(err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const refreshAnalytics = () => {
    fetchAnalytics(false)
  }

  const selectedAccountLabel =
    accountFilter && accounts.length
      ? accounts.find((a) => a.id === accountFilter)?.label || ''
      : ''

  // Show cached data while refreshing in background
  const displayAnalytics = analytics

  if (loading && !analytics) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center text-xl font-bold">Loading analytics...</div>
        </div>
      </>
    )
  }

  if (error && !analytics) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="border-4 border-black bg-red-50 p-6 text-red-900">
            {error || 'No analytics data available'}
          </div>
        </div>
      </>
    )
  }

  if (!displayAnalytics) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center text-xl font-bold">Loading analytics...</div>
        </div>
      </>
    )
  }

  const {
    totalTrades,
    winRate,
    expectancy,
    profitFactor,
    winRateByTag,
    dailyContribution = [],
    financialPerformance = { startingBalance: 10000, points: [] },
  } = displayAnalytics

  const tagData = Object.entries(winRateByTag).map(([tag, rate]) => ({
    name: tag,
    winRate: parseFloat((rate || 0).toFixed(2))
  }))

  const MetricCard = ({ title, value, subtitle, color = 'black' }) => (
    <div className="border-2 border-black bg-white p-6 shadow-brutal-md">
      <p className="text-sm font-bold text-zinc-600 uppercase mb-2">{title}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="text-sm text-zinc-600 mt-2">{subtitle}</p>}
    </div>
  )

  // Transform dailyContribution data to match ContributionGraph component format
  // The API returns: { date, wins, losses, total, outcome }
  // Component expects: { date, trades, pnl, wins, losses }
  const contributionData = dailyContribution.map(day => ({
    date: day.date,
    trades: day.total || 0,
    pnl: day.pnl || 0, // We'll need to calculate this from trades if not available
    wins: day.wins || 0,
    losses: day.losses || 0
  }))

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-2 inline-flex items-center gap-3">
              <svg className="w-10 h-10 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden>
                <path d="M0 0h24v24H0z" fill="none" />
                <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                  <path d="M7 18v-2m5 2v-3m5 3v-5M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12" />
                  <path d="M5.992 11.486c2.155.072 7.042-.253 9.822-4.665m-1.822-.533l1.876-.302c.228-.029.564.152.647.367l.495 1.638" />
                </g>
              </svg>
              Analytics Dashboard
            </h1>
            <div className="w-full h-1 bg-black"></div>
          </div>
          <button
            onClick={refreshAnalytics}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-white text-sm font-bold hover:bg-zinc-100 transition-colors shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh analytics data"
          >
            <svg
              className={`w-4 h-4 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 15 15"
              aria-hidden
            >
              <path d="M0 0h15v15H0z" fill="none" />
              <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14 7.5A6.5 6.5 0 0 0 7.5 1V0a7.5 7.5 0 0 1 5.099 13H15v1h-4v-4h1v2.19a6.48 6.48 0 0 0 2-4.69M2.4 2H0V1h4v4H3V2.81A6.5 6.5 0 0 0 7.5 14v1A7.5 7.5 0 0 1 2.4 2"
              />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {error && analytics && (
          <div className="mb-6 p-4 border-2 border-black bg-yellow-50 text-yellow-900">
            {error} (showing cached data)
          </div>
        )}

        <div className="mb-8 flex flex-col gap-2 border-4 border-black bg-white p-4 shadow-brutal-lg md:flex-row md:items-center md:justify-between">
          <label htmlFor="analytics-account" className="text-sm font-bold uppercase">
            Analytics scope
          </label>
          <select
            id="analytics-account"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full max-w-md border-2 border-black bg-white px-3 py-2 text-sm font-semibold md:w-auto"
          >
            <option value="">All trading accounts (combined)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <MetricCard
            title="Total Trades"
            value={totalTrades}
            subtitle="All trade entries"
          />
          <MetricCard
            title="Win Rate"
            value={`${(winRate || 0).toFixed(2)}%`}
            subtitle={`${totalTrades > 0 ? (((winRate || 0) / 100) * totalTrades).toFixed(0) : 0} winning trades`}
            color="text-green-600"
          />
          <MetricCard
            title="Average P&L"
            value={`${(analytics.averagePnl || 0) >= 0 ? '+' : ''}$${(analytics.averagePnl || 0).toFixed(2)}`}
            subtitle={`Win: $${(analytics.averageWinPnl || 0).toFixed(2)} | Loss: $${(analytics.averageLossPnl || 0).toFixed(2)}`}
            color={(analytics.averagePnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <MetricCard
            title="Expectancy"
            value={`${(expectancy || 0) >= 0 ? '+' : ''}$${(expectancy || 0).toFixed(2)}`}
            subtitle="Expected value per trade"
            color={(expectancy || 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <MetricCard
            title="Largest Win"
            value={`+$${(analytics.largestWinPnl || 0).toFixed(2)}`}
            subtitle="Best performing trade"
            color="text-green-600"
          />
          <MetricCard
            title="Largest Loss"
            value={`$${(analytics.largestLossPnl || 0).toFixed(2)}`}
            subtitle="Worst performing trade"
            color="text-red-600"
          />
          <MetricCard
            title="Profit Factor"
            value={profitFactor === Infinity || profitFactor === null ? '∞' : (profitFactor || 0).toFixed(2)}
            subtitle="Total wins / Total losses"
            color={(profitFactor || 0) >= 1 ? 'text-green-600' : 'text-red-600'}
          />
        </div>

        <FinancialPerformanceChart
          startingBalance={financialPerformance.startingBalance}
          points={financialPerformance.points}
          scopeLabel={selectedAccountLabel}
        />

        <div className="border-4 border-black bg-white p-6 md:p-12 shadow-brutal-2xl mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold uppercase">Trading Calendar</h2>
            <p className="text-sm text-zinc-600 mt-1">
              Trades and net P&amp;L per day — green/red bar by result
              {selectedAccountLabel ? ` · ${selectedAccountLabel}` : ''}
            </p>
          </div>
          <TradingCalendar dailyContribution={dailyContribution} />
        </div>

        {/* Charts */}
        <div className="space-y-12">
          {/* Contribution Graph */}
          <div className="border-4 border-black bg-white p-6 md:p-12 shadow-brutal-2xl">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold uppercase">Trading Activity</h2>
                <p className="text-sm text-zinc-600 mt-1">Daily win/loss overview</p>
              </div>
              {/* Mode Toggle */}
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setGraphMode('activity')}
                  className={`px-3 py-1 text-xs font-bold border-2 border-black transition-all ${
                    graphMode === 'activity' 
                      ? 'bg-zinc-200 text-black' 
                      : 'bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                  aria-label="Activity mode"
                >
                  Activity
                </button>
                <button
                  onClick={() => setGraphMode('pnl')}
                  className={`px-3 py-1 text-xs font-bold border-2 border-black transition-all ${
                    graphMode === 'pnl' 
                      ? 'bg-zinc-200 text-black' 
                      : 'bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                  aria-label="P&L mode"
                >
                  P&L
                </button>
              </div>
            </div>
            <ContributionGraph
              data={contributionData}
              mode={graphMode}
              title=""
              subtitle=""
              showWeekends={true}
              showLegend={true}
            />
          </div>

          {/* Win Rate by Tag */}
          {tagData.length > 0 && (
            <div className="border-4 border-black bg-white p-6 md:p-12 shadow-brutal-2xl">
              <h2 className="text-2xl font-bold mb-6 uppercase">Win Rate by Setup Tag</h2>
              <p className="text-sm text-zinc-600 mb-6">Performance by trade setup characteristics</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={tagData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: palette.tick, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke={palette.axis}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    tick={{ fill: palette.tick, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke={palette.axis}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      border: `2px solid ${palette.tooltipBorder}`,
                      borderRadius: '0',
                      fontFamily: 'JetBrains Mono',
                      color: palette.tooltipLabel,
                    }}
                    formatter={(value) => `${value}%`}
                  />
                  <Bar dataKey="winRate" fill="#ea580c" stroke={palette.axis} strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  )
}


