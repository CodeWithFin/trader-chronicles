import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import TradersClient from '@/components/TradersClient'

export const dynamic = 'force-dynamic'

export default async function TradersPage() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  
  // Fetch traders data directly on the server
  const { data: rawTraders } = await supabase.rpc('get_public_trader_stats')
  
  const traders = (rawTraders || []).map((row) => ({
    id: row.id,
    username: row.username,
    totalTrades: row.total_trades,
    winRate: row.win_rate,
    bestAssetPair: row.best_asset_pair,
    joinedAt: row.joined_at,
  }))

  return <TradersClient initialTraders={traders} session={session} />
}
