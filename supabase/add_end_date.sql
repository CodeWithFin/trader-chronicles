-- Add end_date column to backtest_entries table
-- This allows trades to have both a start date and end date

ALTER TABLE public.backtest_entries
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Create index for end_date queries
CREATE INDEX IF NOT EXISTS idx_backtest_entries_end_date ON public.backtest_entries(end_date DESC);

