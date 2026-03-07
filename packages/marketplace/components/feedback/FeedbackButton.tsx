'use client';

import { useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { Chat as MessageSquarePlus } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import { FeedbackModal } from './FeedbackModal';

/**
 * Floating feedback button that appears on most pages
 * Hidden on checkout and staff/admin pages
 */
export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('Feedback');

  // Hide on checkout and admin/staff pages
  const shouldHide =
    pathname.includes('/checkout') ||
    pathname.includes('/admin') ||
    pathname.includes('/staff') ||
    pathname.includes('/sell');

  if (shouldHide) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6 right-6 z-40
          flex items-center gap-2
          bg-frost-ice border border-frost-ice text-snow-white shadow-lg
          rounded-full
          transition-all duration-200 ease-out
          hover:bg-frost-polar hover:border-frost-polar
          active:bg-frost-arctic
          focus:outline-none focus:ring-2 focus:ring-frost-ice focus:ring-offset-2
          ${isHovered ? 'pl-4 pr-5 py-3' : 'p-3'}
        `}
        aria-label={t('button')}
      >
        <MessageSquarePlus className="w-5 h-5 text-snow-white shrink-0" />
        <span
          className={`
            text-sm font-medium text-snow-white whitespace-nowrap
            transition-all duration-200 ease-out
            ${isHovered ? 'opacity-100 max-w-32' : 'opacity-0 max-w-0 overflow-hidden'}
          `}
        >
          {t('button')}
        </span>
      </button>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
