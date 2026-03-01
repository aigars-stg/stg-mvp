'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Button, Badge } from '@second-turn/design-system';
import { Search, RefreshCw as Loader2, AlertCircle, Shield, ChevronLeft, ChevronRight, AlertTriangle, Package, Download, TrendUp, CurrencyDollar, FileText, Receipt, Truck, User, CheckCircleAlt01 as CheckCircle2, Bug, Sparks as Lightbulb, HelpCircle } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  extractVatFromGross,
  calculateBookkeepingSummary,
  generateBookkeepingCSV,
  downloadCSV,
  formatEuros,
  formatDateForAPI,
  DATE_RANGE_PRESETS,
  EXCLUDED_FROM_TOTALS,
  type OrderBookkeepingData,
  type BookkeepingSummary,
} from '@/lib/bookkeeping-utils';
import { formatPrice } from '@/lib/services/pricing';
import { getDac7StatusLabel, type Dac7ComplianceStatus } from '@/lib/types/seller';
import { formatDate } from '@/lib/date-utils';
import { getStatusConfig } from '@/components/shipping';
import type { FeedbackType, FeedbackStatus, FeedbackListResponse } from '@/lib/types/feedback';

interface OrderSummary {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  shipping_method: string;
  total_amount: number;
  created_at: string;
  paid_at: string | null;
  buyer_name: string;
  seller_name: string;
  issue_count: {
    total: number;
    open: number;
  };
  items_total: number;
  shipping_cost: number;
  platform_commission_cents: number;
}

interface TransactionListResponse {
  orders: OrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// DAC7 types
interface SellerDac7Item {
  userId: string;
  email: string;
  fullName: string;
  country: string;
  sellerStatus: string;
  complianceStatus: Dac7ComplianceStatus;
  annualTransactionCount: number;
  annualSalesTotal: number;
  reportingYear: number | null;
  taxId: string | null;
  taxIdType: string | null;
  legalName: string | null;
  infoSubmittedAt: string | null;
  isVerified: boolean;
}

interface Dac7Summary {
  total: number;
  exempt: number;
  approaching: number;
  required: number;
  compliant: number;
  blocked: number;
}

interface Dac7Response {
  sellers: SellerDac7Item[];
  summary: Dac7Summary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const dac7StatusConfig: Record<
  Dac7ComplianceStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'trust' }
> = {
  exempt: { label: 'Exempt', variant: 'default' },
  approaching: { label: 'Approaching', variant: 'warning' },
  required: { label: 'Required', variant: 'error' },
  compliant: { label: 'Compliant', variant: 'success' },
  blocked: { label: 'Blocked', variant: 'error' },
};

const dac7StatusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'approaching', label: 'Approaching Threshold' },
  { value: 'required', label: 'Tax Info Required' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'exempt', label: 'Exempt' },
];


const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_seller', label: 'Pending Seller' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'disputed', label: 'Disputed' },
];

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
        <p className="text-text-secondary">Loading transactions...</p>
      </div>
    </div>
  );
}

export default function StaffTransactionsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StaffTransactionsContent />
    </Suspense>
  );
}

function StaffTransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [hasIssues, setHasIssues] = useState(searchParams.get('has_issues') === 'true');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Bookkeeping state
  const [viewMode, setViewMode] = useState<'operations' | 'bookkeeping' | 'dac7' | 'feedback' | 'play'>('operations');
  const [dateRange, setDateRange] = useState('this_month');

  // DAC7 state
  const [dac7Data, setDac7Data] = useState<Dac7Response | null>(null);
  const [dac7StatusFilter, setDac7StatusFilter] = useState('all');
  const [dac7SearchQuery, setDac7SearchQuery] = useState('');
  const [dac7CurrentPage, setDac7CurrentPage] = useState(1);

  // Feedback state
  const [feedbackData, setFeedbackData] = useState<FeedbackListResponse | null>(null);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all');
  const [feedbackCurrentPage, setFeedbackCurrentPage] = useState(1);

  // Play analytics state
  const [playAnalytics, setPlayAnalytics] = useState<{
    summary: {
      playsToday: number;
      playsThisWeek: number;
      playsThisMonth: number;
      winRate: number;
      avgGuesses: number;
      uniqueVisitorsToday: number;
      uniqueVisitorsWeek: number;
      uniqueVisitorsMonth: number;
    };
    dailyTrends: Array<{
      date: string;
      plays: number;
      wins: number;
      uniquePlayers: number;
    }>;
    puzzleStats: Array<{
      puzzleNumber: number;
      gameName: string;
      plays: number;
      wins: number;
      winRate: number;
      avgGuesses: number;
    }>;
  } | null>(null);

  // Calculate bookkeeping summary from loaded data
  const bookkeepingSummary = useMemo<BookkeepingSummary | null>(() => {
    if (!data?.orders || viewMode !== 'bookkeeping') return null;
    const ordersWithBookkeeping: OrderBookkeepingData[] = data.orders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      created_at: o.created_at,
      paid_at: o.paid_at,
      items_total: o.items_total,
      platform_commission_cents: o.platform_commission_cents,
      shipping_cost: o.shipping_cost,
      total_amount: o.total_amount,
      buyer_name: o.buyer_name,
      seller_name: o.seller_name,
    }));
    return calculateBookkeepingSummary(ordersWithBookkeeping);
  }, [data?.orders, viewMode]);

  // Handle CSV export
  const handleExportCSV = () => {
    if (!data?.orders) return;
    const ordersWithBookkeeping: OrderBookkeepingData[] = data.orders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      created_at: o.created_at,
      paid_at: o.paid_at,
      items_total: o.items_total,
      platform_commission_cents: o.platform_commission_cents,
      shipping_cost: o.shipping_cost,
      total_amount: o.total_amount,
      buyer_name: o.buyer_name,
      seller_name: o.seller_name,
    }));
    const csv = generateBookkeepingCSV(ordersWithBookkeeping);
    const preset = DATE_RANGE_PRESETS.find((p) => p.key === dateRange);
    const filename = `stg-bookkeeping-${preset?.label.toLowerCase().replace(/\s+/g, '-') || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirectTo=/staff/transactions');
    }
  }, [user, authLoading, router]);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (hasIssues) params.set('has_issues', 'true');
      params.set('page', currentPage.toString());
      params.set('limit', '20');

      // Add date range params when in bookkeeping mode
      if (viewMode === 'bookkeeping') {
        const preset = DATE_RANGE_PRESETS.find((p) => p.key === dateRange);
        if (preset) {
          const { start, end } = preset.getRange();
          params.set('date_from', formatDateForAPI(start));
          params.set('date_to', formatDateForAPI(end));
        }
      }

      const response = await fetch(`/api/staff/transactions?${params}`);
      const result = await response.json();

      if (response.status === 403) {
        setIsStaff(false);
        setError('Staff access required');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch transactions');
      }

      setIsStaff(true);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch DAC7 sellers
  const fetchDac7Sellers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dac7StatusFilter !== 'all') params.set('status', dac7StatusFilter);
      if (dac7SearchQuery) params.set('search', dac7SearchQuery);
      params.set('page', dac7CurrentPage.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/staff/dac7/sellers?${params}`);
      const result = await response.json();

      if (response.status === 403) {
        setIsStaff(false);
        setError('Staff access required');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch sellers');
      }

      setIsStaff(true);
      setDac7Data(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  // Handle DAC7 export
  const handleDac7Export = () => {
    const year = new Date().getFullYear();
    window.open(`/api/staff/dac7/export?year=${year}`, '_blank');
  };

  // Handle DAC7 search
  const handleDac7Search = (e: React.FormEvent) => {
    e.preventDefault();
    setDac7CurrentPage(1);
    fetchDac7Sellers();
  };

  // Fetch feedback
  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (feedbackStatusFilter !== 'all') params.set('status', feedbackStatusFilter);
      if (feedbackTypeFilter !== 'all') params.set('type', feedbackTypeFilter);
      params.set('page', feedbackCurrentPage.toString());
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
      setFeedbackData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [feedbackStatusFilter, feedbackTypeFilter, feedbackCurrentPage]);

  // Fetch play analytics
  const fetchPlayAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/staff/play-analytics');
      const result = await response.json();

      if (response.status === 403) {
        setIsStaff(false);
        setError('Staff access required');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch play analytics');
      }

      setIsStaff(true);
      setPlayAnalytics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load play analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (viewMode === 'dac7') {
        fetchDac7Sellers();
      } else if (viewMode === 'feedback') {
        fetchFeedback();
      } else if (viewMode === 'play') {
        fetchPlayAnalytics();
      } else {
        fetchTransactions();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, hasIssues, currentPage, viewMode, dateRange, dac7StatusFilter, dac7CurrentPage, feedbackStatusFilter, feedbackTypeFilter, feedbackCurrentPage]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTransactions();
  };

  // Not staff check
  if (isStaff === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-4">
          <Shield className="w-16 h-16 text-aurora-red mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">Staff Access Required</h1>
          <p className="text-text-secondary mb-6">
            This page is only accessible to staff members.
          </p>
          <Link href="/">
            <Button variant="accent">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Loading
  if (authLoading || (loading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading transactions...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">{error}</h2>
          <Button variant="primary" onClick={fetchTransactions}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-frost-ice" />
                <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">Staff Dashboard</h1>
              </div>
              <p className="text-text-secondary">
                {viewMode === 'operations'
                  ? 'Manage transactions, view conversations, and resolve issues.'
                  : viewMode === 'bookkeeping'
                    ? 'Financial overview with VAT breakdown for bookkeeping.'
                    : viewMode === 'dac7'
                      ? 'Monitor seller tax reporting status and export compliance data.'
                      : 'Review and manage user feedback submissions.'}
              </p>
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-frost-ice/10 rounded-lg p-1">
              <button
                onClick={() => {
                  setViewMode('operations');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'operations'
                    ? 'bg-frost-ice text-white'
                    : 'text-frost-ice hover:bg-frost-ice/20'
                }`}
              >
                Operations
              </button>
              <button
                onClick={() => {
                  setViewMode('bookkeeping');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'bookkeeping'
                    ? 'bg-frost-ice text-white'
                    : 'text-frost-ice hover:bg-frost-ice/20'
                }`}
              >
                Bookkeeping
              </button>
              <button
                onClick={() => {
                  setViewMode('dac7');
                  setDac7CurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'dac7'
                    ? 'bg-frost-ice text-white'
                    : 'text-frost-ice hover:bg-frost-ice/20'
                }`}
              >
                DAC7
              </button>
              <button
                onClick={() => {
                  setViewMode('feedback');
                  setFeedbackCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'feedback'
                    ? 'bg-frost-ice text-white'
                    : 'text-frost-ice hover:bg-frost-ice/20'
                }`}
              >
                Feedback
                {feedbackData?.data.filter(f => f.status === 'new').length ? (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-aurora-red text-white">
                    {feedbackData.data.filter(f => f.status === 'new').length}
                  </span>
                ) : null}
              </button>
              <button
                onClick={() => setViewMode('play')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'play'
                    ? 'bg-frost-ice text-white'
                    : 'text-frost-ice hover:bg-frost-ice/20'
                }`}
              >
                Play
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 border-b border-divider-subtle">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search - different for each mode */}
          {viewMode === 'dac7' && (
            <form onSubmit={handleDac7Search} className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={dac7SearchQuery}
                  onChange={(e) => setDac7SearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
                />
              </div>
            </form>
          )}
          {(viewMode === 'operations' || viewMode === 'bookkeeping') && (
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order number..."
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
                />
              </div>
            </form>
          )}

          {/* Status filter - different options for each mode */}
          {viewMode === 'dac7' && (
            <select
              value={dac7StatusFilter}
              onChange={(e) => {
                setDac7StatusFilter(e.target.value);
                setDac7CurrentPage(1);
              }}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
            >
              {dac7StatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {(viewMode === 'operations' || viewMode === 'bookkeeping') && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {viewMode === 'feedback' && (
            <>
              <select
                value={feedbackStatusFilter}
                onChange={(e) => {
                  setFeedbackStatusFilter(e.target.value);
                  setFeedbackCurrentPage(1);
                }}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={feedbackTypeFilter}
                onChange={(e) => {
                  setFeedbackTypeFilter(e.target.value);
                  setFeedbackCurrentPage(1);
                }}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
              >
                <option value="all">All Types</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug_report">Bug Report</option>
                <option value="other">Other</option>
              </select>
            </>
          )}

          {/* Has issues filter (operations mode only) */}
          {viewMode === 'operations' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasIssues}
                onChange={(e) => {
                  setHasIssues(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 rounded border-border text-frost-ice focus:ring-frost-ice/50"
              />
              <span className="text-sm text-text-secondary">Has open issues</span>
            </label>
          )}

          {/* DAC7 export button */}
          {viewMode === 'dac7' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDac7Export}
              disabled={!dac7Data?.sellers?.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}

          {/* Date range filter (bookkeeping mode only) */}
          {viewMode === 'bookkeeping' && (
            <>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
              >
                {DATE_RANGE_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>

              <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={!data?.orders?.length}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards (bookkeeping mode only) */}
      {viewMode === 'bookkeeping' && bookkeepingSummary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Orders */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-frost-ice/10 flex items-center justify-center mb-2">
                <Package className="w-4 h-4 text-frost-ice" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Orders</p>
              <p className="text-xl font-bold text-polar-night">{bookkeepingSummary.orderCount}</p>
              <p className="text-xs text-text-secondary">in selected period</p>
            </div>

            {/* GMV */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-frost-ice/10 flex items-center justify-center mb-2">
                <TrendUp className="w-4 h-4 text-frost-ice" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">GMV</p>
              <p className="text-xl font-bold text-polar-night">{formatEuros(bookkeepingSummary.gmv)}</p>
              <p className="text-xs text-text-secondary">game prices total</p>
            </div>

            {/* Platform Revenue */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-green/10 flex items-center justify-center mb-2">
                <CurrencyDollar className="w-4 h-4 text-aurora-green" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Platform Revenue</p>
              <p className="text-xl font-bold text-aurora-green">{formatEuros(bookkeepingSummary.platformRevenue.gross + bookkeepingSummary.shippingRevenue.gross)}</p>
              <p className="text-xs text-aurora-yellow">Net: {formatEuros(bookkeepingSummary.platformRevenue.net + bookkeepingSummary.shippingRevenue.net)}</p>
            </div>

            {/* Total VAT */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-yellow/10 flex items-center justify-center mb-2">
                <FileText className="w-4 h-4 text-aurora-yellow" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">VAT Collected</p>
              <p className="text-xl font-bold text-aurora-yellow">{formatEuros(bookkeepingSummary.totalVatCollected)}</p>
              <p className="text-xs text-text-secondary">21% rate</p>
            </div>

            {/* Platform Fee VAT */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-yellow/10 flex items-center justify-center mb-2">
                <Receipt className="w-4 h-4 text-aurora-yellow" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Fee VAT</p>
              <p className="text-xl font-bold text-aurora-yellow">{formatEuros(bookkeepingSummary.platformRevenue.vat)}</p>
              <p className="text-xs text-text-secondary">Gross: {formatEuros(bookkeepingSummary.platformRevenue.gross)}</p>
            </div>

            {/* Shipping VAT */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-yellow/10 flex items-center justify-center mb-2">
                <Truck className="w-4 h-4 text-aurora-yellow" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Shipping VAT</p>
              <p className="text-xl font-bold text-aurora-yellow">{formatEuros(bookkeepingSummary.shippingRevenue.vat)}</p>
              <p className="text-xs text-text-secondary">Gross: {formatEuros(bookkeepingSummary.shippingRevenue.gross)}</p>
            </div>
          </div>
        </div>
      )}

      {/* DAC7 Summary Cards */}
      {viewMode === 'dac7' && dac7Data?.summary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Dac7SummaryCard
              label="Total Sellers"
              value={dac7Data.summary.total}
              icon={<User className="w-4 h-4 text-frost-ice" />}
              bgColor="bg-frost-ice/10"
            />
            <Dac7SummaryCard
              label="Exempt"
              value={dac7Data.summary.exempt}
              icon={<CheckCircle2 className="w-4 h-4 text-text-muted" />}
              bgColor="bg-gray-100"
            />
            <Dac7SummaryCard
              label="Approaching"
              value={dac7Data.summary.approaching}
              icon={<AlertTriangle className="w-4 h-4 text-aurora-yellow" />}
              bgColor="bg-aurora-yellow/10"
              highlight={dac7Data.summary.approaching > 0}
            />
            <Dac7SummaryCard
              label="Required"
              value={dac7Data.summary.required}
              icon={<AlertCircle className="w-4 h-4 text-aurora-red" />}
              bgColor="bg-aurora-red/10"
              highlight={dac7Data.summary.required > 0}
            />
            <Dac7SummaryCard
              label="Compliant"
              value={dac7Data.summary.compliant}
              icon={<CheckCircle2 className="w-4 h-4 text-aurora-green" />}
              bgColor="bg-aurora-green/10"
            />
            <Dac7SummaryCard
              label="Blocked"
              value={dac7Data.summary.blocked}
              icon={<AlertCircle className="w-4 h-4 text-aurora-red" />}
              bgColor="bg-aurora-red/10"
              highlight={dac7Data.summary.blocked > 0}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading && (data || dac7Data) && (
          <div className="text-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-frost-ice mx-auto" />
          </div>
        )}

        {/* DAC7 Sellers Table */}
        {viewMode === 'dac7' && (
          <>
            {dac7Data && dac7Data.sellers.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-polar-night mb-2">
                  No sellers found
                </h3>
                <p className="text-text-secondary">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="bg-snow-white border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-background-secondary border-b border-divider-subtle">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Seller
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Country
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Sales
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Tax ID
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider-subtle">
                      {dac7Data?.sellers.map((seller) => {
                        const statusInfo =
                          dac7StatusConfig[seller.complianceStatus] || dac7StatusConfig.exempt;

                        return (
                          <tr
                            key={seller.userId}
                            className="hover:bg-frost-ice/5 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-polar-night">
                                  {seller.legalName || seller.fullName || 'Unknown'}
                                </p>
                                <p className="text-sm text-text-muted">{seller.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-polar-night">
                              {seller.country || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-polar-night text-right">
                              {formatPrice(seller.annualSalesTotal)}
                            </td>
                            <td className="px-4 py-3 text-sm text-polar-night text-right">
                              {seller.annualTransactionCount}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {seller.taxId ? (
                                <span className="font-mono text-sm text-aurora-green">
                                  {seller.taxId}
                                </span>
                              ) : (
                                <span className="text-sm text-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={statusInfo.variant} size="sm">
                                {getDac7StatusLabel(seller.complianceStatus)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DAC7 Pagination */}
            {dac7Data && dac7Data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-text-secondary">
                  Showing {(dac7Data.pagination.page - 1) * dac7Data.pagination.limit + 1} to{' '}
                  {Math.min(
                    dac7Data.pagination.page * dac7Data.pagination.limit,
                    dac7Data.pagination.total
                  )}{' '}
                  of {dac7Data.pagination.total} sellers
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={dac7CurrentPage === 1}
                    onClick={() => setDac7CurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-text-secondary">
                    Page {dac7CurrentPage} of {dac7Data.pagination.totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={dac7CurrentPage === dac7Data.pagination.totalPages}
                    onClick={() => setDac7CurrentPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Transactions Tables (Operations & Bookkeeping) - empty state */}
        {(viewMode === 'operations' || viewMode === 'bookkeeping') && data && data.orders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-polar-night mb-2">No transactions found</h3>
            <p className="text-text-secondary">
              {viewMode === 'bookkeeping'
                ? 'No transactions in the selected period.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        )}

        {viewMode === 'operations' && data && data.orders.length > 0 && (
          <div className="bg-snow-white border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-background-secondary border-b border-divider-subtle">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Order
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Issues
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider-subtle">
                {data?.orders.map((order) => {
                  const statusInfo = getStatusConfig(order.status);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-frost-ice/5 cursor-pointer transition-colors"
                      onClick={() => router.push(`/staff/transactions/${order.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-frost-ice">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night">
                        {order.buyer_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night">
                        {order.seller_name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant} size="sm">
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-polar-night text-right">
                        {formatPrice(order.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.issue_count.open > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-aurora-red/10 text-aurora-red rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {order.issue_count.open}
                          </span>
                        ) : order.issue_count.total > 0 ? (
                          <span className="text-xs text-text-muted">
                            {order.issue_count.total} resolved
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'bookkeeping' && data && data.orders.length > 0 && (
          <div className="bg-snow-white border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: '1000px' }}>
                <thead className="bg-background-secondary border-b border-divider-subtle">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Order</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Game Price</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Fee Net</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-aurora-yellow uppercase tracking-wider">Fee VAT</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Ship Net</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-aurora-yellow uppercase tracking-wider">Ship VAT</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-aurora-yellow uppercase tracking-wider">Total VAT</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Buyer Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider-subtle">
                  {data?.orders.map((order) => {
                    const statusInfo = getStatusConfig(order.status);
                    const platformFee = extractVatFromGross(order.platform_commission_cents / 100);
                    const shipping = extractVatFromGross(order.shipping_cost);
                    const totalVat = platformFee.vat + shipping.vat;
                    const isCancelled = EXCLUDED_FROM_TOTALS.includes(order.status);

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-frost-ice/5 cursor-pointer transition-colors ${isCancelled ? 'opacity-50' : ''}`}
                        onClick={() => router.push(`/staff/transactions/${order.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-frost-ice">
                            {order.order_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {formatDate(order.paid_at || order.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant} size="sm">
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-polar-night text-right">
                          {formatEuros(order.items_total)}
                        </td>
                        <td className="px-4 py-3 text-sm text-polar-night text-right">
                          {formatEuros(platformFee.net)}
                        </td>
                        <td className="px-4 py-3 text-sm text-aurora-yellow text-right">
                          {formatEuros(platformFee.vat)}
                        </td>
                        <td className="px-4 py-3 text-sm text-polar-night text-right">
                          {formatEuros(shipping.net)}
                        </td>
                        <td className="px-4 py-3 text-sm text-aurora-yellow text-right">
                          {formatEuros(shipping.vat)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-aurora-yellow text-right">
                          {formatEuros(totalVat)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-polar-night text-right">
                          {formatEuros(order.total_amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Period Totals Footer */}
                {bookkeepingSummary && (
                  <tfoot className="bg-frost-ice/5 border-t-2 border-frost-ice/30">
                    <tr className="font-semibold">
                      <td colSpan={3} className="px-4 py-3 text-sm text-polar-night">
                        Period Totals ({bookkeepingSummary.orderCount} orders)
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night text-right">
                        {formatEuros(bookkeepingSummary.gmv)}
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night text-right">
                        {formatEuros(bookkeepingSummary.platformRevenue.net)}
                      </td>
                      <td className="px-4 py-3 text-sm text-aurora-yellow text-right">
                        {formatEuros(bookkeepingSummary.platformRevenue.vat)}
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night text-right">
                        {formatEuros(bookkeepingSummary.shippingRevenue.net)}
                      </td>
                      <td className="px-4 py-3 text-sm text-aurora-yellow text-right">
                        {formatEuros(bookkeepingSummary.shippingRevenue.vat)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-aurora-yellow text-right">
                        {formatEuros(bookkeepingSummary.totalVatCollected)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-polar-night text-right">
                        {formatEuros(bookkeepingSummary.totalBuyerPaid)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Feedback Tab Content */}
        {viewMode === 'feedback' && (
          <div className="bg-snow-white border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-secondary border-b border-divider-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider-subtle">
                  {feedbackData?.data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-text-secondary">
                        No feedback found
                      </td>
                    </tr>
                  ) : (
                    feedbackData?.data.map((feedback) => {
                      const typeConfig: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string }> = {
                        feature_request: { label: 'Feature', icon: <Lightbulb className="w-4 h-4" />, color: 'text-frost-ice' },
                        bug_report: { label: 'Bug', icon: <Bug className="w-4 h-4" />, color: 'text-aurora-red' },
                        other: { label: 'Other', icon: <HelpCircle className="w-4 h-4" />, color: 'text-text-secondary' },
                      };
                      const statusInfo: Record<FeedbackStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'trust' }> = {
                        new: { label: 'New', variant: 'warning' },
                        reviewed: { label: 'Reviewed', variant: 'trust' },
                        in_progress: { label: 'In Progress', variant: 'trust' },
                        resolved: { label: 'Resolved', variant: 'success' },
                        closed: { label: 'Closed', variant: 'default' },
                      };
                      const typeInfo = typeConfig[feedback.type as FeedbackType];
                      const status = statusInfo[feedback.status as FeedbackStatus];

                      return (
                        <tr
                          key={feedback.id}
                          className="hover:bg-frost-ice/5 cursor-pointer transition-colors"
                          onClick={() => router.push(`/staff/feedback/${feedback.id}`)}
                        >
                          <td className="px-4 py-4">
                            <div className={`flex items-center gap-2 ${typeInfo.color}`}>
                              {typeInfo.icon}
                              <span className="text-sm font-medium">{typeInfo.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-polar-night line-clamp-2 max-w-md">
                              {feedback.description}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={status.variant} size="sm">
                              {status.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-polar-night">
                              {feedback.user?.full_name || feedback.email || 'Anonymous'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-text-secondary">
                              {formatDate(new Date(feedback.created_at))}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedback Pagination */}
        {viewMode === 'feedback' && feedbackData && feedbackData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-text-secondary">
              Showing {((feedbackData.pagination.page - 1) * feedbackData.pagination.limit) + 1} to{' '}
              {Math.min(feedbackData.pagination.page * feedbackData.pagination.limit, feedbackData.pagination.total)} of{' '}
              {feedbackData.pagination.total} feedback items
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={feedbackCurrentPage === 1}
                onClick={() => setFeedbackCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-text-secondary">
                Page {feedbackCurrentPage} of {feedbackData.pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={feedbackCurrentPage === feedbackData.pagination.totalPages}
                onClick={() => setFeedbackCurrentPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Play Analytics Tab Content */}
        {viewMode === 'play' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-1">Players Today</p>
                <p className="text-2xl font-bold text-polar-night">
                  {playAnalytics?.summary.uniqueVisitorsToday || 0}
                </p>
              </div>
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-1">Plays Today</p>
                <p className="text-2xl font-bold text-polar-night">
                  {playAnalytics?.summary.playsToday || 0}
                </p>
              </div>
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-1">Win Rate</p>
                <p className="text-2xl font-bold text-polar-night">
                  {playAnalytics?.summary.winRate || 0}%
                </p>
              </div>
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-1">Avg Guesses</p>
                <p className="text-2xl font-bold text-polar-night">
                  {playAnalytics?.summary.avgGuesses || 0}
                </p>
              </div>
            </div>

            {/* Extended Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-2">This Week</p>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Players</span>
                  <span className="font-medium text-polar-night">
                    {playAnalytics?.summary.uniqueVisitorsWeek || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Plays</span>
                  <span className="font-medium text-polar-night">
                    {playAnalytics?.summary.playsThisWeek || 0}
                  </span>
                </div>
              </div>
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-2">This Month</p>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Players</span>
                  <span className="font-medium text-polar-night">
                    {playAnalytics?.summary.uniqueVisitorsMonth || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Plays</span>
                  <span className="font-medium text-polar-night">
                    {playAnalytics?.summary.playsThisMonth || 0}
                  </span>
                </div>
              </div>
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-2">Overall</p>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Total Puzzles</span>
                  <span className="font-medium text-polar-night">
                    {playAnalytics?.puzzleStats.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Trends */}
            {playAnalytics?.dailyTrends && playAnalytics.dailyTrends.length > 0 && (
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-4">
                  Daily Activity (Last 30 Days)
                </h3>
                <div className="h-32 flex items-end gap-1">
                  {playAnalytics.dailyTrends.map((day) => {
                    const maxPlays = Math.max(...playAnalytics.dailyTrends.map(d => d.plays), 1);
                    const height = (day.plays / maxPlays) * 100;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 bg-frost-ice/60 hover:bg-frost-ice rounded-t transition-colors cursor-default group relative"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${day.date}: ${day.plays} plays, ${day.wins} wins`}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-polar-night text-snow-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {day.date.slice(5)}: {day.plays} plays
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Puzzle Performance Table */}
            {playAnalytics?.puzzleStats && playAnalytics.puzzleStats.length > 0 && (
              <div className="bg-snow-white border border-border rounded-lg overflow-hidden">
                <h3 className="text-sm font-semibold text-polar-night p-4 border-b border-divider-subtle">
                  Puzzle Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-background-secondary border-b border-divider-subtle">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Game
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Plays
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Win Rate
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Avg Guesses
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider-subtle">
                      {playAnalytics.puzzleStats.map((puzzle) => (
                        <tr key={puzzle.puzzleNumber} className="hover:bg-frost-ice/5 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-polar-night">
                            {puzzle.puzzleNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-polar-night">
                            {puzzle.gameName}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-polar-night">
                            {puzzle.plays}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-polar-night">
                            {puzzle.winRate}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-polar-night">
                            {puzzle.avgGuesses || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!playAnalytics || playAnalytics.summary.playsThisMonth === 0) && (
              <div className="text-center py-12">
                <TrendUp className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary">No play data yet</p>
                <p className="text-sm text-text-muted mt-1">
                  Data will appear once users start playing Galda Spēle
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination for Operations/Bookkeeping */}
        {viewMode !== 'dac7' && viewMode !== 'feedback' && viewMode !== 'play' && data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-text-secondary">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} transactions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-text-secondary">
                Page {currentPage} of {data.pagination.total_pages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === data.pagination.total_pages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// DAC7 Summary Card Component
function Dac7SummaryCard({
  label,
  value,
  icon,
  bgColor,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-snow-white border rounded-lg p-4 ${
        highlight ? 'border-aurora-yellow' : 'border-border'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center mb-2`}
      >
        {icon}
      </div>
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p
        className={`text-xl font-bold ${
          highlight ? 'text-aurora-yellow' : 'text-polar-night'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
