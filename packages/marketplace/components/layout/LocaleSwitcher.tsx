'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useTransition, useRef, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { routing } from '@/i18n/routing';

const localeLabels: Record<string, { code: string; name: string }> = {
  en: { code: 'EN', name: 'English' },
  lv: { code: 'LV', name: 'Latviešu' },
  // Future:
  // lt: { code: 'LT', name: 'Lietuvių' },
  // et: { code: 'ET', name: 'Eesti' },
};

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className = '' }: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);

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

        // 3. Navigate to new locale using next-intl router
        router.replace(pathname, { locale: newLocale });
      } catch (error) {
        console.error('Error changing locale:', error);
      }
    });
  };

  const currentLabel = localeLabels[locale] || localeLabels.en;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors bg-bg-secondary text-text-secondary hover:bg-bg-elevated hover:text-text disabled:opacity-50"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Globe icon */}
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span>{currentLabel.code}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-44 bg-bg rounded-lg shadow-lg border border-border py-1 z-50"
          role="listbox"
          aria-label="Select language"
        >
          {routing.locales.map((loc) => {
            const label = localeLabels[loc];
            if (!label) return null;
            const isActive = loc === locale;

            return (
              <button
                key={loc}
                onClick={() => handleLocaleChange(loc)}
                disabled={isPending}
                role="option"
                aria-selected={isActive}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                  isActive
                    ? 'bg-frost-ice/10 text-frost-ice'
                    : 'text-text hover:bg-bg-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{label.code}</span>
                  <span className={isActive ? 'text-frost-ice' : 'text-text-secondary'}>
                    {label.name}
                  </span>
                </div>
                {isActive && (
                  <svg
                    className="w-4 h-4 text-frost-ice flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
