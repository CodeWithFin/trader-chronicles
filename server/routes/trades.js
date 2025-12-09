const express = require('express');
const router = express.Router();
const { BacktestEntry } = require('../models');
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   POST /api/trades
// @desc    Create a new backtest entry
// @access  Private
router.post('/', auth, [
  body('dateTime').isISO8601().withMessage('Valid date/time is required'),
  body('assetPair').trim().notEmpty().withMessage('Asset/Pair is required'),
  body('direction').isIn(['Long', 'Short']).withMessage('Direction must be Long or Short'),
  body('entryPrice').isFloat({ min: 0 }).withMessage('Entry price must be a positive number'),
  body('exitPrice').isFloat({ min: 0 }).withMessage('Exit price must be a positive number'),
  body('stopLossPrice').isFloat({ min: 0 }).withMessage('Stop loss price must be a positive number'),
  body('riskPerTrade').isFloat({ min: 0, max: 100 }).withMessage('Risk per trade must be between 0 and 100'),
  body('result').isIn(['Win', 'Loss', 'Break Even']).withMessage('Result must be Win, Loss, or Break Even'),
  body('pnlAbsolute').isNumeric().withMessage('P&L must be a number'),
  body('rMultiple').isNumeric().withMessage('R-Multiple must be a number'),
  body('strategyUsed').trim().notEmpty().withMessage('Strategy used is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const backtestEntry = await BacktestEntry.create({
      ...req.body,
      userId: req.userId
    });

    res.status(201).json(backtestEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/trades
// @desc    Get all backtest entries for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      assetPair,
      strategyUsed,
      result,
      setupTag,
      sortBy = 'dateTime',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Build where clause
    const where = { userId: req.userId };
    if (assetPair) {
      where.assetPair = { [Op.iLike]: `%${assetPair}%` };
    }
    if (strategyUsed) {
      where.strategyUsed = { [Op.iLike]: `%${strategyUsed}%` };
    }
    if (result) {
      where.result = result;
    }
    if (setupTag) {
      where.setupTags = { [Op.contains]: [setupTag] };
    }

    // Build order
    const order = [[sortBy, sortOrder.toUpperCase()]];

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const { count, rows: trades } = await BacktestEntry.findAndCountAll({
      where,
      order,
      offset,
      limit: limitNum
    });

    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: count,
        pages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/trades/:id
// @desc    Get a single backtest entry
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const trade = await BacktestEntry.findOne({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/trades/:id
// @desc    Update a backtest entry
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const [updated] = await BacktestEntry.update(req.body, {
      where: {
        id: req.params.id,
        userId: req.userId
      },
      returning: true
    });

    if (updated === 0) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    const trade = await BacktestEntry.findOne({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    res.json(trade);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/trades/:id
// @desc    Delete a backtest entry
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await BacktestEntry.destroy({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json({ message: 'Trade deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
