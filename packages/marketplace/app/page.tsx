import { supabase } from '@/lib/supabase/client';
import {
  HeroSection,
  StatsCounter,
  GameCollection,
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
    return {
      listings: 0,
      users: 0,
      sellers: 0,
      countries: 3,
    };
  }
}

export default async function HomePage() {
  const stats = await getStats();

  // Check if site is in "coming soon" mode
  const isComingSoon = true; // process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  // Prepare stats for counter
  const statsData = [
    { label: 'Games listed', value: stats.listings, suffix: stats.listings > 0 ? '+' : '' },
    { label: 'Happy gamers', value: stats.users, suffix: stats.users > 0 ? '+' : '' },
    { label: 'Active sellers', value: stats.sellers, suffix: stats.sellers > 0 ? '+' : '' },
    { label: 'Baltic countries', value: stats.countries, suffix: '' },
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

      {/* Hero Section with Search */}
      <HeroSection isComingSoon={isComingSoon} />

      {/* Stats Counter */}
      <StatsCounter stats={statsData} />

      {/* Game Collections - Algorithm-driven */}
      {!isComingSoon && (
        <>
          {/* Just Listed - Newest arrivals */}
          <GameCollection
            type="recently_listed"
            limit={8}
            viewAllHref="/browse?sort=newest"
          />

          {/* Popular Games - Hidden for launch
          <GameCollection
            type="popular"
            limit={8}
            viewAllHref="/browse"
          />
          */}

          {/* Like New Games */}
          <GameCollection
            type="great_condition"
            limit={8}
            viewAllHref="/browse?condition=likeNew"
          />

          {/* From Trusted Sellers - Hidden for launch
          <GameCollection
            type="trusted_sellers"
            limit={8}
            viewAllHref="/browse"
          />
          */}
        </>
      )}

      {/* How It Works */}
      {!isComingSoon && <HowItWorks />}

      {/* Final CTA */}
      <FinalCTA isComingSoon={isComingSoon} />
    </div>
  );
}
