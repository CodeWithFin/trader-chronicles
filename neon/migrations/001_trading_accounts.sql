-- Run once on existing Neon DBs that already have users/backtest_entries.
-- New projects should use neon/schema.sql only.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

INSERT INTO public.trading_accounts (user_id, label, kind, starting_balance, sort_order)
SELECT u.id, 'Primary', 'other', 10000, 0
FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.trading_accounts t WHERE t.user_id = u.id);

ALTER TABLE public.backtest_entries ADD COLUMN IF NOT EXISTS account_id UUID;

UPDATE public.backtest_entries b
SET account_id = (
  SELECT id FROM public.trading_accounts t WHERE t.user_id = b.user_id ORDER BY t.sort_order, t.created_at LIMIT 1
)
WHERE b.account_id IS NULL;

ALTER TABLE public.backtest_entries ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE public.backtest_entries DROP CONSTRAINT IF EXISTS backtest_entries_account_id_fkey;
ALTER TABLE public.backtest_entries ADD CONSTRAINT backtest_entries_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.trading_accounts(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_backtest_entries_account_id ON public.backtest_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_backtest_entries_user_account ON public.backtest_entries(user_id, account_id);
