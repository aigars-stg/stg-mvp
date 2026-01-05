'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';

type LocaleSwitcherProps = {
  variant?: 'select' | 'buttons';
  className?: string;
};

export function LocaleSwitcher({ variant = 'select', className = '' }: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === locale) return; // No change needed

    startTransition(async () => {
      try {
        // 1. Update cookie (for anonymous users)
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

        // 2. Update database (for authenticated users)
        if (user) {
          const { error } = await supabase
            .from('user_profiles')
            .update({ preferred_locale: newLocale })
            .eq('id', user.id);

          if (error) {
            console.error('Failed to update user locale preference:', error);
            // Continue anyway - cookie fallback will work
          }
        }

        // 3. Navigate to new locale
        // Remove current locale prefix and add new one
        const pathnameWithoutLocale = pathname.replace(/^\/(en|lv)/, '') || '/';
        const newPath = newLocale === 'en'
          ? pathnameWithoutLocale // English has no prefix
          : `/${newLocale}${pathnameWithoutLocale}`;

        router.push(newPath);
        router.refresh();
      } catch (error) {
        console.error('Error changing locale:', error);
      }
    });
  };

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          onClick={() => handleLocaleChange('en')}
          disabled={isPending || locale === 'en'}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            locale === 'en'
              ? 'bg-frost-ice text-snow-white'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-elevated'
          } disabled:opacity-50`}
          aria-label="Switch to English"
        >
          EN
        </button>
        <button
          onClick={() => handleLocaleChange('lv')}
          disabled={isPending || locale === 'lv'}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            locale === 'lv'
              ? 'bg-frost-ice text-snow-white'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-elevated'
          } disabled:opacity-50`}
          aria-label="Pārslēgties uz latviešu"
        >
          LV
        </button>
      </div>
    );
  }

  // Select dropdown variant
  return (
    <select
      value={locale}
      onChange={(e) => handleLocaleChange(e.target.value)}
      disabled={isPending}
      className={`text-sm border border-border rounded-md px-2 py-1.5 bg-bg text-text disabled:opacity-50 ${className}`}
      aria-label="Select language"
    >
      <option value="en">English</option>
      <option value="lv">Latviešu</option>
    </select>
  );
}
