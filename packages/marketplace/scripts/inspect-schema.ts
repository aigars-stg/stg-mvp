
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
    console.log('🔍 Inspecting Live Database Schema...');

    // 1. Get all tables in public schema
    // Note: internal supabase tables are usually hidden or in other schemas
    // We cannot easily query information_schema with supabase-js directly without an RPC usually,
    // BUT we can try querying a known table or creating a temporary RPC if needed.
    // Actually, let's try to query information_schema directly via the JS client.
    // It usually creates a REST request to /rest/v1/information_schema/tables which might fail if permissions aren't set.
    // However, with SERVICE_ROLE_KEY we bypass RLS, so it *might* work if the API is exposed.

    // If direct query fails, we might have to rely on what we can see or assume, but let's try.

    // Alternative: We can list all *known* tables and check their columns.
    // But to discover *unknown* tables, we need information_schema.

    // Let's try querying a specific RPC if one exists for inspection, or just try the table.

    try {
        // NOTE: Supabase JS client usually targets 'public' schema by default. 
        // We can try to switch schema or use a raw query if we had a raw SQL tool.
        // Since I don't have a direct SQL tool, I will try to infer "Zombie Tables" by checking if the tables I *think* 
        // exist actually exist, and check the columns of 'user_profiles'.

        console.log('\n--- Checking User Profiles Columns ---');
        const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('*')
            .limit(1);

        if (userError) {
            console.error('Error fetching user_profiles:', userError);
        } else if (userProfile && userProfile.length > 0) {
            const columns = Object.keys(userProfile[0]);
            console.log('Columns found in user_profiles:', columns);

            const zombieColumns = columns.filter(c =>
                c.startsWith('stripe_connect_') ||
                c.startsWith('dac7_') ||
                c.startsWith('bank_account_') ||
                c === 'seller_status'
            );

            if (zombieColumns.length > 0) {
                console.log('⚠️  Confirmed Zombie Columns:', zombieColumns);
            } else {
                console.log('✅ No zombie columns found in user_profiles (sample row).');
            }
        } else {
            console.log('user_profiles is empty, cannot infer columns from data.');
        }

        console.log('\n--- Checking for Potential Zombie Tables ---');
        const tablesToCheck = [
            'seller_reviews',
            'seller_onboarding',
            'old_shipping_rates',
            'wishlist_games'
        ];

        for (const table of tablesToCheck) {
            const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
            if (!error) {
                console.log(`⚠️  Table EXISTS: ${table}`);
            } else {
                // Error usually means table doesn't exist (404) or permission error
                if (error.code === '42P01') { // undefined_table
                    console.log(`✅ Table does NOT exist: ${table}`);
                } else {
                    console.log(`❓ Status unknown for ${table}: ${error.code} - ${error.message}`);
                }
            }
        }

    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectSchema();
