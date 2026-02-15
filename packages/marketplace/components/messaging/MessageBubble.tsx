/* eslint-disable @next/next/no-img-element -- message photos are user-uploaded URLs */
'use client';

import { useState } from 'react';
import { Close } from '@/lib/icons';
import type { Message } from '@/lib/types/message';
import { formatMessageTime } from '@/lib/date-utils';
import { Avatar } from '@/components/user';

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

  if (message.is_system_message) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-bg-secondary text-text-secondary text-sm px-4 py-2 rounded-full max-w-md text-center">
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
          <Avatar
            src={message.sender?.avatar_url}
            name={message.sender?.full_name || 'User'}
            size="sm"
          />
        )}

        {/* Message bubble */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name (if shown) */}
          {showSender && !isOwn && message.sender?.full_name && (
            <div className="text-xs text-text-muted mb-1 px-1">
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
                  : 'bg-bg-secondary text-text rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.content}
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-text-muted mt-1 px-1">
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
            <Close className="w-8 h-8" />
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
