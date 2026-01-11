'use client';

import type { UserProfile } from '@/lib/auth/types';
import { useTranslations } from 'next-intl';

interface DashboardHeaderProps {
  profile: UserProfile | null;
  isProfileComplete: boolean;
}

/**
 * Dashboard header with personalized greeting.
 *
 * Brand Voice:
 * - Incomplete profile: "Welcome! Let's get you set up"
 * - Complete profile: "Welcome back, {firstName}"
 * - Uses first name only for warmth (not full name)
 * - No exclamation marks (per brand guide)
 * - Subtitle should be useful or removed
 */
export function DashboardHeader({
  profile,
  isProfileComplete,
}: DashboardHeaderProps) {
  const t = useTranslations('Dashboard.Header');
  // Use first name only for a warmer, less formal greeting
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="text-center">
      <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
        {isProfileComplete
          ? t('welcomeBack', { firstName })
          : t('letsSetUp')}
      </h1>
      {!isProfileComplete && (
        <p className="text-text-secondary mt-2">
          {t('quickSteps')}
        </p>
      )}
    </div>
  );
}