-- Add auth_token field for sync agent authentication
-- Run this in the Neon SQL Editor

ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS auth_token TEXT,
  ADD COLUMN IF NOT EXISTS auth_token_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_trading_accounts_auth_token ON public.trading_accounts(auth_token);