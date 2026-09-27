-- Weekly/monthly profit targets per trading account.
-- Run once on existing Neon DBs. New projects should use neon/schema.sql only.

CREATE TABLE IF NOT EXISTS public.account_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  weekly_target_percent NUMERIC(6, 2) NOT NULL CHECK (weekly_target_percent > 0),
  monthly_target_percent NUMERIC(6, 2) NOT NULL CHECK (monthly_target_percent > 0),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_targets_account_id ON public.account_targets(account_id);
