import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    const { data, error } = await supabase.rpc('get_public_trader_stats');

    if (error) {
      console.error('Error fetching trader stats:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch traders',
          details: 'Run supabase/traders_visibility.sql in Supabase SQL Editor to enable public trader stats.',
        },
        { status: 500 }
      );
    }

    const traders = (data || []).map((row) => ({
      id: row.id,
      username: row.username,
      totalTrades: row.total_trades,
      winRate: row.win_rate,
      bestAssetPair: row.best_asset_pair,
      joinedAt: row.joined_at,
    }));

    return NextResponse.json(traders);
  } catch (error) {
    console.error('Traders API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Run supabase/traders_visibility.sql in Supabase SQL Editor to enable public trader stats.',
      },
      { status: 500 }
    );
  }
}
