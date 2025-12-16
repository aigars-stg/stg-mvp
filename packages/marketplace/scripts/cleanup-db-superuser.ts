
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
    const connectionString = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
    console.log('🔌 Connecting to database as superuser...');
    console.log(`   URL: ${connectionString}`);

    const sql = postgres(connectionString);

    try {
        // Read migration file
        const migrationPath = join(process.cwd(), 'supabase', 'migrations', '047_cleanup_unused_tables.sql');
        console.log(`📖 Reading migration file: ${migrationPath}`);
        const migrationSql = readFileSync(migrationPath, 'utf-8');

        // Split statements simply by semicolon is risky if logic contains semicolons (functions), 
        // but our migration is simple DDL.
        // However, using sql.file() is better if postgres.js supports it, but here we read content.
        // Let's just run the whole block? 
        // Postgres.js usually handles simple query blocks.

        console.log('🔄 Executing migration...');

        // We can try to execute it as a single block.
        await sql.unsafe(migrationSql);

        console.log('✅ Migration executed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
