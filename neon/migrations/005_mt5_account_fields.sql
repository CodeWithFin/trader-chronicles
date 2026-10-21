-- Add MT4/MT5 account connection fields to trading_accounts
-- Run this in the Neon SQL Editor after creating a project.

ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS mt_account_number TEXT,
  ADD COLUMN IF NOT EXISTS mt_broker_server TEXT,
  ADD COLUMN IF NOT EXISTS mt_password TEXT,
  ADD COLUMN IF NOT EXISTS mt_platform TEXT CHECK (mt_platform IN ('mt4', 'mt5')),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_trading_accounts_mt_account ON public.trading_accounts(mt_account_number);