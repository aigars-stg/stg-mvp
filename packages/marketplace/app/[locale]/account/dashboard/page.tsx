'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ProfileCompletionCard } from '@/components/dashboard/ProfileCompletionCard';
import { SellerCTACard } from '@/components/dashboard/SellerCTACard';
import { PlatformFeaturesCard } from '@/components/dashboard/PlatformFeaturesCard';

/**
 * Account Dashboard - Feature discovery and seller conversion hub.
 *
 * Shows:
 * - Profile completion card (if incomplete)
 * - Seller CTA with inline terms
 * - Platform features education
 *
 * New users redirected here after magic link confirmation.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading, isProfileComplete } = useAuth();
  const sellerStatus = profile?.seller_status || 'not_started';

  // Profile card dismissal (session-based - reappears on new session)
  const [showProfileCard, setShowProfileCard] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting for sessionStorage
  useEffect(() => {
    setMounted(true);
    const dismissed = sessionStorage.getItem('profileCompletionDismissed');
    if (dismissed === 'true') {
      setShowProfileCard(false);
    }
  }, []);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [loading, user, router]);

  const handleDismissProfile = () => {
    sessionStorage.setItem('profileCompletionDismissed', 'true');
    setShowProfileCard(false);
  };

  const handleProfileComplete = () => {
    // Profile completed - card will hide on next render via isProfileComplete
    setShowProfileCard(false);
  };

  // Show loading state
  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-frost-ice border-t-transparent" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const shouldShowProfileCard = !isProfileComplete && showProfileCard;

  return (
    <div className="min-h-screen bg-bg">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <DashboardHeader
          profile={profile}
          isProfileComplete={isProfileComplete}
        />

        <div className="space-y-6 mt-8">
          {/* Profile Completion - conditional */}
          {shouldShowProfileCard && (
            <ProfileCompletionCard
              profile={profile}
              onDismiss={handleDismissProfile}
              onComplete={handleProfileComplete}
            />
          )}

          {/* Seller CTA - show unless already active seller */}
          {sellerStatus !== 'active' && (
            <SellerCTACard />
          )}

          {/* Platform Features - always show */}
          <PlatformFeaturesCard />
        </div>
      </div>
    </div>
  );
}
