
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

async function main() {
    // Load environment variables
    const envPath = path.join(process.cwd(), '..', '..', '.env.local');
    console.log(`🔧 Loading environment from: ${envPath}\n`);

    if (!fs.existsSync(envPath)) {
        console.error(`❌ .env.local not found at: ${envPath}`);
        process.exit(1);
    }

    const envConfig = dotenv.config({ path: envPath });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
        console.error('❌ Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    console.log('🗄️  Applying migration: 049_secure_profiles_views.sql\n');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '049_secure_profiles_views.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('⏳ Executing migration...');

    try {
        // Try to execute via RPC 'exec_sql' if available (common pattern in Supabase helpers)
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.log('⚠️  RPC exec_sql failed or missing. Attempting to run statements individually via invalid-but-sometimes-supported method or just alerting user if manual run is needed.');
            console.log('Error:', error.message);

            // Fallback: If we can't run remote SQL, we might have to ask user to run it.
            // But let's check if 'execute' RPC exists (another common pattern)
            const { error: execError } = await (supabase as any).rpc('execute', { query: sql });
            if (execError) {
                console.error('❌ Failed to execute SQL via RPC.');
                console.log('\n💡 Please apply the migration manually via Supabase Dashboard:');
                console.log('   1. Go to SQL Editor');
                console.log(`   2. Copy content from: ${migrationPath}`);
                console.log('   3. Run');
                process.exit(1);
            }
        }

        console.log('✅ Migration executed successfully!');

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ Migration failed:', message);
        process.exit(1);
    }
}

main();
