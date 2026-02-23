'use client';

import { InfoIcon } from '@phosphor-icons/react/ssr';
import { useTranslations } from 'next-intl';

interface PlainTermsBoxProps {
  children: React.ReactNode;
}

export function PlainTermsBox({ children }: PlainTermsBoxProps) {
  const t = useTranslations('Legal');
  return (
    <div className="my-6 rounded-r-lg border-l-4 border-frost-arctic bg-snow-stormLightest p-4 print:break-inside-avoid sm:p-5">
      <div className="mb-1 flex items-center gap-2 font-medium text-polar-nightDark">
        <InfoIcon size={20} weight="fill" className="shrink-0 text-frost-arctic" />
        <span>{t('inPlainTerms')}</span>
      </div>
      <div className="text-sm leading-relaxed text-polar-nightDark">
        {children}
      </div>
    </div>
  );
}
