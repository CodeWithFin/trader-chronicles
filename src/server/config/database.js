const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// Support for Neon DB connection string (DATABASE_URL) or individual parameters
if (process.env.DATABASE_URL) {
  // Use connection string (Neon DB format: postgresql://user:password@host/database?sslmode=require)
  const databaseUrl = process.env.DATABASE_URL;
  
  // Check if SSL is required (Neon DB always requires SSL)
  const requiresSSL = databaseUrl.includes('sslmode=require') || 
                      databaseUrl.includes('neon.tech');
  
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: requiresSSL ? {
        require: true,
        rejectUnauthorized: false // Required for Neon DB
      } : false
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
  
  console.log('Using DATABASE_URL connection string');
  if (requiresSSL) {
    console.log('SSL enabled for database connection');
  }
} else {
  // Fallback to individual parameters for local development
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
        idle: 10000
      }
    }
  );
}

module.exports = sequelize;

