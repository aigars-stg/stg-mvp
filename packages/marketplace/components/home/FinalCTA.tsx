import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Ready to give a game its second turn?
          </h2>
          <p className="text-lg sm:text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            Join the Baltic board game community. Buy pre-loved games, sell your collection, or post what you're hunting for.
          </p>
          <Link
            href="/auth"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-aurora-orange text-snow-white hover:shadow-md"
          >
            Join
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
