'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { AlertCircle, Email as Mail, Close } from '@/lib/icons';
import { Button } from '@second-turn/design-system';
import { supabase } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

interface EmailVerificationBannerProps {
  dismissible?: boolean;
}

export function EmailVerificationBanner({ dismissible = false }: EmailVerificationBannerProps) {
  const t = useTranslations('EmailVerificationBanner');
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Don't show if user is verified or banner is dismissed
  if (!user || user.email_confirmed_at || isDismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
      });

      if (error) {
        setResendMessage(t('errorPrefix', { message: error.message }));
      } else {
        setResendMessage(t('successMessage'));
      }
    } catch (error: unknown) {
      setResendMessage(t('errorPrefix', { message: error instanceof Error ? error.message : t('failedToResend') }));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-aurora-yellow/10 border-2 border-aurora-yellow/30 rounded-lg p-4 mb-6 relative">
      {dismissible && (
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-3 right-3 text-text-secondary hover:text-polar-night transition-colors"
          aria-label={t('dismiss')}
        >
          <Close className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-aurora-yellow flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-polar-night mb-1">
            {t('title')}
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            {t('description', { email: user.email || '' })}
          </p>

          {resendMessage && (
            <p
              className={`text-sm mb-3 ${
                resendMessage.includes('Error') || resendMessage.includes('Kļūda')
                  ? 'text-aurora-red'
                  : 'text-aurora-green'
              }`}
            >
              {resendMessage}
            </p>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            <Mail className="w-4 h-4 mr-2" />
            {isResending ? t('sending') : t('resendButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
