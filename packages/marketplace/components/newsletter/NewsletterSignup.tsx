'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button, Input } from '@second-turn/design-system';
import { Check } from 'griddy-icons';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  isValidEmail,
  NEWSLETTER_SUCCESS_KEY,
  type NewsletterLocale,
} from '@/lib/newsletter';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function NewsletterSignup() {
  const t = useTranslations('Newsletter');
  const locale = useLocale() as NewsletterLocale;
  const { profile } = useAuth();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Check sessionStorage for previous success
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasSubscribed = sessionStorage.getItem(NEWSLETTER_SUCCESS_KEY);
      if (wasSubscribed === 'true') {
        setStatus('success');
      }
    }
  }, []);

  // Pre-fill email for authenticated users
  useEffect(() => {
    if (profile?.email && !email) {
      setEmail(profile.email);
    }
  }, [profile?.email, email]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setErrorMessage(t('errorInvalidEmail'));
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale,
          source: 'footer',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('error'));
      }

      setStatus('success');
      // Persist success in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(NEWSLETTER_SUCCESS_KEY, 'true');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('error'));
    }
  };

  // Success state
  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-aurora-green">
        <Check className="w-5 h-5" />
        <span className="text-sm">{t('success')}</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-sm text-text-secondary dark:text-snow-stormLight mb-3">
        {t('description')}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('placeholder')}
            inputSize="sm"
            variant={status === 'error' ? 'error' : 'default'}
            disabled={status === 'loading'}
            aria-label={t('placeholder')}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={status === 'loading'}
          disabled={status === 'loading'}
        >
          {t('subscribe')}
        </Button>
      </form>

      {status === 'error' && errorMessage && (
        <p className="mt-2 text-sm text-aurora-red">{errorMessage}</p>
      )}
    </div>
  );
}
