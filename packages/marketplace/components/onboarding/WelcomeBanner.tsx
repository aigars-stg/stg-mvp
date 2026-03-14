'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from 'next-intl';
import { Check } from '@/lib/icons';
import { cleanUrlParam } from '@/lib/utils/clean-url-param';

export function WelcomeBanner() {
  const t = useTranslations('WelcomeBanner');
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (user && searchParams.get('welcome') === 'true') {
      setVisible(true);
      cleanUrlParam('welcome');
    }
  }, [user, searchParams]);

  if (!visible) return null;

  return (
    <div className="bg-aurora-green/10 border border-aurora-green/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-sm text-polar-night">
        <div className="w-6 h-6 bg-aurora-green/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-aurora-green" />
        </div>
        <span>{t('message')}</span>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-text-muted hover:text-polar-night text-lg leading-none flex-shrink-0"
        aria-label={t('dismiss')}
      >
        &times;
      </button>
    </div>
  );
}
