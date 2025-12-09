const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelize } = require('./models');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Connect to PostgreSQL
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('PostgreSQL connection established successfully.');
    return sequelize.sync({ alter: false }); // Set to { force: true } to drop tables, { alter: true } to sync
  })
  .then(() => {
    console.log('Database models synchronized.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  });

