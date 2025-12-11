const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BacktestEntry = sequelize.define('BacktestEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Trade Details
  dateTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  assetPair: {
    type: DataTypes.STRING,
    allowNull: false
  },
  direction: {
    type: DataTypes.ENUM('Long', 'Short'),
    allowNull: false
  },
  entryPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  exitPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  stopLossPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  riskPerTrade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  // Outcomes
  result: {
    type: DataTypes.ENUM('Win', 'Loss', 'Break Even'),
    allowNull: false
  },
  pnlAbsolute: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  rMultiple: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false
  },
  // Strategy & Context
  strategyUsed: {
    type: DataTypes.STRING,
    allowNull: false
  },
  setupTags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  // Image Attachment
  screenshotUrl: {
    type: DataTypes.STRING,
    defaultValue: ''
  }
}, {
  tableName: 'backtest_entries',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'dateTime']
    },
    {
      fields: ['userId', 'assetPair']
    },
    {
      fields: ['userId', 'strategyUsed']
    }
  ]
});

module.exports = BacktestEntry;
