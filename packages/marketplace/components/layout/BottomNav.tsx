/* eslint-disable @next/next/no-img-element -- user avatars are external URLs */
'use client';

import { useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import dynamic from 'next/dynamic';
import { Home, Grid, Plus, ShoppingBasket as ShoppingCart, User, LogIn } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUnreadMessages } from '@/lib/contexts/UnreadMessagesContext';
import { useUnreadNotifications } from '@/lib/contexts/UnreadNotificationsContext';
import { useCart } from '@/lib/contexts/CartContext';
import { useTranslations } from 'next-intl';
import { getInitials } from '@/lib/auth/utils';

// Lazy load action sheets - they're only shown on user interaction
const SellActionSheet = dynamic(() => import('./SellActionSheet').then(mod => ({ default: mod.SellActionSheet })), {
  ssr: false,
});

const ProfileBottomSheet = dynamic(() => import('./ProfileBottomSheet').then(mod => ({ default: mod.ProfileBottomSheet })), {
  ssr: false,
});

export function BottomNav() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { unreadCount: unreadNotifications } = useUnreadNotifications();
  const { itemCount: cartCount } = useCart();
  const [sellSheetOpen, setSellSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const t = useTranslations('Navigation');

  // Routes where bottom nav should be hidden
  const hideOnRoutes = ['/auth/', '/privacy', '/terms', '/checkout'];
  const shouldHide = hideOnRoutes.some(route => pathname?.startsWith(route));

  // Don't render bottom nav on auth pages and legal pages
  if (shouldHide) {
    return null;
  }

  // Helper to check if route is active
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  // Navigation items configuration
  const navItems = [
    {
      label: t('home'),
      icon: Home,
      path: '/',
      active: isActive('/') && pathname === '/',
    },
    {
      label: t('browse'),
      icon: Grid,
      path: '/browse',
      active: isActive('/browse') || isActive('/listing') || isActive('/games'),
    },
    {
      label: t('sellShort'),
      icon: Plus,
      path: null, // Opens action sheet instead
      active: false,
      isCenter: true, // Special styling for center button
    },
    {
      label: t('cart'),
      icon: ShoppingCart,
      path: '/cart',
      active: isActive('/cart'),
      badge: cartCount > 0 ? cartCount : null,
    },
    user
      ? {
          label: t('profile'),
          icon: User,
          path: null as null, // Opens bottom sheet instead
          active: isActive('/account') || isActive('/my-listings'),
          hasNotification: unreadCount > 0 || unreadNotifications > 0,
        }
      : {
          label: t('signIn'),
          icon: LogIn,
          path: '/auth/signin' as string,
          active: isActive('/auth/signin'),
        },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    // Handle Sell button
    if (item.label === t('sellShort')) {
      setSellSheetOpen(true);
      return;
    }

    // Handle Profile button
    if (item.label === t('profile')) {
      setProfileSheetOpen(true);
      return;
    }

    // Regular navigation is handled by Link component
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-snow-white border-t border-border-subtle shadow-lg"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isProfileItem = item.label === t('profile');
            const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
            const initials = user ? getInitials(displayName) : '';

            // Center SELL button with special styling
            if (item.isCenter) {
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item)}
                  className="flex flex-col items-center justify-center relative -mt-3"
                  aria-label={item.label}
                >
                  <div className="w-14 h-14 rounded-full bg-aurora-orange text-snow-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-medium text-aurora-orange mt-1">
                    {item.label}
                  </span>
                </button>
              );
            }

            // Regular nav items
            const NavContent = (
              <div
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors relative ${
                  item.active
                    ? 'text-frost-ice'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <div className="relative">
                  {/* Profile icon: show avatar when logged in, generic icon when not */}
                  {isProfileItem && user ? (
                    profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-6 h-6 rounded-md object-cover border border-border"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-frost-ice text-snow-white flex items-center justify-center text-[10px] font-semibold">
                        {initials}
                      </div>
                    )
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                  {/* Badge for cart count */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-aurora-orange text-snow-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  {/* Notification dot for profile when there are unread messages */}
                  {item.hasNotification && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-aurora-red rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {/* Active indicator */}
                {item.active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-frost-ice" />
                )}
              </div>
            );

            // Wrap in Link if it has a path, otherwise button
            if (item.path) {
              return (
                <Link
                  key={item.label}
                  href={item.path}
                  className="flex-1 flex justify-center"
                >
                  {NavContent}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className="flex-1 flex justify-center"
              >
                {NavContent}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Action Sheets */}
      <SellActionSheet
        isOpen={sellSheetOpen}
        onClose={() => setSellSheetOpen(false)}
      />
      <ProfileBottomSheet
        isOpen={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
      />
    </>
  );
}
