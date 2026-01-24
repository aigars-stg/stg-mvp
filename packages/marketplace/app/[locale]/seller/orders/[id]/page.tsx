/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import {
  Package,
  Time as Clock,
  CheckCircleAlt01 as CheckCircle2,
  CloseCircle as XCircle,
  RefreshCw as Loader2,
  AlertCircle,
  ArrowLeft,
  Truck,
  User,
  FileText,
  LinkExternal as ExternalLink,
  Chat as MessageSquare,
} from 'griddy-icons';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';

// Badge variant type for proper typing
type BadgeVariant = 'trust' | 'likeNew' | 'veryGood' | 'good' | 'acceptable' | 'forParts' | 'success' | 'warning' | 'error' | 'default' | 'outline';
import { TrackingEventsTimeline } from '@/components/shipping';
import { useSellerOrderDetail, PARCEL_SIZES } from '@/lib/hooks/useSellerOrderDetail';
import { formatDateTime } from '@/lib/date-utils';

export default function SellerOrderDetailPage({ params }: { params: { id: string } }) {
  const {
    order,
    loading,
    error,
    authLoading,
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
    timeRemaining,
    retryingLabel,
    retryError,
    handleAcceptOrder,
    handleDeclineOrder,
    handleRetryLabel,
    getStatusConfig,
  } = useSellerOrderDetail(params.id);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-aurora-red/10 border border-aurora-red/20 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-aurora-red font-medium">Error loading order</p>
                <p className="text-sm text-text-secondary mt-1">{error || 'Order not found'}</p>
                <Link href="/seller/orders">
                  <Button variant="ghost" size="sm" className="mt-3">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Orders
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusConfig(order.status);
  const StatusIcon = statusInfo.icon === 'Clock' ? Clock :
    statusInfo.icon === 'CheckCircle2' ? CheckCircle2 :
    statusInfo.icon === 'Truck' ? Truck :
    statusInfo.icon === 'Package' ? Package :
    statusInfo.icon === 'XCircle' ? XCircle :
    AlertCircle;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link href="/seller/orders">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night dark:text-snow-white">
              {order.order_number}
            </h1>
            <Badge variant={statusInfo.color as BadgeVariant}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-text-secondary">Buyer: {order.buyer_name}</p>
          <Link href={`/orders/${order.id}`} className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              View Order & Messages
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Action Required Card - For pending_seller orders */}
        {order.status === 'pending_seller' && (
          <div className="bg-aurora-yellow/10 border-2 border-aurora-yellow/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-aurora-yellow/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-aurora-yellow" />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold text-polar-night dark:text-snow-white">
                    Action Required
                  </h3>
                  {timeRemaining && (
                    <Badge variant={timeRemaining === 'Expired' ? 'error' : 'warning'}>
                      {timeRemaining}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Please accept or decline this order. You have 24 hours from when the order was placed to respond.
                  If you don&apos;t respond in time, the order will be automatically cancelled and the buyer will be refunded.
                </p>

                {actionError && (
                  <div className="mb-4 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                    <p className="text-sm text-aurora-red">{actionError}</p>
                  </div>
                )}

                {!showAcceptModal && !showDeclineModal && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="accent"
                      onClick={() => {
                        setShowAcceptModal(true);
                        setShowDeclineModal(false);
                        setActionError(null);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept Order
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
                      Decline Order
                    </Button>
                  </div>
                )}

                {/* Accept Modal Inline */}
                {showAcceptModal && (
                  <div className="p-4 bg-snow-white dark:bg-polar-night border border-border rounded-lg">
                    <h4 className="font-semibold text-polar-night dark:text-snow-white mb-3">
                      Confirm Accept Order
                    </h4>

                    {order.shipping_method === 't2t' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Select Parcel Size *
                        </label>
                        <p className="text-xs text-text-muted mb-3">
                          Choose the size that fits your packaged game(s). This is required for generating the shipping label.
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
                              <span className="block font-semibold text-polar-night dark:text-snow-white">
                                {size.label}
                              </span>
                              <span className="block text-xs text-text-muted">{size.dimensions}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.shipping_method === 'local_pickup' && (
                      <p className="text-sm text-text-secondary mb-4">
                        By accepting, you agree to coordinate pickup with the buyer in {order.pickup_city}.
                        Please use the chat feature to arrange a meeting time and location.
                      </p>
                    )}

                    <div className="flex gap-3">
                      <Button
                        variant="accent"
                        onClick={handleAcceptOrder}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirm Accept
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
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Decline Modal Inline */}
                {showDeclineModal && (
                  <div className="p-4 bg-snow-white dark:bg-polar-night border border-border rounded-lg">
                    <h4 className="font-semibold text-polar-night dark:text-snow-white mb-3">
                      Decline Order
                    </h4>
                    <p className="text-sm text-text-secondary mb-4">
                      Are you sure you want to decline this order? The buyer will be automatically refunded.
                    </p>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Reason (optional)
                      </label>
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="e.g., Item is no longer available, damaged, etc."
                        className="w-full p-3 border border-border rounded-lg text-sm resize-none dark:bg-polar-night-light dark:text-snow-white"
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
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline & Refund
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
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Label Generation Failed Card - For T2T Orders without label */}
        {order.shipping_method === 't2t' && order.status === 'accepted' && !order.label_url && (
          <div className="bg-aurora-red/10 border-2 border-aurora-red/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-aurora-red/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-aurora-red" />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-polar-night dark:text-snow-white mb-1">
                  Shipping Label Not Generated
                </h3>
                <p className="text-sm text-text-secondary mb-2">
                  There was an error generating your shipping label. Please try again.
                </p>
                {order.label_error && (
                  <p className="text-sm text-aurora-red mb-4 p-2 bg-aurora-red/10 rounded">
                    Error: {order.label_error}
                  </p>
                )}
                {retryError && (
                  <p className="text-sm text-aurora-red mb-4 p-2 bg-aurora-red/10 rounded">
                    Retry failed: {retryError}
                  </p>
                )}
                <Button
                  variant="accent"
                  onClick={handleRetryLabel}
                  disabled={retryingLabel}
                >
                  {retryingLabel ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Label...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Retry Label Generation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Shipping Label Card - For T2T Orders */}
        {order.shipping_method === 't2t' && order.status === 'accepted' && order.label_url && (
          <div className="bg-frost-ice/10 border-2 border-frost-ice/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-frost-ice/20 flex items-center justify-center flex-shrink-0">
                <Truck className="w-6 h-6 text-frost-ice" />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-polar-night dark:text-snow-white mb-1">
                  Ready to Ship
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Your parcel has been registered with Unisend. Follow these steps to ship:
                </p>

                {/* Parcel ID - Main focus */}
                <div className="mb-4 p-4 bg-snow-white dark:bg-polar-night rounded-lg border-2 border-frost-ice">
                  <p className="text-xs text-text-secondary mb-1">Your Parcel ID</p>
                  <p className="font-mono text-2xl font-bold text-frost-ice">
                    {order.unisend_parcel_id || order.label_url?.replace('unisend://terminal/', '') || order.barcode}
                  </p>
                </div>

                {/* Instructions */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">1</div>
                    <p className="text-sm text-text-secondary">
                      Go to your nearest <strong className="text-polar-night dark:text-snow-white">Unisend terminal</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">2</div>
                    <p className="text-sm text-text-secondary">
                      Enter the <strong className="text-polar-night dark:text-snow-white">Parcel ID</strong> above at the terminal screen
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">3</div>
                    <p className="text-sm text-text-secondary">
                      <strong className="text-polar-night dark:text-snow-white">Print the label</strong> at the terminal and attach it to your parcel
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">4</div>
                    <p className="text-sm text-text-secondary">
                      <strong className="text-polar-night dark:text-snow-white">Place the parcel</strong> in the locker opened by the terminal
                    </p>
                  </div>
                </div>

                {/* Only show tracking button when barcode is assigned (after printing at terminal) */}
                {order.barcode && order.tracking_url && (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Track Package
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shipping Information */}
        <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night dark:text-snow-white mb-4">Shipping Information</h2>
          <div className="space-y-3">
            {order.shipping_method === 't2t' ? (
              <>
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-frost-ice mt-0.5" />
                  <div>
                    <p className="font-medium text-polar-night dark:text-snow-white">Terminal-to-Terminal Shipping</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {order.destination_terminal_name}
                    </p>
                    <p className="text-sm text-text-muted">{order.destination_terminal_address}</p>
                    {order.parcel_size && (
                      <p className="text-sm text-text-secondary mt-2">
                        Parcel Size: <span className="font-medium">{order.parcel_size}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="pl-8 space-y-2 text-sm">
                  <div>
                    <p className="text-text-secondary">Receiver:</p>
                    <p className="font-medium">{order.receiver_name}</p>
                    <p className="text-text-secondary">{order.receiver_phone}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-frost-ice mt-0.5" />
                  <div>
                    <p className="font-medium text-polar-night dark:text-snow-white">Local Pickup</p>
                    <p className="text-sm text-text-secondary mt-1">{order.pickup_city}</p>
                    {order.pickup_notes && (
                      <p className="text-sm text-text-muted mt-2">{order.pickup_notes}</p>
                    )}
                  </div>
                </div>
                <div className="pl-8 space-y-2 text-sm">
                  <div>
                    <p className="text-text-secondary">Buyer Contact:</p>
                    <p className="font-medium">{order.buyer_name}</p>
                    <p className="text-text-secondary">{order.buyer_phone}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tracking Events - For T2T Orders with tracking */}
        {order.shipping_method === 't2t' && order.tracking_events && order.tracking_events.length > 0 && (
          <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-6">
            <TrackingEventsTimeline
              events={order.tracking_events}
              title="Tracking History"
            />
          </div>
        )}

        {/* Order Items */}
        <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night dark:text-snow-white mb-4">
            Order Items ({order.order_items.length})
          </h2>
          <div className="space-y-4">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex gap-4 pb-4 border-b border-border-subtle last:border-0 last:pb-0">
                <div className="w-16 h-16 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.game_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-text-muted" />
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-polar-night dark:text-snow-white mb-2">{item.game_name}</h3>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.condition as ListingCondition} size="sm">
                      {getConditionLabel(item.condition as ListingCondition)}
                    </Badge>
                    <span className="text-lg font-semibold text-polar-night dark:text-snow-white">
                      €{item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night dark:text-snow-white mb-4">Pricing Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Items Total:</span>
              <span className="font-medium">€{order.items_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Shipping Cost:</span>
              <span className="font-medium">€{order.shipping_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Platform Service Fee:</span>
              <span className="font-medium text-aurora-red">-€{order.service_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border-subtle">
              <span className="font-semibold text-polar-night dark:text-snow-white">You Receive:</span>
              <span className="text-xl font-bold text-aurora-green">
                €{(order.items_total + order.shipping_cost).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night dark:text-snow-white mb-4">Order Timeline</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-frost-ice mt-2" />
              <div>
                <p className="font-medium text-polar-night dark:text-snow-white">Order Placed</p>
                <p className="text-sm text-text-secondary">
                  {formatDateTime(order.created_at)}
                </p>
              </div>
            </div>
            {order.paid_at && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-frost-ice mt-2" />
                <div>
                  <p className="font-medium text-polar-night dark:text-snow-white">Payment Received</p>
                  <p className="text-sm text-text-secondary">
                    {formatDateTime(order.paid_at)}
                  </p>
                </div>
              </div>
            )}
            {order.seller_responded_at && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-aurora-green mt-2" />
                <div>
                  <p className="font-medium text-polar-night dark:text-snow-white">Order Accepted</p>
                  <p className="text-sm text-text-secondary">
                    {formatDateTime(order.seller_responded_at)}
                  </p>
                </div>
              </div>
            )}
            {order.label_generated_at && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-aurora-green mt-2" />
                <div>
                  <p className="font-medium text-polar-night dark:text-snow-white">Shipping Label Generated</p>
                  <p className="text-sm text-text-secondary">
                    {formatDateTime(order.label_generated_at)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
