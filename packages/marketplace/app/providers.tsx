'use client';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { OnboardingProvider } from '@/components/onboarding';
import { SavedListingsProvider } from '@/lib/contexts/SavedListingsContext';
import { ConditionalAnalytics } from '@/components/ConditionalAnalytics';
import { CookieConsent } from '@/components/CookieConsent';
import { UnreadMessagesProvider } from '@/lib/contexts/UnreadMessagesContext';
import { CartProvider } from '@/lib/contexts/CartContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SavedListingsProvider>
        <UnreadMessagesProvider>
          <CartProvider>
            <OnboardingProvider>
              {children}
            </OnboardingProvider>
          </CartProvider>
        </UnreadMessagesProvider>
      </SavedListingsProvider>
      <ConditionalAnalytics />
      <CookieConsent />
    </AuthProvider>
  );
}
