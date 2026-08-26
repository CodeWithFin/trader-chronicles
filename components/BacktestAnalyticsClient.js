'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useChartPalette } from '@/components/useChartPalette'

const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false })
const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false })

const ContributionGraph = dynamic(() => import('@/components/ContributionGraph'), { ssr: false })
const TradingCalendar = dynamic(() => import('@/components/TradingCalendar'), { ssr: false })
const FinancialPerformanceChart = dynamic(() => import('@/components/FinancialPerformanceChart'), { ssr: false })

export default function BacktestAnalyticsClient({ initialData = null, session = null }) {
  const palette = useChartPalette()
  const [analytics, setAnalytics] = useState(initialData)
  const [strategies, setStrategies] = useState([])
  const [strategyFilter, setStrategyFilter] = useState('')
  const [loading, setLoading] = useState(!(initialData != null))
  const [error, setError] = useState('')
  const [graphMode, setGraphMode] = useState('activity')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetch('/api/backtests?limit=1', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setStrategies(Array.isArray(d.strategies) ? d.strategies : []))
      .catch(() => setStrategies([]))
  }, [])

  useEffect(() => {
    fetchAnalytics(!(initialData != null && strategyFilter === ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyFilter])

  const fetchAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setIsRefreshing(true)
      const qs = strategyFilter ? `?strategyName=${encodeURIComponent(strategyFilter)}` : ''
      const response = await fetch(`/api/backtests/analytics${qs}`, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch analytics')
      setAnalytics(data)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics')
      console.error(err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  if (loading && !analytics) {
    return (
      <>
        <Navbar initialSession={session} />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center text-xl font-semibold text-brown">Loading analytics...</div>
        </div>
      </>
    )
  }

  if (error && !analytics) {
    return (
      <>
        <Navbar initialSession={session} />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="fc-banner fc-banner-error">{error}</div>
        </div>
      </>
    )
  }

  if (!analytics) {
    return (
      <>
        <Navbar initialSession={session} />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center text-xl font-semibold text-brown">Loading analytics...</div>
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
  } = analytics

  const tagData = Object.entries(winRateByTag || {}).map(([tag, rate]) => ({
    name: tag,
    winRate: parseFloat((rate || 0).toFixed(2)),
  }))

  const strategyData = Object.entries(analytics.winRateByStrategy || {}).map(([name, rate]) => ({
    name,
    winRate: parseFloat((rate || 0).toFixed(2)),
  }))

  const MetricCard = ({ title, value, valueClass = 'text-ink' }) => (
    <div className="fc-card p-6">
      <p className="text-xs font-semibold text-muted uppercase mb-2">{title}</p>
      <p className={`text-3xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  )

  const contributionData = dailyContribution.map((day) => ({
    date: day.date,
    trades: day.total || 0,
    pnl: day.pnl || 0,
    wins: day.wins || 0,
    losses: day.losses || 0,
  }))

  return (
    <>
      <Navbar initialSession={session} />
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="fc-heading-lg text-4xl md:text-5xl mb-2">Backtest Analytics</h1>
            <p className="text-sm text-brown">
              Strategy performance from simulated trades only — separate from your live results.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/backtesting" className="fc-btn fc-btn-secondary fc-btn-sm">
              ← Back to Log
            </Link>
            <button
              onClick={() => fetchAnalytics(false)}
              disabled={isRefreshing}
              className="fc-btn fc-btn-secondary fc-btn-sm"
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
        </div>

        {error && analytics && (
          <div className="fc-banner fc-banner-warn mb-6">
            {error} (showing cached data)
          </div>
        )}

        <div className="mb-8 flex flex-col gap-3 fc-card p-4 md:flex-row md:items-center md:justify-between">
          <label htmlFor="strategy-scope" className="fc-label mb-0">
            Strategy scope
          </label>
          <select
            id="strategy-scope"
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="fc-input fc-input-sm w-full max-w-md md:w-auto"
          >
            <option value="">All strategies (combined)</option>
            {strategies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {totalTrades === 0 ? (
          <div className="fc-card p-8 text-center text-brown">
            No backtest data yet.{' '}
            <Link href="/backtesting/new" className="text-[#ff3e00] font-semibold hover:underline">
              Add a backtest trade
            </Link>{' '}
            to see win rate and analytics.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <MetricCard title="Total Trades" value={totalTrades} />
              <MetricCard
                title="Win Rate"
                value={`${(winRate || 0).toFixed(2)}%`}
                valueClass="fc-text-pos"
              />
              <MetricCard
                title="Average P&L"
                value={`${(analytics.averagePnl || 0) >= 0 ? '+' : ''}$${(analytics.averagePnl || 0).toFixed(2)}`}
                valueClass={(analytics.averagePnl || 0) >= 0 ? 'fc-text-pos' : 'fc-text-neg'}
              />
              <MetricCard
                title="Expectancy"
                value={`${(expectancy || 0) >= 0 ? '+' : ''}$${(expectancy || 0).toFixed(2)}`}
                valueClass={(expectancy || 0) >= 0 ? 'fc-text-pos' : 'fc-text-neg'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              <MetricCard
                title="Largest Win"
                value={`+$${(analytics.largestWinPnl || 0).toFixed(2)}`}
                valueClass="fc-text-pos"
              />
              <MetricCard
                title="Largest Loss"
                value={`$${(analytics.largestLossPnl || 0).toFixed(2)}`}
                valueClass="fc-text-neg"
              />
              <MetricCard
                title="Profit Factor"
                value={profitFactor === Infinity || profitFactor === null ? '∞' : (profitFactor || 0).toFixed(2)}
                valueClass={(profitFactor || 0) >= 1 ? 'fc-text-pos' : 'fc-text-neg'}
              />
            </div>

            <FinancialPerformanceChart
              startingBalance={financialPerformance.startingBalance}
              points={financialPerformance.points}
              scopeLabel={strategyFilter}
            />

            <div className="fc-card p-6 md:p-12 mb-10">
              <div className="mb-6">
                <h2 className="fc-heading text-2xl">Backtest Calendar</h2>
                <p className="text-sm text-brown mt-1">
                  Simulated trades and net P&amp;L per day{strategyFilter ? ` · ${strategyFilter}` : ''}
                </p>
              </div>
              <TradingCalendar dailyContribution={dailyContribution} />
            </div>

            <div className="space-y-10">
              <div className="fc-card p-6 md:p-12">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="fc-heading text-2xl">Backtest Activity</h2>
                    <p className="text-sm text-brown mt-1">Daily win/loss overview</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setGraphMode('activity')}
                      className={`fc-btn fc-btn-sm ${graphMode === 'activity' ? 'fc-btn-primary' : 'fc-btn-secondary'}`}
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => setGraphMode('pnl')}
                      className={`fc-btn fc-btn-sm ${graphMode === 'pnl' ? 'fc-btn-primary' : 'fc-btn-secondary'}`}
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

              {strategyData.length > 0 && (
                <div className="fc-card p-6 md:p-12">
                  <h2 className="fc-heading text-2xl mb-2">Win Rate by Strategy</h2>
                  <p className="text-sm text-brown mb-6">Compare how each strategy performed</p>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={strategyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: palette.tick, fontSize: 12, fontFamily: 'Inter' }}
                        stroke={palette.axis}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis
                        tick={{ fill: palette.tick, fontSize: 12, fontFamily: 'Inter' }}
                        stroke={palette.axis}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: palette.tooltipBg,
                          border: `1px solid ${palette.tooltipBorder}`,
                          borderRadius: '10px',
                          fontFamily: 'Inter',
                          color: palette.tooltipLabel,
                        }}
                        formatter={(value) => `${value}%`}
                      />
                      <Bar dataKey="winRate" fill={palette.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {tagData.length > 0 && (
                <div className="fc-card p-6 md:p-12">
                  <h2 className="fc-heading text-2xl mb-6">Win Rate by Setup Tag</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={tagData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: palette.tick, fontSize: 12, fontFamily: 'Inter' }}
                        stroke={palette.axis}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis
                        tick={{ fill: palette.tick, fontSize: 12, fontFamily: 'Inter' }}
                        stroke={palette.axis}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: palette.tooltipBg,
                          border: `1px solid ${palette.tooltipBorder}`,
                          borderRadius: '10px',
                          fontFamily: 'Inter',
                          color: palette.tooltipLabel,
                        }}
                        formatter={(value) => `${value}%`}
                      />
                      <Bar dataKey="winRate" fill={palette.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
