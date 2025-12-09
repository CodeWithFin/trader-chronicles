const express = require('express');
const router = express.Router();
const { BacktestEntry } = require('../models');
const auth = require('../middleware/auth');

// Helper to parse decimal values from PostgreSQL
const parseDecimal = (value) => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) : value;
};

// @route   GET /api/analytics
// @desc    Get analytics data for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const trades = await BacktestEntry.findAll({
      where: { userId: req.userId },
      order: [['dateTime', 'ASC']]
    });

    if (trades.length === 0) {
      return res.json({
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
      });
    }

    // Parse decimal values
    const parsedTrades = trades.map(trade => ({
      ...trade.toJSON(),
      rMultiple: parseDecimal(trade.rMultiple),
      pnlAbsolute: parseDecimal(trade.pnlAbsolute),
      entryPrice: parseDecimal(trade.entryPrice),
      exitPrice: parseDecimal(trade.exitPrice),
      stopLossPrice: parseDecimal(trade.stopLossPrice),
      riskPerTrade: parseDecimal(trade.riskPerTrade)
    }));

    // Calculate basic metrics
    const totalTrades = parsedTrades.length;
    const wins = parsedTrades.filter(t => t.result === 'Win');
    const losses = parsedTrades.filter(t => t.result === 'Loss');
    const breakEvens = parsedTrades.filter(t => t.result === 'Break Even');
    
    const winRate = (wins.length / totalTrades) * 100;
    
    const rMultiples = parsedTrades.map(t => t.rMultiple);
    const averageRMultiple = rMultiples.reduce((a, b) => a + b, 0) / totalTrades;
    
    const winRMultiples = wins.map(t => t.rMultiple);
    const averageWinR = winRMultiples.length > 0 
      ? winRMultiples.reduce((a, b) => a + b, 0) / winRMultiples.length 
      : 0;
    
    const lossRMultiples = losses.map(t => t.rMultiple);
    const averageLossR = lossRMultiples.length > 0
      ? lossRMultiples.reduce((a, b) => a + b, 0) / lossRMultiples.length
      : 0;
    
    const largestWin = winRMultiples.length > 0 ? Math.max(...winRMultiples, 0) : 0;
    const largestLoss = lossRMultiples.length > 0 ? Math.min(...lossRMultiples, 0) : 0;
    
    // Expectancy = (%Win × Avg Win R) - (%Loss × Avg Loss R)
    const winPercentage = wins.length / totalTrades;
    const lossPercentage = losses.length / totalTrades;
    const expectancy = (winPercentage * averageWinR) - (lossPercentage * Math.abs(averageLossR));
    
    // Profit Factor = Total Wins / Total Losses (absolute)
    const totalWins = wins.reduce((sum, t) => sum + Math.abs(t.pnlAbsolute), 0);
    const totalLosses = losses.reduce((sum, t) => sum + Math.abs(t.pnlAbsolute), 0);
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? Infinity : 0);

    // R-Multiple Distribution
    const rMultipleRanges = {};
    parsedTrades.forEach(trade => {
      const r = trade.rMultiple;
      let range;
      if (r < -2) range = '< -2R';
      else if (r < -1) range = '-2R to -1R';
      else if (r < 0) range = '-1R to 0R';
      else if (r === 0) range = '0R (BE)';
      else if (r <= 1) range = '0R to 1R';
      else if (r <= 2) range = '1R to 2R';
      else if (r <= 3) range = '2R to 3R';
      else range = '> 3R';
      
      rMultipleRanges[range] = (rMultipleRanges[range] || 0) + 1;
    });

    const rMultipleDistribution = Object.entries(rMultipleRanges).map(([range, count]) => ({
      range,
      count
    }));

    // Equity Curve (cumulative R-Multiple)
    let cumulativeR = 0;
    const equityCurve = parsedTrades.map(trade => {
      cumulativeR += trade.rMultiple;
      return {
        date: trade.dateTime,
        cumulativeR,
        pnl: cumulativeR // Can also use actual P&L if preferred
      };
    });

    // Win Rate by Strategy
    const strategyStats = {};
    parsedTrades.forEach(trade => {
      const strategy = trade.strategyUsed;
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { total: 0, wins: 0 };
      }
      strategyStats[strategy].total++;
      if (trade.result === 'Win') {
        strategyStats[strategy].wins++;
      }
    });

    const winRateByStrategy = {};
    Object.entries(strategyStats).forEach(([strategy, stats]) => {
      winRateByStrategy[strategy] = (stats.wins / stats.total) * 100;
    });

    // Win Rate by Tag
    const tagStats = {};
    parsedTrades.forEach(trade => {
      if (trade.setupTags && Array.isArray(trade.setupTags)) {
        trade.setupTags.forEach(tag => {
          if (!tagStats[tag]) {
            tagStats[tag] = { total: 0, wins: 0 };
          }
          tagStats[tag].total++;
          if (trade.result === 'Win') {
            tagStats[tag].wins++;
          }
        });
      }
    });

    const winRateByTag = {};
    Object.entries(tagStats).forEach(([tag, stats]) => {
      winRateByTag[tag] = (stats.wins / stats.total) * 100;
    });

    res.json({
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
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
