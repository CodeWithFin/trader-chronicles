const sequelize = require('../config/database');
const User = require('./User');
const BacktestEntry = require('./BacktestEntry');

// Define associations
BacktestEntry.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(BacktestEntry, { foreignKey: 'userId', as: 'trades' });

module.exports = {
  sequelize,
  User,
  BacktestEntry
};

