'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Home, FileText, Lock, Briefcase, BookOpen, Settings, Coins } from 'griddy-icons';
import { LEGAL_SECTIONS, type LegalSectionId } from './legal-sections';

export type { LegalSectionId } from './legal-sections';

const SECTION_ICONS: Record<LegalSectionId, React.ComponentType<{ size?: string | number; className?: string }>> = {
  overview: Home,
  terms: FileText,
  privacy: Lock,
  seller: Briefcase,
  buyer: BookOpen,
  cookies: Settings,
  fees: Coins,
};

export function LegalNav() {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') || 'overview';

  return (
    <nav aria-label="Legal sections">
      {/* Desktop: sticky sidebar */}
      <div className="hidden rounded-lg border border-border-subtle bg-white/60 p-2 dark:border-polar-nightDark dark:bg-polar-nightDark/60 lg:block">
        <ul className="flex flex-col gap-1">
          {LEGAL_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.id];
            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  scroll={false}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-frost-ice/10 font-medium text-frost-ice'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text dark:text-snow-stormLight dark:hover:text-snow-stormLightest'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Mobile/Tablet: horizontal scrollable tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {LEGAL_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.id];
          return (
            <Link
              key={section.id}
              href={section.href}
              scroll={false}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-frost-ice text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-text dark:bg-polar-nightLight dark:text-snow-stormLight'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
