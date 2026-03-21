'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch traders' }, { status: 500 });
    }

    // For each user, calculate their stats
    const tradersWithStats = await Promise.all(
      users.map(async (user) => {
        const { data: trades = [] } = await supabase
          .from('backtest_entries')
          .select('*')
          .eq('user_id', user.id);

        // Calculate win rate
        const totalTrades = trades.length;
        const wins = trades.filter((t) => t.result === 'Win').length;
        const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

        // Find best asset pair (highest win rate)
        const assetPairStats = {};
        trades.forEach((trade) => {
          if (!assetPairStats[trade.asset_pair]) {
            assetPairStats[trade.asset_pair] = { wins: 0, total: 0 };
          }
          assetPairStats[trade.asset_pair].total += 1;
          if (trade.result === 'Win') {
            assetPairStats[trade.asset_pair].wins += 1;
          }
        });

        let bestAssetPair = null;
        let bestWinRate = 0;
        Object.entries(assetPairStats).forEach(([pair, stats]) => {
          const rate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
          if (rate > bestWinRate) {
            bestWinRate = rate;
            bestAssetPair = pair;
          }
        });

        return {
          id: user.id,
          username: user.username,
          totalTrades,
          winRate,
          bestAssetPair,
          joinedAt: user.created_at,
        };
      })
    );

    // Sort by total trades (descending) as a ranking metric
    tradersWithStats.sort((a, b) => b.totalTrades - a.totalTrades);

    return NextResponse.json(tradersWithStats);
  } catch (error) {
    console.error('Traders API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
