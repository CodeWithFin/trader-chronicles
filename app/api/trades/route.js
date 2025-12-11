import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    const response = new NextResponse()

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set(name, value, options)
            response.cookies.set(name, value, options)
          },
          remove(name, options) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
            response.cookies.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    // Try getUser first (reads from JWT in cookies)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Get user error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assetPair = searchParams.get('assetPair')
    const strategyUsed = searchParams.get('strategyUsed')
    const result = searchParams.get('result')
    const setupTag = searchParams.get('setupTag')
    const sortBy = searchParams.get('sortBy') || 'date_time'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('backtest_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    if (assetPair) {
      query = query.ilike('asset_pair', `%${assetPair}%`)
    }
    if (strategyUsed) {
      query = query.ilike('strategy_used', `%${strategyUsed}%`)
    }
    if (result) {
      query = query.eq('result', result)
    }
    if (setupTag) {
      query = query.contains('setup_tags', [setupTag])
    }

    const { data: trades, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      trades: trades || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    }, {
      headers: response.headers
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    // Create a response object for cookie handling
    const response = new NextResponse()

    // Helper to get cookie value from multiple sources
    const getCookie = (name) => {
      // Try cookieStore first
      const cookieValue = cookieStore.get(name)?.value
      if (cookieValue) return cookieValue
      
      // Fallback to reading from request headers
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {})
        return cookies[name]
      }
      return undefined
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return getCookie(name)
          },
          set(name, value, options) {
            cookieStore.set(name, value, options)
            response.cookies.set(name, value, options)
          },
          remove(name, options) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
            response.cookies.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    // Try getUser first (reads from JWT in cookies)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Get user error:', userError)
      const allCookies = cookieStore.getAll()
      const cookieHeader = request.headers.get('cookie')
      console.error('Available cookies from store:', allCookies.map(c => c.name))
      console.error('Cookie header:', cookieHeader?.substring(0, 200))
      return NextResponse.json({ error: 'Unauthorized. Please log in to continue.' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.email)

    const body = await request.json()
    console.log('Received payload:', body)

    // Validate required fields
    if (!body.dateTime) {
      return NextResponse.json({ error: 'Date/Time is required' }, { status: 400 })
    }
    if (!body.assetPair || !body.assetPair.trim()) {
      return NextResponse.json({ error: 'Asset/Symbol is required' }, { status: 400 })
    }
    if (!body.direction || !['Long', 'Short'].includes(body.direction)) {
      return NextResponse.json({ error: 'Direction must be Long or Short' }, { status: 400 })
    }
    if (body.entryPrice === undefined || body.entryPrice === null || isNaN(parseFloat(body.entryPrice))) {
      return NextResponse.json({ error: 'Valid entry price is required' }, { status: 400 })
    }
    if (body.exitPrice === undefined || body.exitPrice === null || isNaN(parseFloat(body.exitPrice))) {
      return NextResponse.json({ error: 'Valid exit price is required' }, { status: 400 })
    }
    if (!body.result || !['Win', 'Loss'].includes(body.result)) {
      return NextResponse.json({ error: 'Result must be Win or Loss' }, { status: 400 })
    }
    if (body.pnlAbsolute === undefined || body.pnlAbsolute === null || isNaN(parseFloat(body.pnlAbsolute))) {
      return NextResponse.json({ error: 'Valid P&L amount is required' }, { status: 400 })
    }

    const {
      dateTime,
      assetPair,
      direction,
      entryPrice,
      exitPrice,
      stopLossPrice = 0,
      riskPerTrade = 0,
      result,
      pnlAbsolute,
      rMultiple = 0,
      strategyUsed = '',
      setupTags = [],
      notes = '',
      screenshotUrl = ''
    } = body

    const insertData = {
      user_id: user.id,
      date_time: dateTime,
      asset_pair: assetPair.trim(),
      direction,
      entry_price: parseFloat(entryPrice),
      exit_price: parseFloat(exitPrice),
      stop_loss_price: parseFloat(stopLossPrice) || 0,
      risk_per_trade: parseFloat(riskPerTrade) || 0,
      result,
      pnl_absolute: parseFloat(pnlAbsolute),
      r_multiple: parseFloat(rMultiple) || 0,
      strategy_used: strategyUsed || '',
      setup_tags: Array.isArray(setupTags) ? setupTags : [],
      notes: notes || '',
      screenshot_url: screenshotUrl || ''
    }

    console.log('Inserting data:', insertData)

    const { data, error } = await supabase
      .from('backtest_entries')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message || 'Database error occurred' }, { status: 500 })
    }

    console.log('Trade created successfully:', data)
    return NextResponse.json(data, { 
      status: 201,
      headers: response.headers
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: error.message || 'Server error occurred' }, { status: 500 })
  }
}

