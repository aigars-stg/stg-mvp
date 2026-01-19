'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import { Search, RefreshCw as Loader2, AlertCircle, Shield, ChevronLeft, ChevronRight, AlertTriangle, Package, Download, TrendUp, CurrencyDollar, FileText, Receipt, Truck } from 'griddy-icons';
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
  service_fee: number;
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

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'trust' }> = {
  pending_payment: { label: 'Pending Payment', variant: 'warning' },
  pending_seller: { label: 'Pending Seller', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'trust' },
  shipped: { label: 'Shipped', variant: 'trust' },
  in_transit: { label: 'In Transit', variant: 'trust' },
  delivered: { label: 'Delivered', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
  refunded: { label: 'Refunded', variant: 'error' },
  disputed: { label: 'Disputed', variant: 'error' },
};

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
  const [viewMode, setViewMode] = useState<'operations' | 'bookkeeping'>('operations');
  const [dateRange, setDateRange] = useState('this_month');

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
      service_fee: o.service_fee,
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
      service_fee: o.service_fee,
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
      router.push('/auth/signin?redirect=/staff/transactions');
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

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, statusFilter, hasIssues, currentPage, viewMode, dateRange]);

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
          <h1 className="text-2xl font-bold text-polar-night mb-2">Staff Access Required</h1>
          <p className="text-text-secondary mb-6">
            This page is only accessible to staff members.
          </p>
          <Link href="/">
            <Button variant="primary">Go Home</Button>
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
                <h1 className="text-2xl font-bold text-polar-night dark:text-snow-white">Staff Dashboard</h1>
              </div>
              <p className="text-text-secondary">
                {viewMode === 'operations'
                  ? 'Manage transactions, view conversations, and resolve issues.'
                  : 'Financial overview with VAT breakdown for bookkeeping.'}
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
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 border-b border-divider-subtle">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order number..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-snow-white dark:bg-polar-night text-polar-night dark:text-snow-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
              />
            </div>
          </form>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-snow-white dark:bg-polar-night text-polar-night dark:text-snow-white focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

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

          {/* Date range filter (bookkeeping mode only) */}
          {viewMode === 'bookkeeping' && (
            <>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-snow-white dark:bg-polar-night text-polar-night dark:text-snow-white focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
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
            <div className="bg-snow-white dark:bg-polar-nightLight border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-frost-ice/10 flex items-center justify-center mb-2">
                <Package className="w-4 h-4 text-frost-ice" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Orders</p>
              <p className="text-xl font-bold text-polar-night dark:text-snow-white">{bookkeepingSummary.orderCount}</p>
              <p className="text-xs text-text-secondary">in selected period</p>
            </div>

            {/* GMV */}
            <div className="bg-snow-white dark:bg-polar-nightLight border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-frost-ice/10 flex items-center justify-center mb-2">
                <TrendUp className="w-4 h-4 text-frost-ice" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">GMV</p>
              <p className="text-xl font-bold text-polar-night dark:text-snow-white">{formatEuros(bookkeepingSummary.gmv)}</p>
              <p className="text-xs text-text-secondary">game prices total</p>
            </div>

            {/* Platform Revenue */}
            <div className="bg-snow-white dark:bg-polar-nightLight border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-green/10 flex items-center justify-center mb-2">
                <CurrencyDollar className="w-4 h-4 text-aurora-green" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Platform Revenue</p>
              <p className="text-xl font-bold text-aurora-green">{formatEuros(bookkeepingSummary.platformRevenue.gross + bookkeepingSummary.shippingRevenue.gross)}</p>
              <p className="text-xs text-aurora-yellow">Net: {formatEuros(bookkeepingSummary.platformRevenue.net + bookkeepingSummary.shippingRevenue.net)}</p>
            </div>

            {/* Total VAT */}
            <div className="bg-snow-white dark:bg-polar-nightLight border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-yellow/10 flex items-center justify-center mb-2">
                <FileText className="w-4 h-4 text-aurora-yellow" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">VAT Collected</p>
              <p className="text-xl font-bold text-aurora-yellow">{formatEuros(bookkeepingSummary.totalVatCollected)}</p>
              <p className="text-xs text-text-secondary">21% rate</p>
            </div>

            {/* Platform Fee VAT */}
            <div className="bg-snow-white dark:bg-polar-nightLight border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-yellow/10 flex items-center justify-center mb-2">
                <Receipt className="w-4 h-4 text-aurora-yellow" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Fee VAT</p>
              <p className="text-xl font-bold text-aurora-yellow">{formatEuros(bookkeepingSummary.platformRevenue.vat)}</p>
              <p className="text-xs text-text-secondary">Gross: {formatEuros(bookkeepingSummary.platformRevenue.gross)}</p>
            </div>

            {/* Shipping VAT */}
            <div className="bg-snow-white dark:bg-polar-nightLight border border-border rounded-lg p-4">
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

      {/* Transactions list */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading && data && (
          <div className="text-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-frost-ice mx-auto" />
          </div>
        )}

        {data && data.orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-polar-night dark:text-snow-white mb-2">No transactions found</h3>
            <p className="text-text-secondary">
              {viewMode === 'bookkeeping'
                ? 'No transactions in the selected period.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : viewMode === 'operations' ? (
          <div className="bg-snow-white dark:bg-polar-nightLight border border-border rounded-lg overflow-hidden">
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
                  const statusInfo = statusConfig[order.status] || { label: order.status, variant: 'default' as const };

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
                        €{order.total_amount.toFixed(2)}
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
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Bookkeeping Table */
          <div className="bg-snow-white dark:bg-polar-nightLight border border-border rounded-lg overflow-hidden">
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
                    const statusInfo = statusConfig[order.status] || { label: order.status, variant: 'default' as const };
                    const platformFee = extractVatFromGross(order.service_fee);
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
                          {new Date(order.paid_at || order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant} size="sm">
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-polar-night dark:text-snow-white text-right">
                          {formatEuros(order.items_total)}
                        </td>
                        <td className="px-4 py-3 text-sm text-polar-night dark:text-snow-white text-right">
                          {formatEuros(platformFee.net)}
                        </td>
                        <td className="px-4 py-3 text-sm text-aurora-yellow text-right">
                          {formatEuros(platformFee.vat)}
                        </td>
                        <td className="px-4 py-3 text-sm text-polar-night dark:text-snow-white text-right">
                          {formatEuros(shipping.net)}
                        </td>
                        <td className="px-4 py-3 text-sm text-aurora-yellow text-right">
                          {formatEuros(shipping.vat)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-aurora-yellow text-right">
                          {formatEuros(totalVat)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-polar-night dark:text-snow-white text-right">
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
                      <td colSpan={3} className="px-4 py-3 text-sm text-polar-night dark:text-snow-white">
                        Period Totals ({bookkeepingSummary.orderCount} orders)
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night dark:text-snow-white text-right">
                        {formatEuros(bookkeepingSummary.gmv)}
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night dark:text-snow-white text-right">
                        {formatEuros(bookkeepingSummary.platformRevenue.net)}
                      </td>
                      <td className="px-4 py-3 text-sm text-aurora-yellow text-right">
                        {formatEuros(bookkeepingSummary.platformRevenue.vat)}
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night dark:text-snow-white text-right">
                        {formatEuros(bookkeepingSummary.shippingRevenue.net)}
                      </td>
                      <td className="px-4 py-3 text-sm text-aurora-yellow text-right">
                        {formatEuros(bookkeepingSummary.shippingRevenue.vat)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-aurora-yellow text-right">
                        {formatEuros(bookkeepingSummary.totalVatCollected)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-polar-night dark:text-snow-white text-right">
                        {formatEuros(bookkeepingSummary.totalBuyerPaid)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.total_pages > 1 && (
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
