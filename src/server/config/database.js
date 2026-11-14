const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// Support for DATABASE_URL or individual PostgreSQL parameters
if (process.env.DATABASE_URL) {
  const databaseUrl = process.env.DATABASE_URL;
  const requiresSSL =
    databaseUrl.includes('sslmode=require') || databaseUrl.includes('ssl=true');

  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: requiresSSL
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'trader_chronicles',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

module.exports = sequelize;
