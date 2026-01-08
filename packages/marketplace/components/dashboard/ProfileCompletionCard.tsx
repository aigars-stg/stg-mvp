'use client';

import { useState, useMemo } from 'react';
import { Button, Card } from '@second-turn/design-system';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth/AuthContext';
import { COUNTRIES } from '@/lib/country-utils';
import { User, LocationPin as MapPin, Check, X } from 'griddy-icons';
import type { UserProfile } from '@/lib/auth/types';

interface ProfileCompletionCardProps {
  profile: UserProfile | null;
  onDismiss: () => void;
  onComplete: () => void;
}

/**
 * Profile completion card - Inline form for display name and country.
 *
 * Shows progress indicator and allows inline editing.
 * Can be dismissed (stored in sessionStorage - reappears on new session).
 *
 * Brand Voice:
 * - Title: "Complete Your Profile"
 * - Subtitle: "Help other traders know who they're dealing with"
 */
export function ProfileCompletionCard({
  profile,
  onDismiss,
  onComplete,
}: ProfileCompletionCardProps) {
  const { user, updateProfile } = useAuth();

  // Form state - pre-fill from existing profile
  const [displayName, setDisplayName] = useState(profile?.full_name || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate completion status
  const hasDisplayName = !!(profile?.full_name && profile.full_name.length >= 2);
  const hasCountry = !!profile?.country;
  const completionPercent = [hasDisplayName, hasCountry].filter(Boolean).length * 50;

  // Generate suggested display names from email
  const suggestions = useMemo(() => {
    if (!user?.email) return [];

    const [localPart] = user.email.split('@');
    const cleaned = localPart.replace(/[._-]/g, '');

    return [
      localPart,
      cleaned,
      `${cleaned}${Math.floor(Math.random() * 100)}`,
    ].filter((s) => s.length >= 3 && s.length <= 20);
  }, [user?.email]);


  const handleSubmit = async () => {
    setError('');

    // Validate display name
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Please enter a display name');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Display name must be less than 50 characters');
      return;
    }

    // Validate country
    if (!country) {
      setError('Please select your country');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // updateProfile already refreshes profile state internally
      const { error: updateError } = await updateProfile({
        full_name: trimmedName,
        country: country,
      });

      if (updateError) {
        console.error('Profile update error:', updateError);
        setError(updateError.message || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      // Success - profile is already updated by updateProfile
      setLoading(false);
      onComplete();
    } catch (err) {
      console.error('Profile update failed:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Card padding="lg" className="relative">
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1 text-text-muted hover:text-polar-night transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-polar-night">
            A bit about you
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Help others know who they&apos;re dealing with
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">Profile completion</span>
            <span className="font-medium text-polar-night">
              {completionPercent}%
            </span>
          </div>
          <div className="h-2 bg-snow-storm rounded-full overflow-hidden">
            <div
              className="h-full bg-frost-ice transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
            <p className="text-sm text-aurora-red">{error}</p>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-polar-night mb-2">
              <User className="w-4 h-4 text-text-muted" />
              What should we call you?
              {hasDisplayName && (
                <Check className="w-4 h-4 text-aurora-green" />
              )}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
              placeholder="BoardGameFan42"
              disabled={loading}
              maxLength={50}
            />

            {/* Suggestions */}
            {suggestions.length > 0 && !displayName && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-text-muted">Suggestions:</span>
                {suggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setDisplayName(suggestion)}
                    className="text-xs text-frost-ice hover:underline"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-polar-night mb-2">
              <MapPin className="w-4 h-4 text-text-muted" />
              Where are you from?
              {hasCountry && <Check className="w-4 h-4 text-aurora-green" />}
            </label>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCountry(c.code)}
                  disabled={loading}
                  className={clsx(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all',
                    'text-sm font-medium',
                    country === c.code
                      ? 'border-frost-ice bg-frost-ice/10 text-frost-ice'
                      : 'border-border bg-snow-white text-polar-night hover:border-frost-ice/50',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className={c.flagClass} />
                  {c.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              Helps show relevant listings near you
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
            className="sm:flex-1"
          >
            {loading ? 'Saving...' : 'Save & continue'}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={onDismiss}
            disabled={loading}
          >
            Skip for now
          </Button>
        </div>

        
      </div>
    </Card>
  );
}
