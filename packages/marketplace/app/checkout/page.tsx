'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import {
  Package,
  MapPin,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Truck,
  User,
  Mail,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { TerminalSelector } from '@/components/checkout/TerminalSelector';
import { PhoneInput, validatePhone } from '@/components/checkout/PhoneInput';
import { ReservationTimer } from '@/components/checkout/ReservationTimer';
import type { Terminal, TerminalCountry } from '@/lib/unisend/types';
import { getShippingPrice } from '@/lib/unisend/types';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { calculateMarketplacePricing, formatCentsToCurrency } from '@/lib/stripe-utils';

interface CartItem {
  item_id: string;
  listing_id: string;
  bgg_game_id: number;
  game_name: string;
  price: number;
  photo_url: string | null;
  condition: string;
  expires_at: string;
  is_expired: boolean;
}

interface CartBasket {
  basket_id: string;
  seller_id: string;
  seller_name: string;
  seller_country: string | null;
  items: CartItem[];
  item_count: number;
  subtotal: number;
}

interface SellerShippingInfo {
  shipping_local_pickup: boolean;
  pickup_city: string | null;
}

type ShippingMethod = 't2t' | 'local_pickup';

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const basketId = searchParams.get('basket');
  const { user, profile, updateProfile, loading: authLoading } = useAuth();

  // Data state
  const [basket, setBasket] = useState<CartBasket | null>(null);
  const [sellerShipping, setSellerShipping] = useState<SellerShippingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Shipping method selection
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('t2t');

  // T2T options
  const [selectedCountry, setSelectedCountry] = useState<TerminalCountry>('LT');
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

  // Contact info (for T2T)
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [savePhone, setSavePhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/cart');
    }
  }, [user, authLoading, router]);

  // Fetch basket, seller shipping info, and user profile
  useEffect(() => {
    const fetchData = async () => {
      if (!basketId || !user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch cart/basket
        const cartResponse = await fetch('/api/cart');
        const cartData = await cartResponse.json();

        if (!cartResponse.ok) {
          throw new Error(cartData.error || 'Failed to fetch cart');
        }

        const foundBasket = cartData.baskets?.find(
          (b: CartBasket) => b.basket_id === basketId
        );

        if (!foundBasket) {
          throw new Error('Basket not found');
        }

        // Check for expired items
        const hasExpiredItems = foundBasket.items.some((item: CartItem) => item.is_expired);
        if (hasExpiredItems) {
          throw new Error('Some items in your cart have expired. Please return to cart.');
        }

        setBasket(foundBasket);

        // Fetch seller's shipping options
        // Get first listing ID to fetch seller's shipping preferences
        const firstListingId = foundBasket.items[0]?.listing_id;
        if (firstListingId) {
          const listingResponse = await fetch(`/api/listings/${firstListingId}`);
          if (listingResponse.ok) {
            const listingData = await listingResponse.json();
            setSellerShipping({
              shipping_local_pickup: listingData.shipping_local_pickup || false,
              pickup_city: listingData.pickup_city || null,
            });
          }
        }

        // Prefill contact info from profile
        if (profile) {
          setReceiverName(profile.full_name || '');
          setReceiverEmail(profile.email || user.email || '');
          setReceiverPhone(profile.phone || '');

          // Set default country from user profile or seller
          const userCountry = profile.country;
          if (userCountry && ['LT', 'LV', 'EE'].includes(userCountry)) {
            setSelectedCountry(userCountry as TerminalCountry);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load checkout');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [basketId, user, profile]);

  // Validate phone when it changes
  useEffect(() => {
    if (shippingMethod === 't2t' && receiverPhone) {
      if (!validatePhone(receiverPhone, selectedCountry)) {
        setPhoneError('Please enter a valid phone number for the selected country');
      } else {
        setPhoneError(null);
      }
    } else {
      setPhoneError(null);
    }
  }, [receiverPhone, selectedCountry, shippingMethod]);

  // Calculate pricing
  const sellerCountry = (basket?.seller_country || 'LT') as TerminalCountry;
  const shippingPrice = shippingMethod === 't2t'
    ? getShippingPrice(sellerCountry, selectedCountry, 'M')
    : 0;

  const pricing = basket
    ? calculateMarketplacePricing(basket.subtotal, shippingPrice, shippingMethod)
    : null;

  // Validation
  const isValid =
    basket &&
    (shippingMethod === 'local_pickup'
      ? true // Local pickup requires no additional info
      : selectedTerminal !== null &&
      receiverName.trim().length > 0 &&
      receiverEmail.trim().length > 0 &&
      receiverPhone.length > 0 &&
      !phoneError);

  // Handle payment
  const handlePayment = async () => {
    if (!isValid || !basket || !pricing) return;

    try {
      setSubmitting(true);
      setError(null);

      // If saving phone, update profile first
      if (shippingMethod === 't2t' && savePhone && receiverPhone) {
        try {
          await updateProfile({ phone: receiverPhone });
        } catch (err) {
          console.error('Failed to save phone:', err);
        }
      }

      // Prepare checkout session data
      const sessionData: any = {
        basketId: basket.basket_id,
        shippingMethod,
      };

      // Add T2T specific data
      if (shippingMethod === 't2t' && selectedTerminal) {
        sessionData.destinationCountry = selectedCountry;
        sessionData.destinationTerminalId = selectedTerminal.id;
        sessionData.destinationTerminalName = selectedTerminal.name;
        sessionData.destinationTerminalAddress = selectedTerminal.address;
        sessionData.receiverName = receiverName;
        sessionData.receiverPhone = receiverPhone;
        sessionData.receiverEmail = receiverEmail;
      }

      // Add local pickup specific data
      if (shippingMethod === 'local_pickup' && sellerShipping) {
        sessionData.pickupCity = sellerShipping.pickup_city || '';
        sessionData.pickupNotes = '';
      }

      // Create Stripe Checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to process payment. Please try again.'
      );
      setSubmitting(false);
    }
  };

  // Handle expired item
  const handleItemExpired = async (listingId: string) => {
    try {
      await fetch(`/api/cart?listingId=${listingId}`, { method: 'DELETE' });
      router.push('/cart');
    } catch (err) {
      console.error('Error removing expired item:', err);
      router.push('/cart');
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!user || !basket || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {error || 'Unable to load checkout'}
          </h2>
          <Link href="/cart">
            <Button variant="primary">Return to Cart</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
            <Link href="/cart" className="hover:text-frost-ice">
              Cart
            </Link>
            <span>/</span>
            <span className="text-polar-night font-medium">Checkout</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">Checkout</h1>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            Order from {basket.seller_name}
            {basket.seller_country && (
              <span
                className={`${getCountryFlag(basket.seller_country)} ml-2`}
                title={getCountryName(basket.seller_country)}
              />
            )}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Shipping Method Selection */}
            <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-polar-night mb-4">
                1. Choose Shipping Method
              </h2>

              <div className="space-y-3" role="radiogroup" aria-label="Shipping method selection">
                {/* T2T Option */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={shippingMethod === 't2t'}
                  onClick={() => setShippingMethod('t2t')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShippingMethod('t2t');
                    }
                  }}
                  className={`
                    w-full text-left p-4 sm:p-5 rounded-lg border-2 transition-all
                    ${shippingMethod === 't2t'
                      ? 'border-frost-ice bg-frost-ice/5 ring-2 ring-frost-ice/20'
                      : 'border-border hover:border-frost-ice/50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${shippingMethod === 't2t'
                        ? 'bg-frost-ice text-snow-white'
                        : 'bg-bg-secondary text-text-muted'
                        }`}
                      aria-hidden="true"
                    >
                      <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-polar-night">
                          Parcel Terminal (Unisend)
                        </span>
                        <Badge variant="trust" size="sm">
                          Recommended
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        Pick up at a convenient parcel locker near you. Fast and
                        secure delivery within 1-3 business days.
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-polar-night">
                        €{shippingPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Local Pickup Option */}
                {sellerShipping?.shipping_local_pickup && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={shippingMethod === 'local_pickup'}
                    onClick={() => setShippingMethod('local_pickup')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShippingMethod('local_pickup');
                      }
                    }}
                    className={`
                      w-full text-left p-4 sm:p-5 rounded-lg border-2 transition-all
                      ${shippingMethod === 'local_pickup'
                        ? 'border-frost-ice bg-frost-ice/5 ring-2 ring-frost-ice/20'
                        : 'border-border hover:border-frost-ice/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${shippingMethod === 'local_pickup'
                          ? 'bg-frost-ice text-snow-white'
                          : 'bg-bg-secondary text-text-muted'
                          }`}
                        aria-hidden="true"
                      >
                        <User className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <span className="font-medium text-polar-night">
                          Local Pickup
                        </span>
                        <p className="text-sm text-text-secondary mt-1">
                          Meet the seller in person. Coordinate pickup details via
                          messaging after purchase.
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-aurora-green">Free</span>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* T2T: Terminal Selection */}
            {shippingMethod === 't2t' && (
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-polar-night mb-4">
                  2. Select Pickup Terminal
                </h2>
                <TerminalSelector
                  country={selectedCountry}
                  onCountryChange={setSelectedCountry}
                  selectedTerminal={selectedTerminal}
                  onSelect={setSelectedTerminal}
                />
              </div>
            )}

            {/* Local Pickup: Areas */}
            {shippingMethod === 'local_pickup' && sellerShipping?.pickup_city && (
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-polar-night mb-4">
                  2. Pickup Location
                </h2>
                <div className="flex items-start gap-3 p-3 bg-bg-elevated rounded-lg">
                  <MapPin className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-polar-night">
                      Seller accepts pickup in:
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      {sellerShipping.pickup_city}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-frost-ice/10 border border-frost-ice/20 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary">
                      After payment, you'll arrange the exact meeting location with
                      the seller via in-app messaging.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* T2T: Contact Information */}
            {shippingMethod === 't2t' && (
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-polar-night mb-4">
                  3. Contact Information
                </h2>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="receiver-name" className="block text-sm font-medium text-polar-night mb-2">
                      Full Name <span className="text-aurora-red">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
                      <input
                        id="receiver-name"
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="Your full name"
                        required
                        aria-required="true"
                        className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-lg border border-border bg-bg-primary text-polar-night placeholder-text-muted focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none transition-all min-h-[48px]"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="receiver-email" className="block text-sm font-medium text-polar-night mb-2">
                      Email <span className="text-aurora-red">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
                      <input
                        id="receiver-email"
                        type="email"
                        value={receiverEmail}
                        onChange={(e) => setReceiverEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        aria-required="true"
                        aria-describedby="email-hint"
                        className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-lg border border-border bg-bg-primary text-polar-night placeholder-text-muted focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none transition-all min-h-[48px]"
                      />
                    </div>
                    <p id="email-hint" className="text-xs text-text-muted mt-1">
                      Order updates and tracking info will be sent here
                    </p>
                  </div>

                  {/* Phone */}
                  <PhoneInput
                    country={selectedCountry}
                    value={receiverPhone}
                    onChange={setReceiverPhone}
                    error={phoneError || undefined}
                    required
                  />

                  {/* Save Phone Checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-bg-elevated transition-colors">
                    <input
                      type="checkbox"
                      checked={savePhone}
                      onChange={(e) => setSavePhone(e.target.checked)}
                      className="mt-0.5 w-6 h-6 rounded border-border text-frost-ice focus:ring-frost-ice focus:ring-offset-0"
                      aria-label="Save phone number for future orders"
                    />
                    <div className="flex-grow">
                      <span className="text-sm font-medium text-polar-night">
                        Save phone number for future orders
                      </span>
                      <p className="text-xs text-text-muted mt-0.5">
                        We'll remember your phone number for faster checkout next
                        time
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-polar-night mb-4">
                  Order Summary
                </h3>

                {/* Items */}
                <div className="space-y-3 pb-4 border-b border-border-subtle">
                  {basket.items.map((item) => (
                    <div key={item.item_id} className="flex gap-3">
                      <div className="w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.photo_url ? (
                          <img
                            src={item.photo_url}
                            alt={item.game_name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-text-muted" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-polar-night line-clamp-1">
                          {item.game_name}
                        </p>
                        <p className="text-sm text-text-secondary">
                          €{item.price.toFixed(2)}
                        </p>
                        <div className="mt-1">
                          <ReservationTimer
                            expiresAt={item.expires_at}
                            onExpire={() => handleItemExpired(item.listing_id)}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                {pricing && (
                  <>
                    <div className="space-y-2 py-4 border-b border-border-subtle">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">
                          Subtotal ({basket.item_count} item
                          {basket.item_count !== 1 ? 's' : ''})
                        </span>
                        <span className="font-medium">
                          {formatCentsToCurrency(pricing.itemsTotalCents)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Shipping</span>
                        <span className="font-medium">
                          {shippingMethod === 'local_pickup' ? (
                            <span className="text-aurora-green">Free</span>
                          ) : (
                            formatCentsToCurrency(pricing.shippingCostCents)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Service fee</span>
                        <span className="font-medium">
                          {formatCentsToCurrency(pricing.serviceFeeCents)}
                        </span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between pt-4 pb-6">
                      <span className="font-semibold text-polar-night">Total</span>
                      <span className="text-xl font-bold text-polar-night">
                        {formatCentsToCurrency(pricing.totalChargeCents)}
                      </span>
                    </div>
                  </>
                )}

                {/* Pay Button */}
                <Button
                  variant="accent"
                  fullWidth
                  onClick={handlePayment}
                  disabled={!isValid || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Securely
                    </>
                  )}
                </Button>

                <Link href="/cart" className="block mt-3">
                  <Button variant="ghost" fullWidth>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Cart
                  </Button>
                </Link>

                {/* Info */}
                <div className="mt-4 p-3 bg-frost-ice/10 border border-frost-ice/20 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-text-secondary">
                      <p>
                        <strong className="text-polar-night">
                          Seller has 24 hours to accept
                        </strong>
                      </p>
                      <p className="mt-1">
                        If the seller doesn't respond, you'll receive a full refund
                        automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Sticky Bottom Bar (Outside Grid) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-snow-white border-t-2 border-border p-4 z-50 shadow-lg safe-area-inset-bottom">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-secondary">Total</span>
          {pricing && (
            <span className="text-xl font-bold text-polar-night">
              {formatCentsToCurrency(pricing.totalChargeCents)}
            </span>
          )}
        </div>
        <Button
          variant="accent"
          fullWidth
          onClick={handlePayment}
          disabled={!isValid || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Securely
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
