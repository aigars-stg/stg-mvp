'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { Button, Badge } from '@second-turn/design-system';
import { Search, RefreshCw as Loader2, AlertCircle, AlertTriangle, Download, User, CheckCircleAlt01 as CheckCircle2 } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatPrice } from '@/lib/services/pricing';
import { getDac7StatusLabel, type Dac7ComplianceStatus } from '@/lib/types/seller';
import { Pagination } from '@/components/staff/Pagination';

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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
        <p className="text-text-secondary">Loading DAC7 data...</p>
      </div>
    </div>
  );
}

export default function StaffDac7Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StaffDac7Content />
    </Suspense>
  );
}

function StaffDac7Content() {
  const { user } = useAuth();

  const [data, setData] = useState<Dac7Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSellers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', currentPage.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/staff/dac7/sellers?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch sellers');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, currentPage]);

  useEffect(() => {
    if (user) {
      fetchSellers();
    }
  }, [user?.id, fetchSellers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleExport = () => {
    const year = new Date().getFullYear();
    window.open(`/api/staff/dac7/export?year=${year}`, '_blank');
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
          <Button variant="primary" onClick={fetchSellers}>
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
                placeholder="Search by name or email..."
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
            {dac7StatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={!data?.sellers?.length}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Dac7SummaryCard
              label="Total Sellers"
              value={data.summary.total}
              icon={<User className="w-4 h-4 text-frost-ice" />}
              bgColor="bg-frost-ice/10"
            />
            <Dac7SummaryCard
              label="Exempt"
              value={data.summary.exempt}
              icon={<CheckCircle2 className="w-4 h-4 text-text-muted" />}
              bgColor="bg-gray-100"
            />
            <Dac7SummaryCard
              label="Approaching"
              value={data.summary.approaching}
              icon={<AlertTriangle className="w-4 h-4 text-aurora-yellow" />}
              bgColor="bg-aurora-yellow/10"
              highlight={data.summary.approaching > 0}
            />
            <Dac7SummaryCard
              label="Required"
              value={data.summary.required}
              icon={<AlertCircle className="w-4 h-4 text-aurora-red" />}
              bgColor="bg-aurora-red/10"
              highlight={data.summary.required > 0}
            />
            <Dac7SummaryCard
              label="Compliant"
              value={data.summary.compliant}
              icon={<CheckCircle2 className="w-4 h-4 text-aurora-green" />}
              bgColor="bg-aurora-green/10"
            />
            <Dac7SummaryCard
              label="Blocked"
              value={data.summary.blocked}
              icon={<AlertCircle className="w-4 h-4 text-aurora-red" />}
              bgColor="bg-aurora-red/10"
              highlight={data.summary.blocked > 0}
            />
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

        {data && data.sellers.length === 0 ? (
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
                  {data?.sellers.map((seller) => {
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

        {data && (
          <Pagination
            currentPage={currentPage}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={setCurrentPage}
            itemLabel="sellers"
          />
        )}
      </div>
    </>
  );
}
