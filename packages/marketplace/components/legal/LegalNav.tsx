'use client';

import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, FileText, Lock, Briefcase, BookOpen, Settings, Coins } from '@/lib/icons';
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
  const tCommon = useTranslations('Common');

  return (
    <nav aria-label={tCommon('aria.legalSections')}>
      {/* Desktop: sticky sidebar */}
      <div className="hidden rounded-lg border border-border-subtle bg-white/60 p-2 lg:block">
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
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text'
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
                  : 'bg-bg-elevated text-text-secondary hover:text-text'
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
