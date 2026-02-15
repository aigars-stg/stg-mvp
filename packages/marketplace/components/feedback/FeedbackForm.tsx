/* eslint-disable @next/next/no-img-element -- screenshot previews are blob URLs */
'use client';

import { useState, useRef } from 'react';
import { Button, Input } from '@second-turn/design-system';
import { PhotoCamera as Camera, Close, RefreshCw as Loader2 } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import type { FeedbackType, SubmitFeedbackRequest } from '@/lib/types/feedback';
import { FEEDBACK_CONSTRAINTS } from '@/lib/types/feedback';

interface FeedbackFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

const FEEDBACK_TYPES: FeedbackType[] = ['feature_request', 'bug_report', 'other'];

export function FeedbackForm({ onSuccess, onError }: FeedbackFormProps) {
  const t = useTranslations('Feedback');
  const { user, profile } = useAuth();

  const [type, setType] = useState<FeedbackType>('feature_request');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(profile?.email || '');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholders: Record<FeedbackType, string> = {
    feature_request: t('descriptionPlaceholderFeature'),
    bug_report: t('descriptionPlaceholderBug'),
    other: t('descriptionPlaceholderOther'),
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > FEEDBACK_CONSTRAINTS.MAX_SCREENSHOT_SIZE_BYTES) {
      setValidationError(t('errorScreenshotTooLarge'));
      return;
    }

    // Validate file type
    if (
      !FEEDBACK_CONSTRAINTS.ALLOWED_SCREENSHOT_TYPES.includes(
        file.type as (typeof FEEDBACK_CONSTRAINTS.ALLOWED_SCREENSHOT_TYPES)[number]
      )
    ) {
      setValidationError(t('errorInvalidScreenshotType'));
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setScreenshot(base64);
      setScreenshotPreview(base64);
      setValidationError(null);
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate description length
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < FEEDBACK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH) {
      setValidationError(t('errorTooShort'));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: SubmitFeedbackRequest = {
        type,
        description: trimmedDescription,
        email: email.trim() || undefined,
        screenshotBase64: screenshot || undefined,
        context: {
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          locale: document.documentElement.lang || 'en',
        },
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : t('errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          {t('typeLabel')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FEEDBACK_TYPES.map((feedbackType) => (
            <button
              key={feedbackType}
              type="button"
              onClick={() => setType(feedbackType)}
              className={`
                py-2.5 px-3 text-sm font-medium rounded-lg border transition-colors
                ${
                  type === feedbackType
                    ? 'bg-frost-ice/10 border-frost-ice text-frost-ice'
                    : 'bg-bg-elevated border-snow-storm text-text hover:border-frost-ice/50'
                }
              `}
            >
              {t(`type${feedbackType}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="feedback-description"
          className="block text-sm font-medium text-text mb-2"
        >
          {t('descriptionLabel')}
        </label>
        <textarea
          id="feedback-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={placeholders[type]}
          rows={4}
          className="
            w-full px-3 py-2 border border-snow-storm rounded-lg
            text-text placeholder:text-text-secondary
            focus:outline-none focus:ring-2 focus:ring-frost-ice focus:border-transparent
            resize-none
          "
          required
          minLength={FEEDBACK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH}
          maxLength={FEEDBACK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}
        />
        <div className="mt-1 text-xs text-text-secondary text-right">
          {description.length} / {FEEDBACK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}
        </div>
      </div>

      {/* Email (optional) */}
      {!user && (
        <div>
          <label
            htmlFor="feedback-email"
            className="block text-sm font-medium text-text mb-2"
          >
            {t('emailLabel')}
          </label>
          <Input
            id="feedback-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <p className="mt-1 text-xs text-text-secondary">{t('emailHelper')}</p>
        </div>
      )}

      {/* Screenshot upload */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          {t('screenshotLabel')}
        </label>
        {screenshotPreview ? (
          <div className="relative inline-block">
            <img
              src={screenshotPreview}
              alt="Screenshot preview"
              className="h-20 w-auto rounded-lg border border-snow-storm"
            />
            <button
              type="button"
              onClick={removeScreenshot}
              className="
                absolute -top-2 -right-2
                w-6 h-6 rounded-full
                bg-polar-night text-snow-white
                flex items-center justify-center
                hover:bg-polar-night/80 transition-colors
              "
              aria-label="Remove screenshot"
            >
              <Close className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="
              flex items-center gap-2 px-4 py-2
              border border-dashed border-snow-storm rounded-lg
              text-sm text-text-secondary
              hover:border-frost-ice/50 hover:text-text transition-colors
            "
          >
            <Camera className="w-4 h-4" />
            {t('screenshotLabel')}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleScreenshotChange}
          className="hidden"
        />
        <p className="mt-1 text-xs text-text-secondary">{t('screenshotHelper')}</p>
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-sm text-aurora-red">{validationError}</p>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('sending')}
          </span>
        ) : (
          t('submit')
        )}
      </Button>
    </form>
  );
}
