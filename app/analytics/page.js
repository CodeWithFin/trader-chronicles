'use client'

export const dynamic = 'force-dynamic'

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
    winRateByTag,
    dailyContribution = []
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

  // Contribution Graph Component (GitHub-style)
  const ContributionGraph = () => {
    if (!dailyContribution || dailyContribution.length === 0) {
      return (
        <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold mb-6 uppercase">Trading Activity</h2>
          <p className="text-center text-zinc-600 py-12">No trading data available</p>
        </div>
      )
    }

    // Create a map for quick lookup
    const dailyMap = new Map()
    dailyContribution.forEach(day => {
      dailyMap.set(day.date, day)
    })

    // GitHub shows last 53 weeks (approximately 1 year)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Calculate start date: 53 weeks ago, but align to Sunday
    const weeksToShow = 53
    const daysToShow = weeksToShow * 7
    let startDate = new Date(today)
    startDate.setDate(startDate.getDate() - daysToShow)
    
    // Align to Sunday (0 = Sunday)
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)
    startDate.setHours(0, 0, 0, 0)

    // Generate grid: 7 rows (days) × 53 columns (weeks)
    // Rows: Sunday (0) to Saturday (6)
    // Columns: weeks from startDate to today
    const grid = []
    const monthLabels = []
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    
    // Track months for labels - show the LAST occurrence of each month (not the first)
    // This prevents showing duplicate month labels like "Dec" appearing twice
    const monthMap = new Map()
    const monthAbbrMap = new Map() // Track by abbreviation, keep updating to get last occurrence
    
    // Generate weeks (columns)
    for (let week = 0; week < weeksToShow; week++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(weekStart.getDate() + (week * 7))
      
      // Generate days for this week (7 rows)
      const weekDays = []
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(weekStart)
        currentDate.setDate(currentDate.getDate() + day)
        
        // Only include dates up to today
        if (currentDate <= today) {
          // Use local date components to avoid timezone issues (match API format)
          const year = currentDate.getFullYear()
          const month = String(currentDate.getMonth() + 1).padStart(2, '0')
          const day = String(currentDate.getDate()).padStart(2, '0')
          const dateStr = `${year}-${month}-${day}`
          const dayData = dailyMap.get(dateStr)
          
          // Check if this is the 1st of a month
          const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
          const monthAbbr = format(currentDate, 'MMM')
          
          if (currentDate.getDate() === 1 && !monthMap.has(monthKey)) {
            // Update to always use the last occurrence of each month abbreviation
            monthAbbrMap.set(monthAbbr, week)
            monthMap.set(monthKey, true)
          }
          
          weekDays.push({
            date: dateStr,
            dateObj: new Date(currentDate),
            ...dayData
          })
        } else {
          weekDays.push(null)
        }
      }
      
      grid.push(weekDays)
    }
    
    // Convert monthAbbrMap to monthLabels array (showing only the last occurrence of each month)
    monthLabels.push(...Array.from(monthAbbrMap.entries()).map(([month, week]) => ({
      week,
      month
    })).sort((a, b) => a.week - b.week))

    // Get color based on activity level (GitHub-style)
    const getSquareColor = (day) => {
      if (!day || !day.total || day.total === 0) {
        return '#ebedf0' // No activity - very light gray
      }
      
      // For win days (more wins than losses)
      if (day.outcome === 'win') {
        if (day.total >= 5) return '#216e39' // Very high - darkest green
        if (day.total >= 3) return '#30a14e' // High - dark green
        if (day.total >= 2) return '#40c463' // Medium - medium green
        return '#9be9a8' // Low - light green
      }
      
      // For loss days (more losses than wins)
      if (day.outcome === 'loss') {
        if (day.total >= 5) return '#8b1a1a' // Very high - darkest red
        if (day.total >= 3) return '#c53030' // High - dark red
        if (day.total >= 2) return '#e53e3e' // Medium - medium red
        return '#fc8181' // Low - light red
      }
      
      // Neutral (equal wins/losses)
      return '#d1d5db' // Light gray
    }

    return (
      <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-2xl font-bold mb-2 uppercase">Trading Activity</h2>
        <p className="text-sm text-zinc-600 mb-6">Daily win/loss overview</p>
        
        <div className="overflow-x-auto">
          <div className="inline-block relative">
            {/* Month labels row */}
            <div className="relative mb-2" style={{ height: '15px', paddingLeft: '27px' }}>
              {monthLabels.map((label, idx) => {
                // Calculate position: each week is 14px wide (11px square + 3px gap)
                const leftPosition = label.week * 14
                return (
                  <div
                    key={idx}
                    className="text-xs text-zinc-600 absolute whitespace-nowrap"
                    style={{
                      left: `${leftPosition}px`
                    }}
                  >
                    {label.month}
                  </div>
                )
              })}
            </div>
            
            {/* Main grid */}
            <div className="flex gap-[3px]">
              {/* Day labels column */}
              <div className="flex flex-col gap-[3px] mr-2">
                {dayLabels.map((label, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-zinc-600 text-right pr-2"
                    style={{ width: '25px', height: '11px', lineHeight: '11px' }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              
              {/* Weeks (columns) */}
              {grid.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => {
                    const color = getSquareColor(day)
                    const tooltip = day
                      ? `${format(day.dateObj, 'MMM d, yyyy')}: ${day.wins || 0} wins, ${day.losses || 0} losses`
                      : ''
                    
                    return (
                      <div
                        key={dayIndex}
                        className="cursor-pointer hover:ring-2 hover:ring-zinc-400 hover:ring-offset-1 rounded-sm transition-all"
                        style={{
                          width: '11px',
                          height: '11px',
                          backgroundColor: color,
                          borderRadius: '2px'
                        }}
                        title={tooltip}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6 text-xs">
          <span className="text-zinc-600">Less</span>
          <div className="flex gap-[3px]">
            <div style={{ width: '11px', height: '11px', backgroundColor: '#ebedf0', borderRadius: '2px' }} />
            <div style={{ width: '11px', height: '11px', backgroundColor: '#9be9a8', borderRadius: '2px' }} />
            <div style={{ width: '11px', height: '11px', backgroundColor: '#40c463', borderRadius: '2px' }} />
            <div style={{ width: '11px', height: '11px', backgroundColor: '#30a14e', borderRadius: '2px' }} />
            <div style={{ width: '11px', height: '11px', backgroundColor: '#216e39', borderRadius: '2px' }} />
          </div>
          <span className="text-zinc-600">More</span>
          <div className="ml-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div style={{ width: '11px', height: '11px', backgroundColor: '#40c463', borderRadius: '2px' }} />
              <span className="text-zinc-600">More wins</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: '11px', height: '11px', backgroundColor: '#e53e3e', borderRadius: '2px' }} />
              <span className="text-zinc-600">More losses</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: '11px', height: '11px', backgroundColor: '#ebedf0', borderRadius: '2px' }} />
              <span className="text-zinc-600">No trades</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
          {/* Contribution Graph */}
          <ContributionGraph />

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

