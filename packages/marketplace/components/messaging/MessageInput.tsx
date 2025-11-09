'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@second-turn/design-system';
import { Send, Loader2 } from 'lucide-react';
import { MESSAGE_CONSTRAINTS } from '@/lib/types/message';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent || sending || disabled) {
      return;
    }

    if (trimmedContent.length > MESSAGE_CONSTRAINTS.MAX_LENGTH) {
      return;
    }

    setSending(true);

    try {
      await onSend(trimmedContent);
      setContent('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const remainingChars = MESSAGE_CONSTRAINTS.MAX_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;
  const showCounter = content.length > MESSAGE_CONSTRAINTS.MAX_LENGTH * 0.8;

  return (
    <div className="border-t border-divider-subtle bg-background-primary p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            placeholder={placeholder}
            className={`w-full resize-none rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 transition-colors ${
              isOverLimit
                ? 'border-aurora-red focus:ring-aurora-red'
                : 'border-divider-subtle focus:ring-frost-ice focus:border-frost-ice'
            } bg-background-primary text-text-primary placeholder:text-text-tertiary disabled:opacity-50 disabled:cursor-not-allowed`}
            rows={1}
            style={{
              minHeight: '44px',
              maxHeight: '120px',
            }}
          />

          {showCounter && (
            <div
              className={`absolute right-2 bottom-2 text-xs ${
                isOverLimit ? 'text-aurora-red' : 'text-text-tertiary'
              }`}
            >
              {remainingChars}
            </div>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={!content.trim() || sending || disabled || isOverLimit}
          variant="primary"
          size="md"
          className="h-11 px-4"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Send
            </>
          )}
        </Button>
      </div>

      {isOverLimit && (
        <p className="text-sm text-aurora-red mt-2">
          Message is too long. Please shorten it by {Math.abs(remainingChars)}{' '}
          character{Math.abs(remainingChars) !== 1 ? 's' : ''}.
        </p>
      )}
    </div>
  );
}
