import { Dices } from 'lucide-react';
import {
  HeroSection,
  GameCollection,
  WantedCollection,
  HowItWorks,
  FinalCTA,
} from '@/components/home';

export default function HomePage() {
  // Check if site is in "coming soon" mode
  const isComingSoon = true; // process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  return (
    <div className="overflow-hidden">
      {/* Launching Soon Banner */}
      {isComingSoon && (
        <div className="bg-frost-ice text-snow-white py-3 px-4 text-center">
          <p className="text-sm sm:text-base font-medium inline-flex items-center justify-center gap-2">
            <Dices className="w-5 h-5" />
            Coming soon - a preview of what's coming to the Baltic board game community.
          </p>
        </div>
      )}

      {/* Hero Section */}
      <HeroSection />

      {/* Collections - Listings and Wanted */}
      <GameCollection
        type="recently_listed"
        limit={8}
        viewAllHref="/browse?sort=newest"
      />

      <WantedCollection limit={8} />

      {/* How It Works */}
      <HowItWorks />

      {/* Final CTA */}
      <FinalCTA />
    </div>
  );
}
