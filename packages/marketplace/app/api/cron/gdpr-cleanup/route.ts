import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/cron/gdpr-cleanup
 *
 * GDPR Article 17 — Right to Erasure (90-day retention cleanup)
 *
 * After account deletion, user data is soft-deleted and retained for 90 days
 * to support dispute resolution (GDPR Article 17.3.e). This cron job runs
 * daily to permanently anonymize/delete data for accounts past the 90-day
 * retention period.
 *
 * What it does:
 *   1. Finds user_profiles where deleted_at is more than 90 days ago
 *   2. Anonymizes remaining PII (full_name, phone, avatar_url, bio, original_email)
 *   3. Deletes listing photos from Supabase storage
 *   4. Deletes avatar photos from Supabase storage
 *   5. Logs cleanup actions for auditing
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/gdpr-cleanup",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (required in all environments)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      throw new Error('CRON_SECRET environment variable not set');
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized gdpr-cleanup request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS
    const supabase = createServiceClient();

    console.log('[Cron] Running GDPR 90-day cleanup job...');

    // Find accounts where deleted_at is more than 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: expiredProfiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', ninetyDaysAgo.toISOString())
      // Only process profiles that haven't been fully anonymized yet
      .neq('full_name', 'Deleted User');

    if (fetchError) {
      throw new Error(`Failed to fetch expired profiles: ${fetchError.message}`);
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      console.log('[Cron] No profiles past 90-day retention period');
      return NextResponse.json({
        success: true,
        processed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Cron] Found ${expiredProfiles.length} profiles to clean up`);

    let processedCount = 0;
    let storageErrorCount = 0;
    const processedUserIds: string[] = [];

    for (const profile of expiredProfiles) {
      const userId = profile.id;

      try {
        // 1. Anonymize remaining PII in user_profiles
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: 'Deleted User',
            phone: null,
            avatar_url: null,
            bio: null,
            original_email: null, // No longer needed after recovery window
          })
          .eq('id', userId);

        if (updateError) {
          console.error(`[Cron] Failed to anonymize profile ${userId}:`, updateError.message);
          continue;
        }

        // 2. Clear PII from auth.users metadata (belt and suspenders — should already be cleared at deletion)
        try {
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {},
          });
        } catch {
          // Non-fatal — profile is already anonymized
        }

        // 3. Delete listing photos from storage (listing-photos/{user_id}/ folder)
        try {
          // List all files in the user's listing photos folder
          const { data: photoFiles } = await supabase
            .storage
            .from('listing-photos')
            .list(userId, { limit: 1000 });

          if (photoFiles && photoFiles.length > 0) {
            // Supabase storage list returns items in the immediate folder
            // For nested folders, we need to handle subfolder listing
            const allPaths: string[] = [];

            for (const item of photoFiles) {
              if (item.id === null) {
                // This is a folder — list its contents
                const { data: subFiles } = await supabase
                  .storage
                  .from('listing-photos')
                  .list(`${userId}/${item.name}`, { limit: 1000 });

                if (subFiles && subFiles.length > 0) {
                  for (const subFile of subFiles) {
                    if (subFile.name) {
                      allPaths.push(`${userId}/${item.name}/${subFile.name}`);
                    }
                  }
                }
              } else {
                // This is a file
                allPaths.push(`${userId}/${item.name}`);
              }
            }

            if (allPaths.length > 0) {
              // Delete in batches of 100 (Supabase storage limit)
              for (let i = 0; i < allPaths.length; i += 100) {
                const batch = allPaths.slice(i, i + 100);
                const { error: deleteError } = await supabase
                  .storage
                  .from('listing-photos')
                  .remove(batch);

                if (deleteError) {
                  console.error(`[Cron] Storage delete error for ${userId}:`, deleteError.message);
                  storageErrorCount++;
                }
              }

              console.log(`[Cron] Deleted ${allPaths.length} files for user ${userId}`);
            }
          }
        } catch (storageError) {
          console.error(`[Cron] Storage cleanup error for ${userId}:`, storageError);
          storageErrorCount++;
          // Continue processing other users even if storage cleanup fails
        }

        // 4. Delete avatar from avatars bucket if it exists
        if (profile.avatar_url) {
          try {
            // Avatar URLs typically look like: .../storage/v1/object/public/avatars/{userId}/filename
            // Extract the path after the bucket name
            const avatarMatch = profile.avatar_url.match(/avatars\/(.+)$/);
            if (avatarMatch) {
              await supabase
                .storage
                .from('avatars')
                .remove([avatarMatch[1]]);
            }
          } catch {
            // Non-fatal — avatar may already be deleted
            storageErrorCount++;
          }
        }

        processedCount++;
        processedUserIds.push(userId);
      } catch (err) {
        console.error(`[Cron] Error processing user ${userId}:`, err);
      }
    }

    console.log(
      `[Cron] GDPR cleanup complete: ${processedCount}/${expiredProfiles.length} profiles anonymized` +
      (storageErrorCount > 0 ? `, ${storageErrorCount} storage errors` : '')
    );

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: expiredProfiles.length,
      storageErrors: storageErrorCount,
      userIds: processedUserIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'GDPR cleanup');
  }
}

// Also support POST for manual triggers
export const POST = GET;
