'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import { useAuth } from '@/lib/auth/AuthContext';
import { Mail, Lock, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { validatePassword, validateEmail } from '@/lib/auth/utils';
import { mapAuthError } from '@/lib/auth/errors';
import { AUTH_ERRORS } from '@/lib/auth/constants';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { Turnstile } from '@marsidev/react-turnstile';
import { CountrySelector } from '@/components/auth/CountrySelector';
import type { CountryCode } from '@/lib/country-utils';

export default function SignUpPage() {
  // Check if site is in "coming soon" mode
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  // If in coming soon mode, show a message instead
  if (isComingSoon) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-frost-ice/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-frost-ice" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-polar-night mb-2">
              We're Launching Soon!
            </h2>
            <p className="text-text-secondary mb-6">
              Sign up will be available when we officially launch. In the meantime, you can explore what's coming to the Baltic board game community.
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/">
              <Button variant="primary" fullWidth>
                Explore Preview
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="secondary" fullWidth>
                Sign In (If You Have an Account)
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<CountryCode | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const { signUp, signInWithOAuth } = useAuth();
  const router = useRouter();

  // Check if Turnstile is configured
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!country) {
      setError('Please select your country');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }

    if (password !== confirmPassword) {
      setError(AUTH_ERRORS.PASSWORDS_DONT_MATCH);
      return;
    }

    // Verify CAPTCHA if configured
    if (turnstileSiteKey && !captchaToken) {
      setError('Please complete the security verification');
      return;
    }

    setLoading(true);

    try {
      // Verify Turnstile token if configured
      if (turnstileSiteKey && captchaToken) {
        const verifyRes = await fetch('/api/auth/verify-captcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: captchaToken }),
        });

        if (!verifyRes.ok) {
          setError('Security verification failed. Please try again.');
          setLoading(false);
          setCaptchaToken(null);
          return;
        }
      }

      const { error: signUpError } = await signUp(email, password, fullName, country);

      if (signUpError) {
        setError(mapAuthError(signUpError));
        setLoading(false);
        return;
      }

      // Show success message
      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'github') => {
    setError('');
    setOauthLoading(true);

    try {
      const { error: oauthError } = await signInWithOAuth(provider);

      if (oauthError) {
        setError(mapAuthError(oauthError));
        setOauthLoading(false);
        return;
      }

      // OAuth will redirect to provider, so we don't need to do anything here
    } catch (err: any) {
      setError(mapAuthError(err));
      setOauthLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-frost-ice/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-frost-ice" />
            </div>
            <h2 className="text-2xl font-bold text-polar-night mb-2">
              Check your email
            </h2>
            <p className="text-text-secondary">
              We've sent a verification link to <strong>{email}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-frost-ice/5 rounded-lg border border-frost-ice/20 text-left">
              <p className="text-sm text-text-secondary">
                Click the link in the email to verify your account. You may need to check your spam folder.
              </p>
            </div>

            <Link href="/auth/signin">
              <Button variant="primary" fullWidth>
                Go to Sign In
              </Button>
            </Link>
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
            Create your account
          </h1>
          <p className="text-text-secondary">
            Start buying and selling board games
          </p>
        </div>

        {/* Sign Up Form */}
        <Card padding="lg">
          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => handleOAuthSignUp('google')}
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
              Sign up with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-snow-white text-text-secondary">or sign up with email</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                <p className="text-sm text-aurora-red">{error}</p>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                Country *
              </label>
              <p className="text-xs text-text-secondary mb-3">
                Select your country for local pickup options
              </p>
              <CountrySelector
                value={country}
                onChange={setCountry}
                disabled={loading}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                Email *
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
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                Password *
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
                  placeholder="At least 8 characters"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  tabIndex={-1}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                  placeholder="Re-enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-text-muted hover:text-polar-night" />
                  ) : (
                    <Eye className="h-5 w-5 text-text-muted hover:text-polar-night" />
                  )}
                </button>
              </div>
            </div>

            {/* Turnstile CAPTCHA */}
            {turnstileSiteKey && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{
                    theme: 'light',
                    size: 'normal',
                  }}
                />
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading || (!!turnstileSiteKey && !captchaToken)}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            {/* Terms */}
            <p className="text-xs text-text-secondary text-center">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-frost-ice hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-frost-ice hover:underline">
                Privacy Policy
              </Link>
            </p>
          </form>
        </Card>

        {/* Sign In Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-frost-ice hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
