'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { format } from 'date-fns'
import Navbar from '@/components/Navbar'

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fecaca', '#fef3c7', '#dbeafe', '#e0e7ff']

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analytics')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const data = await response.json()
      setAnalytics(data)
      setError('')
    } catch (err) {
      setError('Failed to fetch analytics')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center text-xl font-bold">Loading analytics...</div>
        </div>
      </>
    )
  }

  if (error || !analytics) {
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
    winRateByStrategy,
    winRateByTag
  } = analytics

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

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-2">Analytics Dashboard</h1>
          <div className="w-full h-1 bg-black"></div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <MetricCard
            title="Total Trades"
            value={totalTrades}
            subtitle="All backtest entries"
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

