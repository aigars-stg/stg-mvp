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
    pathname.includes('/staff');

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
          fixed bottom-6 right-6 z-40
          flex items-center gap-2
          bg-white border border-gray-200 shadow-lg
          rounded-full
          transition-all duration-200 ease-out
          hover:bg-frost-ice/10 hover:border-frost-ice
          active:bg-frost-ice/20
          focus:outline-none focus:ring-2 focus:ring-frost-ice focus:ring-offset-2
          ${isHovered ? 'pl-4 pr-5 py-3' : 'p-3'}
        `}
        aria-label={t('button')}
      >
        <MessageSquarePlus className="w-5 h-5 text-frost-ice shrink-0" />
        <span
          className={`
            text-sm font-medium text-text whitespace-nowrap
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
