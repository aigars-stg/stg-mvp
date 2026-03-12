/**
 * Edge Function: cron-cleanup-accounts
 *
 * Permanently deletes soft-deleted accounts after 90-day GDPR retention period.
 * - Finds accounts with deleted_at older than 90 days
 * - Deletes storage files (listing photos)
 * - Deletes auth user (cascades to user_profiles)
 *
 * Schedule: Daily at 2:00 AM UTC via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RETENTION_DAYS = 90

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (authHeader !== 'Bearer ' + serviceRoleKey) {
      console.error('[Cron] Unauthorized access attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[Cron] Starting cleanup-deleted-accounts job...')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Calculate retention date
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS)
    const retentionDateISO = retentionDate.toISOString()

    console.log(`[Cron] Looking for accounts deleted before: ${retentionDateISO}`)

    // Find all soft-deleted accounts past retention period
    const { data: deletedProfiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, deleted_at, deletion_reason')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', retentionDateISO)

    if (fetchError) {
      console.error('[Cron] Error fetching deleted profiles:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!deletedProfiles || deletedProfiles.length === 0) {
      console.log('[Cron] No accounts to delete')
      return new Response(JSON.stringify({
        success: true,
        total: 0,
        deleted: 0,
        failed: 0,
        errors: [],
        message: 'No accounts past retention period',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[Cron] Found ${deletedProfiles.length} accounts to permanently delete`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process each account
    for (const profile of deletedProfiles) {
      try {
        console.log(`[Cron] Deleting account: ${profile.id} (${profile.email})`)

        // 1. Delete all storage files for this user
        try {
          const { data: files } = await supabase
            .storage
            .from('listing-photos')
            .list(profile.id)

          if (files && files.length > 0) {
            const filePaths = files.map(file => `${profile.id}/${file.name}`)
            const { error: storageError } = await supabase
              .storage
              .from('listing-photos')
              .remove(filePaths)

            if (storageError) {
              console.error(`[Cron] Error deleting storage for ${profile.id}:`, storageError)
            } else {
              console.log(`[Cron] Deleted ${files.length} storage files for ${profile.id}`)
            }
          }
        } catch (storageError: unknown) {
          console.error(`[Cron] Storage deletion error for ${profile.id}:`, storageError instanceof Error ? storageError.message : 'Unknown error')
          // Continue anyway - storage deletion shouldn't block user deletion
        }

        // 2. Delete auth user (this will CASCADE delete user_profiles and related data)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.id)

        if (deleteError) {
          console.error(`[Cron] Error deleting auth user ${profile.id}:`, deleteError)
          results.failed++
          results.errors.push(`${profile.id}: ${deleteError.message}`)
        } else {
          console.log(`[Cron] Successfully deleted account ${profile.id}`)
          results.success++
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error: unknown) {
        console.error(`[Cron] Error processing ${profile.id}:`, error)
        results.failed++
        results.errors.push(`${profile.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const summary = {
      success: true,
      total: deletedProfiles.length,
      deleted: results.success,
      failed: results.failed,
      errors: results.errors,
      message: `Cleanup completed: ${results.success} accounts permanently deleted`,
      timestamp: new Date().toISOString(),
    }

    console.log('[Cron] Job completed:', { ...summary, errors: `${results.errors.length} errors` })

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[Cron] Unexpected error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
