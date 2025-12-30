'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { AuthContextType, UserProfile } from './types';

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
      const { data: { user } } = await (supabase as any).auth.getUser();

      if (!user) {
        console.error('❌ [Auth] Cannot create profile - no user found');
        return null;
      }

      console.log('🔧 [Auth] Creating missing profile for user:', user.id);

      const { data, error } = await (supabase as any)
        .from('user_profiles')
        .insert({
          id: userId,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email!,
          phone: user.user_metadata?.phone || null,
          country: user.user_metadata?.country || null,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [Auth] Failed to create profile:', error);
        return null;
      }

      console.log('✅ [Auth] Profile created successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('❌ [Auth] Profile creation failed:', error);
      return null;
    }
  }, []);

  // Update auth_providers column if needed (for performance optimization of check-email endpoint)
  const updateAuthProviders = useCallback(async (userId: string, userIdentities: any[] | undefined) => {
    if (!userIdentities || userIdentities.length === 0) return;

    try {
      const providers = [...new Set(userIdentities.map((identity: any) => identity.provider))];
      if (providers.length === 0) return;

      // Update only if auth_providers is empty (avoid unnecessary writes)
      await (supabase as any)
        .from('user_profiles')
        .update({ auth_providers: providers })
        .eq('id', userId)
        .or('auth_providers.is.null,auth_providers.eq.{}');
    } catch (error) {
      // Non-critical - log but don't fail
      console.warn('[Auth] Failed to update auth_providers:', error);
    }
  }, []);

  // Fetch user profile from database (uses view that includes seller data)
  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_profiles_full')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist (PGRST116), try to create it or retry
        if (error.code === 'PGRST116') {
          // If we haven't retried enough, wait and try again (trigger might be slow)
          if (retryCount < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchProfile(userId, retryCount + 1);
          }

          console.warn('[Auth] Profile not found after retries, attempting to create...');
          return await createMissingProfile(userId);
        }

        console.error('[Auth] Profile fetch error:', error.code, error.message);
        return null;
      }

      return data as UserProfile;
    } catch (error: any) {
      console.error('[Auth] Profile fetch exception:', error);
      return null;
    }
  }, [createMissingProfile]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let subscription: any = null;

    async function initAuth() {
      try {
        // Set up auth state listener FIRST before checking initial state
        // This ensures we don't miss any auth events during initialization
        const {
          data: { subscription: sub },
        } = (supabase as any).auth.onAuthStateChange(
          async (event: string, session: any) => {
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

              // AUTO RECOVERY CHECK
              if (userProfile?.deleted_at) {
                try {
                  const res = await fetch('/api/auth/recover-account', { method: 'POST' });
                  if (res.ok) {
                    // Refresh profile one more time to get clean state
                    const recoveredProfile = await fetchProfile(session.user.id);
                    setProfile(recoveredProfile);

                    // Refresh user session to get restored email
                    const { data: { user: refreshedUser } } = await (supabase as any).auth.getUser();
                    if (refreshedUser) {
                      setUser(refreshedUser);
                    }

                    router.refresh();
                    return; // Exit early using new profile
                  } else {
                    console.error('[Auth] Account recovery failed');
                  }
                } catch (recError) {
                  console.error('[Auth] Account recovery exception:', recError);
                }
              }

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
        const { data: { session } } = await (supabase as any).auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          // Mark that we already have a session (prevents reload on token refresh)
          hadSessionRef.current = true;
          setUser(session.user);

          // Update auth_providers for check-email performance optimization
          updateAuthProviders(session.user.id, session.user.identities);

          const userProfile = await fetchProfile(session.user.id);

          // AUTO RECOVERY CHECK (Initial Load)
          if (userProfile?.deleted_at) {
            console.log('♻️ [Auth] Deleted account detected on init, attempting recovery...');
            try {
              const res = await fetch('/api/auth/recover-account', { method: 'POST' });
              if (res.ok) {
                console.log('✅ [Auth] Account recovered successfully');
                const recoveredProfile = await fetchProfile(session.user.id);
                setProfile(recoveredProfile);

                // Refresh user session to get restored email
                const { data: { user: refreshedUser } } = await (supabase as any).auth.getUser();
                if (refreshedUser) {
                  setUser(refreshedUser);
                }
              } else {
                setProfile(userProfile);
              }
            } catch (recError) {
              setProfile(userProfile);
            }
          } else {
            setProfile(userProfile);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
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

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await (supabase as any).auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Log login activity (don't block on failure)
      try {
        const { data: { session } } = await (supabase as any).auth.getSession();

        await fetch('/api/auth/log-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign up with email and password
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    country: string | null
  ) => {
    try {
      // Create auth user
      const { error } = await (supabase as any).auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            full_name: fullName,
            country: country,
          },
        },
      });

      if (error) {
        return { error };
      }

      // Profile will be created automatically by database trigger

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign in with OAuth provider
  const signInWithOAuth = async (provider: 'google' | 'github' | 'facebook') => {
    try {
      const { error } = await (supabase as any).auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign in with magic link (passwordless)
  const signInWithMagicLink = async (email: string) => {
    try {
      // Derive a better default name from email (e.g. "alex" from "alex@gmail.com")
      const emailPrefix = email.split('@')[0];

      const { error } = await (supabase as any).auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          shouldCreateUser: true, // Creates account if doesn't exist
          data: {
            full_name: emailPrefix,
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
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await (supabase as any).auth.signOut();
      if (error) throw error;

      // Don't manually update state or navigate here
      // The auth listener will handle the SIGNED_OUT event
      // and update state/navigation automatically
      // This prevents race conditions between manual updates and listener updates
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await (supabase as any)
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
    } catch (error) {
      return { error: error as Error };
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
    signIn,
    signUp,
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
