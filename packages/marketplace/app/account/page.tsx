'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button, Card } from '@second-turn/design-system';
import { User, Mail, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { AvatarUpload } from '@/components/auth/AvatarUpload';
import { EmailChange } from '@/components/auth/EmailChange';
import { AccountDeletion } from '@/components/auth/AccountDeletion';
import { LoginActivity } from '@/components/auth/LoginActivity';
import { CountrySelector } from '@/components/auth/CountrySelector';
import { getCountryFlag, getCountryName, type CountryCode } from '@/lib/country-utils';

export default function AccountPage() {
  const { user, profile, updateProfile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState<CountryCode | ''>(profile?.country as CountryCode || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Update local state when profile changes
  useState(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
      setCountry(profile.country as CountryCode || '');
    }
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        country: country || null,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess('Profile updated successfully');
      setIsEditing(false);
      setLoading(false);

      // Refresh profile to get latest data
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // AuthContext handles the redirect to '/'
    } catch (error) {
      console.error('Failed to sign out:', error);
      setError('Failed to sign out. Please try again.');
    }
  };

  const handleAvatarUpload = async (url: string) => {
    const { error: updateError } = await updateProfile({
      avatar_url: url || null,
    });

    if (!updateError) {
      setSuccess('Avatar updated successfully');
      await refreshProfile();
    } else {
      setError('Failed to update avatar');
    }
  };

  // Show loading only while auth is initializing
  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // If user exists but profile doesn't, show error with retry
  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-aurora-red mx-auto" />
            <h2 className="text-xl font-semibold text-polar-night">Profile Loading Error</h2>
            <p className="text-text-secondary">
              We couldn't load your profile. This might be due to a network issue or a problem with your account data.
            </p>
            <div className="text-sm text-text-muted bg-bg-secondary p-3 rounded border border-border">
              <p className="font-mono">User ID: {user.id.substring(0, 8)}...</p>
              <p className="font-mono">Email: {user.email}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
                fullWidth
                className="sm:w-auto"
              >
                Retry
              </Button>
              <Button
                onClick={handleSignOut}
                variant="secondary"
                fullWidth
                className="sm:w-auto"
              >
                Sign Out
              </Button>
            </div>
            <p className="text-xs text-text-muted pt-2">
              If this problem persists, please contact{' '}
              <a href="mailto:info@secondturn.games" className="text-frost-ice hover:underline">
                info@secondturn.games
              </a>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-4 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">Account Settings</h1>
          <p className="text-sm sm:text-base text-text-secondary">
            Manage your profile and account preferences
          </p>
        </div>

        {/* Email Verification Banner */}
        <EmailVerificationBanner dismissible />

        {/* Profile Information Card */}
        <Card padding="lg" className="mb-6 sm:p-6 p-4">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-polar-night">Profile Information</h2>
            {!isEditing && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-4 bg-aurora-green/10 border border-aurora-green/20 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0 mt-0.5" />
              <p className="text-sm text-aurora-green">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
              <p className="text-sm text-aurora-red">{error}</p>
            </div>
          )}

          {!isEditing ? (
            /* VIEW MODE - Compact Profile Card */
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-frost-ice/10 flex items-center justify-center border-2 border-border">
                    <User className="w-10 h-10 text-text-muted" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Name */}
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-polar-night truncate">
                    {profile.full_name}
                    {profile.country && getCountryFlag(profile.country) && (
                      <span
                        className={`${getCountryFlag(profile.country)} ml-2`}
                        role="img"
                        aria-label={`Country: ${getCountryName(profile.country)}`}
                        title={getCountryName(profile.country)}
                      />
                    )}
                  </h3>
                </div>

                {/* Email */}
                <div className="text-sm text-text-secondary break-words">
                  {profile.email}
                </div>

                {/* Phone - only show if exists */}
                {profile.phone && (
                  <div className="text-sm text-text-secondary">
                    {profile.phone}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EDIT MODE - Compact Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Avatar Upload */}
              <div>
                <AvatarUpload
                  currentAvatarUrl={profile.avatar_url}
                  onUploadComplete={handleAvatarUpload}
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-frost-ice" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                    placeholder="John Doe"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-frost-ice" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                    placeholder="+371 12345678"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Country *
                </label>
                <CountrySelector
                  value={country}
                  onChange={setCountry}
                  disabled={loading}
                  required
                />
              </div>

              {/* Email Change */}
              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Change Email
                </label>
                <EmailChange currentEmail={profile.email} />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  fullWidth
                  className="sm:w-auto"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setFullName(profile.full_name);
                    setPhone(profile.phone || '');
                    setCountry(profile.country as CountryCode || '');
                    setError('');
                    setSuccess('');
                  }}
                  disabled={loading}
                  fullWidth
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Account Actions Card */}
        <Card padding="lg" className="mb-6 sm:p-6 p-4">
          <h2 className="text-lg sm:text-xl font-semibold text-polar-night mb-4">Account Actions</h2>

          <div className="space-y-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => router.push('/my-listings')}
            >
              View My Listings
            </Button>

            <Button
              variant="danger"
              fullWidth
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Login Activity */}
        <div className="mb-6">
          <LoginActivity />
        </div>

        {/* Danger Zone - Account Deletion */}
        <Card padding="lg" className="sm:p-6 p-4">
          <h2 className="text-lg sm:text-xl font-semibold text-polar-night mb-4">Danger Zone</h2>
          <AccountDeletion />
        </Card>

        {/* Account Info */}
        <div className="mt-6 p-3 sm:p-4 bg-bg-elevated rounded-lg">
          <p className="text-xs text-text-secondary">
            <strong>Account ID:</strong> {user.id}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            <strong>Member since:</strong>{' '}
            {new Date(user.created_at || '').toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
