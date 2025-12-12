import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE() {
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

    // Use getUser instead of getSession for API routes
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all trades for the authenticated user
    const { data, error } = await supabase
      .from('backtest_entries')
      .delete()
      .eq('user_id', user.id)
      .select()

    if (error) throw error

    return NextResponse.json({ 
      message: 'All trades deleted successfully',
      deletedCount: data?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

