'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@second-turn/design-system';
import { Send, RefreshCw as Loader2 } from '@/lib/icons';
import { QUESTION_CONSTRAINTS } from '@/lib/types/question';
import { useTranslations } from 'next-intl';

interface QuestionInputProps {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  /** Whether this is a reply (changes button text) */
  isReply?: boolean;
}

export function QuestionInput({
  onSubmit,
  disabled = false,
  placeholder,
  isReply = false,
}: QuestionInputProps) {
  const t = useTranslations('QuestionInput');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent || sending || disabled) {
      return;
    }

    if (trimmedContent.length > QUESTION_CONSTRAINTS.MAX_LENGTH) {
      return;
    }

    setSending(true);

    try {
      await onSubmit(trimmedContent);
      setContent('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to submit question:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  const charCount = content.length;
  const remainingChars = QUESTION_CONSTRAINTS.MAX_LENGTH - charCount;
  const isOverLimit = remainingChars < 0;

  // Character counter visibility and color based on thresholds
  const showCounter = charCount >= QUESTION_CONSTRAINTS.COUNTER_SHOW_THRESHOLD;
  const counterColor = charCount >= QUESTION_CONSTRAINTS.COUNTER_CRITICAL_THRESHOLD
    ? 'text-aurora-red'
    : charCount >= QUESTION_CONSTRAINTS.COUNTER_WARNING_THRESHOLD
      ? 'text-amber-500'
      : 'text-text-muted';

  const canSubmit = content.trim().length > 0 && !isOverLimit && !sending && !disabled;

  return (
    <div className="border-t border-border-subtle bg-snow-white p-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            placeholder={placeholder || t('placeholder')}
            className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
              isOverLimit
                ? 'border-aurora-red focus:ring-aurora-red'
                : 'border-border focus:ring-frost-ice focus:border-frost-ice'
            } bg-snow-white text-polar-night placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed`}
            rows={1}
            style={{
              minHeight: '40px',
              maxHeight: '150px',
            }}
          />

          {showCounter && (
            <div className={`absolute right-2 bottom-2 text-xs ${counterColor}`}>
              {remainingChars}
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant="primary"
          size="sm"
          className="h-10 px-3 self-end"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-1.5" />
              {isReply ? t('reply') : t('ask')}
            </>
          )}
        </Button>
      </div>

      {isOverLimit && (
        <p className="text-xs text-aurora-red mt-2">
          {isReply
            ? t('replyTooLong', { count: Math.abs(remainingChars) })
            : t('questionTooLong', { count: Math.abs(remainingChars) })}
        </p>
      )}
    </div>
  );
}
