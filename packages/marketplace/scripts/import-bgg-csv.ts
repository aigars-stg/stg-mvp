import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Use require for csv-parser (CommonJS module)
const csv = require('csv-parser');

interface CSVRow {
  id: string;
  name: string;
  yearpublished: string;
  bayesaverage: string;
  is_expansion: string;
}

interface Game {
  id: number;
  name: string;
  yearpublished: number | null;
  bayesaverage: number | null;
  is_expansion: boolean;
}

async function main() {
  // STEP 1: Load environment variables FIRST
  const envPath = path.join(process.cwd(), '..', '..', '.env.local');
  console.log(`🔧 Loading environment from: ${envPath}\n`);

  if (!fs.existsSync(envPath)) {
    console.error(`❌ .env.local not found at: ${envPath}`);
    console.error('Please create .env.local in the project root with Supabase credentials\n');
    process.exit(1);
  }

  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ Error loading .env.local:', result.error);
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(
    `   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}`
  );
  console.log(
    `   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`
  );
  console.log(
    `   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'}\n`
  );

  // Verify all required variables are present
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error('❌ Missing required environment variables');
    console.error('Please ensure your .env.local contains:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }

  // STEP 2: NOW dynamically import Supabase client (after env is loaded)
  const { createServiceClient } = await import('../lib/supabase/client');
  const supabase = createServiceClient();

  console.log('🎲 Starting BGG CSV import...');
  console.log('   Importing: id, name, yearpublished, bayesaverage, is_expansion');
  console.log('   Additional metadata (images, versions, etc.) fetched from BGG API on-demand\n');

  // STEP 3: Find and parse CSV
  const csvPath = path.join(process.cwd(), '..', '..', 'boardgames_ranks.csv');
  console.log(`📂 Looking for CSV at: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV file not found at: ${csvPath}\n` +
        `Please ensure boardgames_ranks.csv is in the project root directory`
    );
  }

  const games: Game[] = [];
  let rowCount = 0;
  let parseErrors = 0;

  // Parse CSV - only extract columns we need
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: CSVRow) => {
        rowCount++;

        try {
          // Convert CSV row to database format
          const game: Game = {
            id: parseInt(row.id),
            name: row.name,
            yearpublished: row.yearpublished ? parseInt(row.yearpublished) : null,
            bayesaverage: row.bayesaverage ? parseFloat(row.bayesaverage) : null,
            is_expansion: row.is_expansion === '1',
          };

          // Validate required fields
          if (!game.id || !game.name) {
            parseErrors++;
            return;
          }

          games.push(game);

          // Progress indicator every 10k rows
          if (rowCount % 10000 === 0) {
            console.log(`📊 Parsed ${rowCount.toLocaleString()} rows...`);
          }
        } catch (error) {
          parseErrors++;
        }
      })
      .on('end', () => {
        console.log(`\n✅ CSV parsing complete:`);
        console.log(`   Total rows processed: ${rowCount.toLocaleString()}`);
        console.log(`   Valid games: ${games.length.toLocaleString()}`);
        console.log(`   Parse errors: ${parseErrors.toLocaleString()}\n`);
        resolve();
      })
      .on('error', reject);
  });

  if (games.length === 0) {
    throw new Error('No valid games found in CSV file');
  }

  // STEP 4: Insert in batches
  const BATCH_SIZE = 1000;
  const batches: Game[][] = [];

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    batches.push(games.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Inserting ${batches.length} batches into Supabase...`);
  console.log(`   (${BATCH_SIZE} games per batch)\n`);

  let successfulBatches = 0;
  let failedBatches = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const { error } = await supabase.from('games').upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error.message);
        failedBatches++;
        continue;
      }

      successfulBatches++;

      // Progress indicator
      const progress = ((i + 1) / batches.length) * 100;
      if ((i + 1) % 10 === 0 || i === batches.length - 1) {
        console.log(`✅ Batch ${i + 1}/${batches.length} (${progress.toFixed(1)}%)`);
      }
    } catch (error: any) {
      console.error(`❌ Batch ${i + 1} exception:`, error.message);
      failedBatches++;
    }
  }

  console.log(`\n📊 Batch Insert Summary:`);
  console.log(`   Successful: ${successfulBatches}/${batches.length}`);
  console.log(`   Failed: ${failedBatches}/${batches.length}\n`);

  // STEP 5: Verify import
  console.log('🔍 Verifying database...');

  const { count: totalCount, error: countError } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting games:', countError);
    throw countError;
  }

  const { count: baseGamesCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('is_expansion', false);

  const { count: expansionsCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('is_expansion', true);

  console.log(`\n🎉 Import Complete!\n`);
  console.log(`📊 Database Statistics:`);
  console.log(`   Total games: ${totalCount?.toLocaleString() || 0}`);
  console.log(`   Base games: ${baseGamesCount?.toLocaleString() || 0}`);
  console.log(`   Expansions: ${expansionsCount?.toLocaleString() || 0}\n`);

  console.log(`💡 Next Steps:`);
  console.log(`   1. Test search: Go to http://localhost:3002/sell`);
  console.log(`   2. Search for "Terra", "Wingspan", "Catan"`);
  console.log(`   3. Verify no expansions appear in results`);
  console.log(`   4. Click a game to test on-demand metadata fetching\n`);
}

// Run main function
main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  });
