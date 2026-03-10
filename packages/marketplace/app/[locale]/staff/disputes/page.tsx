'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { Button, Badge } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  Shield,
  AlertCircle,
  Time as Clock,
} from '@/lib/icons';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDateTime } from '@/lib/date-utils';
import { formatPrice } from '@/lib/services/pricing';

interface Dispute {
  order_id: string;
  order_number: string;
  dispute_type: string;
  dispute_reason: string;
  game_name: string;
  total_amount: number;
  disputed_at: string;
  deadline_at: string | null;
  buyer_name: string;
  seller_name: string;
  resolution_type: string | null;
  refund_status: string | null;
  payment_method: string | null;
  status: string;
}

interface DisputeResponse {
  disputes: Dispute[];
  counts: {
    needs_action: number;
    awaiting_seller: number;
    refund_issues: number;
    resolved: number;
  };
}

type Section = 'needs_action' | 'awaiting_seller' | 'refund_issues' | 'resolved';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'needs_action', label: 'Needs Action' },
  { key: 'awaiting_seller', label: 'Awaiting Seller' },
  { key: 'refund_issues', label: 'Refund Issues' },
  { key: 'resolved', label: 'Recently Resolved' },
];

const RESOLUTION_BADGE: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  completed: 'success',
  refunded: 'error',
  partial_refund: 'warning',
};

const REFUND_STATUS_BADGE: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  completed: 'success',
  failed: 'error',
  manual_sepa_required: 'warning',
  pending: 'default',
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins}m ago`;
}

function getCountdown(deadlineStr: string): { text: string; urgent: boolean } {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) return { text: 'Expired', urgent: true };

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (diffDays > 0) {
    return { text: `${diffDays}d ${remainingHours}h left`, urgent: diffDays < 1 };
  }
  return { text: `${diffHours}h left`, urgent: diffHours < 12 };
}

function DisputesContent() {
  const locale = useLocale();
  const { user } = useAuth();
  const [data, setData] = useState<DisputeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>('needs_action');

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/staff/disputes?section=${section}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    if (user) fetchDisputes();
  }, [user, fetchDisputes]);

  return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Summary */}
        {data?.counts && data.counts.needs_action > 0 && (
          <div className="bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-yellow flex-shrink-0" />
            <div>
              <p className="font-medium text-polar-night">
                {data.counts.needs_action} dispute{data.counts.needs_action !== 1 ? 's' : ''} requiring staff action
              </p>
              <p className="text-xs text-text-secondary">
                Review evidence and decide on resolution
              </p>
            </div>
          </div>
        )}

        {/* Section Filters */}
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <Button
              key={s.key}
              variant={section === s.key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSection(s.key)}
            >
              {s.label}
              {data?.counts && data.counts[s.key] > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-snow-white/20 text-xs font-medium">
                  {data.counts[s.key]}
                </span>
              )}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDisputes}
            disabled={loading}
            className="ml-auto"
          >
            <Loader2 className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Dispute Cards */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-snow-white border border-border rounded-lg p-4 animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-5 w-32 bg-bg-elevated rounded" />
                  <div className="h-5 w-20 bg-bg-elevated rounded-full" />
                </div>
                <div className="h-4 w-48 bg-bg-elevated rounded" />
              </div>
            ))}
          </div>
        ) : data?.disputes.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-aurora-green mx-auto mb-3" />
            <p className="text-text-secondary">
              {section === 'needs_action'
                ? 'No disputes requiring action'
                : section === 'awaiting_seller'
                  ? 'No disputes awaiting seller response'
                  : section === 'refund_issues'
                    ? 'No refund issues'
                    : 'No recently resolved disputes'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.disputes.map((d) => (
              <Link
                key={d.order_id}
                href={`/staff/disputes/${d.order_id}`}
                className="block bg-snow-white border border-border rounded-lg p-4 sm:p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-frost-ice">
                        Order #{d.order_number}
                      </p>
                      <Badge variant="default">
                        {d.dispute_type}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-polar-night">
                      {d.game_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-polar-night">
                      {formatPrice(d.total_amount)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(d.disputed_at)}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-text-secondary mb-3">
                  {d.dispute_reason}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                  <span>
                    <span className="text-text-muted">Buyer: </span>
                    {d.buyer_name}
                  </span>
                  <span>
                    <span className="text-text-muted">Seller: </span>
                    {d.seller_name}
                  </span>
                  <span>
                    <span className="text-text-muted">Opened: </span>
                    {formatDateTime(d.disputed_at, locale)}
                  </span>
                </div>

                {/* Section-specific badges */}
                {section === 'awaiting_seller' && d.deadline_at && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {(() => {
                      const countdown = getCountdown(d.deadline_at);
                      return (
                        <Badge variant={countdown.urgent ? 'error' : 'warning'}>
                          <Clock className="w-3 h-3 mr-1" />
                          {countdown.text}
                        </Badge>
                      );
                    })()}
                  </div>
                )}

                {section === 'refund_issues' && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                    {d.refund_status && (
                      <Badge variant={REFUND_STATUS_BADGE[d.refund_status] || 'default'}>
                        Refund: {d.refund_status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    {d.payment_method && (
                      <Badge variant="default">
                        {d.payment_method}
                      </Badge>
                    )}
                  </div>
                )}

                {section === 'resolved' && d.resolution_type && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Badge variant={RESOLUTION_BADGE[d.resolution_type] || 'default'}>
                      {d.resolution_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
  );
}

export default function StaffDisputesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
        </div>
      }
    >
      <DisputesContent />
    </Suspense>
  );
}
