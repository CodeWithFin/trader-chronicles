import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Use getUser instead of getSession for API routes
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: trades, error } = await supabase
      .from('backtest_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date_time', { ascending: true })

    if (error) throw error

    if (!trades || trades.length === 0) {
      return NextResponse.json({
        totalTrades: 0,
        winRate: 0,
        averageRMultiple: 0,
        averageWinR: 0,
        averageLossR: 0,
        largestWin: 0,
        largestLoss: 0,
        expectancy: 0,
        profitFactor: 0,
        rMultipleDistribution: [],
        equityCurve: [],
        winRateByStrategy: {},
        winRateByTag: {}
      })
    }

    // Parse decimal values
    const parsedTrades = trades.map(trade => ({
      ...trade,
      r_multiple: parseFloat(trade.r_multiple || 0),
      pnl_absolute: parseFloat(trade.pnl_absolute || 0),
      entry_price: parseFloat(trade.entry_price || 0),
      exit_price: parseFloat(trade.exit_price || 0),
      stop_loss_price: parseFloat(trade.stop_loss_price || 0),
      risk_per_trade: parseFloat(trade.risk_per_trade || 0)
    }))

    // Helper function to correct P&L based on result
    const getCorrectedPnl = (trade) => {
      if (trade.result === 'Loss' && trade.pnl_absolute > 0) {
        return -Math.abs(trade.pnl_absolute)
      } else if (trade.result === 'Win' && trade.pnl_absolute < 0) {
        return Math.abs(trade.pnl_absolute)
      }
      return trade.pnl_absolute
    }

    // Calculate metrics
    const totalTrades = parsedTrades.length
    const wins = parsedTrades.filter(t => t.result === 'Win')
    const losses = parsedTrades.filter(t => t.result === 'Loss')
    
    const winRate = (wins.length / totalTrades) * 100
    
    // For simplified form: Use P&L-based metrics instead of R-Multiple
    // Calculate average P&L using corrected values
    const totalPnl = parsedTrades.reduce((sum, t) => sum + getCorrectedPnl(t), 0)
    const averagePnl = totalPnl / totalTrades
    
    // Average win and loss amounts using corrected P&L
    const winPnls = wins.map(t => getCorrectedPnl(t))
    const averageWinPnl = winPnls.length > 0 
      ? winPnls.reduce((a, b) => a + b, 0) / winPnls.length 
      : 0
    
    const lossPnls = losses.map(t => getCorrectedPnl(t))
    const averageLossPnl = lossPnls.length > 0
      ? lossPnls.reduce((a, b) => a + b, 0) / lossPnls.length
      : 0
    
    // Largest win and loss (P&L based) - using corrected values
    const largestWinPnl = winPnls.length > 0 ? Math.max(...winPnls, 0) : 0
    const largestLossPnl = lossPnls.length > 0 ? Math.min(...lossPnls, 0) : 0
    
    // For R-Multiple: Use stored value if available, otherwise calculate from P&L if we have risk data
    // Since simplified form doesn't collect risk, we'll use P&L as a proxy
    const rMultiples = parsedTrades.map(t => {
      // If r_multiple is set and non-zero, use it
      if (t.r_multiple && t.r_multiple !== 0) {
        return t.r_multiple
      }
      // Otherwise, we can't calculate true R-Multiple without risk amount
      return 0
    })
    const averageRMultiple = rMultiples.reduce((a, b) => a + b, 0) / totalTrades
    
    const winRMultiples = wins.map(t => t.r_multiple || 0)
    const averageWinR = winRMultiples.length > 0 
      ? winRMultiples.reduce((a, b) => a + b, 0) / winRMultiples.length 
      : 0
    
    const lossRMultiples = losses.map(t => t.r_multiple || 0)
    const averageLossR = lossRMultiples.length > 0
      ? lossRMultiples.reduce((a, b) => a + b, 0) / lossRMultiples.length
      : 0
    
    const largestWin = winRMultiples.length > 0 ? Math.max(...winRMultiples, 0) : 0
    const largestLoss = lossRMultiples.length > 0 ? Math.min(...lossRMultiples, 0) : 0
    
    // Expectancy: Use P&L-based calculation since we don't have reliable R-Multiple
    const winPercentage = wins.length / totalTrades
    const lossPercentage = losses.length / totalTrades
    const expectancy = (winPercentage * averageWinPnl) - (lossPercentage * Math.abs(averageLossPnl))
    
    // Profit factor using corrected P&L values
    const totalWins = wins.reduce((sum, t) => sum + Math.abs(getCorrectedPnl(t)), 0)
    const totalLosses = losses.reduce((sum, t) => sum + Math.abs(getCorrectedPnl(t)), 0)
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? Infinity : 0)

    // R-Multiple Distribution
    const rMultipleRanges = {}
    parsedTrades.forEach(trade => {
      const r = trade.r_multiple
      let range
      if (r < -2) range = '< -2R'
      else if (r < -1) range = '-2R to -1R'
      else if (r < 0) range = '-1R to 0R'
      else if (r === 0) range = '0R (BE)'
      else if (r <= 1) range = '0R to 1R'
      else if (r <= 2) range = '1R to 2R'
      else if (r <= 3) range = '2R to 3R'
      else range = '> 3R'
      
      rMultipleRanges[range] = (rMultipleRanges[range] || 0) + 1
    })

    const rMultipleDistribution = Object.entries(rMultipleRanges).map(([range, count]) => ({
      range,
      count
    }))

    // Equity Curve - Use cumulative P&L since we don't have reliable R-Multiple data
    // Use corrected P&L values
    let cumulativePnl = 0
    const equityCurve = parsedTrades.map(trade => {
      cumulativePnl += getCorrectedPnl(trade)
      return {
        date: trade.date_time,
        cumulativeR: cumulativePnl, // Keep name for compatibility, but use P&L
        cumulativePnl: cumulativePnl,
        pnl: cumulativePnl
      }
    })

    // Win Rate by Strategy
    const strategyStats = {}
    parsedTrades.forEach(trade => {
      const strategy = trade.strategy_used
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { total: 0, wins: 0 }
      }
      strategyStats[strategy].total++
      if (trade.result === 'Win') {
        strategyStats[strategy].wins++
      }
    })

    const winRateByStrategy = {}
    Object.entries(strategyStats).forEach(([strategy, stats]) => {
      winRateByStrategy[strategy] = (stats.wins / stats.total) * 100
    })

    // Win Rate by Tag
    const tagStats = {}
    parsedTrades.forEach(trade => {
      if (trade.setup_tags && Array.isArray(trade.setup_tags)) {
        trade.setup_tags.forEach(tag => {
          if (!tagStats[tag]) {
            tagStats[tag] = { total: 0, wins: 0 }
          }
          tagStats[tag].total++
          if (trade.result === 'Win') {
            tagStats[tag].wins++
          }
        })
      }
    })

    const winRateByTag = {}
    Object.entries(tagStats).forEach(([tag, stats]) => {
      winRateByTag[tag] = (stats.wins / stats.total) * 100
    })

    // Daily contribution data (for GitHub-style graph)
    // Note: This uses the result field directly, which should be correct
    // The P&L correction is already handled in getCorrectedPnl for calculations
    const dailyStats = {}
    parsedTrades.forEach(trade => {
      // Get date in YYYY-MM-DD format using local timezone (not UTC)
      // This prevents date shifting due to timezone conversion
      const tradeDate = new Date(trade.date_time)
      // Use local date components to avoid timezone issues
      const year = tradeDate.getFullYear()
      const month = String(tradeDate.getMonth() + 1).padStart(2, '0')
      const day = String(tradeDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { wins: 0, losses: 0, total: 0 }
      }
      
      dailyStats[dateKey].total++
      // Use corrected result: if P&L is positive but result is Loss, it's actually a loss
      // But for the graph, we use the result field which should be correct
      if (trade.result === 'Win') {
        dailyStats[dateKey].wins++
      } else {
        dailyStats[dateKey].losses++
      }
    })

    // Convert to array format for the graph
    const dailyContribution = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      wins: stats.wins,
      losses: stats.losses,
      total: stats.total,
      outcome: stats.wins > stats.losses ? 'win' : stats.losses > stats.wins ? 'loss' : 'neutral'
    })).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
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
      // Add P&L-based metrics for simplified form
      averagePnl,
      averageWinPnl,
      averageLossPnl,
      largestWinPnl,
      largestLossPnl,
      totalPnl,
      // Daily contribution data for GitHub-style graph
      dailyContribution
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

