'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getInitials } from '@/lib/auth/utils';
import { Button, Card } from '@second-turn/design-system';
import { User, Mail, Phone, CheckCircle2, AlertCircle, Download, Settings, AtSign, Globe, Pencil, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { AvatarUpload } from '@/components/auth/AvatarUpload';
import { EmailChange } from '@/components/auth/EmailChange';
import { AccountDeletion } from '@/components/auth/AccountDeletion';
import { LoginActivity } from '@/components/auth/LoginActivity';
import { CountrySelector } from '@/components/auth/CountrySelector';
import { getCountryFlag, getCountryName, type CountryCode } from '@/lib/country-utils';

export default function AccountSettingsPage() {
  const { user, profile, updateProfile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState<CountryCode | ''>(profile?.country as CountryCode || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isChangingCountry, setIsChangingCountry] = useState(false);
  const [isChangingName, setIsChangingName] = useState(false);
  const [isChangingPhone, setIsChangingPhone] = useState(false);

  // Update local state when profile changes
  useState(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
      setCountry(profile.country as CountryCode || '');
    }
  });

  /* Individual Update Handlers */

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await updateProfile({
        full_name: fullName.trim(),
      });

      if (updateError) throw updateError;

      setSuccess('Name updated successfully');
      setIsChangingName(false);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePhone = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await updateProfile({
        phone: phone.trim() || null,
      });

      if (updateError) throw updateError;

      setSuccess('Phone number updated successfully');
      setIsChangingPhone(false);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update phone');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCountry = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await updateProfile({
        country: country || null,
      });

      if (updateError) throw updateError;

      setSuccess('Country updated successfully');
      setIsChangingCountry(false);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update country');
    } finally {
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

  const handleDownloadData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Call the export API
      const response = await fetch('/api/auth/export-data');

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get the JSON blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `second-turn-games-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Your data has been downloaded successfully');
      setLoading(false);
    } catch (error) {
      console.error('Failed to download data:', error);
      setError('Failed to download your data. Please try again.');
      setLoading(false);
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

  // The return statement is wrapped carefully to avoid syntax errors
  return <div className="min-h-screen bg-bg py-4 sm:py-8 px-4" id="account-settings">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-frost-ice" />
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">Account settings</h1>
        </div>
        <p className="text-sm sm:text-base text-text-secondary">
          Your profile and preferences
        </p>
      </div>

      {/* Email Verification Banner */}
      <div className="mb-6">
        <EmailVerificationBanner dismissible />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN - Profile Information */}
        <div className="lg:col-span-3">
          {/* Profile Information Card */}
          <Card padding="lg" className="mb-6 sm:p-6 p-4">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-polar-night">Profile information</h2>
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

            <div className="space-y-6">
              {/* Avatar Upload */}
              <div>
                <AvatarUpload
                  currentAvatarUrl={profile.avatar_url}
                  onUploadComplete={handleAvatarUpload}
                />
              </div>

              {/* Full Name */}
              <div>
                {!isChangingName ? (
                  <div
                    className="group relative flex items-center justify-between p-3 border border-transparent rounded-lg hover:bg-bg transition-colors cursor-pointer"
                    onClick={() => {
                      setFullName(profile.full_name);
                      setIsChangingName(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-text-muted" />
                      <span className="text-sm font-medium text-polar-night">
                        {profile.full_name}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-frost-ice/10 hover:text-frost-ice rounded"
                      aria-label="Edit name"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-2 border-frost-ice/20 rounded-lg bg-snow-white">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span id="full-name-label" className="sr-only">Full name</span>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-frost-ice" />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-white"
                          placeholder="John Doe"
                          aria-labelledby="full-name-label"
                          required
                          disabled={loading}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setIsChangingName(false);
                              setFullName(profile.full_name);
                            }
                            if (e.key === 'Enter') {
                              handleUpdateName();
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleUpdateName}
                          disabled={loading}
                          className="p-2 text-aurora-green hover:bg-aurora-green/10 rounded-md transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-aurora-green border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingName(false);
                            setFullName(profile.full_name);
                          }}
                          disabled={loading}
                          className="p-2 text-aurora-red hover:bg-aurora-red/10 rounded-md transition-colors disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                {!isChangingPhone ? (
                  <div
                    className="group relative flex items-center justify-between p-3 border border-transparent rounded-lg hover:bg-bg transition-colors cursor-pointer"
                    onClick={() => {
                      setPhone(profile.phone || '');
                      setIsChangingPhone(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-text-muted" />
                      <span className="text-sm font-medium text-polar-night">
                        {profile.phone || <span className="text-text-secondary italic">Add phone number</span>}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-frost-ice/10 hover:text-frost-ice rounded"
                      aria-label="Edit phone"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-2 border-frost-ice/20 rounded-lg bg-snow-white">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span id="phone-label" className="sr-only">Phone number</span>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-frost-ice" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-white"
                          placeholder="+371 12345678"
                          aria-labelledby="phone-label"
                          disabled={loading}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setIsChangingPhone(false);
                              setPhone(profile.phone || '');
                            }
                            if (e.key === 'Enter') {
                              handleUpdatePhone();
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleUpdatePhone}
                          disabled={loading}
                          className="p-2 text-aurora-green hover:bg-aurora-green/10 rounded-md transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-aurora-green border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPhone(false);
                            setPhone(profile.phone || '');
                          }}
                          disabled={loading}
                          className="p-2 text-aurora-red hover:bg-aurora-red/10 rounded-md transition-colors disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Country */}
              <div>
                {!isChangingCountry ? (
                  <div
                    className="group relative flex items-center justify-between p-3 border border-transparent rounded-lg hover:bg-bg transition-colors cursor-pointer"
                    onClick={() => {
                      setCountry(profile.country as CountryCode || '');
                      setIsChangingCountry(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-text-muted" />
                      <span className={`${getCountryFlag(profile.country as CountryCode)} text-2xl`} role="img" aria-label={`${getCountryName(profile.country as CountryCode)} flag`} />
                      <span className="text-sm font-medium text-polar-night">
                        {getCountryName(profile.country as CountryCode)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-frost-ice/10 hover:text-frost-ice rounded"
                      aria-label="Edit country"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-2 border-frost-ice/20 rounded-lg bg-snow-white">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span id="country-label" className="sr-only">Country</span>
                        <CountrySelector
                          value={country}
                          onChange={(newCountry) => setCountry(newCountry)}
                          disabled={loading}
                          required
                          aria-labelledby="country-label"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleUpdateCountry}
                          disabled={loading}
                          className="p-2 text-aurora-green hover:bg-aurora-green/10 rounded-md transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-aurora-green border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingCountry(false);
                            setCountry(profile.country as CountryCode || '');
                          }}
                          disabled={loading}
                          className="p-2 text-aurora-red hover:bg-aurora-red/10 rounded-md transition-colors disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Change */}
              <div>
                <EmailChange currentEmail={profile.email} />
              </div>

              {/* Joined Date */}
              <div className="pt-2 text-xs text-text-secondary text-right">
                Joined {new Date(user.created_at || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </Card>


        </div>

        {/* RIGHT COLUMN - Actions & Danger Zone */}
        <div className="space-y-6 lg:col-span-2">

          {/* Privacy & Data Management */}
          <Card padding="lg" className="sm:p-6 p-4">
            <div className="space-y-4">
              <div className="p-4 bg-frost-ice/5 rounded-lg border border-frost-ice/20">
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-polar-night mb-1">Your data</h3>
                    <p className="text-sm text-text-secondary mb-3">
                      Export all your personal data in JSON format.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownloadData}
                      disabled={loading}
                    >
                      {loading ? 'Preparing...' : 'Download'}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                This feature complies with GDPR Article 20. Learn more in our{' '}
                <a href="/privacy#your-rights" className="text-frost-ice hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </Card>

          {/* Login Activity */}
          <LoginActivity />

          {/* Danger Zone - Account Deletion */}
          <Card padding="lg" className="sm:p-6 p-4">
            <AccountDeletion />
          </Card>


        </div>
      </div >
    </div >
  </div >
}
