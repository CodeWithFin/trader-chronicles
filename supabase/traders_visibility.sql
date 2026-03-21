-- Trader visibility and public stats
-- Run this in Supabase SQL Editor

-- Public profile visibility
DROP POLICY IF EXISTS "Public can view all user profiles" ON public.users;
CREATE POLICY "Public can view all user profiles" ON public.users
  FOR SELECT USING (true);

-- Safe aggregated stats API for traders directory
CREATE OR REPLACE FUNCTION public.get_public_trader_stats()
RETURNS TABLE (
  id UUID,
  username TEXT,
  total_trades INTEGER,
  win_rate INTEGER,
  best_asset_pair TEXT,
  joined_at TIMESTAMP WITH TIME ZONE
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

GRANT EXECUTE ON FUNCTION public.get_public_trader_stats() TO anon, authenticated;
