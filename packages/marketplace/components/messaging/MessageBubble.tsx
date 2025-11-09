'use client';

import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import type { Message } from '@/lib/types/message';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  showSender = false,
}: MessageBubbleProps) {
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);

    if (isToday(date)) {
      return format(date, 'h:mm a');
    }

    if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    }

    // Less than 7 days ago
    if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return format(date, 'EEE, h:mm a');
    }

    return format(date, 'MMM d, h:mm a');
  };

  if (message.is_system_message) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-background-tertiary text-text-secondary text-sm px-4 py-2 rounded-full max-w-md text-center">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-end gap-2 mb-4 ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar (only show for other user's messages) */}
      {!isOwn && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background-tertiary flex items-center justify-center text-text-secondary text-sm font-medium overflow-hidden">
          {message.sender?.avatar_url ? (
            <img
              src={message.sender.avatar_url}
              alt={message.sender.full_name || 'User'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>
              {message.sender?.full_name?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>
      )}

      {/* Message bubble */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name (if shown) */}
        {showSender && !isOwn && message.sender?.full_name && (
          <div className="text-xs text-text-tertiary mb-1 px-1">
            {message.sender.full_name}
          </div>
        )}

        {/* Message content */}
        <div
          className={`max-w-md px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-frost-ice text-snow-storm rounded-br-sm'
              : 'bg-background-tertiary text-text-primary rounded-bl-sm'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-text-tertiary mt-1 px-1">
          {formatMessageTime(message.created_at)}
        </div>
      </div>

      {/* Spacer for own messages to maintain alignment */}
      {isOwn && <div className="w-8" />}
    </div>
  );
}
