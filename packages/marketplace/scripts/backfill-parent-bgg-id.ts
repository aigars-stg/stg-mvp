/**
 * Backfill parent_bgg_id for expansion games that have active listings
 *
 * Usage: npx ts-node scripts/backfill-parent-bgg-id.ts [--dry-run]
 *
 * This script:
 * 1. Finds expansion games with active listings that don't have parent_bgg_id set
 * 2. Fetches BGG metadata to find the base game via inbound expansion links
 * 3. Updates games.parent_bgg_id with the base game's BGG ID
 */

import { createClient } from '@supabase/supabase-js';
import { fetchGameMetadata } from '../lib/bgg-api';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const dryRun = process.argv.includes('--dry-run');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function backfillParentBggId() {
  if (dryRun) {
    console.log('DRY RUN — no database writes will be made\n');
  }

  console.log('Starting parent_bgg_id backfill...\n');

  // Find expansion games with active listings that need parent_bgg_id
  const { data: listingGames, error: listingError } = await supabase
    .from('listings')
    .select('bgg_game_id, game_name')
    .eq('status', 'active');

  if (listingError) {
    console.error('Error fetching listings:', listingError);
    process.exit(1);
  }

  const uniqueGameIds = [...new Set(listingGames?.map(l => l.bgg_game_id) || [])];

  // Filter to expansion games without parent_bgg_id
  const { data: expansionGames, error: gamesError } = await supabase
    .from('games')
    .select('id, name, is_expansion, parent_bgg_id')
    .in('id', uniqueGameIds)
    .eq('is_expansion', true)
    .is('parent_bgg_id', null);

  if (gamesError) {
    console.error('Error fetching games:', gamesError);
    process.exit(1);
  }

  if (!expansionGames || expansionGames.length === 0) {
    console.log('All expansion games with active listings already have parent_bgg_id set.');
    return;
  }

  console.log(`Found ${expansionGames.length} expansion game(s) needing parent_bgg_id\n`);

  let updated = 0;
  let failed = 0;

  for (const game of expansionGames) {
    try {
      console.log(`Fetching metadata for: ${game.name} (ID: ${game.id})`);

      const metadata = await fetchGameMetadata(game.id);

      if (!metadata) {
        console.log(`  No metadata returned for ${game.name}`);
        failed++;
        continue;
      }

      // Find the base game via inbound expansion links
      const parentLink = metadata.inboundLinks.find(
        l => l.type === 'boardgameexpansion'
      );

      if (!parentLink) {
        console.log(`  No parent game link found for ${game.name}`);
        failed++;
        continue;
      }

      const parentBggId = parseInt(parentLink.id);
      console.log(`  Found parent: ${parentLink.value} (ID: ${parentBggId})`);

      if (dryRun) {
        console.log(`  [DRY RUN] Would set parent_bgg_id = ${parentBggId}`);
        updated++;
        await delay(600);
        continue;
      }

      // Update the expansion game's parent_bgg_id
      const { error: updateError } = await supabase
        .from('games')
        .update({ parent_bgg_id: parentBggId })
        .eq('id', game.id);

      if (updateError) {
        console.log(`  Update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  Set parent_bgg_id = ${parentBggId}`);
        updated++;
      }

      // Ensure parent game exists with metadata
      const { data: parentGame } = await supabase
        .from('games')
        .select('id, thumbnail')
        .eq('id', parentBggId)
        .single();

      if (!parentGame) {
        console.log(`  Parent game ${parentBggId} not in DB — fetching from BGG...`);
        const parentMeta = await fetchGameMetadata(parentBggId);
        if (parentMeta) {
          await supabase.from('games').upsert({
            id: parentBggId,
            name: parentMeta.name,
            yearpublished: parentMeta.yearPublished || null,
            is_expansion: false,
            thumbnail: parentMeta.thumbnail || null,
            image: parentMeta.image || null,
            player_count: parentMeta.playerCount || null,
            min_age: parentMeta.minAge || null,
            playing_time: parentMeta.playingTime || null,
            description: parentMeta.description || null,
            designers: parentMeta.designers?.length ? parentMeta.designers : null,
            bayesaverage: parentMeta.bayesaverage || null,
            metadata_fetched_at: new Date().toISOString(),
          }, { onConflict: 'id' });
          console.log(`  Created/updated parent game: ${parentMeta.name}`);
        }
        await delay(600);
      } else if (!parentGame.thumbnail) {
        console.log(`  Parent game ${parentBggId} exists but missing metadata — refreshing...`);
        const parentMeta = await fetchGameMetadata(parentBggId);
        if (parentMeta) {
          await supabase.from('games').update({
            thumbnail: parentMeta.thumbnail || null,
            image: parentMeta.image || null,
            player_count: parentMeta.playerCount || null,
            min_age: parentMeta.minAge || null,
            playing_time: parentMeta.playingTime || null,
            metadata_fetched_at: new Date().toISOString(),
          }).eq('id', parentBggId);
          console.log(`  Refreshed parent game metadata`);
        }
        await delay(600);
      }

      await delay(600);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  Error: ${message}`);
      failed++;
      await delay(2000);
    }
  }

  console.log('\nBackfill complete:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${expansionGames.length}`);
}

backfillParentBggId()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
