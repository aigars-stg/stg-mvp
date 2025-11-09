import { Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  HeroSection,
  StatsCounter,
  FeaturedGames,
  FeaturedGamesLoading,
  HowItWorks,
  FinalCTA,
} from '@/components/home';

async function getStats() {
  const client = supabase;

  try {
    // Get total active listings
    const { count: listingsCount } = await client
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get total users
    const { count: usersCount } = await client
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Get active sellers (users with at least one listing)
    const { data: sellers } = await client
      .from('listings')
      .select('seller_id')
      .eq('status', 'active');

    const uniqueSellers = sellers ? new Set(sellers.map((s: { seller_id: string }) => s.seller_id)).size : 0;

    return {
      listings: listingsCount || 0,
      users: usersCount || 0,
      sellers: uniqueSellers,
      countries: 3, // Estonia, Latvia, Lithuania
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Return real zeros if data fetch fails
    return {
      listings: 0,
      users: 0,
      sellers: 0,
      countries: 3, // Always show 3 Baltic countries
    };
  }
}

export default async function HomePage() {
  const stats = await getStats();

  // Check if site is in "coming soon" mode
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  // Prepare stats for counter - using real data
  const statsData = [
    { label: 'Games Listed', value: stats.listings, suffix: stats.listings > 0 ? '+' : '' },
    { label: 'Happy Gamers', value: stats.users, suffix: stats.users > 0 ? '+' : '' },
    { label: 'Active Sellers', value: stats.sellers, suffix: stats.sellers > 0 ? '+' : '' },
    { label: 'Baltic Countries', value: stats.countries, suffix: '' },
  ];

  return (
    <div className="overflow-hidden">
      {/* Launching Soon Banner */}
      {isComingSoon && (
        <div className="bg-gradient-to-r from-frost-ice to-frost-sky text-snow-white py-3 px-4 text-center">
          <p className="text-sm sm:text-base font-medium">
            🎲 We're launching soon! This is a preview of what's coming to the Baltic board game community.
          </p>
        </div>
      )}

      {/* Hero Section */}
      <HeroSection isComingSoon={isComingSoon} />

      {/* Stats Counter */}
      <StatsCounter stats={statsData} />

      {/* Featured Games */}
      <Suspense fallback={<FeaturedGamesLoading />}>
        <FeaturedGames />
      </Suspense>

      {/* How It Works */}
      <HowItWorks />

      {/* Final CTA */}
      <FinalCTA isComingSoon={isComingSoon} />
    </div>
  );
}
