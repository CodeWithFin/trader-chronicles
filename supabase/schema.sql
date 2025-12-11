-- Trader Chronicles - Simple Trade Journal
-- Supabase Database Schema
-- Run this entire file in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Supabase Auth handles authentication, this is for additional user data)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Backtest entries table (Simplified for Simple Trade Journal)
CREATE TABLE IF NOT EXISTS public.backtest_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core Required Fields (7 essential fields from simplified form)
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  asset_pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Long', 'Short')),
  entry_price DECIMAL(20, 8) NOT NULL CHECK (entry_price >= 0),
  exit_price DECIMAL(20, 8) NOT NULL CHECK (exit_price >= 0),
  result TEXT NOT NULL CHECK (result IN ('Win', 'Loss')),
  pnl_absolute DECIMAL(20, 8) NOT NULL,
  
  -- Optional Fields (with defaults for backward compatibility)
  stop_loss_price DECIMAL(20, 8) DEFAULT 0 CHECK (stop_loss_price >= 0),
  risk_per_trade DECIMAL(5, 2) DEFAULT 0 CHECK (risk_per_trade >= 0 AND risk_per_trade <= 100),
  r_multiple DECIMAL(10, 4) DEFAULT 0,
  strategy_used TEXT DEFAULT '',
  setup_tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  screenshot_url TEXT DEFAULT '',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backtest_entries_user_id ON public.backtest_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_date_time ON public.backtest_entries(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_asset_pair ON public.backtest_entries(asset_pair);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_result ON public.backtest_entries(result);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Backtest entries policies
CREATE POLICY "Users can view own entries" ON public.backtest_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON public.backtest_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON public.backtest_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON public.backtest_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
