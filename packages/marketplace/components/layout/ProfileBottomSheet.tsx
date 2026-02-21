/* eslint-disable @next/next/no-img-element -- user avatars are external URLs */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Package, Heart, Search, Settings, LogOut, Close, LogIn, ShoppingBag, Store, ChatBubble, Globe, Shield, Notification as BellIcon } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUnreadMessages } from '@/lib/contexts/UnreadMessagesContext';
import { useUnreadNotifications } from '@/lib/contexts/UnreadNotificationsContext';
import { Button } from '@second-turn/design-system';
import { getInitials } from '@/lib/auth/utils';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useTranslations } from 'next-intl';

interface ProfileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileBottomSheet({ isOpen, onClose }: ProfileBottomSheetProps) {
  const router = useRouter();
  const t = useTranslations('Navigation');
  const { user, profile, signOut } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { unreadCount: unreadNotifications } = useUnreadNotifications();
  const [listingsCount, setListingsCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [wantedCount, setWantedCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [signOutLoading, setSignOutLoading] = useState(false);

  // Check if user is an active seller
  const isActiveSeller = profile?.seller_status === 'active';

  // Check if user is staff
  const isStaff = profile?.is_staff === true;

  // Fetch counts for authenticated users
  useEffect(() => {
    if (!user || !isOpen) return;

    const fetchCounts = async () => {
      try {
        // Build fetch list based on seller status
        const fetches: Promise<Response>[] = [
          fetch('/api/saved-listings'),
          fetch('/api/wanted/my-listings'),
          fetch('/api/orders'),
        ];

        // Only fetch seller-specific data for active sellers
        if (isActiveSeller) {
          fetches.push(
            fetch(`/api/listings?sellerId=${user.id}`),
            fetch('/api/seller/orders'),
          );
        }

        const results = await Promise.all(fetches);
        const [savedRes, wantedRes, ordersRes, ...sellerResults] = results;

        if (savedRes.ok) {
          const data = await savedRes.json();
          setSavedCount(data.savedListings?.length || 0);
        }

        if (wantedRes.ok) {
          const data = await wantedRes.json();
          setWantedCount(data.wantedListings?.length || 0);
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrdersCount(data.orders?.length || 0);
        }

        if (isActiveSeller && sellerResults.length >= 2) {
          const [listingsRes, salesRes] = sellerResults;
          if (listingsRes.ok) {
            const data = await listingsRes.json();
            setListingsCount(data.listings?.length || 0);
          }
          if (salesRes.ok) {
            const data = await salesRes.json();
            setSalesCount(data.orders?.length || 0);
            setPendingSalesCount(data.summary?.pending || 0);
          }
        }
      } catch {
        // Silently fail - counts are non-critical UI elements
      }
    };

    fetchCounts();
  }, [user, isOpen, profile?.seller_status]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    try {
      setSignOutLoading(true);
      await signOut();
      onClose();
      router.push('/');
    } catch {
      // Sign out error handled by AuthContext
    } finally {
      setSignOutLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  if (!isOpen) return null;

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = user ? getInitials(displayName) : '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-polar-night/50 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden bg-snow-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle flex-shrink-0">
          <h2 className="text-lg font-semibold text-polar-night">
            {user ? t('profileSheet.title') : t('profileSheet.guestTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
            aria-label="Close"
          >
            <Close className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {user ? (
            <>
              {/* User Info */}
              <div className="p-4 border-b border-border-subtle bg-bg-elevated">
                <div className="flex items-center gap-3">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="w-12 h-12 rounded-lg object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-frost-ice text-snow-white flex items-center justify-center text-lg font-semibold">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-polar-night flex items-center gap-2">
                      <span className="truncate">{displayName}</span>
                      {profile?.country && getCountryFlag(profile.country) && (
                        <span
                          className={getCountryFlag(profile.country)}
                          role="img"
                          aria-label={`Country: ${getCountryName(profile.country)}`}
                          title={getCountryName(profile.country)}
                        />
                      )}
                    </div>
                    <div className="text-sm text-text-secondary truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account & Settings Section - Prominent position */}
              <div className="py-2 border-b border-border-subtle">
                <button
                  onClick={() => handleNavigate('/account/settings')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
                >
                  <Settings className="w-5 h-5 text-frost-ice" />
                  <span className="text-polar-night font-medium">{t('profileSheet.accountSettings')}</span>
                </button>

                {isStaff && (
                  <button
                    onClick={() => handleNavigate('/staff/transactions')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
                  >
                    <Shield className="w-5 h-5 text-aurora-purple" />
                    <span className="text-polar-night font-medium">{t('userMenu.staffDashboard')}</span>
                  </button>
                )}
              </div>

              {/* Menu Items - My Activity Section */}
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {t('profileSheet.sectionActivity')}
                </div>

                {/* Notifications */}
                <button
                  onClick={() => handleNavigate('/notifications')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BellIcon className="w-5 h-5 text-aurora-orange" />
                    <span className="text-polar-night font-medium">{t('profileSheet.notifications')}</span>
                  </div>
                  {unreadNotifications > 0 && (
                    <span className="bg-aurora-orange/10 text-aurora-orange text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {/* Messages */}
                <button
                  onClick={() => handleNavigate('/messages')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ChatBubble className="w-5 h-5 text-frost-ice" />
                    <span className="text-polar-night font-medium">{t('profileSheet.messages')}</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-aurora-orange/10 text-aurora-orange text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNavigate('/orders')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-frost-ice" />
                    <span className="text-polar-night font-medium">{t('userMenu.myOrders')}</span>
                  </div>
                  {ordersCount > 0 && (
                    <span className="bg-frost-ice/10 text-frost-ice text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                      {ordersCount}
                    </span>
                  )}
                </button>

                {isActiveSeller ? (
                  <>
                    {/* Seller: Sales Dashboard */}
                    <button
                      onClick={() => handleNavigate('/seller/dashboard?tab=orders')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-aurora-green" />
                        <span className="text-polar-night font-medium">{t('userMenu.sellerDashboard')}</span>
                      </div>
                      {pendingSalesCount > 0 ? (
                        <span className="bg-aurora-orange/10 text-aurora-orange text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                          {pendingSalesCount}
                        </span>
                      ) : salesCount > 0 ? (
                        <span className="bg-aurora-green/10 text-aurora-green text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                          {salesCount}
                        </span>
                      ) : null}
                    </button>

                    {/* Seller: My Listings (all 3 tabs) */}
                    <button
                      onClick={() => handleNavigate('/my-listings')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-frost-ice" />
                        <span className="text-polar-night font-medium">{t('userMenu.myListings')}</span>
                      </div>
                      {listingsCount > 0 && (
                        <span className="bg-frost-ice/10 text-frost-ice text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                          {listingsCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleNavigate('/my-listings?tab=saved')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-aurora-red" />
                        <span className="text-polar-night font-medium">{t('profileSheet.savedListings')}</span>
                      </div>
                      {savedCount > 0 && (
                        <span className="bg-aurora-red/10 text-aurora-red text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                          {savedCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleNavigate('/my-listings?tab=wanted')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Search className="w-5 h-5 text-aurora-orange" />
                        <span className="text-polar-night font-medium">{t('profileSheet.wantedGames')}</span>
                      </div>
                      {wantedCount > 0 && (
                        <span className="bg-aurora-orange/10 text-aurora-orange text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                          {wantedCount}
                        </span>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Non-seller: Saved & Wanted (combined) */}
                    <button
                      onClick={() => handleNavigate('/my-listings')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-aurora-red" />
                        <span className="text-polar-night font-medium">{t('userMenu.savedAndWanted')}</span>
                      </div>
                      {(savedCount + wantedCount) > 0 && (
                        <span className="bg-aurora-red/10 text-aurora-red text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                          {savedCount + wantedCount}
                        </span>
                      )}
                    </button>

                    {/* Non-seller: Start selling CTA */}
                    <button
                      onClick={() => handleNavigate('/seller/onboard')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
                    >
                      <Store className="w-5 h-5 text-aurora-green" />
                      <span className="text-polar-night font-medium">{t('userMenu.startSelling')}</span>
                    </button>
                  </>
                )}
              </div>

              {/* Language Section */}
              <div className="py-2 border-t border-border-subtle">
                <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {t('profileSheet.sectionLanguage')}
                </div>
                <div className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-text-muted" />
                    <LocaleSwitcher className="flex-1" />
                  </div>
                </div>
              </div>

              {/* Sign Out Section */}
              <div className="py-2 border-t border-border-subtle">
                <button
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-aurora-red/10 text-aurora-red transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">
                    {signOutLoading ? t('profileSheet.signingOut') : t('userMenu.signOut')}
                  </span>
                </button>
              </div>
            </>
          ) : (
            /* Guest User - Show Sign In */
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-frost-ice/10 flex items-center justify-center">
                <LogIn className="w-8 h-8 text-frost-ice" />
              </div>
              <div>
                <h3 className="font-semibold text-polar-night text-lg mb-2">
                  {t('profileSheet.guest.title')}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t('profileSheet.guest.description')}
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  router.push('/auth/signin');
                  onClose();
                }}
              >
                {t('profileSheet.guest.signIn')}
              </Button>
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => {
                  router.push('/auth/signup');
                  onClose();
                }}
              >
                {t('profileSheet.guest.createAccount')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
