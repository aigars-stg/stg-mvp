/**
 * Pre-cache BGG thumbnails for top-rated games
 *
 * This script fetches thumbnails from BGG API and stores them in the database
 * to avoid on-demand API calls during production.
 *
 * Run: npx tsx packages/marketplace/scripts/cache-bgg-thumbnails.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createServiceClient } from '../lib/supabase/client';
import { fetchGameMetadata } from '../lib/bgg-api';

// Load environment variables
const envPath = path.join(process.cwd(), '..', '..', '.env.local');
dotenv.config({ path: envPath });

interface Game {
  id: number;
  name: string;
  bayesaverage: number | null;
}

async function main() {
  console.log('🖼️  BGG Thumbnail Caching Script\n');

  const supabase = createServiceClient();
  const BATCH_SIZE = 100;
  const DELAY_MS = 1000; // 1 second between requests (BGG rate limit friendly)

  // Step 1: Get top games without thumbnails
  console.log('📊 Fetching games without thumbnails...');

  const { data: games, error } = await supabase
    .from('games')
    .select('id, name, bayesaverage')
    .is('thumbnail', null)
    .order('bayesaverage', { ascending: false })
    .limit(BATCH_SIZE) as { data: Game[] | null; error: any };

  if (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }

  if (!games || games.length === 0) {
    console.log('✅ All top games already have thumbnails cached!');
    process.exit(0);
  }

  console.log(`📦 Found ${games.length} games without thumbnails\n`);

  // Step 2: Fetch thumbnails from BGG
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const progress = `[${i + 1}/${games.length}]`;

    try {
      console.log(`${progress} Fetching ${game.name} (ID: ${game.id})...`);

      // Fetch metadata from BGG
      const metadata = await fetchGameMetadata(game.id);

      if (!metadata) {
        console.log(`  ⚠️  No metadata returned from BGG`);
        failCount++;
        continue;
      }

      if (!metadata.thumbnail && !metadata.image) {
        console.log(`  ⚠️  No images available for this game`);
        skipCount++;
        continue;
      }

      // Update database with thumbnail and image
      const { error: updateError } = await supabase
        .from('games')
        .update({
          thumbnail: metadata.thumbnail,
          image: metadata.image,
          metadata_fetched_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (updateError) {
        console.log(`  ❌ Database update failed:`, updateError.message);
        failCount++;
      } else {
        console.log(`  ✅ Cached thumbnail`);
        successCount++;
      }

      // Rate limiting: wait between requests
      if (i < games.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      failCount++;

      // If we get 401/403, stop the script
      if (error.message?.includes('401') || error.message?.includes('403')) {
        console.error('\n⛔ BGG API authentication error - stopping script');
        console.error('   Please check BGG API access and authentication requirements\n');
        break;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⚠️  Skipped (no images): ${skipCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('='.repeat(60) + '\n');

  // Check if more games remain
  const { count: remainingCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .is('thumbnail', null);

  if (remainingCount && remainingCount > 0) {
    console.log(`📦 ${remainingCount} games still need thumbnails`);
    console.log('   Run this script again to cache more\n');
  } else {
    console.log('🎉 All games with ratings now have thumbnails!\n');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
