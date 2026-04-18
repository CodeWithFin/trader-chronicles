import { startOfDay } from 'date-fns'
import { roundPnl } from '@/lib/pnl-money'

/** Notional account size before realized PnL (chart baseline). */
export const FINANCIAL_STARTING_BALANCE = 10000

// Shared analytics calculation logic

export const getCorrectedPnl = (trade) => {
  const pnlAbsolute = roundPnl(trade.pnl_absolute ?? 0)
  if (!Number.isFinite(pnlAbsolute)) return 0
  if (trade.result === 'Loss' && pnlAbsolute > 0) {
    return -Math.abs(pnlAbsolute)
  }
  if (trade.result === 'Win' && pnlAbsolute < 0) {
    return Math.abs(pnlAbsolute)
  }
  return pnlAbsolute
}

function buildFinancialPerformance(parsedTrades, startingBalance = FINANCIAL_STARTING_BALANCE) {
  const base =
    typeof startingBalance === 'number' && Number.isFinite(startingBalance)
      ? startingBalance
      : FINANCIAL_STARTING_BALANCE

  const sorted = [...parsedTrades].sort(
    (a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
  )
  if (sorted.length === 0) {
    return { startingBalance: base, points: [] }
  }

  let cum = 0
  const points = []
  const dayStart = startOfDay(new Date(sorted[0].date_time))
  points.push({
    time: dayStart.toISOString(),
    balance: base,
    profit: 0,
  })

  for (const trade of sorted) {
    cum += getCorrectedPnl(trade)
    const dt = trade.date_time
    const time =
      typeof dt === 'string'
        ? dt
        : dt instanceof Date
          ? dt.toISOString()
          : new Date(dt).toISOString()
    points.push({
      time,
      balance: base + cum,
      profit: cum,
    })
  }

  return { startingBalance: base, points }
}

export const calculateAnalytics = (trades, options = {}) => {
  const financialStartingBalance =
    typeof options.financialStartingBalance === 'number' &&
    Number.isFinite(options.financialStartingBalance)
      ? options.financialStartingBalance
      : FINANCIAL_STARTING_BALANCE

  if (!trades || trades.length === 0) {
    return {
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
      winRateByAssetPair: {},
      winRateByStrategy: {},
      winRateByTag: {},
      dailyContribution: [],
      financialPerformance: {
        startingBalance: financialStartingBalance,
        points: [],
      },
    }
  }

  // Parse decimal values
  const parsedTrades = trades.map((trade) => {
    const num = (v) => {
      const x = roundPnl(v ?? 0)
      return Number.isFinite(x) ? x : 0
    }
    return {
      ...trade,
      r_multiple: num(trade.r_multiple),
      pnl_absolute: num(trade.pnl_absolute),
      entry_price: num(trade.entry_price),
      exit_price: num(trade.exit_price),
      stop_loss_price: num(trade.stop_loss_price),
      risk_per_trade: num(trade.risk_per_trade),
    }
  })

  const totalTrades = parsedTrades.length
  const wins = parsedTrades.filter(t => t.result === 'Win')
  const losses = parsedTrades.filter(t => t.result === 'Loss')
  
  const winRate = (wins.length / totalTrades) * 100
  const totalPnl = parsedTrades.reduce((sum, t) => sum + getCorrectedPnl(t), 0)
  const averagePnl = totalPnl / totalTrades
  
  const winPnls = wins.map(t => getCorrectedPnl(t))
  const averageWinPnl = winPnls.length > 0 
    ? winPnls.reduce((a, b) => a + b, 0) / winPnls.length 
    : 0
  
  const lossPnls = losses.map(t => getCorrectedPnl(t))
  const averageLossPnl = lossPnls.length > 0
    ? lossPnls.reduce((a, b) => a + b, 0) / lossPnls.length
    : 0
  
  const largestWinPnl = winPnls.length > 0 ? Math.max(...winPnls, 0) : 0
  const largestLossPnl = lossPnls.length > 0 ? Math.min(...lossPnls, 0) : 0
  
  const rMultiples = parsedTrades.map(t => t.r_multiple || 0)
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
  
  const winPercentage = wins.length / totalTrades
  const lossPercentage = losses.length / totalTrades
  const expectancy = (winPercentage * averageWinPnl) - (lossPercentage * Math.abs(averageLossPnl))
  
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

  let cumulativePnl = 0
  const equityCurve = parsedTrades.map(trade => {
    cumulativePnl += getCorrectedPnl(trade)
    return {
      date: trade.date_time,
      cumulativeR: cumulativePnl,
      cumulativePnl: cumulativePnl,
      pnl: cumulativePnl
    }
  })

  // Grouping stats
  const strategyStats = {}
  const assetPairStats = {}
  const tagStats = {}

  parsedTrades.forEach(trade => {
    // Strategy
    const strategy = trade.strategy_used || 'Unspecified'
    if (!strategyStats[strategy]) strategyStats[strategy] = { total: 0, wins: 0 }
    strategyStats[strategy].total++
    if (trade.result === 'Win') strategyStats[strategy].wins++

    // Asset Pair
    const assetPair = (trade.asset_pair || '').trim() || 'Unspecified'
    if (!assetPairStats[assetPair]) assetPairStats[assetPair] = { total: 0, wins: 0 }
    assetPairStats[assetPair].total++
    if (trade.result === 'Win') assetPairStats[assetPair].wins++

    // Tags
    if (trade.setup_tags && Array.isArray(trade.setup_tags)) {
      trade.setup_tags.forEach(tag => {
        if (!tagStats[tag]) tagStats[tag] = { total: 0, wins: 0 }
        tagStats[tag].total++
        if (trade.result === 'Win') tagStats[tag].wins++
      })
    }
  })

  const winRateByStrategy = {}
  Object.entries(strategyStats).forEach(([strategy, stats]) => {
    winRateByStrategy[strategy] = (stats.wins / stats.total) * 100
  })

  const winRateByAssetPair = {}
  Object.entries(assetPairStats).forEach(([assetPair, stats]) => {
    winRateByAssetPair[assetPair] = (stats.wins / stats.total) * 100
  })

  const winRateByTag = {}
  Object.entries(tagStats).forEach(([tag, stats]) => {
    winRateByTag[tag] = (stats.wins / stats.total) * 100
  })

  // Daily Contribution
  const dailyStats = {}
  parsedTrades.forEach(trade => {
    const tradeDate = new Date(trade.date_time)
    const year = tradeDate.getFullYear()
    const month = String(tradeDate.getMonth() + 1).padStart(2, '0')
    const day = String(tradeDate.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = { wins: 0, losses: 0, total: 0, pnl: 0 }
    }
    
    dailyStats[dateKey].total++
    dailyStats[dateKey].pnl += getCorrectedPnl(trade)
    if (trade.result === 'Win') {
      dailyStats[dateKey].wins++
    } else if (trade.result === 'Loss') {
      dailyStats[dateKey].losses++
    }
  })
  
  const dailyContribution = Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    wins: stats.wins,
    losses: stats.losses,
    total: stats.total,
    pnl: parseFloat(stats.pnl.toFixed(2)),
    outcome: stats.wins > stats.losses ? 'win' : stats.losses > stats.wins ? 'loss' : 'neutral'
  })).sort((a, b) => a.date.localeCompare(b.date))

  const financialPerformance = buildFinancialPerformance(parsedTrades, financialStartingBalance)

  return {
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
    averagePnl,
    averageWinPnl,
    averageLossPnl,
    largestWinPnl,
    largestLossPnl,
    totalPnl,
    dailyContribution,
    financialPerformance,
  }
}
