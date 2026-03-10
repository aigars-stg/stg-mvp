'use client';

import { useLocale } from 'next-intl';
import { Gavel, Trophy, Timer, Star, CreditCard, Heart } from '@/lib/icons';
import { formatMessageTime } from '@/lib/date-utils';

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  listing_id?: string;
  actor_id?: string;
  game_name?: string;
  bid_amount?: number;
  auction_ends_at?: string;
  previous_bid?: number;
  order_id?: string;
  // raw_data is the full JSONB data column as exposed by the notifications_with_context view
  raw_data?: Record<string, unknown>;
}

const typeConfig: Record<string, { Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  outbid: { Icon: Gavel, color: 'text-aurora-orange' },
  auction_won: { Icon: Trophy, color: 'text-aurora-green' },
  auction_ending: { Icon: Timer, color: 'text-aurora-orange' },
  auction_expired: { Icon: Timer, color: 'text-text-muted' },
  second_chance: { Icon: Star, color: 'text-aurora-purple' },
  payment_reminder: { Icon: CreditCard, color: 'text-aurora-red' },
  wanted_match: { Icon: Heart, color: 'text-frost-ice' },
};

interface NotificationCardProps {
  notification: NotificationData;
  onClick: (notification: NotificationData) => void;
}

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const locale = useLocale();
  const config = typeConfig[notification.type] || { Icon: Star, color: 'text-text-secondary' };
  const { Icon, color } = config;
  const isUnread = !notification.read_at;

  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full flex items-start gap-3 p-4 rounded-lg text-left transition-colors ${
        isUnread
          ? 'bg-frost-ice/5 hover:bg-frost-ice/10'
          : 'hover:bg-bg-elevated'
      }`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isUnread ? 'bg-bg-elevated' : 'bg-bg-secondary'
      }`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${isUnread ? 'font-semibold text-polar-night' : 'font-medium text-text-secondary'}`}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-aurora-orange rounded-full" />
          )}
        </div>
        <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-text-muted mt-1">
          {formatMessageTime(notification.created_at, locale)}
        </p>
      </div>
    </button>
  );
}
