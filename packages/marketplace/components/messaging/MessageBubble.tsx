'use client';

import { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { X } from 'lucide-react';
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photos = message.photo_urls || [];

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

  const hasContent = message.content && message.content.trim().length > 0;
  const hasPhotos = photos.length > 0;

  return (
    <>
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

          {/* Photos */}
          {hasPhotos && (
            <div className={`flex flex-wrap gap-1 mb-1 max-w-md ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {photos.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="relative group overflow-hidden rounded-lg"
                >
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className={`object-cover transition-transform group-hover:scale-105 ${
                      photos.length === 1 ? 'max-w-[200px] max-h-[200px]' : 'w-24 h-24'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Message content */}
          {hasContent && (
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
          )}

          {/* Timestamp */}
          <div className="text-xs text-text-tertiary mt-1 px-1">
            {formatMessageTime(message.created_at)}
          </div>
        </div>

        {/* Spacer for own messages to maintain alignment */}
        {isOwn && <div className="w-8" />}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-polar-night/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-snow-white hover:text-frost-ice transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={photos[lightboxIndex]}
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === lightboxIndex ? 'bg-frost-ice' : 'bg-snow-white/50 hover:bg-snow-white'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
