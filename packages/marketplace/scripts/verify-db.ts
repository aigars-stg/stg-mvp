import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('❌ Missing Environment Variables in .env.local');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? 'Set' : 'Missing');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', key ? 'Set' : 'Missing');
    process.exit(1);
}

const supabase = createClient(url, key);

async function verifyConnection() {
    console.log('🔌 Connecting to Supabase...');
    console.log(`   URL: ${url}`);

    const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Connection Failed:', error.message);
        process.exit(1);
    }

    console.log('✅ Connection Successful!');
    console.log(`   Access verified. Table 'user_profiles' has ${count} records.`);
}

verifyConnection();
