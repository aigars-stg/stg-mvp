/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import { Package, ArrowLeft, RefreshCw as Loader2, AlertCircle, Truck, User, Email as Mail, CreditCard, ShieldCheck, LocationPin as MapPin } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { TerminalSelectorWithMap } from '@/components/checkout/TerminalSelectorWithMap';
import { PhoneInput } from '@/components/common/PhoneInput';
import { isValidPhoneNumber } from '@/lib/phone-utils';
import { ReservationTimer } from '@/components/checkout/ReservationTimer';
import { CheckoutSection } from '@/components/checkout/CheckoutSection';
import type { Terminal, TerminalCountry } from '@/lib/unisend/types';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import type { CountryCode } from '@/lib/country-utils';
import { calculateBuyerPricing, formatCentsToCurrency, formatPrice } from '@/lib/services/pricing';
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';
import { useTranslations } from 'next-intl';

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

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const basketId = searchParams.get('basket');
  const { user, profile, updateProfile, loading: authLoading } = useAuth();
  const t = useTranslations('Checkout');

  // Data state
  const [basket, setBasket] = useState<CartBasket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Unified country context
  const [selectedCountry, setSelectedCountry] = useState<TerminalCountry>('LT');
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

  // Contact info
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [savePhone, setSavePhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Country gate
  const [countryLoading, setCountryLoading] = useState<CountryCode | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Section expansion state — only terminal starts expanded; others open via guided flow
  const [shippingExpanded, setShippingExpanded] = useState(false);
  const [terminalExpanded, setTerminalExpanded] = useState(true);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);

  const profileCountry = profile?.country;
  const hasValidCountry = profileCountry && ['LV', 'LT', 'EE'].includes(profileCountry);

  // Completion criteria
  const isTerminalComplete = selectedTerminal !== null;
  const isContactComplete =
    receiverName.trim().length > 0 &&
    receiverEmail.trim().length > 0 &&
    receiverPhone.length > 0 &&
    !phoneError;
  const isTermsComplete = termsAccepted;

  // Overall validation
  const isValid = basket && isTerminalComplete && isContactComplete && isTermsComplete;

  // Auto-collapse contact when user moves to another section
  const collapseContactIfComplete = useCallback(() => {
    if (isContactComplete && contactExpanded) {
      setContactExpanded(false);
    }
  }, [isContactComplete, contactExpanded]);

  // Unified country change handler
  const handleUnifiedCountryChange = useCallback((country: TerminalCountry) => {
    setSelectedCountry((prev) => {
      if (prev !== country) {
        // Reset terminal when country changes (terminals are country-specific)
        setSelectedTerminal(null);
        setTerminalExpanded(true);
      }
      return country;
    });
  }, []);

  // Geo-detect country if profile country is missing
  useEffect(() => {
    if (hasValidCountry || authLoading) return;

    fetch('/api/geo/detect')
      .then((res) => res.json())
      .then((data) => {
        if (data.detected && data.country && ['LV', 'LT', 'EE'].includes(data.country)) {
          setDetectedCountry(data.country);
        }
      })
      .catch(() => {});
  }, [hasValidCountry, authLoading]);

  const handleCountrySelect = async (country: CountryCode) => {
    if (countryLoading) return;
    setCountryLoading(country);
    try {
      await updateProfile({ country });
      if (['LT', 'LV', 'EE'].includes(country)) {
        setSelectedCountry(country as TerminalCountry);
      }
    } catch {
      setCountryLoading(null);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/cart');
    }
  }, [user, authLoading, router]);

  // Fetch basket and user profile
  useEffect(() => {
    const fetchData = async () => {
      if (!basketId || !user) return;

      try {
        setLoading(true);
        setError(null);

        const cartResponse = await fetch('/api/cart');
        const cartData = await cartResponse.json();

        if (!cartResponse.ok) {
          throw new Error(cartData.error || t('errors.fetchCartFailed'));
        }

        const foundBasket = cartData.baskets?.find(
          (b: CartBasket) => b.basket_id === basketId
        );

        if (!foundBasket) {
          throw new Error(t('errors.basketNotFound'));
        }

        const hasExpiredItems = foundBasket.items.some((item: CartItem) => item.is_expired);
        if (hasExpiredItems) {
          throw new Error(t('errors.expiredItems'));
        }

        setBasket(foundBasket);

        // Prefill contact info and set initial section states
        if (profile) {
          const name = profile.full_name || '';
          const email = profile.email || user.email || '';
          const phone = profile.phone || '';

          setReceiverName(name);
          setReceiverEmail(email);
          setReceiverPhone(phone);

          // Set default country from user profile
          const userCountry = profile.country;
          if (userCountry && ['LT', 'LV', 'EE'].includes(userCountry)) {
            setSelectedCountry(userCountry as TerminalCountry);
          }

          // If contact info is pre-filled and valid, start section collapsed
          const contactPrefilled =
            name.trim().length > 0 &&
            email.trim().length > 0 &&
            phone.length > 0 &&
            isValidPhoneNumber(phone);

          if (contactPrefilled) {
            setContactExpanded(false);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load checkout');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketId, user, profile]);

  // Validate phone when it changes
  useEffect(() => {
    if (receiverPhone) {
      if (!isValidPhoneNumber(receiverPhone)) {
        setPhoneError(t('form.phoneError'));
      } else {
        setPhoneError(null);
      }
    } else {
      setPhoneError(null);
    }
  }, [receiverPhone, t]);

  // --- Auto-collapse effects (500ms delay) ---

  // Terminal: collapse after selection (only when terminal value changes)
  useEffect(() => {
    if (selectedTerminal) {
      const timer = setTimeout(() => setTerminalExpanded(false), 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerminal]);

  // Terms: collapse after accepted (only when checkbox toggles)
  useEffect(() => {
    if (termsAccepted) {
      const timer = setTimeout(() => setTermsExpanded(false), 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termsAccepted]);

  // --- Auto-expand effects (guided flow) ---

  // After terminal collapses → expand next incomplete section
  useEffect(() => {
    if (isTerminalComplete && !terminalExpanded) {
      if (!isContactComplete) {
        setContactExpanded(true);
      } else if (!isTermsComplete) {
        setTermsExpanded(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalExpanded]);

  // After contact collapses → expand terms if not accepted
  useEffect(() => {
    if (isContactComplete && !contactExpanded && !isTermsComplete) {
      setTermsExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactExpanded]);

  // Calculate pricing
  const itemsTotalCents = basket ? Math.round(basket.subtotal * 100) : 0;
  const shippingCostCents = Math.round(SHIPPING_COST_EUROS * 100);
  const pricing = basket
    ? calculateBuyerPricing(itemsTotalCents, shippingCostCents)
    : null;

  // Handle payment
  const handlePayment = async () => {
    if (!isValid || !basket || !pricing || !selectedTerminal) return;

    try {
      setSubmitting(true);
      setError(null);

      if (savePhone && receiverPhone) {
        try {
          await updateProfile({ phone: receiverPhone });
        } catch (err) {
          console.error('Failed to save phone:', err);
        }
      }

      const sessionData = {
        basketId: basket.basket_id,
        shippingMethod: 't2t',
        destinationCountry: selectedCountry,
        destinationTerminalId: selectedTerminal.id,
        destinationTerminalName: selectedTerminal.name,
        destinationTerminalAddress: selectedTerminal.address,
        receiverName,
        receiverPhone,
        receiverEmail,
      };

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.createSessionFailed'));
      }

      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        throw new Error(t('errors.noCheckoutUrl'));
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(
        err instanceof Error ? err.message : t('errors.paymentFailed')
      );
      setSubmitting(false);
    }
  };

  // Extend reservation for the basket
  const handleExtendReservation = async () => {
    if (!basket) return;
    const response = await fetch('/api/cart/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ basketId: basket.basket_id }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to extend reservation');
    }

    // Re-fetch basket to get updated expiry times
    const cartResponse = await fetch('/api/cart');
    const cartData = await cartResponse.json();
    const updatedBasket = cartData.baskets?.find(
      (b: CartBasket) => b.basket_id === basketId
    );
    if (updatedBasket) {
      setBasket(updatedBasket);
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
          <p className="text-text-secondary">{t('loading')}</p>
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
            {error || t('errorTitle')}
          </h2>
          <Link href="/cart">
            <Button variant="primary">{t('returnToCart')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
            <Link href="/cart" className="hover:text-frost-ice">
              {t('breadcrumb.cart')}
            </Link>
            <span>/</span>
            <span className="text-polar-night font-medium">{t('breadcrumb.checkout')}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">{t('title')}</h1>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            {t('orderFrom', { sellerName: basket.seller_name })}
            {basket.seller_country && (
              <span
                className={`${getCountryFlag(basket.seller_country)} ml-2`}
                title={getCountryName(basket.seller_country)}
              />
            )}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Country Gate — shown when profile country is not set */}
            {!hasValidCountry && (
              <div className="bg-snow-white border-2 border-aurora-orange/30 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-aurora-orange/10">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-aurora-orange" />
                  </div>
                  <div className="flex-grow">
                    <h2 className="font-semibold text-polar-night text-lg">
                      {t('country.title')}
                    </h2>
                    <p className="text-sm text-text-secondary mt-1 mb-4">
                      {t('country.subtitle')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['LV', 'EE', 'LT'] as CountryCode[]).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => handleCountrySelect(code)}
                          disabled={countryLoading !== null}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all disabled:opacity-50 ${
                            detectedCountry === code
                              ? 'border-aurora-orange bg-aurora-orange/10 hover:bg-aurora-orange/20'
                              : 'border-border bg-snow-white hover:border-frost-ice/40 hover:bg-frost-ice/5'
                          }`}
                        >
                          {countryLoading === code ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className={getCountryFlag(code)} />
                          )}
                          <span>{getCountryName(code)}</span>
                          {detectedCountry === code && (
                            <span className="text-xs text-aurora-orange font-normal">
                              {t('country.detected')}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rest of checkout form — hidden until country is set */}
            {!hasValidCountry ? null : (<>

            {/* Shipping Info */}
            <CheckoutSection
              title={t('shipping.title')}
              icon={<Truck className="w-5 h-5 sm:w-6 sm:h-6 text-frost-ice" />}
              isExpanded={shippingExpanded}
              onToggle={() => setShippingExpanded(!shippingExpanded)}
              collapsedSummary={
                <span>{t('shipping.summaryLine')} &mdash; {formatPrice(SHIPPING_COST_EUROS)}</span>
              }
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  {t('shipping.description')}
                </p>
                <span className="font-bold text-polar-night text-lg flex-shrink-0 ml-4">
                  {formatPrice(SHIPPING_COST_EUROS)}
                </span>
              </div>
            </CheckoutSection>

            {/* Terminal Selection */}
            <CheckoutSection
              stepNumber={1}
              title={t('collapse.selectTerminal')}
              icon={<MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-frost-ice" />}
              isComplete={isTerminalComplete}
              isExpanded={terminalExpanded}
              onToggle={() => { if (!terminalExpanded) collapseContactIfComplete(); setTerminalExpanded(!terminalExpanded); }}
              required
              completeLabel={t('collapse.complete')}
              requiredLabel={t('collapse.required')}
              collapsedSummary={
                selectedTerminal ? (
                  <span>
                    {selectedTerminal.name} &mdash; {selectedTerminal.address}, {selectedTerminal.city}
                  </span>
                ) : (
                  <span className="text-text-muted">{t('collapse.terminalPrompt')}</span>
                )
              }
            >
              <TerminalSelectorWithMap
                country={selectedCountry}
                onCountryChange={handleUnifiedCountryChange}
                selectedTerminal={selectedTerminal}
                onSelect={setSelectedTerminal}
              />
            </CheckoutSection>

            {/* Contact Information */}
            <CheckoutSection
              stepNumber={2}
              title={t('collapse.contactInfo')}
              icon={<User className="w-5 h-5 sm:w-6 sm:h-6 text-frost-ice" />}
              isComplete={isContactComplete}
              isExpanded={contactExpanded}
              onToggle={() => setContactExpanded(!contactExpanded)}
              required
              completeLabel={t('collapse.complete')}
              requiredLabel={t('collapse.required')}
              collapsedSummary={
                isContactComplete ? (
                  <span>{receiverName} &middot; {receiverEmail} &middot; {receiverPhone}</span>
                ) : (
                  <span className="text-text-muted">{t('collapse.contactPrompt')}</span>
                )
              }
            >
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="receiver-name" className="block text-sm font-medium text-polar-night mb-2">
                    {t('form.fullName')} <span className="text-aurora-red">{t('form.required')}</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
                    <input
                      id="receiver-name"
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder={t('form.namePlaceholder')}
                      required
                      aria-required="true"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-lg border border-border bg-bg-primary text-polar-night placeholder-text-muted focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none transition-all min-h-[48px]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="receiver-email" className="block text-sm font-medium text-polar-night mb-2">
                    {t('form.email')} <span className="text-aurora-red">{t('form.required')}</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
                    <input
                      id="receiver-email"
                      type="email"
                      value={receiverEmail}
                      onChange={(e) => setReceiverEmail(e.target.value)}
                      placeholder={t('form.emailPlaceholder')}
                      required
                      aria-required="true"
                      aria-describedby="email-hint"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-lg border border-border bg-bg-primary text-polar-night placeholder-text-muted focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none transition-all min-h-[48px]"
                    />
                  </div>
                  <p id="email-hint" className="text-xs text-text-muted mt-1">
                    {t('form.emailHint')}
                  </p>
                </div>

                {/* Phone */}
                <PhoneInput
                  value={receiverPhone}
                  onChange={setReceiverPhone}
                  error={phoneError || undefined}
                  required
                  defaultCountry={(profileCountry && ['LV', 'LT', 'EE'].includes(profileCountry) ? profileCountry : 'LV') as CountryCode}
                  id="receiver-phone"
                />

                {/* Save Phone Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-bg-elevated transition-colors">
                  <input
                    type="checkbox"
                    checked={savePhone}
                    onChange={(e) => setSavePhone(e.target.checked)}
                    className="mt-0.5 w-6 h-6 rounded border-border text-frost-ice focus:ring-frost-ice focus:ring-offset-0"
                    aria-label={t('form.savePhone')}
                  />
                  <div className="flex-grow">
                    <span className="text-sm font-medium text-polar-night">
                      {t('form.savePhone')}
                    </span>
                    <p className="text-xs text-text-muted mt-0.5">
                      {t('form.savePhoneHint')}
                    </p>
                  </div>
                </label>
              </div>
            </CheckoutSection>

            {/* Terms & Conditions — EveryPay Req 19-20 */}
            <CheckoutSection
              stepNumber={3}
              title={t('collapse.termsConsent')}
              icon={<ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-frost-ice" />}
              isComplete={isTermsComplete}
              isExpanded={termsExpanded}
              onToggle={() => { if (!termsExpanded) collapseContactIfComplete(); setTermsExpanded(!termsExpanded); }}
              required
              completeLabel={t('collapse.complete')}
              requiredLabel={t('collapse.required')}
              collapsedSummary={
                termsAccepted ? (
                  <span>{t('collapse.termsAccepted')}</span>
                ) : (
                  <span className="text-text-muted">{t('collapse.termsPrompt')}</span>
                )
              }
            >
              {/* Refund policy summary */}
              <div className="mb-4 p-3 bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-lg">
                <p className="text-sm font-medium text-polar-night mb-2">
                  <ShieldCheck className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-aurora-yellow" />
                  {t('consent.refundSummaryTitle')}
                </p>
                <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside ml-1">
                  <li>{t('consent.refundPoint1')}</li>
                  <li>{t('consent.refundPoint2')}</li>
                  <li>{t('consent.refundPoint3')}</li>
                  <li>{t('consent.refundPoint4')}</li>
                </ul>
              </div>

              {/* Consent checkbox */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-bg-elevated transition-colors">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-6 h-6 rounded border-border text-frost-ice focus:ring-frost-ice focus:ring-offset-0"
                  aria-required="true"
                />
                <span className="text-sm text-polar-night">
                  {t('consent.checkboxPrefix')}{' '}
                  <Link href="/legal?section=terms" target="_blank" className="text-frost-ice underline hover:text-frost-iceDark">
                    {t('consent.termsLink')}
                  </Link>
                  {' '}{t('consent.and')}{' '}
                  <Link href="/legal?section=buyer" target="_blank" className="text-frost-ice underline hover:text-frost-iceDark">
                    {t('consent.refundLink')}
                  </Link>
                </span>
              </label>
            </CheckoutSection>
            </>)}
          </div>

          {/* Order Summary Sidebar (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-polar-night mb-4">
                  {t('summary.title')}
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
                          {formatPrice(item.price)}
                        </p>
                        <div className="mt-1">
                          <ReservationTimer
                            expiresAt={item.expires_at}
                            onExpire={() => handleItemExpired(item.listing_id)}
                            onExtend={handleExtendReservation}
                            canExtend
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
                          {t('summary.subtotal', { count: basket.item_count })}
                        </span>
                        <span className="font-medium">
                          {formatCentsToCurrency(pricing.itemsTotalCents)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">{t('summary.shipping')}</span>
                        <span className="font-medium">
                          {formatCentsToCurrency(pricing.shippingCostCents)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 pb-6">
                      <span className="font-semibold text-polar-night">{t('summary.total')}</span>
                      <span className="text-xl font-bold text-polar-night">
                        {formatCentsToCurrency(pricing.totalChargeCents)}
                      </span>
                    </div>
                  </>
                )}

                {/* Merchant info — EveryPay Req 17 */}
                <div className="text-xs text-text-muted pb-4 border-b border-border-subtle mb-4">
                  <p className="font-medium text-text-secondary mb-0.5">{t('merchant.label')}</p>
                  <p>Second Turn Games SIA</p>
                  <p>Evalda Valtera 5-35, Riga, LV-1021, Latvia</p>
                </div>

                {/* Pay Button */}
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handlePayment}
                  disabled={!isValid || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('actions.processing')}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t('actions.paySecurely')}
                    </>
                  )}
                </Button>

                <Link href="/cart" className="block mt-3">
                  <Button variant="ghost" fullWidth>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('actions.backToCart')}
                  </Button>
                </Link>

                {/* Info */}
                <div className="mt-4 p-3 bg-frost-ice/10 border border-frost-ice/20 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-text-secondary">
                      <p>
                        <strong className="text-polar-night">
                          {t('info.sellerDeadline')}
                        </strong>
                      </p>
                      <p className="mt-1">
                        {t('info.refundPolicy')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Sticky Bottom Bar — hidden until country is set */}
      {hasValidCountry && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-snow-white border-t-2 border-border p-4 z-50 shadow-lg safe-area-inset-bottom">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">{t('summary.total')}</span>
            {pricing && (
              <span className="text-xl font-bold text-polar-night">
                {formatCentsToCurrency(pricing.totalChargeCents)}
              </span>
            )}
          </div>
          {!termsAccepted && (
            <p className="text-xs text-aurora-red mb-2 text-center">
              {t('consent.pleaseAccept')}
            </p>
          )}
          <Button
            variant="primary"
            fullWidth
            onClick={handlePayment}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('actions.processing')}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {t('actions.paySecurely')}
              </>
            )}
          </Button>
        </div>
      )}
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
