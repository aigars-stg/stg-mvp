'use client';

import { useTranslations } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import {
  Time as Clock,
  CheckCircleAlt01 as CheckCircle2,
  CloseCircle as XCircle,
  RefreshCw as Loader2,
} from '@/lib/icons';
import { PARCEL_SIZES } from '@/components/shipping';
import type { ParcelSize } from '@/components/shipping';

interface SellerAcceptDeclineProps {
  shippingMethod: string;
  timeRemaining: string | null;
  showAcceptModal: boolean;
  setShowAcceptModal: (show: boolean) => void;
  showDeclineModal: boolean;
  setShowDeclineModal: (show: boolean) => void;
  selectedParcelSize: ParcelSize;
  setSelectedParcelSize: (size: ParcelSize) => void;
  declineReason: string;
  setDeclineReason: (reason: string) => void;
  actionLoading: boolean;
  actionError: string | null;
  setActionError: (error: string | null) => void;
  handleAcceptOrder: () => Promise<void>;
  handleDeclineOrder: () => Promise<void>;
}

export function SellerAcceptDecline({
  shippingMethod,
  timeRemaining,
  showAcceptModal,
  setShowAcceptModal,
  showDeclineModal,
  setShowDeclineModal,
  selectedParcelSize,
  setSelectedParcelSize,
  declineReason,
  setDeclineReason,
  actionLoading,
  actionError,
  setActionError,
  handleAcceptOrder,
  handleDeclineOrder,
}: SellerAcceptDeclineProps) {
  const t = useTranslations('SellerOrderDetail');

  return (
    <div className="bg-aurora-yellow/10 border-2 border-aurora-yellow/30 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-aurora-yellow/20 flex items-center justify-center flex-shrink-0">
          <Clock className="w-6 h-6 text-aurora-yellow" />
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-polar-night">
              {t('actionRequired.title')}
            </h3>
            {timeRemaining && (
              <Badge variant={timeRemaining === 'Expired' ? 'error' : 'warning'}>
                {timeRemaining}
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary mb-4">
            {t('actionRequired.description')}
          </p>

          {actionError && (
            <div className="mb-4 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
              <p className="text-sm text-aurora-red">{actionError}</p>
            </div>
          )}

          {!showAcceptModal && !showDeclineModal && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setShowAcceptModal(true);
                  setShowDeclineModal(false);
                  setActionError(null);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('actionRequired.acceptOrder')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeclineModal(true);
                  setShowAcceptModal(false);
                  setActionError(null);
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t('actionRequired.declineOrder')}
              </Button>
            </div>
          )}

          {/* Accept form */}
          {showAcceptModal && (
            <div className="p-4 bg-snow-white border border-border rounded-lg">
              <h4 className="font-semibold text-polar-night mb-3">
                {t('acceptModal.title')}
              </h4>
              {shippingMethod === 't2t' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('acceptModal.parcelSizeLabel')}
                  </label>
                  <p className="text-xs text-text-muted mb-3">
                    {t('acceptModal.parcelSizeHelp')}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PARCEL_SIZES.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => setSelectedParcelSize(size.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedParcelSize === size.value
                            ? 'border-frost-ice bg-frost-ice/10'
                            : 'border-border hover:border-frost-ice/50'
                        }`}
                      >
                        <span className="block font-semibold text-polar-night">
                          {size.label}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {size.dimensions}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleAcceptOrder}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('acceptModal.processing')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t('acceptModal.confirmAccept')}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAcceptModal(false);
                    setActionError(null);
                  }}
                  disabled={actionLoading}
                >
                  {t('acceptModal.cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Decline form */}
          {showDeclineModal && (
            <div className="p-4 bg-snow-white border border-border rounded-lg">
              <h4 className="font-semibold text-polar-night mb-3">
                {t('declineModal.title')}
              </h4>
              <p className="text-sm text-text-secondary mb-4">
                {t('declineModal.description')}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('declineModal.reasonLabel')}
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder={t('declineModal.reasonPlaceholder')}
                  className="w-full p-3 border border-border rounded-lg text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeclineOrder}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('declineModal.processing')}
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      {t('declineModal.declineAndRefund')}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeclineModal(false);
                    setActionError(null);
                    setDeclineReason('');
                  }}
                  disabled={actionLoading}
                >
                  {t('declineModal.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
