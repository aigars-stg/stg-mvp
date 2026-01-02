import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

// Lazy initialization to ensure env vars are loaded
let _supabase: ReturnType<typeof createBrowserClient<Database>> | null = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
        'Please check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  // Use createBrowserClient for proper cookie handling in Next.js
  _supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

/**
 * Client-side Supabase client with proper cookie handling
 * Use this in React components and client-side code
 *
 * We eagerly initialize on the client-side to prevent timing issues
 * with auth operations. On the server, we use a Proxy for lazy initialization.
 */
export const supabase = typeof window !== 'undefined'
  ? getSupabaseClient()
  : new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
      get: (_target, prop) => {
        const client = getSupabaseClient();
        return client[prop as keyof typeof client];
      }
    });

/**
 * Server-side client with service role (for imports and admin operations)
 * Use this in API routes and server-side scripts that need full access
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required. ' +
        'This is required for server-side operations like CSV imports.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
