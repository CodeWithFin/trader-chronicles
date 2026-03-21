'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = params;
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

    // Use the same RPC as the directory, but filter for one user
    const { data, error } = await supabase.rpc('get_public_trader_stats');
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch trader profile' }, { status: 500 });
    }
    const profile = (data || []).find((row) => row.id === id);
    if (!profile) {
      return NextResponse.json({ error: 'Trader not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      totalTrades: profile.total_trades,
      winRate: profile.win_rate,
      bestAssetPair: profile.best_asset_pair,
      joinedAt: profile.joined_at,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
