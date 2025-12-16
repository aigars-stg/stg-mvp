'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface OnboardingContextType {
  shouldShowProfileBanner: boolean;
  dismissProfileBanner: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, profile, loading } = useAuth();
  const [shouldShowProfileBanner, setShouldShowProfileBanner] = useState(false);

  // Check if we should show the profile banner
  useEffect(() => {
    if (loading || !user || !profile) {
      setShouldShowProfileBanner(false);
      return;
    }

    // Show profile banner if:
    // 1. User doesn't have an avatar
    // 2. Banner dismissal has expired (or never dismissed)
    const now = new Date();
    const bannerDismissedUntil = profile.profile_banner_dismissed_until
      ? new Date(profile.profile_banner_dismissed_until)
      : null;
    const bannerExpired = !bannerDismissedUntil || bannerDismissedUntil < now;
    const noAvatar = !profile.avatar_url;

    setShouldShowProfileBanner(noAvatar && bannerExpired);
  }, [user, profile, loading]);

  const dismissProfileBanner = useCallback(async () => {
    if (!user) return;

    setShouldShowProfileBanner(false);

    try {
      // Dismiss for 7 days
      const dismissUntil = new Date();
      dismissUntil.setDate(dismissUntil.getDate() + 7);

      await supabase
        .from('user_profiles')
        .update({ profile_banner_dismissed_until: dismissUntil.toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Failed to save profile banner dismissal:', error);
    }
  }, [user]);

  return (
    <OnboardingContext.Provider
      value={{
        shouldShowProfileBanner,
        dismissProfileBanner,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
