'use client';

import { Chat as MessageSquare } from '@/lib/icons';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput';
import type { Message } from '@/lib/types/message';

interface ConversationPanelProps {
  messages: Message[];
  /** Current user's ID — used for isOwn bubble styling */
  currentUserId: string | null;
  /** Buyer's user ID — used for staff role labels */
  buyerId?: string | null;
  /** Name of the other participant (for input placeholder) */
  otherUserName?: string;
  /** Read-only mode for staff view (hides input, shows role labels) */
  readOnly?: boolean;
  /** Send handler — omit or set readOnly to hide input */
  onSend?: (content: string, photoUrls?: string[]) => Promise<void>;
  sendingMessage?: boolean;
  conversationId?: string;
  /** Ref for auto-scrolling to latest message */
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  /** Ref for the scrollable container */
  messagesContainerRef?: React.RefObject<HTMLDivElement>;
  title?: string;
}

export function ConversationPanel({
  messages,
  currentUserId,
  buyerId,
  otherUserName,
  readOnly = false,
  onSend,
  sendingMessage = false,
  conversationId,
  messagesEndRef,
  messagesContainerRef,
  title = 'Conversation',
}: ConversationPanelProps) {
  return (
    <div className="bg-snow-white border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle bg-bg-secondary">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-frost-ice" />
          <h3 className="text-sm font-semibold text-polar-night">
            {title}
          </h3>
          <span className="text-xs text-text-tertiary">
            ({messages.length})
          </span>
        </div>
      </div>

      {/* Messages list */}
      <div
        ref={messagesContainerRef}
        className="px-4 py-4 overflow-y-auto"
        style={{ minHeight: '200px', maxHeight: readOnly ? '600px' : '400px' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare className="w-12 h-12 text-text-muted mb-3" />
            <p className="text-text-secondary">
              {readOnly
                ? 'No messages in this conversation'
                : 'No messages yet'}
            </p>
            {!readOnly && otherUserName && (
              <p className="text-sm text-text-tertiary mt-1">
                Start a conversation with {otherUserName}
              </p>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="mb-2">
              {/* Staff view: show buyer/seller role labels */}
              {readOnly && !message.is_system_message && (
                <div
                  className={`text-xs text-text-muted mb-1 px-1 ${
                    message.sender_id === buyerId ? 'text-left' : 'text-right'
                  }`}
                >
                  {message.sender_id === buyerId ? '(Buyer)' : '(Seller)'}
                </div>
              )}
              <MessageBubble
                message={message}
                isOwn={
                  readOnly
                    ? false
                    : message.sender_id === currentUserId
                }
              />
            </div>
          ))
        )}
        {messagesEndRef && <div ref={messagesEndRef} />}
      </div>

      {/* Message input (hidden in read-only mode) */}
      {!readOnly && onSend && conversationId && (
        <div className="border-t border-border-subtle bg-bg-primary px-4 py-3">
          <MessageInput
            onSend={onSend}
            disabled={sendingMessage}
            placeholder={`Message ${otherUserName || 'the other party'}...`}
            conversationId={conversationId}
            allowPhotos={true}
          />
        </div>
      )}
    </div>
  );
}
