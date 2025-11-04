import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cleanup job for permanently deleting soft-deleted accounts after 90-day retention period
 *
 * This route should be called by a scheduled job (e.g., Vercel Cron, GitHub Actions, etc.)
 * Run daily or weekly to ensure GDPR compliance
 *
 * IMPORTANT: Protect this endpoint with authentication in production
 * Options:
 * 1. Vercel Cron Secret in headers (X-Vercel-Cron-Secret)
 * 2. API key authentication
 * 3. IP whitelist
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify the request is from your cron job
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role for admin operations
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.delete(name);
          },
        },
      }
    );

    // Calculate date 90 days ago
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 90);
    const retentionDateISO = retentionDate.toISOString();

    console.log(`[Cleanup] Looking for accounts deleted before: ${retentionDateISO}`);

    // Find all soft-deleted accounts past retention period
    const { data: deletedProfiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, deleted_at, deletion_reason')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', retentionDateISO);

    if (fetchError) {
      console.error('[Cleanup] Error fetching deleted profiles:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch deleted accounts' },
        { status: 500 }
      );
    }

    if (!deletedProfiles || deletedProfiles.length === 0) {
      console.log('[Cleanup] No accounts to delete');
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No accounts past retention period'
      });
    }

    console.log(`[Cleanup] Found ${deletedProfiles.length} accounts to permanently delete`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each account
    for (const profile of deletedProfiles) {
      try {
        console.log(`[Cleanup] Deleting account: ${profile.id} (${profile.email})`);

        // 1. Delete all storage files for this user
        try {
          const { data: files } = await supabase
            .storage
            .from('listing-photos')
            .list(profile.id);

          if (files && files.length > 0) {
            const filePaths = files.map(file => `${profile.id}/${file.name}`);
            const { error: storageError } = await supabase
              .storage
              .from('listing-photos')
              .remove(filePaths);

            if (storageError) {
              console.error(`[Cleanup] Error deleting storage for ${profile.id}:`, storageError);
            } else {
              console.log(`[Cleanup] Deleted ${files.length} storage files for ${profile.id}`);
            }
          }
        } catch (storageError) {
          console.error(`[Cleanup] Storage deletion error for ${profile.id}:`, storageError);
          // Continue anyway
        }

        // 2. Delete auth user (this will CASCADE delete user_profiles and related data)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.id);

        if (deleteError) {
          console.error(`[Cleanup] Error deleting auth user ${profile.id}:`, deleteError);
          results.failed++;
          results.errors.push(`${profile.id}: ${deleteError.message}`);
        } else {
          console.log(`[Cleanup] Successfully deleted account ${profile.id}`);
          results.success++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`[Cleanup] Error processing ${profile.id}:`, error);
        results.failed++;
        results.errors.push(`${profile.id}: ${error.message}`);
      }
    }

    console.log(`[Cleanup] Completed: ${results.success} deleted, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      total: deletedProfiles.length,
      deleted: results.success,
      failed: results.failed,
      errors: results.errors,
      message: `Cleanup completed: ${results.success} accounts permanently deleted`
    });

  } catch (error: any) {
    console.error('[Cleanup] Cleanup job error:', error);
    return NextResponse.json(
      { error: 'Cleanup job failed', details: error.message },
      { status: 500 }
    );
  }
}
