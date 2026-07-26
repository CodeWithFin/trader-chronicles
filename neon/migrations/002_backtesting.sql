-- Backtesting module: a fully separate record set from live/normal trades.
-- Normal trades live in public.backtest_entries (legacy name). This table is
-- ONLY for strategy backtesting and is never combined with normal trades.
-- Run once in the Neon SQL Editor on existing projects.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.backtest_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  strategy_name TEXT NOT NULL DEFAULT 'Untitled Strategy',
  date_time TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  asset_pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Long', 'Short')),
  entry_price DECIMAL(20, 8) NOT NULL CHECK (entry_price >= 0),
  exit_price DECIMAL(20, 8) NOT NULL CHECK (exit_price >= 0),
  result TEXT NOT NULL CHECK (result IN ('Win', 'Loss')),
  pnl_absolute DECIMAL(20, 8) NOT NULL,
  stop_loss_price DECIMAL(20, 8) DEFAULT 0 CHECK (stop_loss_price >= 0),
  risk_per_trade DECIMAL(5, 2) DEFAULT 0 CHECK (risk_per_trade >= 0 AND risk_per_trade <= 100),
  r_multiple DECIMAL(10, 4) DEFAULT 0,
  strategy_used TEXT DEFAULT '',
  setup_tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  screenshot_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backtest_trades_user_id ON public.backtest_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_strategy ON public.backtest_trades(strategy_name);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_user_strategy ON public.backtest_trades(user_id, strategy_name);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_date_time ON public.backtest_trades(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_asset_pair ON public.backtest_trades(asset_pair);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_result ON public.backtest_trades(result);
