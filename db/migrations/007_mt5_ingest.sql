-- MT5 auto-ingest: per-user API key + deduplication ticket column

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mt5_api_key UUID DEFAULT gen_random_uuid();

UPDATE public.users SET mt5_api_key = gen_random_uuid() WHERE mt5_api_key IS NULL;

ALTER TABLE public.users
  ALTER COLUMN mt5_api_key SET NOT NULL,
  ALTER COLUMN mt5_api_key SET DEFAULT gen_random_uuid();

ALTER TABLE public.backtest_entries
  ADD COLUMN IF NOT EXISTS mt5_ticket BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_backtest_entries_mt5_ticket
  ON public.backtest_entries(user_id, mt5_ticket)
  WHERE mt5_ticket IS NOT NULL;
