const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { sequelize } = require('./models');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Serve static files from the React app
const buildPath = path.join(__dirname, '../../build');
const buildExists = require('fs').existsSync(buildPath);

if (buildExists) {
  // Serve static files from the React app build
  app.use(express.static(buildPath));

  // The "catchall" handler: for any request that doesn't match an API route,
  // send back React's index.html file so React Router can handle the routing
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else if (process.env.NODE_ENV !== 'production') {
  // In development, if build doesn't exist, show helpful message
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Trader Chronicles - Development Mode</title>
          <style>
            body {
              font-family: 'JetBrains Mono', monospace;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              border: 4px solid black;
              background: white;
              box-shadow: 8px 8px 0px rgba(0,0,0,1);
            }
            h1 { margin-top: 0; }
            a {
              display: inline-block;
              margin-top: 1rem;
              padding: 1rem 2rem;
              background: #ea580c;
              color: white;
              text-decoration: none;
              border: 2px solid black;
              font-weight: bold;
            }
            a:hover { background: #c2410c; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Development Mode</h1>
            <p>React dev server is running separately.</p>
            <p>API server is running on port 3000</p>
            <a href="http://localhost:3002">Open React App (Port 3002)</a>
          </div>
        </body>
      </html>
    `);
  });
}

// Connect to PostgreSQL
const PORT = process.env.PORT || 3000;

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
