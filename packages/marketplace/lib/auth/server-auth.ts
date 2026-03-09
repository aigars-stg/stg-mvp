import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';
import type { SupabaseClient, User } from '@supabase/supabase-js';

interface ServerAuth {
  user: User;
  isStaff: boolean;
  serviceClient: SupabaseClient;
}

/**
 * Authenticate the current user and check staff status.
 * Redirects to sign-in if not authenticated.
 * Use in Server Components that need auth + staff check.
 */
export async function requireServerAuth(locale: string): Promise<ServerAuth> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/signin`);

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('is_staff')
    .eq('id', user.id)
    .single();

  return {
    user,
    isStaff: profile?.is_staff === true,
    serviceClient,
  };
}
