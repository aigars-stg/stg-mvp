'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import { useAuth } from '@/lib/auth/AuthContext';
import { Email as Mail, Check, Sparks as Sparkles } from 'griddy-icons';
import { mapAuthError } from '@/lib/auth/errors';
import type { AuthFlowState } from '@/lib/auth/types';
import { useTranslations } from 'next-intl';

/**
 * Email-first authentication page (passwordless).
 * Single page that handles all auth flows with inline state transitions.
 *
 * Flow:
 * 1. Email Entry → user enters email
 * 2. Checking → system checks if email exists
 * 3a. New User → magic link flow
 * 3b. Existing User → magic link or OAuth
 * 4. Magic Link Sent → success confirmation
 */
export default function AuthPage() {
  // Get current locale from URL params
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  // Translations
  const tEmailEntry = useTranslations('Auth.emailEntry');
  const tChecking = useTranslations('Auth.checking');
  const tNewUser = useTranslations('Auth.newUser');
  const tExistingUser = useTranslations('Auth.existingUser');
  const tMagicLink = useTranslations('Auth.magicLinkSent');
  const tErrors = useTranslations('Auth.errors');

  // State machine
  const [authState, setAuthState] = useState<AuthFlowState>('email_entry');

  // Form state
  const [email, setEmail] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Error and UI state
  const [error, setError] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const [redirectTo, setRedirectTo] = useState('/');
  const [providers, setProviders] = useState<string[]>([]);

  const { signInWithMagicLink, signInWithOAuth, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Maximum resend attempts
  const MAX_RESENDS = 3;

  // Get redirect parameter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirectTo');
    if (redirect) {
      setRedirectTo(redirect);
    }
  }, []);

  // Redirect if already logged in (wait for auth to finish loading)
  useEffect(() => {
    if (user && !authLoading) {
      router.push(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

  // Check if email exists in database
  const checkEmailExists = async (emailToCheck: string): Promise<{ exists: boolean; providers: string[] }> => {
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      });

      if (!response.ok) {
        throw new Error('Failed to check email');
      }

      const data = await response.json();
      return { exists: data.exists, providers: data.providers || [] };
    } catch (err) {
      console.error('Email check failed:', err);
      // On error, default to new user flow (safer)
      return { exists: false, providers: [] };
    }
  };

  // Handle email submission (State 1 → State 2 → State 3a/3b)
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthState('checking');

    const startTime = Date.now();
    const minDuration = 400; // ms for perceived quality

    try {
      const { exists, providers: userProviders } = await checkEmailExists(email);

      // Ensure minimum duration (feels more trustworthy)
      const elapsed = Date.now() - startTime;
      if (elapsed < minDuration) {
        await new Promise((r) => setTimeout(r, minDuration - elapsed));
      }

      setProviders(userProviders);
      setAuthState(exists ? 'existing_user' : 'new_user');
    } catch (_err) {
      // Fallback: assume new user on error (safer default)
      setAuthState('new_user');
    }
  };

  // Handle magic link request (State 3a/3b → State 4)
  const handleMagicLink = async () => {
    setError('');
    setLoading(true);

    try {
      const { error: magicLinkError } = await signInWithMagicLink(email, locale);

      if (magicLinkError) {
        setError(mapAuthError(magicLinkError));
        setLoading(false);
        return;
      }

      setAuthState('magic_link_sent');
      setLoading(false);
    } catch (err: unknown) {
      setError(mapAuthError(err instanceof Error ? err : new Error('Unknown error')));
      setLoading(false);
    }
  };

  // Handle OAuth sign in
  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    setError('');
    setOauthLoading(true);

    try {
      const { error: oauthError } = await signInWithOAuth(provider, locale);

      if (oauthError) {
        setError(mapAuthError(oauthError));
        setOauthLoading(false);
        return;
      }

      // OAuth will redirect to provider
    } catch (err: unknown) {
      setError(mapAuthError(err instanceof Error ? err : new Error('Unknown error')));
      setOauthLoading(false);
    }
  };

  // Handle resend magic link
  const handleResend = async () => {
    if (resendCount >= MAX_RESENDS) {
      setError(tErrors('tooManyAttempts'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: resendError } = await signInWithMagicLink(email, locale);

      if (resendError) {
        setError(mapAuthError(resendError));
      } else {
        setResendCount((prev) => prev + 1);
      }
    } catch (err: unknown) {
      setError(mapAuthError(err instanceof Error ? err : new Error('Unknown error')));
    }

    setLoading(false);
  };

  // Go back to email entry
  const handleChangeEmail = () => {
    setAuthState('email_entry');
    setError('');
    setResendCount(0);
  };

  // Render email entry state (State 1)
  const renderEmailEntry = () => (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
          {tEmailEntry('title')}
        </h1>
        <p className="text-text-secondary text-sm sm:text-base">
          {tEmailEntry('subtitle')}
        </p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
              <p className="text-sm text-aurora-red">{error}</p>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-polar-night mb-2">
              {tEmailEntry('emailLabel')}
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
                placeholder={tEmailEntry('emailPlaceholder')}
                required
                disabled={loading || oauthLoading}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Continue Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading || oauthLoading || !email}
          >
            {tEmailEntry('continueButton')}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-snow-white text-text-secondary">
              {tEmailEntry('divider')}
            </span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading || oauthLoading}
            className="flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {tEmailEntry('continueWithGoogle')}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => handleOAuthSignIn('facebook')}
            disabled={loading || oauthLoading}
            className="flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#1877F2"
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
              />
            </svg>
            {tEmailEntry('continueWithFacebook')}
          </Button>
        </div>
      </Card>
    </>
  );

  // Render checking state (State 2)
  const renderChecking = () => (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
          {tChecking('title')}
        </h1>
      </div>

      <Card padding="lg">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-frost-ice border-t-transparent mb-4" />
          <p className="text-text-secondary">{email}</p>
        </div>
      </Card>
    </>
  );

  // Render new user flow (State 3a)
  const renderNewUser = () => (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-frost-ice/20 to-aurora-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-frost-ice/10">
          <Sparkles className="w-8 h-8 text-frost-ice" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-3">
          {tNewUser('title')}
        </h1>
        <p className="text-text-secondary text-sm sm:text-base max-w-xs mx-auto">
          {tNewUser('subtitle')}
        </p>
      </div>

      <Card padding="lg">
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg mb-5">
            <p className="text-sm text-aurora-red">{error}</p>
          </div>
        )}

        {/* Email display with change option */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleChangeEmail}
            className="flex items-center gap-2 px-3 py-1.5 bg-snow-storm rounded-full text-sm text-polar-night hover:bg-frost-ice/10 transition-colors border border-border"
          >
            <span className="font-medium">{email}</span>
            <span className="text-xs text-frost-ice font-semibold ml-1">{tNewUser('changeEmail')}</span>
          </button>
        </div>

        {/* What is a magic link? Box */}
        <div className="bg-frost-ice/5 border border-frost-ice/10 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-polar-night mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-frost-ice" />
            {tNewUser('magicLinkTitle')}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            {tNewUser('magicLinkDescription')}
          </p>
        </div>

        {/* Send Magic Link Button */}
        <Button
          type="button"
          // variant="default"
          size="lg"
          fullWidth
          onClick={handleMagicLink}
          disabled={loading}
          loading={loading}
          className="shadow-md hover:shadow-lg transition-shadow !bg-[#D08770] hover:!bg-[#C97862] text-white font-medium border-none"
        >
          {loading ? tNewUser('sending') : tNewUser('sendMagicLink')}
        </Button>

        {/* Implicit consent */}
        <p className="text-xs text-text-muted text-center mt-5">
          {tNewUser('termsPrefix')}{' '}
          <Link href="/terms" className="text-frost-ice hover:underline" target="_blank">
            {tNewUser('termsOfService')}
          </Link>{' '}
          {tNewUser('termsAnd')}{' '}
          <Link href="/privacy" className="text-frost-ice hover:underline" target="_blank">
            {tNewUser('privacyPolicy')}
          </Link>
        </p>
      </Card>
    </>
  );

  // Render existing user flow (State 3b) - passwordless only
  const renderExistingUser = () => {
    const isGoogleUser = providers.includes('google');
    const isFacebookUser = providers.includes('facebook');
    const hasOAuth = isGoogleUser || isFacebookUser;

    return (
      <>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
            {tExistingUser('welcomeBack')}
          </h1>
          <p className="text-text-secondary text-sm sm:text-base">
            {hasOAuth
              ? tExistingUser('usuallySignInWith', { provider: isGoogleUser ? 'Google' : 'Facebook' })
              : tExistingUser('readyForAnotherTurn')}
          </p>
        </div>

        <Card padding="lg">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg mb-5">
              <p className="text-sm text-aurora-red">{error}</p>
            </div>
          )}

          {/* Email display with change option */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleChangeEmail}
              className="flex items-center gap-2 px-3 py-1.5 bg-snow-storm rounded-full text-sm text-polar-night hover:bg-frost-ice/10 transition-colors border border-border"
            >
              <span className="font-medium">{email}</span>
              <span className="text-xs text-frost-ice font-semibold ml-1">{tExistingUser('changeEmail')}</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* OAuth buttons if available */}
            {isGoogleUser && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading || oauthLoading}
                className="flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="relative z-10">{tExistingUser('signInWithGoogle')}</span>
              </Button>
            )}

            {isFacebookUser && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => handleOAuthSignIn('facebook')}
                disabled={loading || oauthLoading}
                className="flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                {tExistingUser('signInWithFacebook')}
              </Button>
            )}

            {/* Divider - only show if there are OAuth options */}
            {hasOAuth && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-snow-white text-text-secondary">{tExistingUser('divider')}</span>
                </div>
              </div>
            )}

            {/* Magic Link Button */}
            <Button
              type="button"
              size="lg"
              fullWidth
              onClick={handleMagicLink}
              disabled={loading}
              loading={loading}
              className={hasOAuth ? "bg-aurora-orange hover:bg-aurora-orange/90 text-white font-medium" : ""}
              variant={hasOAuth ? undefined : "primary"}
            >
              {loading ? tExistingUser('sending') : tExistingUser('sendMagicLink')}
            </Button>

            <p className="text-xs text-text-muted text-center mt-3">
              {tExistingUser('magicLinkDescription')}
            </p>
          </div>
        </Card>
      </>
    );
  };

  // Render magic link sent state (State 4)
  const renderMagicLinkSent = () => (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-aurora-green/20 to-aurora-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-aurora-green/20 shadow-sm">
          <Check className="w-8 h-8 text-aurora-green" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
          {tMagicLink('title')}
        </h1>
        <p className="text-text-secondary">
          {tMagicLink('subtitle', { email })}
        </p>
      </div>

      <Card padding="lg">
        <div className="text-center">
          {/* Next Steps Visualization */}
          <div className="flex items-center justify-center gap-4 mb-8 text-sm font-medium text-polar-night">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-snow-storm rounded-lg flex items-center justify-center border border-border text-text-muted">
                <Mail className="w-5 h-5" />
              </div>
              <span>{tMagicLink('stepOpenEmail')}</span>
            </div>
            <div className="h-px w-12 bg-border relative">
              <div className="absolute right-0 -top-1 border-t-4 border-b-4 border-l-4 border-transparent border-l-border"></div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-frost-ice/10 rounded-lg flex items-center justify-center border border-frost-ice/20 text-frost-ice">
                <Sparkles className="w-5 h-5" />
              </div>
              <span>{tMagicLink('stepClickLink')}</span>
            </div>
          </div>

          <p className="text-sm text-text-muted mb-6">
            {tMagicLink('expiryInfo')}
          </p>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg mb-4">
              <p className="text-sm text-aurora-red">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {/* Resend Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleResend}
              disabled={loading || resendCount >= MAX_RESENDS}
              className="w-full"
            >
              {loading ? tMagicLink('sending') : tMagicLink('resendButton')}
            </Button>

            {resendCount > 0 && resendCount < MAX_RESENDS && (
              <p className="text-xs text-text-muted">
                {tMagicLink(resendCount > 1 ? 'sentCount_other' : 'sentCount_one', { count: resendCount })}
              </p>
            )}

            {/* Change Email */}
            <button
              onClick={handleChangeEmail}
              className="text-sm text-text-secondary hover:text-polar-night hover:underline block w-full text-center"
            >
              {tMagicLink('useDifferentEmail')}
            </button>
          </div>
        </div>
      </Card>
    </>
  );

  // Main render based on auth state
  const renderContent = () => {
    switch (authState) {
      case 'email_entry':
        return renderEmailEntry();
      case 'checking':
        return renderChecking();
      case 'new_user':
        return renderNewUser();
      case 'existing_user':
        return renderExistingUser();
      case 'magic_link_sent':
        return renderMagicLinkSent();
      default:
        return renderEmailEntry();
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">{renderContent()}</div>
    </div>
  );
}
