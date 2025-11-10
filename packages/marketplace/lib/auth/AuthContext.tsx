'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
          full_name: user.user_metadata?.full_name || 'User',
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

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ [Auth] Profile fetch error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: userId
        });

        // If profile doesn't exist (PGRST116), try to create it
        if (error.code === 'PGRST116') {
          console.warn('⚠️ [Auth] Profile not found, attempting to create...');
          return await createMissingProfile(userId);
        }

        return null;
      }

      console.log('✅ [Auth] Profile loaded successfully:', data.id);
      return data as UserProfile;
    } catch (error: any) {
      console.error('❌ [Auth] Profile fetch exception:', error);
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
            console.log('🔐 Auth state changed:', event);

            if (!mounted) return;

            if (session?.user) {
              setUser(session.user);
              const userProfile = await fetchProfile(session.user.id);
              setProfile(userProfile);
            } else {
              setUser(null);
              setProfile(null);
            }

            // Handle specific events
            if (event === 'SIGNED_IN') {
              router.refresh();
            } else if (event === 'SIGNED_OUT') {
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
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
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
  }, [fetchProfile, router]);

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
        await fetch('/api/auth/log-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    country: string
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
  const signInWithOAuth = async (provider: 'google' | 'github') => {
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
      console.error('Error signing out:', error);
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

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
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
