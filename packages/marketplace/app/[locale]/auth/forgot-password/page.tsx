'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button, Card } from '@second-turn/design-system';
import { supabase } from '@/lib/supabase/client';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { validateEmail } from '@/lib/auth/utils';
import { mapAuthError } from '@/lib/auth/errors';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
  const t = useTranslations('Auth.forgotPassword');
  const tSuccess = useTranslations('Auth.forgotPassword.success');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!validateEmail(email)) {
      setError(t('validationError'));
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await (supabase as any).auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(mapAuthError(resetError));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-xl bg-frost-ice/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-frost-ice" />
            </div>
            <h2 className="text-2xl font-bold text-polar-night mb-2">
              {tSuccess('title')}
            </h2>
            <p className="text-text-secondary">
              {tSuccess('subtitle', { email: email })}
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-frost-ice/5 rounded-lg border border-frost-ice/20 text-left">
              <p className="text-sm text-text-secondary">
                {tSuccess('instructions')}
              </p>
            </div>

            <div className="pt-2">
              <Link href="/auth/signin">
                <Button variant="primary" fullWidth>
                  {tSuccess('backButton')}
                </Button>
              </Link>
            </div>

            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="text-sm text-frost-ice hover:underline"
            >
              {tSuccess('tryAgain')}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-polar-night mb-2">
            {t('title')}
          </h1>
          <p className="text-text-secondary">
            {t('subtitle')}
          </p>
        </div>

        {/* Forgot Password Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                <p className="text-sm text-aurora-red">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                  placeholder={t('emailPlaceholder')}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? t('sending') : t('sendButton')}
            </Button>
          </form>
        </Card>

        {/* Back to Sign In */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 text-sm text-frost-ice hover:underline font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToSignIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
