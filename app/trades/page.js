import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import TradeLogClient from '@/components/TradeLogClient'

export const dynamic = 'force-dynamic'

export default async function TradesPage() {
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

  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  
  let initialTrades = []
  if (user) {
    const { data } = await supabase
      .from('backtest_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date_time', { ascending: false })
      .limit(50)
    
    initialTrades = data || []
  }

  return <TradeLogClient initialTrades={initialTrades} session={session} />
}

