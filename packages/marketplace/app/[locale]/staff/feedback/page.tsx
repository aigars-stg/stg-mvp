'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  Shield,
  ChevronLeft,
  ChevronRight,
  Chat as MessageSquare,
  Bug,
  Sparks as Lightbulb,
  HelpCircle,
} from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDate } from '@/lib/date-utils';
import type {
  FeedbackType,
  FeedbackStatus,
  FeedbackListResponse,
} from '@/lib/types/feedback';

const typeConfig: Record<
  FeedbackType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  feature_request: {
    label: 'Feature',
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'text-frost-ice',
  },
  bug_report: {
    label: 'Bug',
    icon: <Bug className="w-4 h-4" />,
    color: 'text-aurora-red',
  },
  other: {
    label: 'Other',
    icon: <HelpCircle className="w-4 h-4" />,
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

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
];

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
        <p className="text-text-secondary">Loading feedback...</p>
      </div>
    </div>
  );
}

export default function StaffFeedbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StaffFeedbackContent />
    </Suspense>
  );
}

function StaffFeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<FeedbackListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') || 'all'
  );
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1', 10)
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/staff/feedback');
    }
  }, [user, authLoading, router]);

  // Fetch feedback
  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      params.set('page', currentPage.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/staff/feedback?${params}`);
      const result = await response.json();

      if (response.status === 403) {
        setIsStaff(false);
        setError('Staff access required');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch feedback');
      }

      setIsStaff(true);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, currentPage]);

  useEffect(() => {
    if (user) {
      fetchFeedback();
    }
  }, [user, fetchFeedback]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (currentPage > 1) params.set('page', currentPage.toString());
    router.replace(`/staff/feedback${params.toString() ? `?${params}` : ''}`);
  }, [statusFilter, typeFilter, currentPage, router]);

  if (authLoading || (loading && isStaff === null)) {
    return <LoadingFallback />;
  }

  if (isStaff === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center max-w-md mx-auto px-4">
          <Shield className="w-16 h-16 text-aurora-red mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text mb-2">Staff Access Required</h1>
          <p className="text-text-secondary">
            This page is only accessible to staff members.
          </p>
        </div>
      </div>
    );
  }

  const newCount = data?.data.filter((f) => f.status === 'new').length || 0;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-frost-ice" />
            <h1 className="text-2xl font-bold text-text">User Feedback</h1>
            {newCount > 0 && (
              <Badge variant="error">{newCount} new</Badge>
            )}
          </div>
          <p className="text-text-secondary">
            Review and manage user feedback submissions
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-frost-ice"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-frost-ice"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center text-text-secondary"
                        >
                          No feedback found
                        </td>
                      </tr>
                    ) : (
                      data.data.map((feedback) => (
                        <tr
                          key={feedback.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/staff/feedback/${feedback.id}`)}
                        >
                          <td className="px-4 py-4">
                            <div
                              className={`flex items-center gap-2 ${typeConfig[feedback.type].color}`}
                            >
                              {typeConfig[feedback.type].icon}
                              <span className="text-sm font-medium">
                                {typeConfig[feedback.type].label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-text line-clamp-2 max-w-md">
                              {feedback.description}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={statusConfig[feedback.status].variant}>
                              {statusConfig[feedback.status].label}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-text">
                              {feedback.user?.full_name || feedback.email || 'Anonymous'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-text-secondary">
                              {formatDate(new Date(feedback.created_at))}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-text-secondary">
                  Showing {(currentPage - 1) * data.pagination.limit + 1} to{' '}
                  {Math.min(currentPage * data.pagination.limit, data.pagination.total)}{' '}
                  of {data.pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5 text-text" />
                  </button>
                  <span className="text-sm text-text">
                    Page {currentPage} of {data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(data.pagination.totalPages, p + 1))
                    }
                    disabled={currentPage === data.pagination.totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5 text-text" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
