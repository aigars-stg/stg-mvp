
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
const packageEnv = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const rootEnv = dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function runAudit() {
    console.log('--- 1. Checking SECURITY VULNERABILITY (user_profiles) ---');
    try {
        // Try to fetch profiles as anonymous user
        const { data, error } = await anonClient
            .from('user_profiles')
            .select('id, email, phone')
            .limit(3);

        if (error) {
            console.log('✅ SECURE: Anonymous access denied:', error.message);
        } else if (data && data.length > 0) {
            console.log('🚨 VULNERABLE: Found', data.length, 'profiles anonymously!');
            console.log('Sample data:', data[0]);
        } else {
            console.log('⚠️  Allowed but no data found (Table empty?)');
        }
    } catch (e) {
        console.error('Error checking vulnerability:', e);
    }

    console.log('\n--- 2. Checking REDUNDANT TABLES (Usage Stats) ---');

    const tablesToCheck = ['seller_payouts', 'tracking_events', 'games'];

    for (const table of tablesToCheck) {
        const { count, error } = await adminClient
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log(`❌ Table '${table}': Access Error (${error.message})`);
        } else {
            console.log(`📊 Table '${table}': ${count} rows`);
        }
    }

    // Attempt to list all tables if possible (indirectly via known names or brute force?)
    // Using direct SQL via RPC if "exec_sql" exists? Probably not.
    // We'll verify specific table existence from our migration list that we suspected were redundant.
}

runAudit();
