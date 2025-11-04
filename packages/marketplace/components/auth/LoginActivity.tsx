'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import { Monitor, Smartphone, Tablet, MapPin, Calendar, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface LoginRecord {
  id: string;
  ip_address: string;
  device_type: string;
  browser: string;
  os: string;
  country: string | null;
  city: string | null;
  created_at: string;
}

export function LoginActivity() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSignOutAll, setShowSignOutAll] = useState(false);
  const [signOutPassword, setSignOutPassword] = useState('');
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    if (!user) return;

    async function fetchActivities() {
      if (!user) return;

      try {
        const { data, error: fetchError } = await (supabase as any)
          .from('login_activity')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (fetchError) {
          setError('Failed to load login activity');
          console.error('Error fetching login activity:', fetchError);
          setLoading(false);
          return;
        }

        setActivities(data || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to load login activity');
        setLoading(false);
      }
    }

    fetchActivities();
  }, [user]);

  const handleSignOutAll = async () => {
    if (!signOutPassword) {
      setSignOutError('Password is required');
      return;
    }

    setSignOutLoading(true);
    setSignOutError('');

    try {
      const response = await fetch('/api/auth/signout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: signOutPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSignOutError(data.error || 'Failed to sign out all devices');
        setSignOutLoading(false);
        return;
      }

      // Redirect to sign-in page
      router.push('/auth/signin?message=signed-out-all');
    } catch (err: any) {
      setSignOutError(err.message || 'Failed to sign out all devices');
      setSignOutLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading) {
    return (
      <Card padding="lg">
        <h2 className="text-xl font-semibold text-polar-night mb-4">Login Activity</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg">
        <h2 className="text-xl font-semibold text-polar-night mb-4">Login Activity</h2>
        <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
          <p className="text-sm text-aurora-red">{error}</p>
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card padding="lg">
        <h2 className="text-xl font-semibold text-polar-night mb-4">Login Activity</h2>
        <p className="text-sm text-text-secondary text-center py-8">
          No login activity recorded yet.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-polar-night">Login Activity</h2>
        <span className="text-xs text-text-secondary">Last 10 sign-ins</span>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`p-4 rounded-lg border ${
              index === 0
                ? 'border-frost-ice/30 bg-frost-ice/5'
                : 'border-border bg-bg-elevated'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  index === 0 ? 'bg-frost-ice/10' : 'bg-bg'
                }`}>
                  {getDeviceIcon(activity.device_type)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Device and Browser */}
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-polar-night">
                      {activity.browser} on {activity.os}
                    </p>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-frost-ice/20 text-frost-ice rounded">
                        Current
                      </span>
                    )}
                  </div>

                  {/* Location and IP */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                    {(activity.city || activity.country) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {[activity.city, activity.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    <span className="text-text-muted">{activity.ip_address}</span>
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(activity.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security Actions */}
      <div className="mt-6 space-y-3">
        <div className="p-3 bg-bg-elevated rounded-lg border border-border">
          <p className="text-xs text-text-secondary mb-3">
            <strong>Security tip:</strong> If you see any unfamiliar activity, consider changing your
            password immediately and signing out all devices.
          </p>

          {!showSignOutAll ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSignOutAll(true)}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out All Devices
            </Button>
          ) : (
            <div className="mt-3 pt-3 border-t border-border">
              <h3 className="text-sm font-semibold text-polar-night mb-2">
                Sign Out All Devices
              </h3>
              <p className="text-xs text-text-secondary mb-3">
                This will sign you out from all devices including this one. You'll need to sign in again.
              </p>

              {signOutError && (
                <div className="mb-3 p-2 bg-aurora-red/10 border border-aurora-red/20 rounded">
                  <p className="text-xs text-aurora-red">{signOutError}</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-polar-night mb-1">
                    Confirm Your Password
                  </label>
                  <input
                    type="password"
                    value={signOutPassword}
                    onChange={(e) => setSignOutPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                    placeholder="Enter your password"
                    disabled={signOutLoading}
                    autoComplete="current-password"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleSignOutAll}
                    disabled={signOutLoading || !signOutPassword}
                  >
                    {signOutLoading ? 'Signing out...' : 'Confirm Sign Out'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowSignOutAll(false);
                      setSignOutPassword('');
                      setSignOutError('');
                    }}
                    disabled={signOutLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
