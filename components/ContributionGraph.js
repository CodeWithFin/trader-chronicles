'use client'

import { useState } from 'react'
import { format } from 'date-fns'

/**
 * ContributionGraph Component - GitHub-style trading activity heatmap
 *
 * @param {Object} props
 * @param {Array} props.data - Array of daily trading data
 *   Format: [{ date: "2023-10-01", trades: 5, pnl: 200, wins: 3, losses: 2 }, ...]
 * @param {string} props.mode - Display mode: 'activity' | 'pnl' (default: 'activity')
 * @param {string} props.title - Title for the graph (default: "Trading Activity")
 * @param {string} props.subtitle - Subtitle for the graph (default: "Daily win/loss overview")
 * @param {boolean} props.showWeekends - Whether to show weekends (default: true)
 * @param {boolean} props.showLegend - Whether to show the legend (default: true)
 * @param {Function} props.onDateClick - Optional callback when a date square is clicked
 */
export default function ContributionGraph({
  data = [],
  mode = 'activity', // 'activity' | 'pnl'
  title = 'Trading Activity',
  subtitle = 'Daily win/loss overview',
  showWeekends = true,
  showLegend = true,
  onDateClick = null
}) {
  const [hoveredDate, setHoveredDate] = useState(null)
  const [hoveredPosition, setHoveredPosition] = useState({ x: 0, y: 0 })

  // Create a map for quick lookup
  const dailyMap = new Map()
  data.forEach(day => {
    dailyMap.set(day.date, day)
  })

  // Show calendar for the full year (January 1st to December 31st of current year)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentYear = today.getFullYear()

  // Start from January 1st of current year
  const januaryFirst = new Date(currentYear, 0, 1) // Month 0 = January
  januaryFirst.setHours(0, 0, 0, 0)

  // End on December 31st of current year
  const decemberLast = new Date(currentYear, 11, 31) // Month 11 = December
  decemberLast.setHours(23, 59, 59, 999)

  // Align to Sunday (0 = Sunday) - go back to the Sunday before or on Jan 1
  const dayOfWeek = januaryFirst.getDay()
  let startDate = new Date(januaryFirst)
  startDate.setDate(startDate.getDate() - dayOfWeek)
  startDate.setHours(0, 0, 0, 0)

  // Calculate how many weeks to show (from startDate to end of year)
  // We need to include all weeks that contain any day from Jan 1 to Dec 31
  // Find the Sunday that ends the week containing December 31st
  const dec31DayOfWeek = decemberLast.getDay()
  const endSunday = new Date(decemberLast)
  // If Dec 31 is not Saturday (6), we need to go to the next Sunday to complete the week
  if (dec31DayOfWeek !== 6) {
    endSunday.setDate(endSunday.getDate() + (7 - dec31DayOfWeek))
  }
  endSunday.setHours(0, 0, 0, 0)

  // Calculate weeks: from startDate (Sunday before/on Jan 1) to endSunday (Sunday after/on Dec 31)
  const weeksToShow = Math.ceil((endSunday - startDate) / (7 * 24 * 60 * 60 * 1000))

  // Generate grid: 7 rows (days) × weeks columns
  // Rows: Sunday (0) to Saturday (6)
  // Columns: weeks from startDate to today
  const grid = []
  const monthLabels = []
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  // Track months for labels
  const monthMap = new Map()
  const monthAbbrMap = new Map()

  // Initialize grid: 7 rows (one for each day of the week)
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    grid.push([])
  }

  // Generate weeks (columns) - fill each row with the corresponding day from each week
  for (let week = 0; week < weeksToShow; week++) {
    const weekStart = new Date(startDate)
    weekStart.setDate(weekStart.getDate() + (week * 7))

    // For each day of the week (row), get the corresponding day from this week
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const currentDate = new Date(weekStart)
      currentDate.setDate(currentDate.getDate() + dayOfWeek)

      // Skip weekends if showWeekends is false
      if (!showWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        grid[dayOfWeek].push(null)
        continue
      }

      // Include all dates in the current year (Jan 1 - Dec 31)
      // Only show data for dates up to today, future dates will be empty
      const currentDateOnly = new Date(currentDate)
      currentDateOnly.setHours(0, 0, 0, 0)
      const isInCurrentYear = currentDate.getFullYear() === currentYear
      const isBeforeOrOnDec31 = currentDateOnly <= decemberLast

      if (isInCurrentYear && isBeforeOrOnDec31) {
        // Use local date components to avoid timezone issues
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const day = String(currentDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`

        // Only get data for dates up to today (future dates will be null/empty)
        const dayData = currentDateOnly <= today ? dailyMap.get(dateStr) : null

        // Check if this is the 1st of a month
        const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
        const monthAbbr = format(currentDate, 'MMM')
        const isJanuaryOrLater = (currentDate.getFullYear() === currentYear && currentDate.getMonth() >= 0) ||
                                 currentDate.getFullYear() > currentYear

        if (currentDate.getDate() === 1 && !monthMap.has(monthKey) && isJanuaryOrLater) {
          monthAbbrMap.set(monthAbbr, week)
          monthMap.set(monthKey, true)
        }

        grid[dayOfWeek].push({
          date: dateStr,
          dateObj: new Date(currentDate),
          ...(dayData || {})
        })
      } else {
        grid[dayOfWeek].push(null)
      }
    }
  }

  // Convert monthAbbrMap to monthLabels array
  monthLabels.push(...Array.from(monthAbbrMap.entries()).map(([month, week]) => ({
    week,
    month
  })).sort((a, b) => a.week - b.week))

  // Get color based on mode
  const getSquareColor = (day) => {
    if (!day || !day.trades || day.trades === 0) {
      return '#f2f0ed' // No activity - stone
    }

    if (mode === 'pnl') {
      // P&L Mode: green tint for profit, red tint for loss
      const pnl = day.pnl || 0
      if (pnl > 0) {
        if (pnl >= 1000) return '#0a7a3d'
        if (pnl >= 500) return '#00ca48'
        if (pnl >= 200) return '#4fdb7d'
        if (pnl >= 50) return '#a3ecbd'
        return '#d6f7e3'
      } else if (pnl < 0) {
        const absPnl = Math.abs(pnl)
        if (absPnl >= 1000) return '#8f1220'
        if (absPnl >= 500) return '#ff2b3a'
        if (absPnl >= 200) return '#ff7580'
        if (absPnl >= 50) return '#ffb3ba'
        return '#ffe1e3'
      }
      return '#ffbb26' // Break even - honey
    } else {
      // Activity Mode: shades based on trade volume
      const trades = day.trades || 0
      if (trades >= 10) return '#0a7a3d'
      if (trades >= 5) return '#00ca48'
      if (trades >= 3) return '#4fdb7d'
      if (trades >= 2) return '#a3ecbd'
      return '#d6f7e3'
    }
  }

  const handleSquareHover = (day, event) => {
    if (day) {
      setHoveredDate(day)
      setHoveredPosition({
        x: event.clientX,
        y: event.clientY
      })
    }
  }

  const handleSquareLeave = () => {
    setHoveredDate(null)
  }

  const handleSquareClick = (day) => {
    if (day && onDateClick) {
      onDateClick(day)
    }
  }

  const handleKeyDown = (day, event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSquareClick(day)
    }
  }

  if (data.length === 0) {
    return (
      <div className="fc-card p-6 md:p-12">
        <h2 className="fc-heading text-2xl mb-6">{title}</h2>
        <p className="text-center text-brown py-12">No trading data available</p>
      </div>
    )
  }

  // Filter day labels if weekends are hidden
  const visibleDayLabels = showWeekends ? dayLabels : ['M', 'T', 'W', 'T', 'F']
  const visibleGridRows = showWeekends ? grid : [grid[1], grid[2], grid[3], grid[4], grid[5]]

  return (
    <div className="fc-card p-6 md:p-12">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="fc-heading text-2xl">{title}</h2>
          <p className="text-sm text-brown mt-1">{subtitle}</p>
        </div>
        {/* Mode Toggle - Note: Mode is controlled by parent component via props */}
      </div>

      <div className="overflow-x-auto w-full" style={{ scrollbarWidth: 'thin' }}>
        <div className="inline-block relative" style={{ minWidth: `${weeksToShow * 14 + 27}px`, width: `${weeksToShow * 14 + 27}px` }}>
          {/* Month labels row */}
          <div className="relative mb-2" style={{ height: '15px', paddingLeft: '27px', width: `${weeksToShow * 14}px` }}>
            {monthLabels.map((label, idx) => {
              const leftPosition = label.week * 14
              return (
                <div
                  key={idx}
                  className="text-xs text-muted absolute whitespace-nowrap"
                  style={{
                    left: `${leftPosition}px`
                  }}
                  aria-label={`Month: ${label.month}`}
                >
                  {label.month}
                </div>
              )
            })}
          </div>

          {/* Main grid */}
          <div className="flex flex-col gap-[3px]" style={{ width: `${weeksToShow * 14 + 27}px` }}>
            {visibleGridRows.map((weekRow, dayOfWeekIndex) => {
              const actualDayIndex = showWeekends ? dayOfWeekIndex : dayOfWeekIndex + 1
              return (
                <div key={dayOfWeekIndex} className="flex gap-[3px] items-center" style={{ width: '100%' }}>
                  {/* Day label */}
                  <div
                    className="text-xs text-muted text-right pr-2 flex-shrink-0"
                    style={{ width: '25px', height: '11px', lineHeight: '11px' }}
                    aria-label={`Day: ${visibleDayLabels[dayOfWeekIndex]}`}
                  >
                    {visibleDayLabels[dayOfWeekIndex]}
                  </div>

                  {/* Week columns for this day of the week */}
                  <div className="flex gap-[3px] flex-shrink-0">
                    {weekRow.map((day, weekIndex) => {
                      if (day === null) {
                        return (
                          <div
                            key={weekIndex}
                            style={{
                              width: '11px',
                              height: '11px',
                              backgroundColor: 'transparent'
                            }}
                            aria-hidden="true"
                          />
                        )
                      }

                      const color = getSquareColor(day)
                      const trades = day.trades || 0
                      const pnl = day.pnl || 0
                      const wins = day.wins || 0
                      const losses = day.losses || 0
                      const dateStr = format(day.dateObj, 'MMM d, yyyy')

                      const tooltipText = mode === 'pnl'
                        ? `${dateStr}: ${trades} trade${trades !== 1 ? 's' : ''}, P&L: $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`
                        : `${dateStr}: ${trades} trade${trades !== 1 ? 's' : ''}, P&L: $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}${wins > 0 || losses > 0 ? ` (${wins}W/${losses}L)` : ''}`

                      return (
                        <div
                          key={weekIndex}
                          className="cursor-pointer hover:ring-2 hover:ring-[var(--stone-border)] hover:ring-offset-1 rounded-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--stone-border)] focus:ring-offset-1"
                          style={{
                            width: '11px',
                            height: '11px',
                            backgroundColor: color,
                            borderRadius: '2px'
                          }}
                          title={tooltipText}
                          aria-label={`${dateStr}: ${trades} trade${trades !== 1 ? 's' : ''}, P&L: $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`}
                          role="button"
                          tabIndex={0}
                          onMouseEnter={(e) => handleSquareHover(day, e)}
                          onMouseLeave={handleSquareLeave}
                          onClick={() => handleSquareClick(day)}
                          onKeyDown={(e) => handleKeyDown(day, e)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDate && (
        <div
          className="fixed z-50 bg-ink text-white text-xs px-3 py-2 rounded-[10px] pointer-events-none"
          style={{
            left: `${hoveredPosition.x + 10}px`,
            top: `${hoveredPosition.y - 40}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">{format(hoveredDate.dateObj, 'MMM d, yyyy')}</div>
          <div>{hoveredDate.trades || 0} trade{(hoveredDate.trades || 0) !== 1 ? 's' : ''}</div>
          <div>P&L: ${(hoveredDate.pnl || 0) >= 0 ? '+' : ''}{(hoveredDate.pnl || 0).toFixed(2)}</div>
          {(hoveredDate.wins > 0 || hoveredDate.losses > 0) && (
            <div>{hoveredDate.wins || 0}W / {hoveredDate.losses || 0}L</div>
          )}
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-4 mt-6 text-xs flex-wrap">
          <span className="text-muted">Less</span>
          <div className="flex gap-[3px]">
            <div style={{ width: '11px', height: '11px', backgroundColor: '#f2f0ed', borderRadius: '2px' }} aria-label="No activity" />
            {mode === 'activity' ? (
              <>
                <div style={{ width: '11px', height: '11px', backgroundColor: '#d6f7e3', borderRadius: '2px' }} aria-label="1 trade" />
                <div style={{ width: '11px', height: '11px', backgroundColor: '#a3ecbd', borderRadius: '2px' }} aria-label="2 trades" />
                <div style={{ width: '11px', height: '11px', backgroundColor: '#4fdb7d', borderRadius: '2px' }} aria-label="3 trades" />
                <div style={{ width: '11px', height: '11px', backgroundColor: '#00ca48', borderRadius: '2px' }} aria-label="5 trades" />
                <div style={{ width: '11px', height: '11px', backgroundColor: '#0a7a3d', borderRadius: '2px' }} aria-label="10+ trades" />
              </>
            ) : (
              <>
                <div style={{ width: '11px', height: '11px', backgroundColor: '#d6f7e3', borderRadius: '2px' }} aria-label="Small profit" />
                <div style={{ width: '11px', height: '11px', backgroundColor: '#a3ecbd', borderRadius: '2px' }} aria-label="Medium profit" />
                <div style={{ width: '11px', height: '11px', backgroundColor: '#4fdb7d', borderRadius: '2px' }} aria-label="Good profit" />
                <div style={{ width: '11px', height: '11px', backgroundColor: '#00ca48', borderRadius: '2px' }} aria-label="High profit" />
                <div style={{ width: '11px', height: '11px', backgroundColor: '#0a7a3d', borderRadius: '2px' }} aria-label="Very high profit" />
              </>
            )}
          </div>
          <span className="text-muted">More</span>
          <div className="ml-6 flex items-center gap-4 flex-wrap">
            {mode === 'activity' ? (
              <>
                <div className="flex items-center gap-2">
                  <div style={{ width: '11px', height: '11px', backgroundColor: '#4fdb7d', borderRadius: '2px' }} />
                  <span className="text-muted">More trades</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: '11px', height: '11px', backgroundColor: '#f2f0ed', borderRadius: '2px' }} />
                  <span className="text-muted">No trades</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div style={{ width: '11px', height: '11px', backgroundColor: '#4fdb7d', borderRadius: '2px' }} />
                  <span className="text-muted">Profit</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: '11px', height: '11px', backgroundColor: '#ff7580', borderRadius: '2px' }} />
                  <span className="text-muted">Loss</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: '11px', height: '11px', backgroundColor: '#f2f0ed', borderRadius: '2px' }} />
                  <span className="text-muted">No trades</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
