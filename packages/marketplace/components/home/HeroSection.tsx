import Link from 'next/link';
import { Button } from '@second-turn/design-system';
import Image from 'next/image';

interface HeroSectionProps {
  isComingSoon?: boolean;
}

export function HeroSection({ isComingSoon = false }: HeroSectionProps) {
  // Check if hero image exists
  const hasHeroImage = true; 

  return (
    <section className="relative overflow-hidden">
      {/* Optional background image */}
      {hasHeroImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-background.webp"
            alt="Board games background"
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-frost-ice/10 to-bg" />
        </div>
      )}

      {/* Gradient background (always present) */}
      {!hasHeroImage && (
        <div className="absolute inset-0 bg-gradient-to-b from-frost-ice/10 via-frost-ice/5 to-transparent" />
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
        <div className="text-center">
          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6 tracking-tight">
            Every Game Deserves
            <br />
            <span className="text-aurora-orange">a Second Turn</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl lg:text-2xl text-text-secondary max-w-3xl mx-auto mb-4">
            The Baltic board game community's marketplace
          </p>

          {/* Enhanced value prop */}
          <p className="text-base sm:text-lg text-text-muted max-w-2xl mx-auto mb-10">
            Buy quality pre-loved games, sell your finished adventures, and connect with gamers across Estonia, Latvia, and Lithuania
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {isComingSoon ? (
              <>
                <Button size="lg" variant="primary" className="w-full sm:w-auto min-w-[200px]" disabled>
                  Coming Soon
                </Button>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[200px]" disabled>
                  Coming Soon
                </Button>
              </>
            ) : (
              <>
                <Link href="/browse">
                  <Button size="lg" variant="primary" className="w-full sm:w-auto min-w-[200px]">
                    Find Your Next Game
                  </Button>
                </Link>
                <Link href="/sell">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[200px]">
                    List Your Game (Free)
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
