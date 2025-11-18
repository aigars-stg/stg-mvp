'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, Plus, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages';
import { SellActionSheet } from './SellActionSheet';
import { ProfileBottomSheet } from './ProfileBottomSheet';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const [sellSheetOpen, setSellSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  // Routes where bottom nav should be hidden
  const hideOnRoutes = ['/auth/', '/privacy', '/terms'];
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
      label: 'Home',
      icon: Home,
      path: '/',
      active: isActive('/') && pathname === '/',
    },
    {
      label: 'Browse',
      icon: Grid,
      path: '/browse',
      active: isActive('/browse') || isActive('/listing') || isActive('/games') || isActive('/wanted'),
    },
    {
      label: 'Sell',
      icon: Plus,
      path: null, // Opens action sheet instead
      active: false,
      isCenter: true, // Special styling for center button
    },
    {
      label: 'Messages',
      icon: MessageCircle,
      path: '/messages',
      active: isActive('/messages'),
      badge: unreadCount > 0 ? unreadCount : null,
      requiresAuth: true,
    },
    {
      label: 'Profile',
      icon: User,
      path: null, // Opens bottom sheet instead
      active: isActive('/account') || isActive('/my-listings'),
    },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    // Handle Sell button
    if (item.label === 'Sell') {
      setSellSheetOpen(true);
      return;
    }

    // Handle Profile button
    if (item.label === 'Profile') {
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
            const isDisabled = item.requiresAuth && !user;

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
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : item.active
                    ? 'text-frost-ice'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {/* Badge for unread messages */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-aurora-red text-snow-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
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
                  href={isDisabled ? '#' : item.path}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                    }
                  }}
                  className="flex-1 flex justify-center"
                >
                  {NavContent}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => !isDisabled && handleNavClick(item)}
                disabled={isDisabled}
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
