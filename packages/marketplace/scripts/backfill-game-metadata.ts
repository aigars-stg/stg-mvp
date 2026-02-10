/**
 * Backfill missing game metadata (description, designers) for games with active listings
 *
 * Usage: npx ts-node scripts/backfill-game-metadata.ts
 *
 * This script:
 * 1. Finds all games that have active listings but missing description/designers
 * 2. Fetches fresh metadata from BGG API
 * 3. Updates the games table with the new data
 */

import { createClient } from '@supabase/supabase-js';
import { fetchGameMetadata } from '../lib/bgg-api';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting: BGG API recommends max 2 requests per second
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function backfillGameMetadata() {
  console.log('🚀 Starting game metadata backfill...\n');

  // Get games with active listings
  const { data: listingGames, error: listingError } = await supabase
    .from('listings')
    .select('bgg_game_id, game_name')
    .eq('status', 'active');

  if (listingError) {
    console.error('❌ Error fetching listings:', listingError);
    process.exit(1);
  }

  // Get unique game IDs
  const uniqueGameIds = [...new Set(listingGames?.map(l => l.bgg_game_id) || [])];
  console.log(`📊 Found ${uniqueGameIds.length} unique games with active listings\n`);

  // Check which ones need updating
  const { data: existingGames, error: gamesError } = await supabase
    .from('games')
    .select('id, name, description, designers')
    .in('id', uniqueGameIds);

  if (gamesError) {
    console.error('❌ Error fetching games:', gamesError);
    process.exit(1);
  }

  const gamesToUpdate = existingGames?.filter(g => !g.description || !g.designers) || [];
  console.log(`🔍 ${gamesToUpdate.length} games need metadata update\n`);

  if (gamesToUpdate.length === 0) {
    console.log('✅ All games already have description and designers!');
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const game of gamesToUpdate) {
    try {
      console.log(`📡 Fetching metadata for: ${game.name} (ID: ${game.id})`);

      const metadata = await fetchGameMetadata(game.id);

      if (!metadata) {
        console.log(`   ⚠️  No metadata returned for ${game.name}`);
        failed++;
        continue;
      }

      // Update the game with new metadata
      const { error: updateError } = await supabase
        .from('games')
        .update({
          description: metadata.description || null,
          designers: metadata.designers && metadata.designers.length > 0 ? metadata.designers : null,
          // Also update other fields if missing
          bayesaverage: metadata.bayesaverage || null,
          player_count: metadata.playerCount || null,
          min_age: metadata.minAge || null,
          playing_time: metadata.playingTime || null,
          thumbnail: metadata.thumbnail || null,
          image: metadata.image || null,
          metadata_fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (updateError) {
        console.log(`   ❌ Update failed: ${updateError.message}`);
        failed++;
      } else {
        const designerCount = metadata.designers?.length || 0;
        const descLength = metadata.description?.length || 0;
        console.log(`   ✅ Updated: ${designerCount} designer(s), ${descLength} char description`);
        updated++;
      }

      // Rate limit: wait 600ms between requests (< 2 req/sec)
      await delay(600);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Error: ${message}`);
      failed++;
      // Wait longer on error (might be rate limited)
      await delay(2000);
    }
  }

  console.log('\n📊 Backfill complete!');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Total: ${gamesToUpdate.length}`);
}

// Run the backfill
backfillGameMetadata()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
