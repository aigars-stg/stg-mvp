import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    console.log('📦 [Data Export] Starting data export request...');

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [Data Export] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'You must be signed in to export your data' },
        { status: 401 }
      );
    }

    console.log(`📦 [Data Export] Exporting data for user: ${user.id}`);

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
      console.error('❌ [Data Export] Failed to fetch profile:', profileResult.error);
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

    console.log(`✅ [Data Export] Successfully exported data for user ${user.id}`);
    console.log(`   - Profile: ${exportData.profile ? 'included' : 'not found'}`);
    console.log(`   - Listings: ${exportData.listings.count}`);
    console.log(`   - Wanted Listings: ${exportData.wanted_listings.count}`);
    console.log(`   - Conversations: ${exportData.conversations.count}`);
    console.log(`   - Messages: ${exportData.messages.count}`);
    console.log(`   - Login Activity: ${exportData.login_activity.count}`);

    // Return JSON with appropriate headers for download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="second-turn-games-data-${user.id}-${Date.now()}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('❌ [Data Export] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to export data', details: error.message },
      { status: 500 }
    );
  }
}
