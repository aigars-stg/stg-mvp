'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { User, Session, AuthChangeEvent, Subscription, UserIdentity } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { loggers } from '@/lib/logger';
import type { AuthContextType, UserProfile } from './types';

const log = loggers.auth;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Track if we already had a session to distinguish fresh sign-in from token refresh
  const hadSessionRef = useRef(false);

  // Create missing profile (in case trigger didn't fire during signup)
  const createMissingProfile = useCallback(async (userId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        log.error('Cannot create profile - no user found');
        return null;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          full_name: authUser.user_metadata?.full_name || '',
          email: authUser.email!,
          phone: authUser.user_metadata?.phone || null,
          country: authUser.user_metadata?.country || null,
        })
        .select()
        .single();

      if (error) {
        log.error({ error: error.message }, 'Failed to create profile');
        return null;
      }

      return data as unknown as UserProfile;
    } catch (error: unknown) {
      log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Profile creation failed');
      return null;
    }
  }, []);

  // Update auth_providers column if needed (for performance optimization of check-email endpoint)
  const updateAuthProviders = useCallback(async (userId: string, userIdentities: UserIdentity[] | undefined) => {
    if (!userIdentities || userIdentities.length === 0) return;

    try {
      const providers = [...new Set(userIdentities.map((identity) => identity.provider))];
      if (providers.length === 0) return;

      // Update only if auth_providers is empty (avoid unnecessary writes)
      await supabase
        .from('user_profiles')
        .update({ auth_providers: providers })
        .eq('id', userId)
        .or('auth_providers.is.null,auth_providers.eq.{}');
    } catch {
      // Non-critical, silently ignore
    }
  }, []);

  // Fetch user profile from database (queries user_profiles + seller_profiles separately)
  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      const [profileResult, sellerResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, full_name, email, phone, avatar_url, country, preferred_locale, created_at, updated_at, deleted_at, deletion_reason, recovery_deadline, original_email, preferred_terminal_id, preferred_terminal_name, preferred_terminal_address, preferred_delivery_country, profile_banner_dismissed_until, onboarding_email_step, last_onboarding_email_at, is_staff')
          .eq('id', userId)
          .single(),
        supabase
          .from('seller_profiles')
          .select('seller_status')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (profileResult.error) {
        // If profile doesn't exist (PGRST116), try to create it or retry
        if (profileResult.error.code === 'PGRST116') {
          // If we haven't retried enough, wait and try again (trigger might be slow)
          if (retryCount < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchProfile(userId, retryCount + 1);
          }

          log.warn('Profile not found after retries, creating...');
          return await createMissingProfile(userId);
        }

        log.error({ code: profileResult.error.code, message: profileResult.error.message }, 'Profile fetch error');
        return null;
      }

      return {
        ...profileResult.data,
        seller_status: sellerResult.data?.seller_status ?? 'not_started',
      } as unknown as UserProfile;
    } catch (error: unknown) {
      log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Profile fetch exception');
      return null;
    }
  }, [createMissingProfile]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let subscription: Subscription | null = null;

    async function initAuth() {
      try {
        // Set up auth state listener FIRST before checking initial state
        // This ensures we don't miss any auth events during initialization
        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            if (!mounted) return;

            // Handle SIGNED_IN specially - but only for FRESH OAuth sign-ins
            // Token refreshes also trigger SIGNED_IN, so check if we already had a session
            // AND if this is an OAuth callback (has ?code= in URL)
            const isOAuthCallback = typeof window !== 'undefined' && window.location.search.includes('code=');
            const isFreshSignIn = event === 'SIGNED_IN' && !hadSessionRef.current && isOAuthCallback;
            if (isFreshSignIn) {
              hadSessionRef.current = true;

              // The Supabase client is locked during OAuth callback - any auth operations hang.
              // The cleanest solution is to reload the page which ensures a fully initialized state.
              // This only happens once per sign-in session.
              window.location.href = window.location.pathname; // Remove ?code= param
              return;
            }

            // Mark that we have a session (prevents reload on subsequent events)
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
              hadSessionRef.current = true;
            }

            // For token refresh (SIGNED_IN but already had session), skip profile fetch
            // since we already loaded it during INITIAL_SESSION. Re-fetching can hang
            // the Supabase client and block subsequent operations like sign out.
            if (event === 'SIGNED_IN' && hadSessionRef.current) {
              if (session?.user) {
                setUser(session.user); // Update user in case it changed
              }
              return;
            }

            if (session?.user) {
              setUser(session.user);

              // Update auth_providers for check-email performance optimization
              updateAuthProviders(session.user.id, session.user.identities);

              const userProfile = await fetchProfile(session.user.id);
              setProfile(userProfile);

              // Refresh server components after fresh sign-in
              if (isFreshSignIn) {
                router.refresh();
              }
            } else {
              setUser(null);
              setProfile(null);
            }

            // Handle sign out
            if (event === 'SIGNED_OUT') {
              hadSessionRef.current = false; // Reset so next sign-in triggers reload
              router.push('/');
              router.refresh();
            }
          }
        );

        subscription = sub;

        // Now check for existing session (faster than getUser())
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          // Mark that we already have a session (prevents reload on token refresh)
          hadSessionRef.current = true;
          setUser(session.user);

          // Update auth_providers for check-email performance optimization
          updateAuthProviders(session.user.id, session.user.identities);

          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        }

        setLoading(false);
      } catch (error: unknown) {
        log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error initializing auth');
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchProfile, updateAuthProviders, router]);

  // Sign in with OAuth provider
  const signInWithOAuth = async (provider: 'google' | 'github' | 'facebook', locale?: string, redirectTo?: string) => {
    try {
      // Include locale in redirect path so callback can capture it
      const redirectLocale = locale || 'en';
      const confirmUrl = `${window.location.origin}/${redirectLocale}/auth/confirm${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: confirmUrl,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  // Sign in with magic link (passwordless)
  const signInWithMagicLink = async (email: string, locale?: string, redirectTo?: string) => {
    try {
      // Derive a better default name from email (e.g. "alex" from "alex@gmail.com")
      const emailPrefix = email.split('@')[0];
      const redirectLocale = locale || 'en';
      const confirmUrl = `${window.location.origin}/${redirectLocale}/auth/confirm${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: confirmUrl,
          shouldCreateUser: process.env.NEXT_PUBLIC_COMING_SOON !== 'true',
          data: {
            full_name: emailPrefix,
            preferred_locale: redirectLocale,
          },
        },
      });

      if (error) {
        return { error };
      }

      // Persist email for context on /auth/confirm page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_auth_email', email);
      }

      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Don't manually update state or navigate here
      // The auth listener will handle the SIGNED_OUT event
      // and update state/navigation automatically
      // This prevents race conditions between manual updates and listener updates
    } catch (error: unknown) {
      log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Sign out error');
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return { error };
      }

      // Refresh profile
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);

      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (!user) return;

    const userProfile = await fetchProfile(user.id);
    setProfile(userProfile);
  };

  // Computed: check if user's email is verified
  const isEmailVerified = useMemo(() => {
    return user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined;
  }, [user]);

  // Computed: check if profile is complete (has display name and country)
  const isProfileComplete = useMemo(() => {
    if (!profile) return false;
    return !!(profile.full_name && profile.country);
  }, [profile]);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isEmailVerified,
    isProfileComplete,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
