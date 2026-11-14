-- Allow deleting trading accounts that still have trades.
-- Existing DBs used ON DELETE RESTRICT; switch to CASCADE and keep API deletes explicit.

ALTER TABLE public.backtest_entries DROP CONSTRAINT IF EXISTS backtest_entries_account_id_fkey;
ALTER TABLE public.backtest_entries ADD CONSTRAINT backtest_entries_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.trading_accounts(id) ON DELETE CASCADE;
