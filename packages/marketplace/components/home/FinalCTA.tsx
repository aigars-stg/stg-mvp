import Link from 'next/link';
import { Button } from '@second-turn/design-system';

export function FinalCTA() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Ready to Give a Game Its Second Turn?
          </h2>
          <p className="text-lg sm:text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            Join the Baltic board game community. 
            Buy, sell, and discover amazing games.
          </p>
          <Link href="/browse">
            <Button variant="primary" size="lg" className="min-w-[240px]">
              Start Browsing Games
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
