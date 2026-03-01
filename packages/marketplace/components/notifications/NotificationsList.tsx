'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useNavigateWithLoader } from '@/lib/hooks/useNavigateWithLoader';
import { isToday, isYesterday, subDays, isAfter } from 'date-fns';
import { Notification as BellIcon, AlertCircle } from '@/lib/icons';
import { EmptyStateIcon } from '@/components/common/EmptyStateIcon';
import { useUnreadNotifications } from '@/lib/contexts/UnreadNotificationsContext';
import { NotificationCard, type NotificationData } from './NotificationCard';

const PAGE_SIZE = 20;

type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  if (isToday(date)) return 'today';
  if (isYesterday(date)) return 'yesterday';
  if (isAfter(date, subDays(new Date(), 7))) return 'thisWeek';
  return 'earlier';
}

export function NotificationsList() {
  const t = useTranslations('Notifications');
  const navigate = useNavigateWithLoader();
  const { refresh } = useUnreadNotifications();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    try {
      setError(null);
      const res = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) {
        throw new Error('Failed to load notifications');
      }

      const data = await res.json();

      if (append) {
        setNotifications(prev => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setTotal(data.total);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<DateGroup, NotificationData[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const n of notifications) {
      groups[getDateGroup(n.created_at)].push(n);
    }
    return groups;
  }, [notifications]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    fetchNotifications(notifications.length, true);
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        );
        setUnreadCount(0);
        refresh();
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notification: NotificationData) => {
    // Fire-and-forget mark as read — navigation doesn't wait for this
    if (!notification.read_at) {
      fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' })
        .then(() => {
          setNotifications(prev =>
            prev.map(n =>
              n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
            )
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
          refresh();
        })
        .catch(err => console.error('Failed to mark notification as read:', err));
    }

    // Navigate immediately
    // Order-related notifications: read order_id from the view-extracted top-level field
    // (the notifications_with_context view extracts data->>'order_id' into order_id)
    if (notification.type === 'new_order') {
      const orderId = (notification.order_id ?? notification.raw_data?.order_id) as string | undefined;
      if (orderId) {
        navigate(`/orders/${orderId}`);
        return;
      }
    }

    if (notification.type === 'wanted_match') {
      const bggGameId = notification.raw_data?.bgg_game_id as string | undefined;
      if (bggGameId) {
        navigate(`/game/${bggGameId}`);
        return;
      }
    }

    // Auction and other order-linked notifications: prefer order_id, fall back to listing_id
    if (notification.order_id) {
      navigate(`/orders/${notification.order_id}`);
    } else if (notification.listing_id) {
      navigate(`/game/${notification.listing_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-bg-secondary flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-bg-secondary rounded" />
              <div className="h-3 w-full bg-bg-secondary rounded" />
              <div className="h-3 w-16 bg-bg-secondary rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-aurora-red" />
        <p className="text-text">{error}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="flex justify-center mb-4">
          <EmptyStateIcon icon={BellIcon} color="frost-ice" />
        </div>
        <p className="text-text-secondary">{t('noNotifications')}</p>
        <p className="text-text-muted text-sm mt-2">{t('noNotificationsHint')}</p>
      </div>
    );
  }

  const groupOrder: DateGroup[] = ['today', 'yesterday', 'thisWeek', 'earlier'];

  return (
    <div>
      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-frost-ice hover:text-frost-polar transition-colors font-medium"
          >
            {t('markAllRead')}
          </button>
        </div>
      )}

      {/* Grouped notification list in card container */}
      <div className="bg-snow-white border border-border rounded-xl overflow-hidden">
        {groupOrder.map(group => {
          const items = groupedNotifications[group];
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-2 last:mb-0">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-4 pt-4 mb-2">
                {t(group)}
              </h3>
              <div>
                {items.map(notification => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {notifications.length < total && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 text-sm font-medium text-frost-ice hover:text-frost-polar border border-frost-ice/30 rounded-lg hover:bg-frost-ice/5 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? t('loading') : t('loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
