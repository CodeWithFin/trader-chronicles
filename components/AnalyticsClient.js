'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import Navbar from '@/components/Navbar'

// Dynamically import charts to reduce initial bundle size
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false })
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false })

const ContributionGraph = dynamic(() => import('@/components/ContributionGraph'), { ssr: false })

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fecaca', '#fef3c7', '#dbeafe', '#e0e7ff']

export default function AnalyticsClient({ initialData = null, session = null }) {
  const [analytics, setAnalytics] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [graphMode, setGraphMode] = useState('activity') // 'activity' | 'pnl'
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      const response = await fetch('/api/analytics')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const data = await response.json()
      console.log('Analytics data received:', data)
      console.log('Daily contribution:', data.dailyContribution)
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

  // Refresh analytics in the background without blocking UI
  const refreshAnalytics = () => {
    fetchAnalytics(false)
  }

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
    averageRMultiple,
    averageWinR,
    averageLossR,
    largestWin,
    largestLoss,
    expectancy,
    profitFactor,
    rMultipleDistribution,
    equityCurve,
    winRateByAssetPair,
    winRateByStrategy,
    winRateByTag,
    dailyContribution = []
  } = displayAnalytics

  const equityData = equityCurve.map((point, index) => ({
    date: format(new Date(point.date), 'MMM d'),
    cumulativeR: parseFloat((point.cumulativePnl || point.cumulativeR || 0).toFixed(2)),
    cumulativePnl: parseFloat((point.cumulativePnl || point.cumulativeR || 0).toFixed(2)),
    index
  }))

  const strategyData = Object.entries(winRateByStrategy).map(([strategy, rate]) => ({
    name: strategy,
    winRate: parseFloat((rate || 0).toFixed(2))
  }))

  const assetPairData = Object.entries(winRateByAssetPair || {}).map(([assetPair, rate]) => ({
    name: assetPair,
    winRate: parseFloat((rate || 0).toFixed(2))
  }))

  const tagData = Object.entries(winRateByTag).map(([tag, rate]) => ({
    name: tag,
    winRate: parseFloat((rate || 0).toFixed(2))
  }))

  const MetricCard = ({ title, value, subtitle, color = 'black' }) => (
    <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-2">Analytics Dashboard</h1>
            <div className="w-full h-1 bg-black"></div>
          </div>
          <button
            onClick={refreshAnalytics}
            disabled={isRefreshing}
            className="px-4 py-2 border-2 border-black bg-white text-sm font-bold hover:bg-zinc-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh analytics data"
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
        
        {error && analytics && (
          <div className="mb-6 p-4 border-2 border-black bg-yellow-50 text-yellow-900">
            {error} (showing cached data)
          </div>
        )}

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

        {/* Charts */}
        <div className="space-y-12">
          {/* Contribution Graph */}
          <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
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

          {/* Equity Curve */}
          <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-6 uppercase">Equity Curve</h2>
            <p className="text-sm text-zinc-600 mb-6">Cumulative P&L over time</p>
            {equityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                  />
                  <YAxis
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontFamily: 'JetBrains Mono'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeR"
                    stroke="#ea580c"
                    strokeWidth={3}
                    dot={{ fill: '#ea580c', r: 4 }}
                    name="Cumulative P&L"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-zinc-600 py-12">No data available</p>
            )}
          </div>

          {/* R-Multiple Distribution */}
          <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-6 uppercase">R-Multiple Distribution</h2>
            <p className="text-sm text-zinc-600 mb-6">Frequency of different R-Multiple outcomes</p>
            {rMultipleDistribution && rMultipleDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={rMultipleDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontFamily: 'JetBrains Mono'
                    }}
                  />
                  <Bar dataKey="count" fill="#ea580c" stroke="#000" strokeWidth={2}>
                    {rMultipleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-zinc-600 py-12">No data available</p>
            )}
          </div>

          {/* Win Rate by Strategy */}
          {strategyData.length > 0 && (
            <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold mb-6 uppercase">Win Rate by Strategy</h2>
              <p className="text-sm text-zinc-600 mb-6">Performance comparison across strategies</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={strategyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontFamily: 'JetBrains Mono'
                    }}
                    formatter={(value) => `${value}%`}
                  />
                  <Bar dataKey="winRate" fill="#ea580c" stroke="#000" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Win Rate by Currency Pair */}
          {assetPairData.length > 0 && (
            <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold mb-6 uppercase">Win Rate by Currency Pair</h2>
              <p className="text-sm text-zinc-600 mb-6">Each asset pair is tracked with its own win rate</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={assetPairData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontFamily: 'JetBrains Mono'
                    }}
                    formatter={(value) => `${value}%`}
                  />
                  <Bar dataKey="winRate" fill="#16a34a" stroke="#000" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Win Rate by Tag */}
          {tagData.length > 0 && (
            <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold mb-6 uppercase">Win Rate by Setup Tag</h2>
              <p className="text-sm text-zinc-600 mb-6">Performance by trade setup characteristics</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={tagData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    tick={{ fill: '#000', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    stroke="#000"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontFamily: 'JetBrains Mono'
                    }}
                    formatter={(value) => `${value}%`}
                  />
                  <Bar dataKey="winRate" fill="#ea580c" stroke="#000" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  )
}


