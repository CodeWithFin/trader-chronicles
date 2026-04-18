-- Trader Chronicles schema for Neon (standalone PostgreSQL)
-- Run this in the Neon SQL Editor after creating a project.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('eval', 'funded', 'live', 'other')),
  starting_balance NUMERIC(20, 8) NOT NULL DEFAULT 10000 CHECK (starting_balance >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON public.trading_accounts(user_id);

CREATE TABLE IF NOT EXISTS public.backtest_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_backtest_entries_user_id ON public.backtest_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_account_id ON public.backtest_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_user_account ON public.backtest_entries(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_date_time ON public.backtest_entries(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_end_date ON public.backtest_entries(end_date DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_asset_pair ON public.backtest_entries(asset_pair);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_result ON public.backtest_entries(result);

CREATE OR REPLACE FUNCTION public.get_public_trader_stats()
RETURNS TABLE (
  id UUID,
  username TEXT,
  total_trades INTEGER,
  win_rate INTEGER,
  best_asset_pair TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pair_stats AS (
    SELECT
      b.user_id,
      b.asset_pair,
      COUNT(*)::int AS total,
      SUM(CASE WHEN b.result = 'Win' THEN 1 ELSE 0 END)::int AS wins
    FROM public.backtest_entries b
    GROUP BY b.user_id, b.asset_pair
  ),
  best_pair AS (
    SELECT DISTINCT ON (p.user_id)
      p.user_id,
      p.asset_pair
    FROM pair_stats p
    ORDER BY
      p.user_id,
      CASE WHEN p.total = 0 THEN 0 ELSE p.wins::numeric / p.total END DESC,
      p.total DESC,
      p.asset_pair ASC
  ),
  user_stats AS (
    SELECT
      u.id,
      u.username,
      u.created_at,
      COUNT(b.id)::int AS total_trades,
      COALESCE(SUM(CASE WHEN b.result = 'Win' THEN 1 ELSE 0 END), 0)::int AS wins
    FROM public.users u
    LEFT JOIN public.backtest_entries b ON b.user_id = u.id
    GROUP BY u.id, u.username, u.created_at
  )
  SELECT
    us.id,
    us.username,
    us.total_trades,
    CASE
      WHEN us.total_trades = 0 THEN 0
      ELSE ROUND((us.wins::numeric / us.total_trades) * 100)::int
    END AS win_rate,
    bp.asset_pair AS best_asset_pair,
    us.created_at AS joined_at
  FROM user_stats us
  LEFT JOIN best_pair bp ON bp.user_id = us.id
  ORDER BY us.total_trades DESC, us.created_at DESC;
$$;
