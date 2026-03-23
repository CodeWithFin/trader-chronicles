import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { calculateAnalytics } from '@/lib/analytics'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: trades, error } = await supabase
      .from('backtest_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date_time', { ascending: true })

    if (error) throw error

    const analyticsResults = calculateAnalytics(trades)
    return NextResponse.json(analyticsResults)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

