'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LegalNav, type LegalSectionId } from './LegalNav';
import { LegalSection } from './LegalSection';

interface LegalDocument {
  slug: string;
  frontmatter: { title: string; lastUpdated: string; description?: string };
  content: string;
}

interface LegalHubProps {
  documents: Record<string, LegalDocument>;
}

function LegalHubInner({ documents }: LegalHubProps) {
  const searchParams = useSearchParams();
  const section = (searchParams.get('section') || 'overview') as LegalSectionId;
  const doc = documents[section];

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }, [section]);

  if (!doc) {
    return (
      <div className="text-text-secondary">
        <p>Section not found.</p>
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
              <LegalNav />
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

export function LegalHub({ documents }: LegalHubProps) {
  return (
    <Suspense>
      <LegalHubInner documents={documents} />
    </Suspense>
  );
}
