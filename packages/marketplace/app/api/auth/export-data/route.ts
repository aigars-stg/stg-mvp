import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

// Force dynamic rendering for this route (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * Data Export API
 * GDPR Article 20: Right to Data Portability
 *
 * Returns all user data in JSON format (machine-readable)
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Fetch all user data in parallel
    const [
      profileResult,
      listingsResult,
      wantedListingsResult,
      conversationsResult,
      messagesResult,
      loginActivityResult,
    ] = await Promise.all([
      // User profile
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single(),

      // User's listings
      supabase
        .from('listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),

      // User's wanted listings
      supabase
        .from('wanted_listings')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false }),

      // User's conversations
      supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),

      // User's messages (both sent and received)
      supabase
        .from('messages')
        .select(`
          *,
          conversation:conversations(
            id,
            buyer_id,
            seller_id,
            listing_id
          )
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false }),

      // Login activity (last 30 days)
      supabase
        .from('login_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    // Check for errors
    if (profileResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch profile data' },
        { status: 500 }
      );
    }

    // Prepare export data
    const exportData = {
      // Metadata
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        format_version: '1.0',
        gdpr_compliance: 'Article 20 - Right to Data Portability',
      },

      // User profile data
      profile: profileResult.data || null,

      // Auth data (from Supabase Auth)
      auth: {
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at,
      },

      // Listings
      listings: {
        count: listingsResult.data?.length || 0,
        items: listingsResult.data || [],
      },

      // Wanted listings (ISO)
      wanted_listings: {
        count: wantedListingsResult.data?.length || 0,
        items: wantedListingsResult.data || [],
      },

      // Conversations
      conversations: {
        count: conversationsResult.data?.length || 0,
        items: conversationsResult.data || [],
      },

      // Messages
      messages: {
        count: messagesResult.data?.length || 0,
        items: messagesResult.data || [],
      },

      // Login activity (last 30 days)
      login_activity: {
        count: loginActivityResult.data?.length || 0,
        retention_period: '30 days',
        items: loginActivityResult.data || [],
      },
    };

    // Return JSON with appropriate headers for download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="second-turn-games-data-${user.id}-${Date.now()}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Export data');
  }
}
