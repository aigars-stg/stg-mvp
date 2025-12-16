'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@second-turn/design-system';
import { useAuth } from '@/lib/auth/AuthContext';
import { LogOut, Package, ShoppingBag, Store, Settings, ChevronRight, LayoutDashboard } from 'lucide-react';
import { getInitials } from '@/lib/auth/utils';


export function UserMenu() {
  const { user, profile, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string>('');
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
      <Link href="/auth">
        <Button variant="primary" size="sm">
          Join
        </Button>
      </Link>
    );
  }

  // User is logged in
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const initials = getInitials(displayName);

  // Check if user is an active seller
  const isActiveSeller = profile?.seller_status === 'active';

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
        <span className="hidden sm:inline text-text-muted hover:text-text transition-colors">
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-snow-white rounded-lg shadow-lg border border-border py-2 z-50">
          {/* User Info Header - Clickable */}
          <Link
            href="/account/dashboard"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 border-b border-border-subtle hover:bg-bg-secondary transition-colors group relative"
          >
            <div className="pr-6">
              <p className="text-sm font-medium text-polar-night group-hover:text-frost-ice transition-colors">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {user.email}
              </p>
            </div>
            {/* Hover arrow indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted group-hover:text-frost-ice transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Menu Items */}
          <div className="py-1">
            {/* 1. Seller Dashboard (if active seller) */}
            {isActiveSeller && (
              <Link
                href="/seller/dashboard"
                className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Store className="w-4 h-4 text-frost-ice" />
                Seller dashboard
              </Link>
            )}

            {/* 2. My Orders */}
            <Link
              href="/orders"
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBag className="w-4 h-4 text-frost-ice" />
              My orders
            </Link>

            {/* 3. My Listings */}
            <Link
              href="/my-listings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <LayoutDashboard className="w-4 h-4 text-frost-ice" />
              My listings
            </Link>

            {/* 4. Account Settings */}
            <Link
              href="/account/settings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 text-frost-ice" />
              Account settings
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-border-subtle pt-1 mt-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2 text-sm text-aurora-red hover:bg-aurora-red/10 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign out
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
