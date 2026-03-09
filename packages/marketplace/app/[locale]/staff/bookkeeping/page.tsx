'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button, Badge } from '@second-turn/design-system';
import { Search, RefreshCw as Loader2, AlertCircle, Package, Download, TrendUp, CurrencyDollar, FileText, Receipt, Truck } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  calculateBookkeepingSummary,
  generateBookkeepingCSV,
  downloadCSV,
  formatEuros,
  formatDateForAPI,
  resolveVatBreakdown,
  DATE_RANGE_PRESETS,
  EXCLUDED_FROM_TOTALS,
  type OrderBookkeepingData,
  type BookkeepingSummary,
} from '@/lib/bookkeeping-utils';
import { formatDate } from '@/lib/date-utils';
import { getStatusConfig } from '@/components/shipping';
import { Pagination } from '@/components/staff/Pagination';

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  paid_at: string | null;
  buyer_name: string;
  seller_name: string;
  items_total: number;
  shipping_cost: number;
  platform_commission_cents: number;
  commission_net_cents: number | null;
  commission_vat_cents: number | null;
  commission_vat_rate: number | null;
  shipping_net_cents: number | null;
  shipping_vat_cents: number | null;
  shipping_vat_rate: number | null;
}

interface BookkeepingListResponse {
  orders: OrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
        <p className="text-text-secondary">Loading bookkeeping data...</p>
      </div>
    </div>
  );
}

export default function StaffBookkeepingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StaffBookkeepingContent />
    </Suspense>
  );
}

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

function toBookkeepingData(orders: OrderSummary[]): OrderBookkeepingData[] {
  return orders.map((o) => ({
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
    commission_net_cents: o.commission_net_cents,
    commission_vat_cents: o.commission_vat_cents,
    commission_vat_rate: o.commission_vat_rate,
    shipping_net_cents: o.shipping_net_cents,
    shipping_vat_cents: o.shipping_vat_cents,
    shipping_vat_rate: o.shipping_vat_rate,
  }));
}

function StaffBookkeepingContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState<BookkeepingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');
  const [currentPage, setCurrentPage] = useState(1);

  const bookkeepingData = useMemo(() => {
    if (!data?.orders) return null;
    return toBookkeepingData(data.orders);
  }, [data?.orders]);

  const bookkeepingSummary = useMemo<BookkeepingSummary | null>(() => {
    if (!bookkeepingData) return null;
    return calculateBookkeepingSummary(bookkeepingData);
  }, [bookkeepingData]);

  const handleExportCSV = () => {
    if (!bookkeepingData) return;
    const csv = generateBookkeepingCSV(bookkeepingData);
    const preset = DATE_RANGE_PRESETS.find((p) => p.key === dateRange);
    const filename = `stg-bookkeeping-${preset?.label.toLowerCase().replace(/\s+/g, '-') || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', currentPage.toString());
      params.set('limit', '20');

      const preset = DATE_RANGE_PRESETS.find((p) => p.key === dateRange);
      if (preset) {
        const { start, end } = preset.getRange();
        params.set('date_from', formatDateForAPI(start));
        params.set('date_to', formatDateForAPI(end));
      }

      const response = await fetch(`/api/staff/transactions?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch bookkeeping data');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookkeeping data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, dateRange, currentPage]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id, fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  if (loading && !data) {
    return <LoadingFallback />;
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">{error}</h2>
          <Button variant="primary" onClick={fetchData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 border-b border-divider-subtle">
        <div className="flex flex-wrap items-center gap-4">
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
        </div>
      </div>

      {/* Summary Cards */}
      {bookkeepingSummary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-frost-ice/10 flex items-center justify-center mb-2">
                <Package className="w-4 h-4 text-frost-ice" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Orders</p>
              <p className="text-xl font-bold text-polar-night">{bookkeepingSummary.orderCount}</p>
              <p className="text-xs text-text-secondary">in selected period</p>
            </div>

            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-frost-ice/10 flex items-center justify-center mb-2">
                <TrendUp className="w-4 h-4 text-frost-ice" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">GMV</p>
              <p className="text-xl font-bold text-polar-night">{formatEuros(bookkeepingSummary.gmv)}</p>
              <p className="text-xs text-text-secondary">game prices total</p>
            </div>

            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-green/10 flex items-center justify-center mb-2">
                <CurrencyDollar className="w-4 h-4 text-aurora-green" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Platform Revenue</p>
              <p className="text-xl font-bold text-aurora-green">{formatEuros(bookkeepingSummary.platformRevenue.gross + bookkeepingSummary.shippingRevenue.gross)}</p>
              <p className="text-xs text-aurora-yellow">Net: {formatEuros(bookkeepingSummary.platformRevenue.net + bookkeepingSummary.shippingRevenue.net)}</p>
            </div>

            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-yellow/10 flex items-center justify-center mb-2">
                <FileText className="w-4 h-4 text-aurora-yellow" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">VAT Collected</p>
              <p className="text-xl font-bold text-aurora-yellow">{formatEuros(bookkeepingSummary.totalVatCollected)}</p>
              <p className="text-xs text-text-secondary">21% rate</p>
            </div>

            <div className="bg-snow-white border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-aurora-yellow/10 flex items-center justify-center mb-2">
                <Receipt className="w-4 h-4 text-aurora-yellow" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Fee VAT</p>
              <p className="text-xl font-bold text-aurora-yellow">{formatEuros(bookkeepingSummary.platformRevenue.vat)}</p>
              <p className="text-xs text-text-secondary">Gross: {formatEuros(bookkeepingSummary.platformRevenue.gross)}</p>
            </div>

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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading && data && (
          <div className="text-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-frost-ice mx-auto" />
          </div>
        )}

        {data && data.orders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-polar-night mb-2">No transactions found</h3>
            <p className="text-text-secondary">No transactions in the selected period.</p>
          </div>
        )}

        {data && data.orders.length > 0 && (
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
                  {data.orders.map((order) => {
                    const statusInfo = getStatusConfig(order.status);
                    const platformFee = resolveVatBreakdown(
                      order.platform_commission_cents / 100, order.commission_net_cents, order.commission_vat_cents
                    );
                    const shipping = resolveVatBreakdown(
                      order.shipping_cost, order.shipping_net_cents, order.shipping_vat_cents
                    );
                    const totalVat = platformFee.vat + shipping.vat;
                    const isCancelled = EXCLUDED_FROM_TOTALS.includes(order.status);

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-frost-ice/5 cursor-pointer transition-colors ${isCancelled ? 'opacity-50' : ''}`}
                        onClick={() => router.push(`/staff/orders/${order.id}`)}
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

        {data && (
          <Pagination
            currentPage={currentPage}
            totalPages={data.pagination.total_pages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={setCurrentPage}
            itemLabel="transactions"
          />
        )}
      </div>
    </>
  );
}
