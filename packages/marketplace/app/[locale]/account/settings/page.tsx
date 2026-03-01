'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@second-turn/design-system';
import { User, Phone, CheckCircleAlt01 as CheckCircle2, AlertCircle, Download, Settings, Globe, Check, Close, LinkExternal as ExternalLink, Package, At as AtSign } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { UserInfoCard } from '@/components/user/UserInfoCard';
import { EmailChange } from '@/components/auth/EmailChange';
import { AccountDeletion } from '@/components/auth/AccountDeletion';
import { LoginActivity } from '@/components/auth/LoginActivity';
import { NewsletterSettings } from '@/components/newsletter/NewsletterSettings';
import { PhoneInput } from '@/components/common/PhoneInput';
import { CountrySelector } from '@/components/auth/CountrySelector';
import { getCountryFlag, getCountryName, type CountryCode } from '@/lib/country-utils';
import { PreferredTerminalSection } from '@/components/account/PreferredTerminalSection';

type SettingsTab = 'profile' | 'preferences' | 'privacy';

function AccountSettingsContent() {
  const t = useTranslations('AccountSettings');
  const { user, profile, loading: authLoading, updateProfile, refreshProfile, signOut, isProfileComplete } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const validTabs: SettingsTab[] = ['profile', 'preferences', 'privacy'];
  const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState<CountryCode | ''>(profile?.country as CountryCode || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingField, setEditingField] = useState<'country' | 'email' | 'phone' | null>(null);
  const [sellerCtaBannerDismissed, setSellerCtaBannerDismissed] = useState(false);

  const tSeller = useTranslations('Dashboard.SellerCTA');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as SettingsTab);
    setSuccess('');
    setError('');
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'profile') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(`/account/settings${query ? `?${query}` : ''}`, { scroll: false });
  }, [searchParams, router]);

  // Check sessionStorage for banner dismissals
  useEffect(() => {
    if (sessionStorage.getItem('sellerCtaBannerDismissed') === 'true') {
      setSellerCtaBannerDismissed(true);
    }
  }, []);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '');
      setCountry(profile.country as CountryCode || '');
    }
  }, [profile]);

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
      setEditingField(null);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.updateCountry'));
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
      setEditingField(null);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.updatePhone'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
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

      const response = await fetch('/api/auth/export-data');

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `second-turn-games-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();

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

  // Show loading skeleton while auth is still initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg py-4 sm:py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="h-8 bg-polar-night/10 rounded w-48" />
                <div className="h-4 bg-polar-night/10 rounded w-64" />
              </div>
              <div className="h-10 bg-polar-night/10 rounded w-72" />
            </div>
            <div className="h-40 bg-polar-night/10 rounded-xl" />
            <div className="h-24 bg-polar-night/10 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to auth
  if (!user) {
    router.push('/auth/signin?redirectTo=/account/settings');
    return null;
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

  return (
    <div className="min-h-screen bg-bg py-4 sm:py-6 px-4 sm:px-6" id="account-settings">
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange} variant="toggle" size="sm">
          {/* Header with tabs on right, matching staff dashboard */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4 sm:mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-8 h-8 text-frost-ice" />
                <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">{t('title')}</h1>
              </div>
              <p className="text-sm sm:text-base text-text-secondary">
                {t('subtitle')}
              </p>
            </div>
            <TabsList>
              <TabsTrigger value="profile">{t('tabs.profile')}</TabsTrigger>
              <TabsTrigger value="preferences">{t('tabs.preferences')}</TabsTrigger>
              <TabsTrigger value="privacy">{t('tabs.privacy')}</TabsTrigger>
            </TabsList>
          </div>

          {/* Email Verification Banner */}
          <div className="mb-4">
            <EmailVerificationBanner dismissible />
          </div>

          {/* Seller CTA Banner (orange) — shown when profile is complete */}
          {profile.seller_status !== 'active' && isProfileComplete && !sellerCtaBannerDismissed && (
            <div className="mb-4 p-4 bg-aurora-orange/5 border border-aurora-orange/20 rounded-lg flex items-start gap-3">
              <Package className="w-5 h-5 text-aurora-orange flex-shrink-0 mt-0.5" />
              <a href="/seller/onboard" className="flex-1 group">
                <p className="text-sm font-medium text-polar-night group-hover:text-aurora-orange transition-colors">
                  {tSeller('title')}
                </p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {tSeller('subtitle')}
                </p>
              </a>
              <button
                onClick={() => {
                  sessionStorage.setItem('sellerCtaBannerDismissed', 'true');
                  setSellerCtaBannerDismissed(true);
                }}
                className="p-1 text-text-muted hover:text-polar-night transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <Close className="w-4 h-4" />
              </button>
            </div>
          )}

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

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="space-y-6">
              <Card padding="lg" className="sm:p-6 p-4">
                <h2 className="text-lg sm:text-xl font-semibold text-polar-night mb-4 sm:mb-6">{t('profileInfo')}</h2>

                {/* Hero section — colored background + border */}
                <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-xl p-4 sm:p-6">
                  <UserInfoCard
                    user={{
                      id: user.id,
                      name: profile.full_name,
                      avatarUrl: profile.avatar_url,
                      country: profile.country,
                    }}
                    size="xl"
                    countryDisplay="full"
                    memberSince={user.created_at}
                    showMemberSince
                    linkToProfile={false}
                    editable
                    onAvatarChange={async (url) => {
                      const { error: updateError } = await updateProfile({ avatar_url: url || null });
                      if (!updateError) {
                        setSuccess(t('success.avatarUpdated'));
                        await refreshProfile();
                      } else {
                        setError(t('error.updateAvatar'));
                      }
                    }}
                    onNameSave={async (name) => {
                      const { error: updateError } = await updateProfile({ full_name: name });
                      if (updateError) {
                        setError(updateError instanceof Error ? updateError.message : t('error.updateName'));
                        throw updateError;
                      }
                      setSuccess(t('success.nameUpdated'));
                      await refreshProfile();
                    }}
                  />
                </div>

                {/* Field cards grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Country card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (editingField === 'country') {
                        setEditingField(null);
                      } else {
                        setCountry(profile.country as CountryCode || '');
                        setEditingField('country');
                      }
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                      editingField === 'country'
                        ? 'border-frost-ice bg-frost-ice/5 ring-1 ring-frost-ice/20'
                        : 'border-border hover:border-frost-ice/30 hover:bg-bg-secondary'
                    )}
                  >
                    <Globe className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-text-secondary mb-0.5">{t('fields.location')}</div>
                      <div className={cn('text-sm font-medium truncate', profile.country ? 'text-polar-night' : 'text-text-muted')}>
                        {profile.country ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn(getCountryFlag(profile.country as CountryCode), 'fis')} />
                            {getCountryName(profile.country as CountryCode)}
                          </span>
                        ) : '\u2014'}
                      </div>
                    </div>
                  </button>

                  {/* Email card */}
                  <button
                    type="button"
                    onClick={() => setEditingField(editingField === 'email' ? null : 'email')}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                      editingField === 'email'
                        ? 'border-frost-ice bg-frost-ice/5 ring-1 ring-frost-ice/20'
                        : 'border-border hover:border-frost-ice/30 hover:bg-bg-secondary'
                    )}
                  >
                    <AtSign className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-text-secondary mb-0.5">{t('fields.email')}</div>
                      <div className="text-sm font-medium text-polar-night truncate">
                        {profile.email}
                      </div>
                    </div>
                  </button>

                  {/* Phone card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (editingField === 'phone') {
                        setEditingField(null);
                      } else {
                        setPhone(profile.phone || '');
                        setEditingField('phone');
                      }
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                      editingField === 'phone'
                        ? 'border-frost-ice bg-frost-ice/5 ring-1 ring-frost-ice/20'
                        : 'border-border hover:border-frost-ice/30 hover:bg-bg-secondary'
                    )}
                  >
                    <Phone className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-text-secondary mb-0.5">{t('fields.phone')}</div>
                      <div className={cn('text-sm font-medium truncate', profile.phone ? 'text-polar-night' : 'text-text-muted')}>
                        {profile.phone || '\u2014'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Editor panel — appears below grid when a card is selected */}
                {editingField && (
                  <div className="mt-3 p-4 border-2 border-frost-ice/20 rounded-lg bg-snow-white">
                    {editingField === 'country' && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <CountrySelector
                            value={country}
                            onChange={(newCountry) => setCountry(newCountry)}
                            disabled={loading}
                            required
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
                              setEditingField(null);
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
                    )}
                    {editingField === 'email' && (
                      <EmailChange currentEmail={profile.email} />
                    )}
                    {editingField === 'phone' && (
                      <>
                        <PhoneInput
                          value={phone}
                          onChange={setPhone}
                          compact
                          disabled={loading}
                          defaultCountry={(profile.country && ['LV', 'LT', 'EE'].includes(profile.country) ? profile.country : 'LV') as CountryCode}
                          id="settings-phone"
                        />
                        <div className="flex items-center gap-1 mt-2 justify-end">
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
                              setEditingField(null);
                              setPhone(profile.phone || '');
                            }}
                            disabled={loading}
                            className="p-2 text-aurora-red hover:bg-aurora-red/10 rounded-md transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <Close className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>

              {/* Preferred Terminal */}
              <PreferredTerminalSection />

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
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <div className="space-y-6">
              <NewsletterSettings />
            </div>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <div className="space-y-6">
              {/* Data Export */}
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
                    <a href="/legal/privacy#your-rights" className="text-frost-ice hover:underline">{t('yourData.privacyPolicy')}</a>.
                  </p>
                </div>
              </Card>

              {/* Login Activity */}
              <LoginActivity />

              {/* Account Deletion */}
              <Card padding="lg" className="sm:p-6 p-4">
                <AccountDeletion />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense>
      <AccountSettingsContent />
    </Suspense>
  );
}
