/* eslint-disable @next/next/no-img-element -- feedback screenshots are user-uploaded URLs */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  Shield,
  ArrowLeft,
  Bug,
  Sparks as Lightbulb,
  HelpCircle,
  Copy,
  CheckCircle,
  LinkExternal as ExternalLink,
  User,
} from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDateTime } from '@/lib/date-utils';
import type { FeedbackType, FeedbackStatus, UserFeedback } from '@/lib/types/feedback';

interface FeedbackDetail extends UserFeedback {
  screenshot_signed_url: string | null;
  reviewer?: {
    id: string;
    full_name: string | null;
  } | null;
}

const typeConfig: Record<
  FeedbackType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  feature_request: {
    label: 'Feature Request',
    icon: <Lightbulb className="w-5 h-5" />,
    color: 'text-frost-ice',
  },
  bug_report: {
    label: 'Bug Report',
    icon: <Bug className="w-5 h-5" />,
    color: 'text-aurora-red',
  },
  other: {
    label: 'Other',
    icon: <HelpCircle className="w-5 h-5" />,
    color: 'text-text-secondary',
  },
};

const statusConfig: Record<
  FeedbackStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'trust' }
> = {
  new: { label: 'New', variant: 'warning' },
  reviewed: { label: 'Reviewed', variant: 'trust' },
  in_progress: { label: 'In Progress', variant: 'trust' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'default' },
};

const statusOptions: FeedbackStatus[] = [
  'new',
  'reviewed',
  'in_progress',
  'resolved',
  'closed',
];

export default function StaffFeedbackDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = params.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  const [status, setStatus] = useState<FeedbackStatus>('new');
  const [internalNotes, setInternalNotes] = useState('');
  const [copied, setCopied] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirectTo=/staff/feedback');
    }
  }, [user, authLoading, router]);

  // Fetch feedback detail
  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/staff/feedback/${id}`);
      const result = await response.json();

      if (response.status === 403) {
        setIsStaff(false);
        setError('Staff access required');
        return;
      }

      if (response.status === 404) {
        setError('Feedback not found');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch feedback');
      }

      setIsStaff(true);
      setFeedback(result);
      setStatus(result.status);
      setInternalNotes(result.internal_notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchFeedback();
    }
  }, [user, fetchFeedback]);

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/staff/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          internal_notes: internalNotes,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save changes');
      }

      // Refresh data
      await fetchFeedback();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Copy technical details
  const copyTechnicalDetails = () => {
    if (!feedback) return;

    const details = {
      id: feedback.id,
      type: feedback.type,
      status: feedback.status,
      page_url: feedback.page_url,
      user_agent: feedback.user_agent,
      viewport_size: feedback.viewport_size,
      locale: feedback.locale,
      user_id: feedback.user_id,
      email: feedback.email,
      created_at: feedback.created_at,
    };

    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || (loading && isStaff === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading feedback...</p>
        </div>
      </div>
    );
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

  if (error && !feedback) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Link
            href="/staff/feedback"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to feedback
          </Link>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return null;
  }

  const hasChanges =
    status !== feedback.status || internalNotes !== (feedback.internal_notes || '');

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/staff/feedback"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to feedback
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className={typeConfig[feedback.type].color}>
              {typeConfig[feedback.type].icon}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text">
                {typeConfig[feedback.type].label}
              </h1>
              <p className="text-sm text-text-secondary">
                Submitted {formatDateTime(new Date(feedback.created_at))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-frost-ice"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusConfig[s].label}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
                Description
              </h2>
              <p className="text-text whitespace-pre-wrap">{feedback.description}</p>
            </div>

            {/* Screenshot */}
            {feedback.screenshot_signed_url && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
                  Screenshot
                </h2>
                <a
                  href={feedback.screenshot_signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={feedback.screenshot_signed_url}
                    alt="Feedback screenshot"
                    className="max-w-full rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}

            {/* Internal notes */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
                Internal Notes
              </h2>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add notes for the team..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-frost-ice resize-none"
              />
              {feedback.reviewer && feedback.reviewed_at && (
                <p className="mt-2 text-xs text-text-secondary">
                  Last updated by {feedback.reviewer.full_name || 'Staff'} on{' '}
                  {formatDateTime(new Date(feedback.reviewed_at))}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User info */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
                User
              </h2>
              {feedback.user ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-frost-ice/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-frost-ice" />
                  </div>
                  <div>
                    <p className="font-medium text-text">
                      {feedback.user.full_name || 'No name'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {feedback.user.email}
                    </p>
                  </div>
                </div>
              ) : feedback.email ? (
                <div>
                  <p className="text-text">{feedback.email}</p>
                  <p className="text-sm text-text-secondary">Anonymous user</p>
                </div>
              ) : (
                <p className="text-text-secondary">Anonymous</p>
              )}
            </div>

            {/* Context */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
                Context
              </h2>
              <dl className="space-y-3 text-sm">
                {feedback.page_url && (
                  <div>
                    <dt className="text-text-secondary">Page URL</dt>
                    <dd className="text-text break-all">
                      <a
                        href={feedback.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-frost-ice hover:underline"
                      >
                        {feedback.page_url.replace(/^https?:\/\/[^/]+/, '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </dd>
                  </div>
                )}
                {feedback.locale && (
                  <div>
                    <dt className="text-text-secondary">Locale</dt>
                    <dd className="text-text">{feedback.locale.toUpperCase()}</dd>
                  </div>
                )}
                {feedback.viewport_size && (
                  <div>
                    <dt className="text-text-secondary">Viewport</dt>
                    <dd className="text-text">{feedback.viewport_size}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Technical details */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                  Technical Details
                </h2>
                <button
                  onClick={copyTechnicalDetails}
                  className="text-text-secondary hover:text-text"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              {feedback.user_agent && (
                <p className="text-xs text-text-secondary break-all">
                  {feedback.user_agent}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
