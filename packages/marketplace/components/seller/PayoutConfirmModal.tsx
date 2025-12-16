'use client';

import { useState } from 'react';
import { Button } from '@second-turn/design-system';
import {
  X,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Info,
} from 'lucide-react';

interface PayoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableAmount: number; // In cents
  bankLast4: string;
  bankName: string;
}

export function PayoutConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  availableAmount,
  bankLast4,
  bankName,
}: PayoutConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    amount: string;
    arrivalDate?: string;
  } | null>(null);

  if (!isOpen) return null;

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-EU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Estimate arrival date (2-3 business days from now)
  const estimatedArrival = (() => {
    const date = new Date();
    let daysAdded = 0;
    while (daysAdded < 2) {
      date.setDate(date.getDate() + 1);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }
    return formatDate(date.toISOString());
  })();

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/seller/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Full balance - don't specify amount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request payout');
      }

      setSuccess({
        amount: data.payout.amountFormatted,
        arrivalDate: data.payout.arrivalDate,
      });

      // Notify parent after short delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request payout');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-polar-night/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-snow-white rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-text-muted hover:text-polar-night transition-colors"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success State */}
        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-aurora-green/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-aurora-green" />
            </div>
            <h3 className="text-xl font-bold text-polar-night mb-2">
              Payout Requested!
            </h3>
            <p className="text-text-secondary mb-4">
              {success.amount} is on its way to your bank account.
            </p>
            {success.arrivalDate && (
              <p className="text-sm text-text-muted">
                Expected arrival: {formatDate(success.arrivalDate)}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <h2 className="text-xl font-bold text-polar-night mb-6 pr-8">
              Request Payout
            </h2>

            {/* Payout Details */}
            <div className="space-y-4 mb-6">
              {/* Amount */}
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Amount</span>
                <span className="text-xl font-bold text-polar-night">
                  {formatCurrency(availableAmount)}
                </span>
              </div>

              {/* Bank Account */}
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">To</span>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-text-muted" />
                  <span className="font-medium text-polar-night">
                    ****{bankLast4}
                  </span>
                  <span className="text-text-muted">({bankName})</span>
                </div>
              </div>

              {/* Estimated Arrival */}
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Expected arrival</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <span className="font-medium text-polar-night">
                    {estimatedArrival}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 mb-6">
              {/* Info */}
              <div className="flex items-start gap-2 text-sm text-text-muted">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Payouts typically arrive within 2 business days.</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-aurora-red">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Confirm Payout
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
