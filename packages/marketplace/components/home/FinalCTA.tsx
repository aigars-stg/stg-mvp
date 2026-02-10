'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function FinalCTA() {
  const t = useTranslations('HomePage.finalCTA');
  return (
    <section className="py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            {t('title')}
          </h2>
          <p className="text-lg sm:text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          <Link
            href="/auth"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-aurora-orange text-snow-white hover:shadow-md"
          >
            {t('button')}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
