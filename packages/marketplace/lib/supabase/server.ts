import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

/**
 * Creates a Supabase client for use in API routes and server components.
 * Handles cookie-based authentication automatically.
 *
 * Usage:
 * ```ts
 * import { createServerSupabase } from '@/lib/supabase/server';
 *
 * export async function GET() {
 *   const supabase = await createServerSupabase();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 * ```
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cookies can only be modified in a Server Action or Route Handler
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Cookies can only be modified in a Server Action or Route Handler
          }
        },
      },
    }
  );
}

/**
 * Creates a read-only Supabase client for use in API routes.
 * Simpler version when you only need to read cookies (most GET requests).
 *
 * Usage:
 * ```ts
 * import { createServerSupabaseReadOnly } from '@/lib/supabase/server';
 *
 * export async function GET() {
 *   const supabase = await createServerSupabaseReadOnly();
 *   // ...
 * }
 * ```
 */
export async function createServerSupabaseReadOnly() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
