import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

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

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET is not set');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role for admin operations
    const supabase = createServiceClient();

    // Calculate date 90 days ago
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 90);
    const retentionDateISO = retentionDate.toISOString();


    // Find all soft-deleted accounts past retention period
    const { data: deletedProfiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, deleted_at, deletion_reason')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', retentionDateISO);

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch deleted accounts' },
        { status: 500 }
      );
    }

    if (!deletedProfiles || deletedProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No accounts past retention period'
      });
    }


    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each account
    for (const profile of deletedProfiles) {
      try {

        // 1. Delete all storage files for this user
        try {
          const { data: files } = await supabase
            .storage
            .from('listing-photos')
            .list(profile.id);

          if (files && files.length > 0) {
            const filePaths = files.map(file => `${profile.id}/${file.name}`);
            await supabase
              .storage
              .from('listing-photos')
              .remove(filePaths);
          }
        } catch {
          // Continue anyway - storage deletion failure shouldn't block account cleanup
        }

        // 2. Delete auth user (this will CASCADE delete user_profiles and related data)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.id);

        if (deleteError) {
          results.failed++;
          results.errors.push(`${profile.id}: ${deleteError.message}`);
        } else {
          results.success++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.failed++;
        results.errors.push(`${profile.id}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: deletedProfiles.length,
      deleted: results.success,
      failed: results.failed,
      errors: results.errors,
      message: `Cleanup completed: ${results.success} accounts permanently deleted`
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Cleanup job failed', details: message },
      { status: 500 }
    );
  }
}
