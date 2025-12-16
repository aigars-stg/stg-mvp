'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import { supabase } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { validatePassword } from '@/lib/auth/utils';
import { mapAuthError } from '@/lib/auth/errors';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

export default function ResetPasswordPage() {
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
          setError('This reset link has expired. Request a fresh one and you should be good.');
        }
      } catch (err) {
        setValidToken(false);
        setError('This reset link has expired. Request a fresh one and you should be good.');
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
      setError('Make it a bit stronger — 8+ characters with uppercase, lowercase, and a number');
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
          <p className="text-text-secondary">Checking your reset link...</p>
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
              Link expired
            </h2>
            <p className="text-text-secondary mb-4">
              This password reset link is no longer valid. No worries — just request a new one.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/auth/forgot-password">
              <Button variant="primary" fullWidth>
                Request new link
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="secondary" fullWidth>
                Back to sign in
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
              You're all set!
            </h2>
            <p className="text-text-secondary">
              Your password has been updated. Taking you to sign in...
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
            Pick a new password
          </h1>
          <p className="text-text-secondary">
            Make it strong and memorable
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
                New password
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
                  placeholder="8+ characters, mix of letters and numbers"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              {loading ? 'Updating...' : 'Save new password'}
            </Button>
          </form>
        </Card>

        {/* Back to Sign In */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-frost-ice hover:underline font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
