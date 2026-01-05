import {
  HeroSection,
  GameCollection,
  WantedCollection,
  HowItWorks,
  FinalCTA,
} from '@/components/home';

export default function HomePage() {
  return (
    <div className="overflow-hidden">
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
