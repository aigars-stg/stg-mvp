'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@second-turn/design-system';
import { useAuth } from '@/lib/auth/AuthContext';
import { User, LogOut, Package, MessageCircle } from 'lucide-react';
import { getInitials } from '@/lib/auth/utils';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages';

export function UserMenu() {
  const { user, profile, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string>('');
  const { unreadCount } = useUnreadMessages();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      setSignOutError('');
      await signOut();
      setIsOpen(false);
      // AuthContext handles the redirect to '/'
    } catch (error) {
      console.error('Failed to sign out:', error);
      setSignOutError('Failed to sign out. Please try again.');
      // Keep menu open so user can see the error
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-md bg-bg-secondary animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link href="/auth/signin">
        <Button variant="primary" size="sm">
          Sign In
        </Button>
      </Link>
    );
  }

  // User is logged in
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const initials = getInitials(displayName);

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        aria-label="User menu"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="w-8 h-8 rounded-md object-cover border border-border"
            key={profile.avatar_url}
          />
        ) : (
          <div className="w-8 h-8 rounded-md bg-frost-ice text-snow-white flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
        )}
        <span className="hidden sm:inline text-sm font-medium text-text">
          {displayName}
          {profile?.country && getCountryFlag(profile.country) && (
            <span
              className={`${getCountryFlag(profile.country)} ml-1.5`}
              role="img"
              aria-label={`Country: ${getCountryName(profile.country)}`}
              title={getCountryName(profile.country)}
            />
          )}
        </span>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-snow-white rounded-lg shadow-lg border border-border py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="text-sm font-medium text-polar-night">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-text-secondary truncate">
              {user.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/account"
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4 text-frost-ice" />
              Account Settings
            </Link>
            <Link
              href="/my-listings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Package className="w-4 h-4 text-frost-ice" />
              My Listings
            </Link>
            <Link
              href="/messages"
              className="flex items-center justify-between px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-frost-ice" />
                Messages
              </div>
              {unreadCount > 0 && (
                <span className="bg-frost-ice text-snow-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-border-subtle pt-1 mt-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2 text-sm text-aurora-red hover:bg-aurora-red/10 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {/* Error Message */}
          {signOutError && (
            <div className="px-4 py-2 text-xs text-aurora-red bg-aurora-red/10 border-t border-border-subtle">
              {signOutError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
