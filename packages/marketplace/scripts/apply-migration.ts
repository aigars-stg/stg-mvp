import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

async function main() {
  // Load environment variables
  const envPath = path.join(process.cwd(), '..', '..', '.env.local');
  console.log(`🔧 Loading environment from: ${envPath}\n`);

  if (!fs.existsSync(envPath)) {
    console.error(`❌ .env.local not found at: ${envPath}`);
    process.exit(1);
  }

  dotenv.config({ path: envPath });

  // Import Supabase client
  const { createServiceClient } = await import('../lib/supabase/client');
  const supabase = createServiceClient();

  console.log('🗄️  Applying migration: 002_add_bayesaverage.sql\n');

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '002_add_bayesaverage.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📜 SQL to execute:');
  console.log(sql);
  console.log('\n⏳ Executing migration...\n');

  try {
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If RPC doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, trying direct execution...\n');

      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await (supabase as any).rpc('execute', { query: statement });
        if (execError) {
          console.error(`❌ Error executing statement:`, execError);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    // Verify the column exists
    const { data, error: queryError } = await supabase
      .from('games')
      .select('id, name, bayesaverage')
      .limit(1);

    if (queryError) {
      console.error('❌ Migration may have failed:', queryError);
      console.log('\n💡 Please apply the migration manually via Supabase Dashboard:');
      console.log('   1. Go to SQL Editor in Supabase Dashboard');
      console.log('   2. Paste the SQL from: packages/marketplace/supabase/migrations/002_add_bayesaverage.sql');
      console.log('   3. Click RUN\n');
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('   Column "bayesaverage" is now available in games table\n');

    if (data && data.length > 0) {
      console.log('📊 Sample row:');
      console.log(`   ID: ${data[0].id}, Name: ${data[0].name}, BayesAvg: ${data[0].bayesaverage || 'NULL'}\n`);
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Please apply the migration manually via Supabase Dashboard:');
    console.log('   1. Go to SQL Editor in Supabase Dashboard');
    console.log('   2. Copy SQL from: packages/marketplace/supabase/migrations/002_add_bayesaverage.sql');
    console.log('   3. Click RUN\n');
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
