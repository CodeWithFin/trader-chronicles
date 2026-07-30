-- Rank leaderboard by total profit/loss instead of trade count.

CREATE OR REPLACE FUNCTION public.get_public_trader_stats()
RETURNS TABLE (
  id UUID,
  username TEXT,
  total_trades INTEGER,
  win_rate INTEGER,
  total_pnl NUMERIC,
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
      COALESCE(SUM(CASE WHEN b.result = 'Win' THEN 1 ELSE 0 END), 0)::int AS wins,
      COALESCE(SUM(
        CASE
          WHEN b.result = 'Loss' AND b.pnl_absolute > 0 THEN -ABS(b.pnl_absolute)
          WHEN b.result = 'Win' AND b.pnl_absolute < 0 THEN ABS(b.pnl_absolute)
          ELSE b.pnl_absolute
        END
      ), 0) AS total_pnl
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
    us.total_pnl,
    bp.asset_pair AS best_asset_pair,
    us.created_at AS joined_at
  FROM user_stats us
  LEFT JOIN best_pair bp ON bp.user_id = us.id
  ORDER BY us.total_pnl DESC, us.created_at DESC;
$$;
