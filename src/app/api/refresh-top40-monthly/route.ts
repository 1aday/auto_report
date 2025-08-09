import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ success: false, error: 'Missing Supabase configuration' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { error } = await supabase.rpc('refresh_materialized_view', {
    schema_name: 'public',
    view_name: 'ga4_monthly_top40_sources'
  })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

