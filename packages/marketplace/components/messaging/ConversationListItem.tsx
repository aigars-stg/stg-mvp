'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Package } from 'lucide-react';
import type { ConversationListItem as ConversationListItemType } from '@/lib/types/message';

interface ConversationListItemProps {
  conversation: ConversationListItemType;
  isActive?: boolean;
}

export function ConversationListItem({
  conversation,
  isActive = false,
}: ConversationListItemProps) {
  const { other_user, listing, last_message, unread_count, updated_at } =
    conversation;

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const truncateMessage = (text: string, maxLength = 60) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={`block border-b border-divider-subtle hover:bg-background-tertiary transition-colors ${
        isActive ? 'bg-background-tertiary' : 'bg-background-primary'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Other user avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-background-tertiary flex items-center justify-center text-text-primary font-medium overflow-hidden">
            {other_user.avatar_url ? (
              <img
                src={other_user.avatar_url}
                alt={other_user.full_name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{other_user.full_name?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>

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
                unread_count > 0 ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              {other_user.full_name || 'Unknown User'}
            </h3>

            {last_message && (
              <span className="text-xs text-text-tertiary flex-shrink-0">
                {formatTime(last_message.created_at)}
              </span>
            )}
          </div>

          {/* Listing info */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded bg-background-tertiary flex items-center justify-center overflow-hidden flex-shrink-0">
              {listing.thumbnail ? (
                <img
                  src={listing.thumbnail}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-4 h-4 text-text-tertiary" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-secondary truncate">
                {listing.title}
              </p>
              <p className="text-xs font-medium text-text-primary">
                €{listing.price.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Last message */}
          {last_message && (
            <p
              className={`text-sm truncate ${
                unread_count > 0
                  ? 'text-text-primary font-medium'
                  : 'text-text-tertiary'
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
            <p className="text-sm text-text-tertiary italic">No messages yet</p>
          )}
        </div>
      </div>
    </Link>
  );
}
