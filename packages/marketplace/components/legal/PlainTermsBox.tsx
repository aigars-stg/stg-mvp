'use client';

import { ClipboardList } from '@/lib/icons';
import { useTranslations } from 'next-intl';

interface PlainTermsBoxProps {
  children: React.ReactNode;
}

export function PlainTermsBox({ children }: PlainTermsBoxProps) {
  const t = useTranslations('Legal');
  return (
    <div className="my-6 rounded-lg border border-frost-ice/20 bg-frost-ice/5 p-4 print:break-inside-avoid sm:p-5">
      <div className="mb-2 flex items-center gap-2 font-semibold text-polar-night">
        <ClipboardList className="h-4 w-4 text-frost-ice" />
        <span>{t('inPlainTerms')}</span>
      </div>
      <div className="text-sm leading-relaxed text-text-secondary">
        {children}
      </div>
    </div>
  );
}
