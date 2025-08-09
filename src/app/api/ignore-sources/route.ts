import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('source_ignore_rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { pattern, is_glob = false, is_regex = false, notes = '' } = body || {}
    if (!pattern || typeof pattern !== 'string') {
      return NextResponse.json({ success: false, error: 'pattern is required' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('source_ignore_rules')
      .insert({ pattern, is_glob, is_regex, notes })
      .select('*')

    if (error) throw error
    return NextResponse.json({ success: true, data: data?.[0] })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')
    const patternParam = searchParams.get('pattern')
    if (!idParam && !patternParam) {
      return NextResponse.json({ success: false, error: 'id or pattern is required' }, { status: 400 })
    }

    const supabase = getAdminClient()
    let result
    if (idParam) {
      const id = Number(idParam)
      result = await supabase.from('source_ignore_rules').delete().eq('id', id)
    } else {
      result = await supabase.from('source_ignore_rules').delete().eq('pattern', patternParam)
    }

    if (result.error) throw result.error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

