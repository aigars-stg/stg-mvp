'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Home, FileText, Lock, Briefcase, Settings, Coins } from '@/lib/icons';
import { LEGAL_SECTIONS, type LegalSectionId } from './legal-sections';

export type { LegalSectionId } from './legal-sections';

const SECTION_ICONS: Record<LegalSectionId, React.ComponentType<{ size?: string | number; className?: string }>> = {
  overview: Home,
  terms: FileText,
  privacy: Lock,
  seller: Briefcase,
  cookies: Settings,
  fees: Coins,
};

export function LegalNav() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const lastSegment = segments[segments.length - 1];
  const activeSection = lastSegment === 'legal' ? 'overview' : lastSegment;
  const tCommon = useTranslations('Common');
  const tLegal = useTranslations('Legal');

  return (
    <nav aria-label={tCommon('aria.legalSections')}>
      {/* Desktop: sticky sidebar */}
      <div className="hidden rounded-lg border border-border p-1 bg-snow-white shadow-sm lg:block">
        <ul className="flex flex-col gap-0.5">
          {LEGAL_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.id];
            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-frost-ice text-snow-white shadow-sm'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {tLegal(section.labelKey)}
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
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-frost-ice text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-text'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              {tLegal(section.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
