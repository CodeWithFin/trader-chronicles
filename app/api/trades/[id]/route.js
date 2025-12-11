import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
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

    const { data, error } = await supabase
      .from('backtest_entries')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
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

    const body = await request.json()
    const updateData = {}
    
    if (body.dateTime !== undefined) updateData.date_time = body.dateTime
    if (body.assetPair !== undefined) updateData.asset_pair = body.assetPair
    if (body.direction !== undefined) updateData.direction = body.direction
    if (body.entryPrice !== undefined) updateData.entry_price = body.entryPrice
    if (body.exitPrice !== undefined) updateData.exit_price = body.exitPrice
    if (body.stopLossPrice !== undefined) updateData.stop_loss_price = body.stopLossPrice
    if (body.riskPerTrade !== undefined) updateData.risk_per_trade = body.riskPerTrade
    if (body.result !== undefined) updateData.result = body.result
    if (body.pnlAbsolute !== undefined) updateData.pnl_absolute = body.pnlAbsolute
    if (body.rMultiple !== undefined) updateData.r_multiple = body.rMultiple
    if (body.strategyUsed !== undefined) updateData.strategy_used = body.strategyUsed
    if (body.setupTags !== undefined) updateData.setup_tags = body.setupTags
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.screenshotUrl !== undefined) updateData.screenshot_url = body.screenshotUrl

    const { data, error } = await supabase
      .from('backtest_entries')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
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

    const { error } = await supabase
      .from('backtest_entries')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ message: 'Trade deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

