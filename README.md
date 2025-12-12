# Trader Chronicles - Trade Journal

A full-stack Next.js application for logging trades, tracking performance, and analyzing trading activity with comprehensive data visualization and analytics.

## 🚀 Features

- **Simple Trade Journal Form**: Quick and easy trade entry with only 7 essential fields:
  - Date & Time
  - Asset/Symbol
  - Direction (Long/Short)
  - Entry Price
  - Exit Price
  - P&L (Profit/Loss)
  - Win/Loss
- **Trade Log**: View, search, filter, and sort all your trade entries
- **Analytics Dashboard**: Comprehensive performance metrics and visualizations including:
  - Win rate, expectancy, profit factor
  - R-Multiple distribution charts
  - Equity curve visualization
  - Win rate by strategy and setup tags
- **User Authentication**: Secure sign-up and login system powered by Supabase Auth
- **Brutalist Design**: Modern, bold UI with Tailwind CSS

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18 with Server Components
- **Styling**: Tailwind CSS with brutalist design system
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts for data visualization

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (free tier available)

## 🔧 Installation

1. **Clone the repository** or navigate to the project directory

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase:**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Go to SQL Editor and run the SQL from `supabase/schema.sql`
   - Copy your project URL and anon key from Settings → API

4. **Set up environment variables:**

   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure (Monolithic Next.js)

```
trader-chronicles/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── trades/        # Trade CRUD endpoints
│   │   └── analytics/     # Analytics endpoint
│   ├── dashboard/         # Dashboard page
│   ├── trades/            # Trade pages
│   ├── analytics/         # Analytics page
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── layout.js          # Root layout
│   ├── page.js            # Home page (redirects)
│   └── globals.css        # Global styles
├── components/            # React components
│   └── Navbar.js          # Navigation component
├── lib/                   # Utilities
│   ├── supabase.js        # Client-side Supabase client
│   └── supabase-server.js # Server-side Supabase client
├── supabase/              # Database schema
│   ├── schema.sql         # SQL schema for Supabase
│   └── migration.sql      # Migration script for existing databases
├── middleware.js          # Next.js middleware for auth
├── package.json           # Dependencies
└── next.config.js         # Next.js configuration
```

## 🔌 API Endpoints

All API routes are in `app/api/`:

- `GET /api/trades` - Get all trades with filtering (Protected)
- `POST /api/trades` - Create a new trade entry (Protected)
- `GET /api/trades/[id]` - Get a single trade (Protected)
- `PUT /api/trades/[id]` - Update a trade (Protected)
- `DELETE /api/trades/[id]` - Delete a trade (Protected)
- `GET /api/analytics` - Get analytics data (Protected)

## 📊 Database Schema

The database uses Supabase (PostgreSQL) with Row Level Security (RLS) enabled.

### Tables

- `users` - User profiles (linked to Supabase Auth)
- `backtest_entries` - Trade entries with core required fields and optional extended fields (table name kept for backward compatibility)

### Core Required Fields
- `date_time` - When the trade was executed
- `asset_pair` - Asset/Symbol traded
- `direction` - Long or Short
- `entry_price` - Entry price
- `exit_price` - Exit price
- `result` - Win or Loss
- `pnl_absolute` - Profit/Loss amount

### Optional Fields (for backward compatibility)
- `stop_loss_price`, `risk_per_trade`, `r_multiple`, `strategy_used`, `setup_tags`, `notes`, `screenshot_url`

See `supabase/schema.sql` for the complete schema. If you have an existing database, run `supabase/migration.sql` to update it.

## 🎨 Design System

The application uses a brutalist design system with:
- Bold black borders
- Orange accent color (#ea580c)
- Grid background pattern
- JetBrains Mono font
- High contrast, accessible design

## 🔒 Security

- Supabase Auth handles authentication
- Row Level Security (RLS) ensures users can only access their own data
- API routes are protected by middleware
- All database queries are server-side

## 📝 Usage

1. **Sign Up**: Create a new account
2. **Login**: Access your dashboard
3. **Log Trades**: Navigate to "New Trade" and fill in the 7 essential fields (Date/Time, Asset, Direction, Entry/Exit Prices, P&L, Win/Loss)
4. **View Log**: See all your trades in the Trade Log with filtering and sorting
5. **Analyze**: Check the Analytics dashboard for performance metrics and charts

## 🐛 Troubleshooting

- **Supabase Connection Error**: Verify your environment variables are correct
- **Database Errors**: Make sure you've run the SQL schema in Supabase SQL Editor
- **Authentication Issues**: Check that RLS policies are enabled in Supabase
- **Build Errors**: Ensure all dependencies are installed with `npm install`

## 📄 License

ISC

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
