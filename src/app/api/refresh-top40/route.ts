import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ success: false, error: 'Missing Supabase configuration' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Try to refresh our specific MV, fall back to generic
  const { error } = await supabase.rpc('refresh_materialized_view', {
    schema_name: 'public',
    view_name: 'ga4_weekly_top40_sources'
  })

  if (error) {
    // Try our helper if created
    const { error: e2 } = await supabase.rpc('refresh_ga4_weekly_top40')
    if (e2) {
      return NextResponse.json({ success: false, error: e2.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

