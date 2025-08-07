import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  // Initialize Supabase client inside the function to avoid build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { success: false, error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    // Use the new function that refreshes ALL materialized views with CONCURRENTLY
    const { data, error } = await supabase
      .rpc('refresh_all_materialized_views')
    
    if (error) {
      // Fallback to individual refresh if the function doesn't exist
      console.error('refresh_all_materialized_views function not found, falling back to individual refresh')
      
      // List of materialized views to refresh individually
      // All views are in the analytics schema
      const viewsToRefresh = [
        { schema: 'analytics', name: 'wk_totals' },
        { schema: 'analytics', name: 'wk_by_channel' },
        { schema: 'analytics', name: 'wk_by_src_med' },
        { schema: 'analytics', name: 'wk_by_campaign' },
        { schema: 'analytics', name: 'weekly_breakdown' },
        { schema: 'analytics', name: 'weekly_deltas' },
        { schema: 'analytics', name: 'weekly_events' },
        { schema: 'analytics', name: 'weekly_sessions' },
        { schema: 'analytics', name: 'weekly_summary' }
      ]

      const results = []
      
      for (const view of viewsToRefresh) {
        try {
          // Try to refresh individual view
          const { error: refreshError } = await supabase
            .rpc('refresh_materialized_view', {
              schema_name: view.schema,
              view_name: view.name
            })
          
          if (!refreshError) {
            results.push({ 
              schema_name: view.schema, 
              view_name: view.name, 
              status: 'refreshed' 
            })
            console.log(`✅ Refreshed ${view.schema}.${view.name}`)
          } else {
            results.push({ 
              schema_name: view.schema, 
              view_name: view.name, 
              status: 'error',
              error: refreshError.message
            })
            console.error(`❌ Error refreshing ${view.schema}.${view.name}:`, refreshError.message)
          }
        } catch (err) {
          results.push({ 
            schema_name: view.schema, 
            view_name: view.name, 
            status: 'error', 
            error: String(err) 
          })
        }
      }
      
      const refreshedCount = results.filter((r: { status: string }) => r.status === 'refreshed' || r.status === 'refreshed_concurrently').length
      
      return NextResponse.json({
        success: refreshedCount > 0,
        message: refreshedCount > 0 
          ? `Refreshed ${refreshedCount} materialized views (fallback mode)` 
          : 'Failed to refresh views. Please create the refresh functions in Supabase.',
        results,
        note: 'Using fallback mode. For better performance, create refresh_all_materialized_views function.'
      })
    }
    
    // Process results from refresh_all_materialized_views
    const refreshedCount = data?.filter((r: { status: string }) => 
      r.status === 'refreshed' || r.status === 'refreshed_concurrently'
    ).length || 0
    
    const concurrentCount = data?.filter((r: { status: string }) => 
      r.status === 'refreshed_concurrently'
    ).length || 0
    
    const errorCount = data?.filter((r: { status: string }) => 
      r.status.startsWith('error')
    ).length || 0
    
    console.log(`✅ Refreshed ${refreshedCount} materialized views (${concurrentCount} concurrently)`)
    
    if (errorCount > 0) {
      console.log(`⚠️ ${errorCount} views had errors`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully refreshed ${refreshedCount} materialized views (${concurrentCount} concurrently)`,
      results: data,
      summary: {
        total: data?.length || 0,
        refreshed: refreshedCount,
        concurrent: concurrentCount,
        errors: errorCount
      }
    })
  } catch (error) {
    console.error('Error refreshing views:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to refresh views' },
      { status: 500 }
    )
  }
}