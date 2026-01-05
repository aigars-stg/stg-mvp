'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import { Mail, Lock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function RecoverAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recoveryDeadlinePassed, setRecoveryDeadlinePassed] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setRecoveryDeadlinePassed(false);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/recover-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.recovery_deadline_passed) {
          setRecoveryDeadlinePassed(true);
        }
        setError(data.error || 'Failed to recover account');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to sign-in page after 3 seconds
      setTimeout(() => {
        router.push('/auth/signin?message=account-recovered');
      }, 3000);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to recover account');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center py-12 px-4">
        <Card padding="lg" className="w-full max-w-md">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-aurora-green/10 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-aurora-green" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-polar-night mb-2">
              Account Recovered!
            </h1>
            <p className="text-text-secondary mb-4">
              Your account has been successfully restored. You can now sign in with your email address.
            </p>
            <div className="p-3 bg-bg-elevated rounded-lg border border-border mb-4">
              <p className="text-xs text-text-secondary">
                <strong>Note:</strong> Your profile information (name, phone, avatar) was anonymized
                during deletion and will need to be updated in your account settings.
              </p>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Redirecting to sign-in page...
            </p>
            <Link href="/auth/signin">
              <Button variant="primary" fullWidth>
                Sign In Now
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-frost-ice/10 rounded-full">
              <RefreshCw className="w-10 h-10 text-frost-ice" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-polar-night mb-2">
            Recover Your Account
          </h1>
          <p className="text-text-secondary">
            Restore your deleted account within the 14-day grace period
          </p>
        </div>

        <Card padding="lg">
          {/* Error Messages */}
          {error && (
            <div className="mb-4 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-aurora-red">{error}</p>
                {recoveryDeadlinePassed && (
                  <p className="text-xs text-text-secondary mt-2">
                    The 14-day recovery period for this account has expired.
                    You can create a new account with the same email address.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-4 bg-frost-ice/5 border border-frost-ice/20 rounded-lg">
            <p className="text-sm text-text-secondary mb-2">
              <strong>Before you recover:</strong>
            </p>
            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
              <li>You must recover within 14 days of deletion</li>
              <li>Your original email address will be restored</li>
              <li>Your profile data (name, phone, avatar) was anonymized and will need to be updated</li>
              <li>Your transaction history will be restored</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                Email Address *
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
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                Enter the email address you used before deleting your account
              </p>
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                Your account password for verification
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Recovering Account...' : 'Recover Account'}
            </Button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-text-secondary text-center">
              Recovery period expired?{' '}
              <Link href="/auth/signup" className="text-frost-ice hover:underline font-medium">
                Create new account
              </Link>
            </p>
            <p className="text-sm text-text-secondary text-center mt-2">
              Changed your mind?{' '}
              <Link href="/" className="text-frost-ice hover:underline font-medium">
                Back to home
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
