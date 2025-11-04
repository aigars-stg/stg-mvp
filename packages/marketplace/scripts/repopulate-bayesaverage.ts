import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Papa from 'papaparse';

interface CSVRecord {
  id: string;
  name: string;
  yearpublished: string;
  bayesaverage: string;
  is_expansion: string;
}

async function main() {
  // STEP 1: Load environment variables FIRST
  const envPath = path.join(process.cwd(), '..', '..', '.env.local');
  console.log(`🔧 Loading environment from: ${envPath}\n`);

  if (!fs.existsSync(envPath)) {
    console.error(`❌ .env.local not found at: ${envPath}`);
    process.exit(1);
  }

  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ Error loading .env.local:', result.error);
    process.exit(1);
  }

  console.log('✅ Environment variables loaded\n');

  // STEP 2: NOW dynamically import Supabase client (after env is loaded)
  const { createServiceClient } = await import('../lib/supabase/client');
  const supabase = createServiceClient();

  console.log('📊 Starting bayesaverage repopulation...\n');

  // STEP 3: Read CSV file
  const csvPath = path.join(process.cwd(), '..', '..', 'boardgames_ranks.csv');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }

  console.log(`📂 Reading CSV from: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // STEP 4: Parse CSV
  const { data: records } = Papa.parse<CSVRecord>(csvContent, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  console.log(`📖 Parsed ${records.length} records from CSV\n`);

  let updated = 0;
  let errors = 0;
  const batchSize = 100; // Smaller batches for parallel processing

  // STEP 5: Process in batches with parallel updates
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    // Update all records in batch in parallel
    const updatePromises = batch.map(async (record) => {
      const gameId = parseInt(record.id);
      const bayesAvg = record.bayesaverage ? parseFloat(record.bayesaverage) : null;

      const { error } = await supabase
        .from('games')
        .update({ bayesaverage: bayesAvg })
        .eq('id', gameId);

      return { success: !error, error };
    });

    const results = await Promise.all(updatePromises);

    const successes = results.filter((r) => r.success).length;
    const failures = results.filter((r) => !r.success).length;

    updated += successes;
    errors += failures;

    if ((i / batchSize + 1) % 100 === 0 || i + batchSize >= records.length) {
      const percent = ((updated / records.length) * 100).toFixed(1);
      console.log(`✅ Progress: ${updated}/${records.length} (${percent}%)`);
    }
  }

  console.log(`\n✅ Repopulation complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);

  // STEP 6: Verify some records
  console.log('\n🔍 Verifying sample records...');

  const sampleGames = ['Catan', 'Pandemic', 'Wingspan', 'Terraforming Mars'];

  for (const gameName of sampleGames) {
    const { data } = await supabase
      .from('games')
      .select('id, name, bayesaverage')
      .ilike('name', `%${gameName}%`)
      .limit(1)
      .single();

    if (data) {
      console.log(`   ${data.name}: ${data.bayesaverage || 'NULL'}`);
    }
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
