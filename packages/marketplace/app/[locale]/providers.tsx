'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { OnboardingProvider } from '@/components/onboarding';
import { SavedListingsProvider } from '@/lib/contexts/SavedListingsContext';
import { ConditionalAnalytics } from '@/components/ConditionalAnalytics';
import { CookieConsent } from '@/components/CookieConsent';
import { UnreadMessagesProvider } from '@/lib/contexts/UnreadMessagesContext';
import { CartProvider } from '@/lib/contexts/CartContext';
import { PathTracker } from '@/components/PathTracker';
import { ToastProvider } from '@/components/common/Toast';
import { ThemeProvider } from '@/components/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance per component instance to avoid sharing state between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Consider data fresh for 1 minute
            refetchOnWindowFocus: false, // Don't refetch on window focus
            retry: 1, // Only retry once on failure
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <SavedListingsProvider>
              <UnreadMessagesProvider>
                <CartProvider>
                  <OnboardingProvider>
                    <PathTracker />
                    {children}
                  </OnboardingProvider>
                </CartProvider>
              </UnreadMessagesProvider>
            </SavedListingsProvider>
          </ToastProvider>
          <ConditionalAnalytics />
          <CookieConsent />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
