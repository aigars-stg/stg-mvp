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

export default function AccountPage() {
  const { user, profile, updateProfile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Update local state when profile changes
  useState(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
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

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-polar-night mb-2">Account Settings</h1>
          <p className="text-text-secondary">
            Manage your profile and account preferences
          </p>
        </div>

        {/* Email Verification Banner */}
        <EmailVerificationBanner dismissible />

        {/* Profile Information Card */}
        <Card padding="lg" className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-polar-night">Profile Information</h2>
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

          {/* Avatar Upload Section */}
          <div className="mb-8 pb-6 border-b border-border">
            <AvatarUpload
              currentAvatarUrl={profile.avatar_url}
              onUploadComplete={handleAvatarUpload}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                Full Name *
              </label>
              {isEditing ? (
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
              ) : (
                <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg">
                  <User className="h-5 w-5 text-text-muted" />
                  <span className="text-polar-night">{profile.full_name}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-polar-night">
                  Email
                </label>
                {!isEditing && <EmailChange currentEmail={profile.email} />}
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg">
                <Mail className="h-5 w-5 text-text-muted" />
                <span className="text-polar-night">{profile.email}</span>
                {user.email_confirmed_at && (
                  <span className="ml-auto text-xs text-aurora-green flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                Phone Number (Optional)
              </label>
              {isEditing ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                    placeholder="+371 12345678"
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg">
                  <Phone className="h-5 w-5 text-text-muted" />
                  <span className="text-polar-night">
                    {profile.phone || 'Not provided'}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
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
                    setError('');
                    setSuccess('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Account Actions Card */}
        <Card padding="lg" className="mb-6">
          <h2 className="text-xl font-semibold text-polar-night mb-4">Account Actions</h2>

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
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-polar-night mb-4">Danger Zone</h2>
          <AccountDeletion />
        </Card>

        {/* Account Info */}
        <div className="mt-6 p-4 bg-bg-elevated rounded-lg">
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
