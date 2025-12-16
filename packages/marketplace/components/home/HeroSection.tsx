'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import { Search, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface HeroSectionProps {
  isComingSoon?: boolean;
}

export function HeroSection({ isComingSoon = false }: HeroSectionProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const hasHeroImage = true;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/browse');
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Optional background image */}
      {hasHeroImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-background.webp"
            alt="Board games background"
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-frost-ice/5 via-bg/80 to-bg" />
        </div>
      )}

      {/* Gradient background (always present) */}
      {!hasHeroImage && (
        <div className="absolute inset-0 bg-gradient-to-b from-frost-ice/10 via-frost-ice/5 to-transparent" />
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="text-center">
          {/* Main headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            Find your next
            <span className="text-aurora-orange"> board game adventure</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mb-8">
            Buy and sell pre-loved board games across Estonia, Latvia, and Lithuania
          </p>

          {/* Search Bar - Featured prominently */}
          {!isComingSoon && (
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for Catan, Ticket to Ride, Wingspan..."
                  className="w-full pl-12 pr-32 py-4 text-base sm:text-lg border-2 border-border rounded-xl bg-snow-white focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 transition-all shadow-sm"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  Search
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* Quick Links */}
          {!isComingSoon && (
            <div className="flex flex-wrap gap-3 justify-center items-center">
              <span className="text-sm text-text-muted">Popular:</span>
              {['Catan', 'Ticket to Ride', 'Azul', 'Wingspan', 'Pandemic'].map((game) => (
                <Link
                  key={game}
                  href={`/browse?search=${encodeURIComponent(game)}`}
                  className="px-3 py-1 text-sm bg-bg-secondary hover:bg-frost-ice/10 border border-border rounded-full text-text-secondary hover:text-frost-ice transition-colors"
                >
                  {game}
                </Link>
              ))}
            </div>
          )}

          {/* Coming Soon State */}
          {isComingSoon && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" variant="primary" className="w-full sm:w-auto min-w-[200px]" disabled>
                Coming Soon
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
