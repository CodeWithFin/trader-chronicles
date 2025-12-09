# Trader Chronicles - Backtesting Strategy Log

A full-stack web application for tracking, analyzing, and fine-tuning trading strategies through comprehensive backtesting data visualization and analytics.

## 🚀 Features

- **Trade Entry Form**: Log detailed backtest entries with all trade parameters
- **Trade Log**: View, search, filter, and sort all your backtest entries
- **Analytics Dashboard**: Comprehensive performance metrics and visualizations including:
  - Win rate, expectancy, profit factor
  - R-Multiple distribution charts
  - Equity curve visualization
  - Win rate by strategy and setup tags
- **User Authentication**: Secure sign-up and login system
- **Brutalist Design**: Modern, bold UI with Tailwind CSS

## 🛠️ Technology Stack

- **Frontend**: React 18 with functional components and hooks
- **Styling**: Tailwind CSS with brutalist design system
- **Backend**: Node.js/Express REST API
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based authentication
- **Charts**: Recharts for data visualization

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher - local installation or cloud service)
- npm or yarn

## 🔧 Installation

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Install dependencies for all packages:**
   ```bash
   npm run install-all
   ```

   Or install manually:
   ```bash
   # Root dependencies
   npm install
   
   # Backend dependencies
   cd server
   npm install
   
   # Frontend dependencies
   cd ../client
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the `server` directory:
   ```env
   DB_NAME=trader_chronicles
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=localhost
   DB_PORT=5432
   PORT=5000
   JWT_SECRET=your-secret-key-change-in-production
   ```

   Optionally, create a `.env` file in the `client` directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Set up PostgreSQL database:**
   ```bash
   # Create the database
   createdb trader_chronicles
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE trader_chronicles;
   ```

   The application will automatically create the tables on first run using Sequelize's sync feature.

## 🚀 Running the Application

### Development Mode (Both Frontend and Backend)

From the root directory:
```bash
npm run dev
```

This will start both the backend server (port 5000) and the React frontend (port 3000).

### Run Separately

**Backend only:**
```bash
cd server
npm run dev
```

**Frontend only:**
```bash
cd client
npm start
```

## 📁 Project Structure

```
trader-chronicles/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/        # React context (Auth)
│   │   ├── pages/         # Page components
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Express backend
│   ├── config/            # Database configuration
│   ├── models/            # Sequelize models
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   ├── index.js          # Server entry point
│   └── package.json
└── package.json           # Root package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Trades
- `POST /api/trades` - Create a new backtest entry (Protected)
- `GET /api/trades` - Get all trades with filtering (Protected)
- `GET /api/trades/:id` - Get a single trade (Protected)
- `PUT /api/trades/:id` - Update a trade (Protected)
- `DELETE /api/trades/:id` - Delete a trade (Protected)

### Analytics
- `GET /api/analytics` - Get analytics data (Protected)

## 📊 Data Model

### Database Schema
The application uses PostgreSQL with Sequelize ORM. Tables are automatically created on first run.

### User Table
- `id` (UUID, Primary Key)
- `username` (String, Unique)
- `email` (String, Unique)
- `password` (String, Hashed)
- `createdAt`, `updatedAt` (Timestamps)

### BacktestEntry Table
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users)
- **Trade Details**: dateTime, assetPair, direction, entryPrice, exitPrice, stopLossPrice, riskPerTrade
- **Outcomes**: result, pnlAbsolute, rMultiple
- **Strategy & Context**: strategyUsed, setupTags (Array), notes
- **Image**: screenshotUrl
- `createdAt`, `updatedAt` (Timestamps)

## 🎨 Design System

The application uses a brutalist design system with:
- Bold black borders
- Orange accent color (#ea580c)
- Grid background pattern
- JetBrains Mono font
- High contrast, accessible design

## 🔒 Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Protected API routes
- User data isolation (users can only access their own trades)

## 📝 Usage

1. **Sign Up**: Create a new account
2. **Login**: Access your dashboard
3. **Log Trades**: Navigate to "New Trade" and fill in all trade details
4. **View Log**: See all your trades in the Trade Log with filtering and sorting
5. **Analyze**: Check the Analytics dashboard for performance metrics and charts

## 🐛 Troubleshooting

- **PostgreSQL Connection Error**: Ensure PostgreSQL is running and the database credentials in `.env` are correct
- **Database Not Found**: Create the database using `createdb trader_chronicles` or via psql
- **Port Already in Use**: Change the PORT in server `.env` or REACT_APP_API_URL in client `.env`
- **CORS Issues**: The backend is configured to allow requests from `http://localhost:3000`
- **Tables Not Created**: The app will auto-create tables on first run. If issues occur, check Sequelize logs

## 📄 License

ISC

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

# trader-chronicles
