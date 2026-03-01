/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Button, ResultPage } from '@second-turn/design-system';
import { ArrowLeft, RefreshCw as Loader2, AlertCircle, User, Email as Mail, CreditCard, Truck, LocationPin as MapPin } from '@/lib/icons';
import { InlineAlert } from '@/components/common/InlineAlert';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import { resolveListingImage } from '@/lib/utils/listing-image';
import { useAuth } from '@/lib/auth/AuthContext';
import { TerminalSelectorWithMap } from '@/components/checkout/TerminalSelectorWithMap';
import { PaymentMethodLogos } from '@/components/checkout/PaymentMethodLogos';
import { PhoneInput } from '@/components/common/PhoneInput';
import { isValidPhoneNumber } from '@/lib/phone-utils';
import { ReservationTimer } from '@/components/checkout/ReservationTimer';
import { CheckoutSection } from '@/components/checkout/CheckoutSection';
import { UserInfoCard } from '@/components/user/UserInfoCard';
import type { Terminal, TerminalCountry } from '@/lib/unisend/types';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import type { CountryCode } from '@/lib/country-utils';
import { calculateCheckoutPricing, formatCentsToCurrency, formatPrice } from '@/lib/services/pricing';
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';
import { useTranslations } from 'next-intl';

interface CartItem {
  item_id: string;
  listing_id: string;
  bgg_game_id: number;
  game_name: string;
  price: number;
  photo_url: string | null;
  photo_urls: string[];
  condition: string;
  expires_at: string;
  is_expired: boolean;
  language: string | null;
  version_name: string | null;
  publisher: string | null;
  edition_year: number | null;
  game_thumbnail: string | null;
  game_image: string | null;
  is_expansion: boolean;
  all_components_present: boolean;
}

interface CartBasket {
  basket_id: string;
  seller_id: string;
  seller_name: string;
  seller_country: string | null;
  seller_avatar_url: string | null;
  seller_rating: number;
  seller_review_count: number;
  seller_total_sales: number;
  items: CartItem[];
  item_count: number;
  subtotal: number;
}

function friendlyCheckoutError(error: string, t: ReturnType<typeof useTranslations<'Checkout'>>): string {
  if (error.includes('customer_url')) return t('errors.paymentUnavailableLocally');
  if (error.includes('amount')) return t('errors.invalidAmount');
  return t('errors.paymentFailed');
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
  // Initialise from ?error= URL param so EveryPay cancel/failure redirects back here inline
  const [error, setError] = useState<string | null>(() => searchParams.get('error'));
  const [submitting, setSubmitting] = useState(false);
  const [canExtendReservation, setCanExtendReservation] = useState(true);
  const [isExtending, setIsExtending] = useState(false);

  // Terminal selection (country derived from terminal or profile)
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

  // Contact info
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [savePhone, setSavePhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Wallet
  const [walletBalanceCents, setWalletBalanceCents] = useState(0);

  // Country gate
  const [countryLoading, setCountryLoading] = useState<CountryCode | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Preferred terminal auto-selection
  const [isPreferredTerminal, setIsPreferredTerminal] = useState(false);
  const [preferredTerminalLoaded, setPreferredTerminalLoaded] = useState(false);
  const terminalRestored = useRef(false);

  // Section expansion state — only terminal starts expanded; contact opens via guided flow
  const [terminalExpanded, setTerminalExpanded] = useState(true);
  const [contactExpanded, setContactExpanded] = useState(false);

  const profileCountry = profile?.country;
  const hasValidCountry = profileCountry && ['LV', 'LT', 'EE'].includes(profileCountry);

  // Derive default country for terminal selector and payment logos
  const defaultCountry: TerminalCountry = (
    hasValidCountry ? profileCountry
    : detectedCountry && ['LT', 'LV', 'EE'].includes(detectedCountry) ? detectedCountry
    : 'LV'
  ) as TerminalCountry;

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

  // Single basket-level reservation timer (earliest expiry across all items)
  const earliestExpiry = basket?.items.reduce<string | null>((earliest, item) => {
    if (!earliest) return item.expires_at;
    return new Date(item.expires_at) < new Date(earliest) ? item.expires_at : earliest;
  }, null) ?? null;

  // Restore terminal selection from sessionStorage (survives page navigation)
  useEffect(() => {
    if (terminalRestored.current || !basketId) return;
    terminalRestored.current = true;
    try {
      const stored = sessionStorage.getItem(`checkout_terminal_${basketId}`);
      if (stored) {
        const terminal = JSON.parse(stored) as Terminal;
        setSelectedTerminal(terminal);
        setPreferredTerminalLoaded(true); // skip preferred auto-select, user already chose
      }
    } catch { /* ignore parse errors */ }
  }, [basketId]);

  // Persist terminal selection to sessionStorage
  useEffect(() => {
    if (!basketId) return;
    if (selectedTerminal) {
      try {
        sessionStorage.setItem(`checkout_terminal_${basketId}`, JSON.stringify(selectedTerminal));
      } catch { /* ignore quota errors */ }
    }
  }, [basketId, selectedTerminal]);

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

  // Fetch wallet balance
  useEffect(() => {
    if (!user) return;
    fetch('/api/wallet/balance')
      .then(res => res.json())
      .then(data => {
        if (data.balanceCents > 0) setWalletBalanceCents(data.balanceCents);
      })
      .catch(() => {});
  }, [user]);

  const handleCountrySelect = async (country: CountryCode) => {
    if (countryLoading) return;
    setCountryLoading(country);
    try {
      await updateProfile({ country });
    } catch {
      setCountryLoading(null);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirectTo=/cart');
    }
  }, [user, authLoading, router]);

  // Fetch basket and user profile
  useEffect(() => {
    const fetchData = async () => {
      if (!basketId || !user) {
        setLoading(false);
        return;
      }

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

  // Auto-select preferred terminal from profile
  useEffect(() => {
    if (
      preferredTerminalLoaded ||
      loading ||
      !basket ||
      !profile?.preferred_terminal_id ||
      !profile?.preferred_delivery_country
    ) return;

    setPreferredTerminalLoaded(true);
    const country = profile.preferred_delivery_country as TerminalCountry;

    fetch(`/api/shipping/terminals?country=${country}`)
      .then((res) => res.json())
      .then((data: { terminals: Terminal[] }) => {
        const match = (data.terminals || []).find((term: Terminal) => term.id === profile.preferred_terminal_id);
        if (match) {
          setSelectedTerminal(match);
          setIsPreferredTerminal(true);
        }
      })
      .catch(() => {});
  }, [loading, basket, profile, preferredTerminalLoaded]);

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

  // Terminal: collapse after selection on mobile only (desktop stays expanded for map view)
  useEffect(() => {
    if (selectedTerminal && window.innerWidth < 1024) {
      const timer = setTimeout(() => setTerminalExpanded(false), 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerminal]);

  // --- Auto-expand effects (guided flow) ---

  // After terminal collapses → expand contact if incomplete
  useEffect(() => {
    if (isTerminalComplete && !terminalExpanded && !isContactComplete) {
      setContactExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalExpanded]);

  // Calculate pricing (with wallet applied)
  const itemsTotalCents = basket ? Math.round(basket.subtotal * 100) : 0;
  const shippingCostCents = Math.round(SHIPPING_COST_EUROS * 100);
  const pricing = basket
    ? calculateCheckoutPricing(itemsTotalCents, shippingCostCents, walletBalanceCents)
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

      // Save terminal as preferred if user doesn't have one yet
      if (!profile?.preferred_terminal_id) {
        updateProfile({
          preferred_terminal_id: selectedTerminal.id,
          preferred_terminal_name: selectedTerminal.name,
          preferred_terminal_address: `${selectedTerminal.address}, ${selectedTerminal.city}`,
          preferred_delivery_country: selectedTerminal.countryCode,
        }).catch(() => {}); // fire-and-forget
      }

      const sessionData = {
        basketId: basket.basket_id,
        shippingMethod: 't2t',
        destinationCountry: selectedTerminal.countryCode,
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
    setIsExtending(true);
    try {
      const response = await fetch('/api/cart/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basketId: basket.basket_id }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'No items can be extended') {
          setCanExtendReservation(false);
        } else {
          console.error('Failed to extend reservation:', data.error);
        }
        return;
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
    } catch (err) {
      console.error('Error extending reservation:', err);
    } finally {
      setIsExtending(false);
    }
  };

  // Handle expired item — redirect to cart which handles cleanup
  const handleItemExpired = useCallback(() => {
    router.push('/cart');
  }, [router]);

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

  // Error state — only when data is genuinely unavailable (payment errors stay inline)
  if (!user || !basket) {
    return (
      <ResultPage
        variant="error"
        icon={<AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />}
        title={t('errorTitle')}
      >
        <ResultPage.Actions>
          <Link href="/cart" className="block">
            <Button variant="primary" fullWidth>{t('returnToCart')}</Button>
          </Link>
        </ResultPage.Actions>
      </ResultPage>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-28 lg:pb-8">
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid lg:grid-cols-7 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-4 space-y-3 sm:space-y-4">
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

            {/* Terminal Selection */}
            <CheckoutSection
              title={t('collapse.selectTerminal')}
              icon={<Truck className="w-5 h-5 sm:w-6 sm:h-6 text-frost-ice" />}
              isComplete={isTerminalComplete}
              isExpanded={terminalExpanded}
              onToggle={() => setTerminalExpanded(!terminalExpanded)}
              completeLabel={t('collapse.complete')}
              collapsedSummary={
                selectedTerminal ? (
                  <span>
                    {selectedTerminal.name} &mdash; {selectedTerminal.address}, {selectedTerminal.city}
                    {isPreferredTerminal && (
                      <span className="block text-xs text-frost-ice mt-0.5">
                        {t('preferredTerminal.indicator')}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-text-muted">{t('collapse.terminalPrompt')}</span>
                )
              }
            >
              {!selectedTerminal && (
                <p className="text-sm text-text-secondary mb-3">
                  {t('collapse.terminalHint')}
                </p>
              )}
              <TerminalSelectorWithMap
                defaultCountry={defaultCountry}
                selectedTerminal={selectedTerminal}
                onSelect={(terminal) => {
                  setSelectedTerminal(terminal);
                  setIsPreferredTerminal(terminal.id === profile?.preferred_terminal_id);
                }}
              />
            </CheckoutSection>

            {/* Contact Information */}
            <CheckoutSection
              title={t('collapse.contactInfo')}
              icon={<User className="w-5 h-5 sm:w-6 sm:h-6 text-frost-ice" />}
              isComplete={isContactComplete}
              isExpanded={contactExpanded}
              onToggle={() => setContactExpanded(!contactExpanded)}
              completeLabel={t('collapse.complete')}
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

            {/* Mobile-only: Order Summary */}
            <div className="lg:hidden bg-snow-white border border-border rounded-xl overflow-hidden">
              {/* Header: seller + timer */}
              <div className="p-4 border-b border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    {t('summary.sellerLabel')}
                  </p>
                  {earliestExpiry && (
                    <ReservationTimer
                      expiresAt={earliestExpiry}
                      onExpire={handleItemExpired}
                      onExtend={handleExtendReservation}
                      canExtend={canExtendReservation}
                      isExtending={isExtending}
                      size="sm"
                    />
                  )}
                </div>
                <UserInfoCard
                  user={{
                    id: basket.seller_id,
                    name: basket.seller_name,
                    avatarUrl: basket.seller_avatar_url,
                    country: basket.seller_country,
                  }}
                  seller={{
                    totalSales: basket.seller_total_sales,
                    averageRating: basket.seller_rating,
                    totalReviews: basket.seller_review_count,
                  }}
                  size="sm"
                  compact
                  linkToProfile
                />
              </div>

              {/* Items */}
              <div className="p-4 space-y-3">
                {basket.items.map((item) => {
                  const displayImage = resolveListingImage({
                    gameImage: item.game_image,
                    gameThumbnail: item.game_thumbnail,
                    photoUrls: item.photo_urls,
                    photoUrl: item.photo_url,
                  });
                  return (
                    <div key={item.item_id} className="flex gap-3">
                      <ListingThumbnail src={displayImage} alt={item.game_name} size="sm" />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-polar-night line-clamp-1">
                            {item.game_name}
                          </p>
                          <span className="text-sm font-semibold text-polar-night flex-shrink-0">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pricing */}
              {pricing && (
                <div className="px-4 pb-4 space-y-1.5">
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
                  {pricing.walletDebitCents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">{t('summary.walletCredit')}</span>
                      <span className="font-medium text-aurora-green">
                        -{formatCentsToCurrency(pricing.walletDebitCents)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile-only: Inline Terms & Conditions */}
            <div className="lg:hidden bg-snow-white border border-border rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-bg-elevated transition-colors">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-6 h-6 rounded border-border text-frost-ice focus:ring-frost-ice focus:ring-offset-0"
                  aria-required="true"
                />
                <span className="text-xs text-polar-night">
                  {t('consent.checkboxPrefix')}{' '}
                  <Link href="/legal/terms" target="_blank" className="text-frost-ice underline hover:text-frost-iceDark">
                    {t('consent.termsLink')}
                  </Link>
                  {', '}
                  <Link href="/help/shipping" target="_blank" className="text-frost-ice underline hover:text-frost-iceDark">
                    {t('consent.deliveryLink')}
                  </Link>
                  {' '}{t('consent.and')}{' '}
                  <Link href="/legal/terms#6-disputes-returns-and-refunds" target="_blank" className="text-frost-ice underline hover:text-frost-iceDark">
                    {t('consent.returnsLink')}
                  </Link>
                </span>
              </label>
            </div>
            </>)}
          </div>

          {/* Order Summary Sidebar (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-3">
            <div>
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-polar-night">
                    {t('summary.title')}
                  </h3>
                  {earliestExpiry && (
                    <ReservationTimer
                      expiresAt={earliestExpiry}
                      onExpire={handleItemExpired}
                      onExtend={handleExtendReservation}
                      canExtend={canExtendReservation}
                      isExtending={isExtending}
                      size="sm"
                    />
                  )}
                </div>

                {/* Seller Profile */}
                <div className="pb-3 mb-3 border-b border-border-subtle">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                    {t('summary.sellerLabel')}
                  </p>
                  <UserInfoCard
                    user={{
                      id: basket.seller_id,
                      name: basket.seller_name,
                      avatarUrl: basket.seller_avatar_url,
                      country: basket.seller_country,
                    }}
                    seller={{
                      totalSales: basket.seller_total_sales,
                      averageRating: basket.seller_rating,
                      totalReviews: basket.seller_review_count,
                    }}
                    size="md"
                    linkToProfile
                  />
                </div>

                {/* Items */}
                <div className="space-y-3 pb-4 border-b border-border-subtle">
                  {basket.items.map((item) => {
                    const displayImage = resolveListingImage({
                      gameImage: item.game_image,
                      gameThumbnail: item.game_thumbnail,
                      photoUrls: item.photo_urls,
                      photoUrl: item.photo_url,
                    });
                    const metaParts = [
                      item.language?.replace(/, /g, ' / '),
                      item.edition_year,
                    ].filter(Boolean);

                    return (
                      <div key={item.item_id} className="flex gap-3">
                        <ListingThumbnail src={displayImage} alt={item.game_name} size="md" />
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-polar-night line-clamp-1">
                              {item.game_name}
                            </p>
                            <span className="text-sm font-semibold text-polar-night flex-shrink-0">
                              {formatPrice(item.price)}
                            </span>
                          </div>
                          {metaParts.length > 0 && (
                            <p className="text-xs text-text-secondary mt-0.5">
                              {metaParts.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                      {pricing.walletDebitCents > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">{t('summary.walletCredit')}</span>
                          <span className="font-medium text-aurora-green">
                            -{formatCentsToCurrency(pricing.walletDebitCents)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-4 pb-4">
                      <span className="font-semibold text-polar-night">
                        {pricing.walletDebitCents > 0 ? t('summary.toPay') : t('summary.total')}
                      </span>
                      <span className="text-xl font-bold text-polar-night">
                        {formatCentsToCurrency(pricing.walletDebitCents > 0 ? pricing.everypayChargeCents : pricing.totalChargeCents)}
                      </span>
                    </div>
                  </>
                )}

                {/* Terms checkbox — always visible */}
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-bg-elevated transition-colors mb-4">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-border text-frost-ice focus:ring-frost-ice focus:ring-offset-0"
                    aria-required="true"
                  />
                  <span className="text-xs text-polar-night leading-relaxed">
                    {t('consent.checkboxPrefix')}{' '}
                    <Link href="/legal/terms" target="_blank" className="text-frost-ice underline hover:text-frost-iceDark">
                      {t('consent.termsLink')}
                    </Link>
                    {', '}
                    <Link href="/help/shipping" target="_blank" className="text-frost-ice underline hover:text-frost-iceDark">
                      {t('consent.deliveryLink')}
                    </Link>
                    {' '}{t('consent.and')}{' '}
                    <Link href="/legal/terms#6-disputes-returns-and-refunds" target="_blank" className="text-frost-ice underline hover:text-frost-iceDark">
                      {t('consent.returnsLink')}
                    </Link>
                  </span>
                </label>

                {/* Inline payment error */}
                {error && (
                  <InlineAlert message={friendlyCheckoutError(error, t)} />
                )}

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
                  ) : pricing?.everypayChargeCents === 0 ? (
                    t('actions.payWithWallet')
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t('actions.paySecurely')}
                    </>
                  )}
                </Button>

                {/* Payment method logos — hide when paying entirely from wallet */}
                {(!pricing || pricing.everypayChargeCents > 0) && (
                  <div className="mt-3">
                    <PaymentMethodLogos country={defaultCountry} />
                  </div>
                )}

                <Link href="/cart" className="block mt-3">
                  <Button variant="ghost" fullWidth>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('actions.backToCart')}
                  </Button>
                </Link>

                {/* Platform operator info — EveryPay Req 17 */}
                <div className="text-xs text-text-muted mt-4 pt-4 border-t border-border-subtle">
                  <p className="font-medium text-text-secondary mb-0.5">{t('merchant.label')}</p>
                  <p>{t('merchant.name')}</p>
                  <p>{t('merchant.address')}</p>
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
            <span className="text-sm text-text-secondary">
              {pricing && pricing.walletDebitCents > 0 ? t('summary.toPay') : t('summary.total')}
            </span>
            {pricing && (
              <span className="text-xl font-bold text-polar-night">
                {formatCentsToCurrency(pricing.walletDebitCents > 0 ? pricing.everypayChargeCents : pricing.totalChargeCents)}
              </span>
            )}
          </div>
          {error && (
            <InlineAlert message={friendlyCheckoutError(error, t)} compact />
          )}
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
            ) : pricing?.everypayChargeCents === 0 ? (
              t('actions.payWithWallet')
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {t('actions.paySecurely')}
              </>
            )}
          </Button>
          <div className="mt-2">
            {(!pricing || pricing.everypayChargeCents > 0) && (
              <PaymentMethodLogos country={defaultCountry} compact />
            )}
          </div>
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
