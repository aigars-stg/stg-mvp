import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import dotenv from 'dotenv';

// Load env vars
const envPath = resolve(__dirname, '../../../.env.local');
console.log('🔍 Looking for .env.local at:', envPath);
if (existsSync(envPath)) {
  console.log('✅ Found .env.local');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ Error loading .env.local:', result.error);
  }
} else {
  console.log('⚠️  .env.local not found at path, trying default');
  dotenv.config(); // Try default
}

console.log('DEBUG: NEXT_PUBLIC_SUPABASE_URL =', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Unset');
console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY =', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Unset');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('❌ Please provide a migration file name');
    console.error('Usage: npx tsx scripts/run-migration.ts <migration-file>');
    process.exit(1);
  }

  const migrationPath = join(process.cwd(), 'supabase', 'migrations', migrationFile);

  try {
    console.log(`📝 Reading migration: ${migrationFile}`);
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log(`🔄 Executing migration...`);
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
