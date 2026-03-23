import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AnalyticsClient from '@/components/AnalyticsClient'
import { calculateAnalytics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
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
  
  let initialData = null
  if (user) {
    const { data: trades } = await supabase
      .from('backtest_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date_time', { ascending: true })
    
    initialData = calculateAnalytics(trades || [])
  }

  return <AnalyticsClient initialData={initialData} session={session} />
}
