'use client';

import { useState } from 'react';
import { Button } from '@second-turn/design-system';
import { RefreshCw as Loader2, Shield, AlertTriangle } from '@/lib/icons';
import { formatCentsToCurrency } from '@/lib/services/pricing';

type ResolutionType =
  | 'buyer_full_refund'
  | 'buyer_partial_refund'
  | 'seller_favor'
  | 'mutual_agreement';

const resolutionLabels: Record<ResolutionType, string> = {
  buyer_full_refund: 'Full refund to buyer',
  buyer_partial_refund: 'Partial refund to buyer',
  seller_favor: 'Resolve in seller favor',
  mutual_agreement: 'Mutual agreement (seller credited)',
};

interface DisputeResolutionFormProps {
  orderId: string;
  defaultRefundAmountCents: number;
  onResolved: () => void;
}

export function DisputeResolutionForm({
  orderId,
  defaultRefundAmountCents,
  onResolved,
}: DisputeResolutionFormProps) {
  const [resolutionType, setResolutionType] = useState<ResolutionType | ''>('');
  const [refundAmountEuros, setRefundAmountEuros] = useState(
    (defaultRefundAmountCents / 100).toFixed(2)
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const refundAmountCents = Math.round(parseFloat(refundAmountEuros || '0') * 100);
  const canSubmit = resolutionType && resolutionNote.trim().length >= 10 &&
    (resolutionType !== 'buyer_partial_refund' || refundAmountCents > 0);

  const handleResolveClick = () => {
    if (!canSubmit) return;
    setConfirming(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const body: Record<string, unknown> = {
        resolution_type: resolutionType,
        resolution_notes: resolutionNote.trim(),
      };
      if (resolutionType === 'buyer_partial_refund') {
        body.refund_amount_cents = refundAmountCents;
      }

      const response = await fetch(
        `/api/admin/disputes/${orderId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setSubmitMessage({
          type: 'error',
          text: result.error || 'Failed to resolve dispute',
        });
        return;
      }

      setSubmitMessage({
        type: 'success',
        text: `Dispute resolved: ${resolutionLabels[resolutionType as ResolutionType]}. Order status: ${result.finalStatus}.${result.requiresManualSepa ? ' Manual SEPA refund required.' : ''}`,
      });

      onResolved();
    } catch {
      setSubmitMessage({
        type: 'error',
        text: 'Network error. Please try again.',
      });
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-snow-white border-t-2 border-frost-ice shadow-xl z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <h3 className="text-sm font-semibold text-polar-night mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-frost-ice" />
          Resolve Dispute
        </h3>

        {submitMessage && (
          <div
            className={`p-3 rounded-lg mb-3 text-sm ${
              submitMessage.type === 'success'
                ? 'bg-aurora-green/10 text-aurora-green border border-aurora-green/30'
                : 'bg-aurora-red/10 text-aurora-red border border-aurora-red/30'
            }`}
          >
            {submitMessage.text}
          </div>
        )}

        {/* Confirmation banner */}
        {confirming && (
          <div className="p-3 rounded-lg mb-3 bg-aurora-yellow/10 border border-aurora-yellow/30">
            <p className="text-sm font-medium text-polar-night mb-2">
              Confirm resolution: {resolutionLabels[resolutionType as ResolutionType]}
              {resolutionType === 'buyer_partial_refund' && ` — ${formatCentsToCurrency(refundAmountCents)}`}
            </p>
            <p className="text-xs text-text-secondary mb-3">This action is irreversible.</p>
            <div className="flex gap-2">
              <Button variant="accent" size="sm" onClick={handleConfirm} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!confirming && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-auto">
              <label className="block text-xs text-text-muted mb-1">
                Resolution
              </label>
              <select
                value={resolutionType}
                onChange={(e) =>
                  setResolutionType(e.target.value as ResolutionType | '')
                }
                className="w-full sm:w-64 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice bg-snow-white"
              >
                <option value="">Select resolution...</option>
                {Object.entries(resolutionLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {resolutionType === 'buyer_partial_refund' && (
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  Refund amount (EUR)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={refundAmountEuros}
                    onChange={(e) => setRefundAmountEuros(e.target.value)}
                    min={0.01}
                    max={defaultRefundAmountCents / 100}
                    step={0.01}
                    className="w-32 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice"
                  />
                  <span className="text-xs text-text-muted">
                    max {formatCentsToCurrency(defaultRefundAmountCents)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-text-muted mb-1">
                Resolution note (min 10 chars)
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={2}
                placeholder="Describe the resolution and reasoning..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice resize-none"
              />
            </div>

            <div>
              <Button
                variant="accent"
                size="sm"
                onClick={handleResolveClick}
                disabled={!canSubmit}
              >
                Resolve Dispute
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SepaConfirmationFormProps {
  orderId: string;
  onConfirmed: () => void;
}

export function SepaConfirmationForm({ orderId, onConfirmed }: SepaConfirmationFormProps) {
  const [sepaReference, setSepaReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleConfirm = async () => {
    if (!sepaReference.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          refund_type: 'confirm_sepa',
          sepa_reference: sepaReference.trim(),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to confirm SEPA refund',
        });
        return;
      }

      setMessage({ type: 'success', text: 'SEPA refund confirmed' });
      onConfirmed();
    } catch {
      setMessage({
        type: 'error',
        text: 'Network error. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-aurora-yellow/10 border-t-2 border-aurora-yellow z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <h3 className="text-sm font-semibold text-polar-night mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-aurora-yellow" />
          Manual SEPA Refund Required
        </h3>
        <p className="text-sm text-text-secondary mb-3">
          This order was paid via bank link. Process the SEPA transfer
          manually and enter the reference below.
        </p>
        {message && (
          <div
            className={`p-3 rounded-lg mb-3 text-sm ${
              message.type === 'success'
                ? 'bg-aurora-green/10 text-aurora-green border border-aurora-green/30'
                : 'bg-aurora-red/10 text-aurora-red border border-aurora-red/30'
            }`}
          >
            {message.text}
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-md">
            <label className="block text-xs text-text-muted mb-1">
              SEPA Transfer Reference
            </label>
            <input
              type="text"
              value={sepaReference}
              onChange={(e) => setSepaReference(e.target.value)}
              placeholder="e.g. SEPA-2026-03-05-001"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice"
            />
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={handleConfirm}
            disabled={submitting || !sepaReference.trim()}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Confirm SEPA Refund'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
