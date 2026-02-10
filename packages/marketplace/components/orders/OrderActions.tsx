'use client';

import { Button } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  AlertCircle,
  CheckCircleAlt01 as CheckCircle2,
  AlertTriangle,
  Check,
} from 'griddy-icons';

interface OrderActionsProps {
  orderStatus: string;
  currentUserRole: 'buyer' | 'seller';

  // Confirm receipt
  confirmingReceipt: boolean;
  onConfirmReceipt: () => void;

  // Report issue
  showReportIssue: boolean;
  onShowReportIssue: (show: boolean) => void;
  reportingIssue: boolean;
  issueType: string;
  onIssueTypeChange: (type: string) => void;
  issueDescription: string;
  onIssueDescriptionChange: (description: string) => void;
  onReportIssue: () => void;

  // Feedback
  actionError: string | null;
  actionSuccess: string | null;
  onClearError: () => void;
}

export function OrderActions({
  orderStatus,
  currentUserRole,
  confirmingReceipt,
  onConfirmReceipt,
  showReportIssue,
  onShowReportIssue,
  reportingIssue,
  issueType,
  onIssueTypeChange,
  issueDescription,
  onIssueDescriptionChange,
  onReportIssue,
  actionError,
  actionSuccess,
  onClearError,
}: OrderActionsProps) {
  const showActionBar =
    orderStatus === 'delivered' ||
    ['accepted', 'shipped', 'in_transit'].includes(orderStatus);

  if (!showActionBar) {
    return null;
  }

  return (
    <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-xl p-4">
      {/* Action Feedback */}
      {actionError && (
        <div className="mb-3 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
          <p className="text-sm text-aurora-red">{actionError}</p>
        </div>
      )}
      {actionSuccess && (
        <div className="mb-3 p-3 bg-aurora-green/10 border border-aurora-green/20 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-aurora-green flex-shrink-0 mt-0.5" />
          <p className="text-sm text-aurora-green">{actionSuccess}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* Confirm Receipt - Only for buyer when delivered */}
        {currentUserRole === 'buyer' && orderStatus === 'delivered' && (
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirmReceipt}
            disabled={confirmingReceipt}
          >
            {confirmingReceipt ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirm Receipt
              </>
            )}
          </Button>
        )}

        {/* Report Issue */}
        {!showReportIssue && orderStatus !== 'completed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShowReportIssue(true)}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Report Issue
          </Button>
        )}
      </div>

      {/* Report Issue Form */}
      {showReportIssue && (
        <div className="mt-3 p-4 bg-snow-white border border-border rounded-lg">
          <h4 className="text-sm font-semibold text-polar-night mb-3">
            Report an Issue
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Issue Type
              </label>
              <select
                value={issueType}
                onChange={(e) => onIssueTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
              >
                <option value="">Select an issue type...</option>
                <option value="not_received">Package not received</option>
                <option value="damaged">Item arrived damaged</option>
                <option value="wrong_item">Wrong item received</option>
                <option value="not_as_described">Item not as described</option>
                <option value="shipping_delay">Shipping delay</option>
                {currentUserRole === 'buyer' && (
                  <option value="seller_unresponsive">
                    Seller unresponsive
                  </option>
                )}
                {currentUserRole === 'seller' && (
                  <option value="buyer_unresponsive">Buyer unresponsive</option>
                )}
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Description (minimum 10 characters)
              </label>
              <textarea
                value={issueDescription}
                onChange={(e) => onIssueDescriptionChange(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-frost-ice/50 resize-none"
              />
              <p className="text-xs text-text-muted mt-1">
                {issueDescription.length}/2000 characters
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onReportIssue}
                disabled={
                  reportingIssue || !issueType || issueDescription.length < 10
                }
              >
                {reportingIssue ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Issue'
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onShowReportIssue(false);
                  onIssueTypeChange('');
                  onIssueDescriptionChange('');
                  onClearError();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
