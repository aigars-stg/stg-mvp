import { Link } from '@/i18n/navigation';
import {
  HouseIcon,
  FileTextIcon,
  LockIcon,
  BriefcaseIcon,
  BookOpenIcon,
  GearIcon,
  CoinsIcon,
} from '@phosphor-icons/react/ssr';
import type { Icon } from '@phosphor-icons/react';
import { LEGAL_SECTIONS } from './legal-sections';

// TODO: i18n — descriptions should come from translation keys
const sectionDescriptions: Record<string, string> = {
  overview: 'Marketplace info and quick answers',
  terms: 'Rules for using the platform',
  privacy: 'How we handle your data',
  seller: 'How selling works on Second Turn Games',
  buyer: 'Everything you need to know about buying',
  cookies: 'Which cookies we use and why',
  fees: 'Our pricing breakdown',
};

const sectionIcons: Record<string, Icon> = {
  overview: HouseIcon,
  terms: FileTextIcon,
  privacy: LockIcon,
  seller: BriefcaseIcon,
  buyer: BookOpenIcon,
  cookies: GearIcon,
  fees: CoinsIcon,
};

export function SectionNav() {
  return (
    <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {LEGAL_SECTIONS.map((section) => {
        const IconComponent = sectionIcons[section.id];
        return (
          <Link
            key={section.id}
            href={section.href}
            className="group flex items-start gap-3 rounded-lg border border-border-subtle p-4 transition-colors hover:border-frost-arctic/30 hover:bg-snow-stormLightest"
          >
            {IconComponent && (
              <IconComponent
                size={20}
                className="mt-0.5 shrink-0 text-frost-arctic"
              />
            )}
            <div>
              <span className="font-semibold text-polar-night group-hover:text-frost-arctic">
                {section.label}
              </span>
              <p className="mt-0.5 text-sm text-text-secondary">
                {sectionDescriptions[section.id]}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
