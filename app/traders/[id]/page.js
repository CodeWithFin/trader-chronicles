import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import TraderProfileClient from '@/components/TraderProfileClient'

export const dynamic = 'force-dynamic'

export default async function TraderProfilePage({ params }) {
  const { id } = params
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
  
  // Fetch trader profile data directly on the server
  let profile = null
  try {
    const { data: rawProfile } = await supabase.rpc('get_public_trader_stats', { 
      // Note: If the RPC supports filtering by ID, use it. 
      // If not, we fetch all and filter here (less efficient but works if RPC is simple)
    })
    
    // For now, let's assume we fetch from the API logic or a direct query if possible
    // The API uses: supabase.rpc('get_public_trader_stats')
    // Let's find the specific trader
    profile = (rawProfile || []).find(t => t.id === id)
    
    if (profile) {
      profile = {
        id: profile.id,
        username: profile.username,
        totalTrades: profile.total_trades,
        winRate: profile.win_rate,
        bestAssetPair: profile.best_asset_pair,
        joinedAt: profile.joined_at,
      }
    }
  } catch (e) {
    console.error('Error fetching profile:', e)
  }

  return <TraderProfileClient profile={profile} session={session} />
}
