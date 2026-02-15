'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { HelpNav, type HelpSectionId } from './HelpNav';
import { LegalSection } from '../legal/LegalSection';

interface HelpDocument {
  slug: string;
  frontmatter: { title: string; lastUpdated: string; description?: string };
  content: string;
}

interface HelpHubProps {
  documents: Record<string, HelpDocument>;
}

function HelpHubInner({ documents }: HelpHubProps) {
  const searchParams = useSearchParams();
  const t = useTranslations('Help');
  const section = (searchParams.get('section') || 'overview') as HelpSectionId;
  const doc = documents[section];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  if (!doc) {
    return (
      <div className="text-text-secondary">
        <p>{t('sectionNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          {/* Sidebar / Mobile tabs */}
          <aside className="mb-6 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <HelpNav />
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 rounded-lg border border-border-subtle bg-white p-6 sm:p-8">
            <LegalSection
              title={doc.frontmatter.title}
              lastUpdated={doc.frontmatter.lastUpdated}
              content={doc.content}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export function HelpHub({ documents }: HelpHubProps) {
  return (
    <Suspense>
      <HelpHubInner documents={documents} />
    </Suspense>
  );
}
