'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button, Card } from '@second-turn/design-system';
import { User, Phone, CheckCircleAlt01 as CheckCircle2, AlertCircle, Download, Settings, Globe, Edit as Pencil, Check, Close, LinkExternal as ExternalLink } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { AvatarUpload } from '@/components/auth/AvatarUpload';
import { EmailChange } from '@/components/auth/EmailChange';
import { AccountDeletion } from '@/components/auth/AccountDeletion';
import { LoginActivity } from '@/components/auth/LoginActivity';
import { CountrySelector } from '@/components/auth/CountrySelector';
import { NewsletterSettings } from '@/components/newsletter/NewsletterSettings';
import { getCountryFlag, getCountryName, type CountryCode } from '@/lib/country-utils';
import { formatDate } from '@/lib/date-utils';

export default function AccountSettingsPage() {
  const t = useTranslations('AccountSettings');
  const { user, profile, updateProfile, refreshProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState<CountryCode | ''>(profile?.country as CountryCode || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isChangingCountry, setIsChangingCountry] = useState(false);
  const [isChangingName, setIsChangingName] = useState(false);
  const [isChangingPhone, setIsChangingPhone] = useState(false);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
      setCountry(profile.country as CountryCode || '');
    }
  }, [profile]);

  /* Individual Update Handlers */

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      setError(t('validation.fullNameRequired'));
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

      setSuccess(t('success.nameUpdated'));
      setIsChangingName(false);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.updateName'));
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

      setSuccess(t('success.phoneUpdated'));
      setIsChangingPhone(false);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.updatePhone'));
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

      setSuccess(t('success.countryUpdated'));
      setIsChangingCountry(false);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.updateCountry'));
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
      setError(t('error.signOut'));
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

      setSuccess(t('success.dataDownloaded'));
      setLoading(false);
    } catch (error) {
      console.error('Failed to download data:', error);
      setError(t('error.downloadData'));
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    const { error: updateError } = await updateProfile({
      avatar_url: url || null,
    });

    if (!updateError) {
      setSuccess(t('success.avatarUpdated'));
      await refreshProfile();
    } else {
      setError(t('error.updateAvatar'));
    }
  };

  // Show loading only while auth is initializing
  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">{t('loading')}</p>
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
            <h2 className="text-xl font-semibold text-polar-night">{t('profileError.title')}</h2>
            <p className="text-text-secondary">
              {t('profileError.description')}
            </p>
            <div className="text-sm text-text-muted bg-bg-secondary p-3 rounded border border-border">
              <p className="font-mono">{t('profileError.userId')} {user.id.substring(0, 8)}...</p>
              <p className="font-mono">{t('profileError.email')} {user.email}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
                fullWidth
                className="sm:w-auto"
              >
                {t('profileError.retry')}
              </Button>
              <Button
                onClick={handleSignOut}
                variant="secondary"
                fullWidth
                className="sm:w-auto"
              >
                {t('profileError.signOut')}
              </Button>
            </div>
            <p className="text-xs text-text-muted pt-2">
              {t('profileError.contactSupport')}{' '}
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
  return <div className="min-h-screen bg-bg py-4 sm:py-6 px-4 sm:px-6" id="account-settings">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-frost-ice" />
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">{t('title')}</h1>
        </div>
        <p className="text-sm sm:text-base text-text-secondary">
          {t('subtitle')}
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
              <h2 className="text-lg sm:text-xl font-semibold text-polar-night">{t('profileInfo')}</h2>
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

            {/* Profile Hero Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pb-6 border-b border-border">
              {/* Large Avatar */}
              <AvatarUpload
                currentAvatarUrl={profile.avatar_url}
                onUploadComplete={handleAvatarUpload}
                size="large"
              />

              {/* Name + Member Since */}
              <div className="flex-1 text-center sm:text-left">
                {!isChangingName ? (
                  <div
                    className="group cursor-pointer inline-flex items-center gap-2"
                    onClick={() => {
                      setFullName(profile.full_name);
                      setIsChangingName(true);
                    }}
                  >
                    <h3 className="text-xl font-semibold text-polar-night">
                      {profile.full_name}
                    </h3>
                    <Pencil className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-xl font-semibold text-polar-night bg-transparent border-b-2 border-frost-ice focus:outline-none w-full max-w-xs"
                      placeholder="Your name"
                      autoFocus
                      disabled={loading}
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
                    <button
                      type="button"
                      onClick={handleUpdateName}
                      disabled={loading}
                      className="p-1 text-aurora-green hover:bg-aurora-green/10 rounded transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-aurora-green border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingName(false);
                        setFullName(profile.full_name);
                      }}
                      disabled={loading}
                      className="p-1 text-aurora-red hover:bg-aurora-red/10 rounded transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <Close className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <p className="text-sm text-text-secondary mt-1">
                  {t('profileHero.memberSince', {
                    date: formatDate(user.created_at || '')
                  })}
                </p>
              </div>
            </div>

            {/* Profile Details with Completion Indicators */}
            <div className="pt-6 space-y-1">
              {/* Email Row - with completion indicator */}
              <div className="flex items-center gap-3 py-3 px-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-secondary">{t('fields.email')}</div>
                  <EmailChange currentEmail={profile.email} compact />
                </div>
              </div>

              {/* Location Row */}
              {!isChangingCountry ? (
                <div
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-bg-secondary transition-colors cursor-pointer"
                  onClick={() => {
                    setCountry(profile.country as CountryCode || '');
                    setIsChangingCountry(true);
                  }}
                >
                  {profile.country ? (
                    <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-text-muted flex-shrink-0" />
                  )}
                  <Globe className="w-5 h-5 text-text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-secondary">{t('fields.location')}</div>
                    <div className={`text-sm font-medium truncate ${profile.country ? 'text-polar-night' : 'text-text-secondary italic'}`}>
                      {profile.country ? (
                        <span className="inline-flex items-center gap-2">
                          <span className={getCountryFlag(profile.country as CountryCode)} />
                          {getCountryName(profile.country as CountryCode)}
                        </span>
                      ) : (
                        t('fields.selectCountry')
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-frost-ice">
                    {profile.country ? t('fields.edit') : t('fields.add')}
                  </span>
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
                        <Close className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Phone Row - optional field, no completion indicator */}
              {!isChangingPhone ? (
                <div
                  className="flex items-center gap-3 py-3 px-3 pl-11 rounded-lg hover:bg-bg-secondary transition-colors cursor-pointer"
                  onClick={() => {
                    setPhone(profile.phone || '');
                    setIsChangingPhone(true);
                  }}
                >
                  <Phone className="w-5 h-5 text-text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-secondary">{t('fields.phone')}</div>
                    <div className={`text-sm font-medium truncate ${profile.phone ? 'text-polar-night' : 'text-text-secondary italic'}`}>
                      {profile.phone || t('fields.addPhone')}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-frost-ice">
                    {profile.phone ? t('fields.edit') : t('fields.add')}
                  </span>
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
                        maxLength={20}
                        pattern="[\d\s\+\-\(\)]+"
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
                        <Close className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* View Public Profile */}
          <Card padding="lg" className="sm:p-6 p-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-polar-night mb-1">{t('publicProfile.title')}</h3>
                <p className="text-sm text-text-secondary mb-3">
                  {t('publicProfile.description')}
                </p>
                <a
                  href={`/profile/${user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-frost-ice hover:text-frost-deep transition-colors"
                >
                  {t('publicProfile.viewLink')}
                  <ExternalLink className="w-4 h-4" />
                </a>
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
                    <h3 className="font-semibold text-polar-night mb-1">{t('yourData.title')}</h3>
                    <p className="text-sm text-text-secondary mb-3">
                      {t('yourData.description')}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownloadData}
                      disabled={loading}
                    >
                      {loading ? t('yourData.preparing') : t('yourData.download')}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                {t('yourData.gdprNote')}{' '}
                <a href="/privacy#your-rights" className="text-frost-ice hover:underline">{t('yourData.privacyPolicy')}</a>.
              </p>
            </div>
          </Card>

          {/* Newsletter Subscription */}
          <NewsletterSettings />

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
