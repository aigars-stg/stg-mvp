'use client';

import { useState } from 'react';
import { Button } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  AlertCircle,
  CheckCircleAlt01 as CheckCircle2,
  AlertTriangle,
  Time as Clock,
} from 'griddy-icons';

interface DisputeResponseFormProps {
  orderId: string;
  orderNumber: string;
  buyerReason: string;
  buyerDescription: string;
  deadline: string;
  alreadyResponded: boolean;
  existingResponse?: string;
  existingPhotos?: string[];
  respondedAt?: string;
}

export function DisputeResponseForm({
  orderId,
  orderNumber,
  buyerReason,
  buyerDescription,
  deadline,
  alreadyResponded,
  existingResponse,
}: DisputeResponseFormProps) {
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const hoursLeft = Math.max(
    0,
    Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
  );
  const isExpired = now > deadlineDate;
  const charCount = responseText.trim().length;

  const handleSubmit = async () => {
    if (charCount < 50) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(
        `/api/seller/orders/${orderId}/dispute/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response_text: responseText.trim() }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit response');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Buyer's claim */}
      <div className="bg-aurora-red/5 border border-aurora-red/20 rounded-xl p-5">
        <h3 className="font-semibold text-polar-night mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-aurora-red" />
          Buyer&apos;s Claim
        </h3>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-text-muted">Reason:</span>{' '}
            <span className="text-polar-night font-medium">{buyerReason}</span>
          </p>
          <p className="text-text-secondary">{buyerDescription}</p>
        </div>
      </div>

      {/* Deadline */}
      {!alreadyResponded && !success && (
        <div
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            isExpired
              ? 'bg-aurora-red/10 text-aurora-red'
              : hoursLeft < 12
                ? 'bg-aurora-yellow/10 text-aurora-yellow'
                : 'bg-frost-ice/10 text-frost-ice'
          }`}
        >
          <Clock className="w-4 h-4" />
          {isExpired
            ? 'Response deadline has passed'
            : `${hoursLeft} hours remaining to respond`}
        </div>
      )}

      {/* Already responded - read only */}
      {alreadyResponded && existingResponse && (
        <div className="bg-snow-white border-2 border-border rounded-xl p-5">
          <h3 className="font-semibold text-polar-night mb-2">
            Your Response
          </h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">
            {existingResponse}
          </p>
          <p className="text-xs text-text-muted mt-3">
            Your response has been submitted. Our team is reviewing the dispute.
          </p>
        </div>
      )}

      {/* Success state */}
      {success && (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-aurora-green/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-aurora-green" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night mb-2">
            Response Submitted
          </h3>
          <p className="text-sm text-text-secondary">
            Our team will review the dispute and notify both parties of the
            outcome.
          </p>
        </div>
      )}

      {/* Response form */}
      {!alreadyResponded && !success && !isExpired && (
        <>
          <div>
            <label className="block text-sm font-medium text-polar-night mb-2">
              Your Response to Order #{orderNumber}
            </label>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Explain your side of the dispute. Include relevant details about the item's condition, packaging, and any communication with the buyer..."
              rows={6}
              maxLength={2000}
              className="w-full border-2 border-border rounded-lg p-3 text-sm text-polar-night placeholder:text-text-muted focus:border-frost-ice focus:outline-none resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-text-muted">
                Minimum 50 characters
              </p>
              <p
                className={`text-xs ${
                  charCount < 50 ? 'text-aurora-red' : 'text-text-muted'
                }`}
              >
                {charCount}/2000
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-aurora-yellow/5 border border-aurora-yellow/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-aurora-yellow flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              You can only submit one response. Make sure to include all
              relevant information before submitting.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
              <p className="text-sm text-aurora-red">{error}</p>
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            disabled={charCount < 50 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Response'
            )}
          </Button>
        </>
      )}
    </div>
  );
}
