'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import { supabase } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, CheckCircleAlt01 as CheckCircle2 } from 'griddy-icons';
import { validatePassword } from '@/lib/auth/utils';
import { mapAuthError } from '@/lib/auth/errors';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { useTranslations } from 'next-intl';

export default function ResetPasswordPage() {
  const t = useTranslations('Auth.resetPassword');
  const tExpired = useTranslations('Auth.resetPassword.expired');
  const tSuccess = useTranslations('Auth.resetPassword.success');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const router = useRouter();

  // Check if we have a valid recovery token
  useEffect(() => {
    const checkToken = async () => {
      try {
        const { data: { session } } = await (supabase as any).auth.getSession();
        setValidToken(!!session);

        if (!session) {
          setError(tExpired('errorMessage'));
        }
      } catch (err) {
        setValidToken(false);
        setError(tExpired('errorMessage'));
      }
    };

    checkToken();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(t('validationError'));
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await (supabase as any).auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(mapAuthError(updateError));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    } catch (err: any) {
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  // Show loading state while checking token
  if (validToken === null) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <p className="text-text-secondary">{t('checkingToken')}</p>
        </Card>
      </div>
    );
  }

  // Show error if invalid token
  if (validToken === false) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-polar-night mb-2">
              {tExpired('title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {tExpired('subtitle')}
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/auth/forgot-password">
              <Button variant="primary" fullWidth>
                {tExpired('requestButton')}
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="secondary" fullWidth>
                {tExpired('backButton')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-xl bg-aurora-green/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-aurora-green" />
            </div>
            <h2 className="text-2xl font-bold text-polar-night mb-2">
              {tSuccess('title')}
            </h2>
            <p className="text-text-secondary">
              {tSuccess('subtitle')}
            </p>
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

        {/* Reset Password Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                <p className="text-sm text-aurora-red">{error}</p>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                  placeholder={t('passwordPlaceholder')}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  tabIndex={-1}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-text-muted hover:text-polar-night" />
                  ) : (
                    <Eye className="h-5 w-5 text-text-muted hover:text-polar-night" />
                  )}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? t('updating') : t('saveButton')}
            </Button>
          </form>
        </Card>

        {/* Back to Sign In */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-frost-ice hover:underline font-medium"
          >
            {t('backToSignIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
