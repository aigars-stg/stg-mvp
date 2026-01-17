'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth/AuthContext';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useTranslations } from 'next-intl';

// Lazy load non-critical navbar components to reduce TBT
const UserMenu = dynamic(() => import('./UserMenu').then(mod => ({ default: mod.UserMenu })), {
  ssr: false,
  loading: () => <div className="w-8 h-8 rounded-full bg-bg-secondary animate-pulse" />,
});

const CartIcon = dynamic(() => import('./CartIcon').then(mod => ({ default: mod.CartIcon })), {
  ssr: false,
  loading: () => <div className="w-10 h-10 rounded-lg bg-bg-secondary animate-pulse" />,
});

const SavedGamesIcon = dynamic(() => import('./SavedGamesIcon').then(mod => ({ default: mod.SavedGamesIcon })), {
  ssr: false,
  loading: () => <div className="w-10 h-10 rounded-lg bg-bg-secondary animate-pulse" />,
});

const MessagesIcon = dynamic(() => import('./MessagesIcon').then(mod => ({ default: mod.MessagesIcon })), {
  ssr: false,
  loading: () => <div className="w-10 h-10 rounded-lg bg-bg-secondary animate-pulse" />,
});

const NavbarSearch = dynamic(() => import('./NavbarSearch').then(mod => ({ default: mod.NavbarSearch })), {
  ssr: false,
  loading: () => <div className="w-64 lg:w-80 h-9 rounded-lg bg-bg-secondary animate-pulse" />,
});

const MobileSearchButton = dynamic(() => import('./MobileSearchButton').then(mod => ({ default: mod.MobileSearchButton })), {
  ssr: false,
  loading: () => <div className="w-10 h-10 rounded-lg bg-bg-secondary animate-pulse" />,
});

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations('Navigation');

  // Helper to check if a nav link is active
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  // Nav link styles with active pill
  const getNavLinkClasses = (href: string) => {
    const active = isActive(href);
    return `px-3 py-1.5 rounded-md text-sm transition-colors ${active
      ? 'bg-frost-ice/15 text-frost-ice font-medium'
      : 'text-text-secondary hover:text-text hover:bg-bg-secondary'
      }`;
  };

  return (
    <header className="bg-bg-elevated border-b border-border-subtle sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0" aria-label="Second Turn Games home">
          <img
            src="/images/logo_nav.svg"
            alt="Second Turn Games"
            className="h-8 sm:h-10 w-auto"
          />
        </Link>

        {/* Desktop Search Bar - visible on lg and up */}
        <div className="hidden lg:block flex-1 max-w-md mx-4">
          <NavbarSearch placeholder={t('searchPlaceholder')} />
        </div>

        {/* Mobile Icons - visible below lg */}
        <div className="flex items-center gap-2 lg:hidden">
          <MobileSearchButton />
          <SavedGamesIcon />
        </div>

        {/* Desktop Navigation - visible on lg and up */}
        <nav className="hidden lg:flex items-center gap-2 flex-shrink-0" role="navigation" aria-label="Main navigation">
          <Link href="/browse" className={getNavLinkClasses('/browse')}>
            {t('browse')}
          </Link>
          <Link
            href="/sell"
            className="ml-2 px-4 py-1.5 bg-frost-ice text-polar-night rounded-md hover:bg-frost-polar transition-colors font-medium text-sm min-h-[36px] inline-flex items-center whitespace-nowrap"
          >
            {t('sell')}
          </Link>

          {/* Icons Group with Divider */}
          <div className="flex items-center ml-2 border-l border-border-subtle pl-2 border-r border-border-subtle pr-2 mr-2 gap-1">
            <CartIcon />
            <SavedGamesIcon />
            <MessagesIcon />
          </div>

          {/* Language Switcher */}
          <LocaleSwitcher variant="buttons" className="mr-2" />

          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
