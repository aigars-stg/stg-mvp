/**
 * Backfill Script: Populate auth_providers column for existing users
 *
 * This script queries the Supabase Admin API to get all users' identity providers
 * and updates the auth_providers column in user_profiles.
 *
 * Run manually during low-traffic period:
 *   npx tsx scripts/backfill-auth-providers.ts
 *
 * Prerequisites:
 * - SUPABASE_SERVICE_ROLE_KEY must be set in environment
 * - Migration 055 must have been applied
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function backfillAuthProviders() {
  console.log('🔄 Starting auth_providers backfill...');

  let page = 1;
  const perPage = 100;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  while (true) {
    // Fetch users from Supabase Auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      break;
    }

    if (!users || users.length === 0) {
      console.log('✅ No more users to process');
      break;
    }

    console.log(`📄 Processing page ${page} (${users.length} users)...`);

    for (const user of users) {
      try {
        // Extract providers from identities
        const providers = user.identities?.map((identity) => identity.provider) || [];
        const uniqueProviders = [...new Set(providers)];

        if (uniqueProviders.length === 0) {
          // No identities, likely email-only user
          uniqueProviders.push('email');
        }

        // Update user_profiles only if auth_providers is empty
        const { data, error: updateError } = await supabase
          .from('user_profiles')
          .update({ auth_providers: uniqueProviders })
          .eq('id', user.id)
          .or('auth_providers.is.null,auth_providers.eq.{}')
          .select('id');

        if (updateError) {
          console.error(`  ❌ Error updating user ${user.id}:`, updateError.message);
          totalErrors++;
        } else if (data && data.length > 0) {
          console.log(`  ✅ Updated user ${user.id}: ${uniqueProviders.join(', ')}`);
          totalUpdated++;
        } else {
          // No rows updated - user already has providers set
          totalSkipped++;
        }
      } catch (error) {
        console.error(`  ❌ Exception processing user ${user.id}:`, error);
        totalErrors++;
      }
    }

    // Move to next page
    if (users.length < perPage) {
      break;
    }
    page++;
  }

  console.log('\n📊 Backfill Complete:');
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Skipped (already set): ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
}

// Run the backfill
backfillAuthProviders()
  .then(() => {
    console.log('\n✅ Backfill script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill script failed:', error);
    process.exit(1);
  });
