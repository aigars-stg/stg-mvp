'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Badge } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  Shield,
  Email,
  Download,
  Globe,
} from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDate } from '@/lib/date-utils';

interface Subscriber {
  id: string;
  email: string;
  source: string;
  locale: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  unsubscribed: number;
  bySource: Record<string, number>;
  byLocale: Record<string, number>;
}

interface NewsletterData {
  subscribers: Subscriber[];
  stats: Stats;
}

const sourceLabels: Record<string, string> = {
  footer: 'Footer',
  settings: 'Settings',
  registration: 'Registration',
};

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
        <p className="text-text-secondary">Loading subscribers...</p>
      </div>
    </div>
  );
}

export default function StaffNewsletterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed'>('active');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/staff/newsletter');
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/staff/newsletter');
      const result = await response.json();

      if (response.status === 403) {
        setIsStaff(false);
        setError('Staff access required');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch subscribers');
      }

      setIsStaff(true);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  if (authLoading || (loading && isStaff === null)) {
    return <LoadingFallback />;
  }

  if (isStaff === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center max-w-md mx-auto px-4">
          <Shield className="w-16 h-16 text-aurora-red mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">Staff Access Required</h1>
          <p className="text-text-secondary">
            This page is only accessible to staff members.
          </p>
        </div>
      </div>
    );
  }

  const filtered = data?.subscribers.filter((s) => {
    if (filter === 'active') return !s.unsubscribed_at;
    if (filter === 'unsubscribed') return !!s.unsubscribed_at;
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Email className="w-8 h-8 text-frost-ice" />
            <h1 className="text-2xl sm:text-3xl font-bold text-text">Newsletter Subscribers</h1>
          </div>
          <p className="text-text-secondary">
            Manage newsletter subscriptions and export subscriber data
          </p>
        </div>

        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-text-secondary">Total</p>
              <p className="text-2xl font-bold text-text">{data.stats.total}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-text-secondary">Active</p>
              <p className="text-2xl font-bold text-aurora-green">{data.stats.active}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-text-secondary">Unsubscribed</p>
              <p className="text-2xl font-bold text-text-secondary">{data.stats.unsubscribed}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-text-secondary">By Source</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(data.stats.bySource).map(([source, count]) => (
                  <Badge key={source} variant="default">
                    {sourceLabels[source] || source}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {(['active', 'all', 'unsubscribed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  filter === f
                    ? 'bg-frost-ice text-white border-frost-ice'
                    : 'bg-white text-text border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f === 'active' ? 'Active' : f === 'unsubscribed' ? 'Unsubscribed' : 'All'}
              </button>
            ))}
          </div>

          <a
            href="/api/staff/newsletter?format=csv"
            download
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-text transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
          </div>
        )}

        {/* Table */}
        {!loading && data && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <Globe className="w-4 h-4 inline -mt-0.5 mr-1" />
                      Locale
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Subscribed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-text-secondary"
                      >
                        No subscribers found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <span className="text-sm text-text font-medium">
                            {subscriber.email}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="default">
                            {sourceLabels[subscriber.source] || subscriber.source}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-text-secondary uppercase">
                            {subscriber.locale}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {subscriber.unsubscribed_at ? (
                            <Badge variant="default">Unsubscribed</Badge>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-text-secondary">
                            {formatDate(new Date(subscriber.subscribed_at))}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Count */}
        {!loading && data && (
          <p className="mt-4 text-sm text-text-secondary">
            Showing {filtered.length} subscriber{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
