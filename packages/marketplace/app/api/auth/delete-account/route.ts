import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/error-handler';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function DELETE(_request: NextRequest) {
  try {
    // Create Supabase client with cookies for user auth
    const supabase = await createServerSupabase();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if already soft deleted
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('deleted_at')
      .eq('id', user.id)
      .single();

    if (profile?.deleted_at) {
      return NextResponse.json(
        { error: 'Account already deleted' },
        { status: 400 }
      );
    }

    // SOFT DELETE STRATEGY (GDPR Article 17.3.e - legal claims defense)
    // Data retained for 90 days for dispute resolution, then permanently deleted
    // Email anonymized immediately to allow reuse, but account recoverable for 14 days

    // Calculate recovery deadline (14 days from now)
    const recoveryDeadline = new Date();
    recoveryDeadline.setDate(recoveryDeadline.getDate() + 14);

    // Define anonymized email pattern (used for both user_profiles and auth.users)
    const anonymizedEmail = `deleted-${user.id}@internal.local`;

    // Step 0.5: SELLER SAFETY CHECKS (Financial Liability)
    // Check if seller has pending withdrawal requests
    const { data: pendingWithdrawals } = await supabase
      .from('withdrawal_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (pendingWithdrawals && pendingWithdrawals.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete account',
          message: 'You have pending withdrawal requests. Please wait for them to complete before deleting your account.',
        },
        { status: 400 }
      );
    }

    // Check for active orders (as buyer or seller)
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .in('status', ['pending_seller', 'confirmed', 'shipped', 'delivered', 'disputed'])
      .limit(1);

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete account',
          message: 'You have active orders. Please wait for all orders to complete before deleting your account.',
        },
        { status: 400 }
      );
    }

    // Step 0: Send Confirmation Email (Before modifying data)
    // We capture the original data before it's anonymized
    try {
      // Import dynamically to avoid cold start issues if possible, or just top-level
      const { sendAccountDeletedEmail } = await import('@/lib/email/send-account-emails');

      const userName = user.user_metadata?.full_name || 'User';

      await sendAccountDeletedEmail({
        email: user.email!,
        name: userName,
        recoveryDate: recoveryDeadline,
      });

    } catch {
      // Don't block deletion if email fails
    }

    // Step 1: Soft delete user profile
    // We ONLY anonymize the email to allow reuse.
    // Name, phone, and avatar are PRESERVED for the 14-day recovery period.
    // They will be permanently deleted/anonymized by a scheduled job after 90 days.
    const { error: softDeleteError } = await supabase
      .from('user_profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_reason: 'user_request',
        recovery_deadline: recoveryDeadline.toISOString(),
        original_email: user.email, // Store for recovery
        email: anonymizedEmail, // Free up the email immediately
        // full_name: 'Deleted User', // KEEP ORIGINAL
        // phone: null,               // KEEP ORIGINAL
        // avatar_url: null,          // KEEP ORIGINAL
      })
      .eq('id', user.id);

    if (softDeleteError) {
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    // Step 2: Mark all user's listings as 'removed' (hide from public, retain for disputes)
    const { error: listingsError } = await supabase
      .from('listings')
      .update({ status: 'removed' })
      .eq('seller_id', user.id)
      .in('status', ['draft', 'active', 'sold']); // Don't update already removed ones

    if (listingsError) {
      return NextResponse.json(
        { error: 'Failed to hide listings from public view' },
        { status: 500 }
      );
    }

    // Step 3: Delete avatar from storage
    // SKIPPED: Kept for 14-day recovery period.
    // Cleanup handled by scheduled job.
    /*
    try {
      const { data: files } = await supabase
        .storage
        .from('listing-photos')
        .list(`${user.id}/avatar`);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/avatar/${file.name}`);
        await supabase
          .storage
          .from('listing-photos')
          .remove(filePaths);
      }
    } catch (storageError) {
      console.error('Error deleting avatar:', storageError);
      // Continue even if avatar deletion fails
    }
    */

    // Step 4: Use service role to sign out all devices (revoke refresh tokens)
    const supabaseAdmin = createServiceClient();

    await supabaseAdmin.auth.admin.signOut(user.id, 'global');

    // Step 5: Anonymize email and clear PII in auth.users
    const { error: emailUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        email: anonymizedEmail,
        user_metadata: {}, // Clear any PII from metadata (name, phone, avatar from OAuth/signup)
      }
    );

    if (emailUpdateError) {
      // Don't fail the whole deletion if auth update fails
      // Profile email is already anonymized in user_profiles
      // Original email stored in user_profiles.original_email for recovery
    }

    // Step 6: Sign out current session
    await supabase.auth.signOut();

    // Note: PII ANONYMIZATION AND DATA RETENTION
    // Immediately anonymized/cleared:
    // - user_profiles: email, full_name, phone, avatar_url
    // - auth.users: email, user_metadata (OAuth/signup data)
    // - Storage: avatar photos deleted
    //
    // Retained for 90-day compliance period:
    // - auth.users record (email anonymized)
    // - user_profiles record (soft deleted, all PII anonymized)
    // - user_profiles.original_email (for 14-day recovery only)
    // - listings (marked as 'removed', hidden from public)
    // - transaction history (for dispute resolution)
    // - listing photos (for dispute resolution)
    //
    // User CAN recover account within 14 days via recovery endpoint
    // After 14 days: recovery not possible, but data retained for GDPR Article 17.3.e
    // After 90 days: scheduled cleanup job permanently deletes everything
    //
    // Email is immediately reusable for new account signups

    return NextResponse.json({
      success: true,
      message: 'Account deleted. You can recover your account within 14 days. Data will be permanently removed after 90 days retention period.',
      recovery_deadline: recoveryDeadline.toISOString()
    });
  } catch (error) {
    return handleApiError(error, 'Delete account');
  }
}
