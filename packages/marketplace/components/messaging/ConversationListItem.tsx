'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Package } from '@/lib/icons';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import { formatMessageTime } from '@/lib/date-utils';
import type { ConversationListItem as ConversationListItemType } from '@/lib/types/message';
import { Avatar } from '@/components/user';
import { formatPrice } from '@/lib/services/pricing';

interface ConversationListItemProps {
  conversation: ConversationListItemType;
  isActive?: boolean;
}

export function ConversationListItem({
  conversation,
  isActive = false,
}: ConversationListItemProps) {
  const t = useTranslations('MessagesPage');
  const { other_user, listing, last_message, unread_count } = conversation;

  const truncateMessage = (text: string, maxLength = 60) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Link to order page for order-based conversations, otherwise messages
  const href = conversation.order_id
    ? `/orders/${conversation.order_id}`
    : `/messages/${conversation.id}`;

  return (
    <Link
      href={href}
      className={`block hover:bg-bg-secondary transition-colors ${
        isActive ? 'bg-bg-secondary' : 'bg-bg-elevated'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Other user avatar */}
        <div className="relative flex-shrink-0">
          <Avatar
            src={other_user.avatar_url}
            name={other_user.full_name || 'User'}
            size="lg"
          />

          {/* Unread indicator */}
          {unread_count > 0 && (
            <div className="absolute -top-1 -right-1 bg-frost-ice text-snow-storm text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {unread_count > 99 ? '99+' : unread_count}
            </div>
          )}
        </div>

        {/* Conversation details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className={`text-sm font-medium truncate ${
                unread_count > 0 ? 'text-text' : 'text-text-secondary'
              }`}
            >
              {other_user.full_name || t('unknownUser')}
            </h3>

            {last_message && (
              <span className="text-xs text-text-muted flex-shrink-0">
                {formatMessageTime(last_message.created_at)}
              </span>
            )}
          </div>

          {/* Listing or order info */}
          {listing && (
            <div className="flex items-center gap-2 mb-2">
              <ListingThumbnail
                src={listing.thumbnail}
                alt={listing.title}
                size="xs"
                objectFit="cover"
                className="rounded"
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-secondary truncate">
                  {listing.title}
                </p>
                <p className="text-xs font-medium text-text">
                  {formatPrice(listing.price)}
                </p>
              </div>
            </div>
          )}
          {!listing && conversation.order && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                <Package className="w-4 h-4 text-text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-secondary truncate">
                  Order {conversation.order.order_number}
                </p>
                <p className="text-xs font-medium text-text">
                  {formatPrice(conversation.order.total_amount)}
                </p>
              </div>
            </div>
          )}

          {/* Last message */}
          {last_message && (
            <p
              className={`text-sm truncate ${
                unread_count > 0
                  ? 'text-text font-medium'
                  : 'text-text-muted'
              }`}
            >
              {last_message.is_system_message ? (
                <em>{truncateMessage(last_message.content)}</em>
              ) : (
                truncateMessage(last_message.content)
              )}
            </p>
          )}

          {!last_message && (
            <p className="text-sm text-text-muted italic">{t('noMessages')}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
