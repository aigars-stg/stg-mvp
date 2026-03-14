/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { cleanUrlParam } from '@/lib/utils/clean-url-param';
import { Button, Modal, Input, Card } from '@second-turn/design-system';
import type { BGGGame } from '@/lib/bgg-api';
import type { BGGVersion, VersionSelection } from '@/lib/bgg-types';
import type { SelectedExpansion } from '@/components/sell/ExpansionSelector';
import { ConditionSelector } from '@/components/sell/ConditionSelector';
import { PhotoUpload } from '@/components/sell/PhotoUpload';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import type { CountryCode } from '@/lib/country-utils';
import { PricingFormatSelector } from '@/components/sell/PricingFormatSelector';
import { ListingPreviewSidebar } from '@/components/sell/ListingPreviewSidebar';
import { SELLER_COMMISSION_RATE } from '@/lib/pricing/constants';
import { PhotoCamera as Camera, ClipboardCheck, CurrencyEuro as Euro, InfoCircle as Info, Close, AlertCircle, RefreshCw as Loader2 } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import type { PricingFormat } from '@/lib/types/listing';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { NotificationModal } from '@/components/common/NotificationModal';
import { PricingAssistant } from '@/components/sell/PricingAssistant';
import { WantedListingContextBanner } from '@/components/sell/WantedListingContextBanner';
import { useTranslations, useLocale } from 'next-intl';
import { useToast } from '@/components/common/Toast';
import { useListingForm } from '@/lib/hooks/useListingForm';
import { usePhaseFlow } from '@/lib/hooks/usePhaseFlow';
import { formatPrice } from '@/lib/services/pricing';

// Phase system imports
import { LISTING_PHASES } from '@/components/phases/phase-definitions';
import { PhaseTracker, type PhaseStatus } from '@/components/phases/PhaseTracker';
import { ResearchPhase } from '@/components/sell/phases/ResearchPhase';
import { MarketPhase } from '@/components/sell/phases/MarketPhase';
import { ActionPhase } from '@/components/sell/phases/ActionPhase';
import { ScorePhase } from '@/components/sell/phases/ScorePhase';
import { DesktopCreateLayout } from '@/components/sell/DesktopCreateLayout';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// ═══════════════════════════════════════════════════════════════════════════
// Shared utilities
// ═══════════════════════════════════════════════════════════════════════════

/** Upload photos and return their URLs. Returns empty array if no photos. */
async function uploadPhotos(photos: import('@/components/sell/PhotoUpload').PhotoFile[]): Promise<string[]> {
  if (photos.length === 0) return [];

  const photoFormData = new FormData();
  photos.forEach((photoFile) => {
    photoFormData.append('photos', photoFile.file);
  });

  const uploadResponse = await fetch('/api/upload/photos', {
    method: 'POST',
    body: photoFormData,
  });

  if (!uploadResponse.ok) throw new Error('Failed to upload photos');

  const uploadData = await uploadResponse.json();
  return uploadData.urls;
}

/** Map a listing API response to ListingFormData + photo URLs. */
function mapListingToFormData(
  listing: Record<string, unknown>,
  overrides?: { termsAccepted?: boolean },
): { formData: import('@/lib/hooks/useListingForm').ListingFormData; photoUrls: string[] } {
  const pricingFormat: PricingFormat = (listing.pricing_format as PricingFormat)
    || ((listing.listing_type as string) === 'auction' ? 'auction' : 'fixed_price');
  const game = listing.game as Record<string, unknown> | undefined;

  return {
    formData: {
      transactionMethod: 'claim',
      pricingFormat,
      selectedGame: {
        id: listing.bgg_game_id as number,
        name: listing.game_name as string,
        yearPublished: (listing.game_year || listing.edition_year) as number,
        thumbnail: (game?.thumbnail as string) || undefined,
        image: (game?.image as string) || undefined,
        playerCount: (game?.player_count as string) || undefined,
        minAge: (game?.min_age as number) || undefined,
        playingTime: (game?.playing_time as string) || undefined,
        alternateNames: undefined,
      },
      selectedGameDisplayName: listing.game_name as string,
      selectedVersion: {
        id: 0,
        isManual: true,
        name: (listing.version_name as string) || '',
        publishers: (listing.publisher as string) ? (listing.publisher as string).split(', ') : [],
        publisher: (listing.publisher as string) || '',
        languages: (listing.language as string) ? (listing.language as string).split(', ') : [],
        language: (listing.language as string) || '',
        yearPublished: (listing.edition_year as number) || undefined,
        thumbnail: (game?.thumbnail as string) || undefined,
        image: (game?.image as string) || undefined,
      },
      selectedExpansions: [],
      photos: [],
      condition: listing.condition as 'likeNew' | 'veryGood' | 'good' | 'acceptable',
      conditionNotes: (listing.condition_notes as string) || '',
      allComponentsPresent: listing.all_components_present as boolean,
      missingComponents: (listing.missing_components as string) || '',
      price: String(listing.price),
      termsAccepted: overrides?.termsAccepted ?? false,
      auctionDurationDays: (listing.auction_duration_days as 1 | 3 | 5 | 7) || 3,
      auctionEndStrategy: (listing.auction_end_strategy as 'fixed' | 'cooldown') || 'fixed',
      auctionCooldownHours: (listing.auction_cooldown_hours as 24 | 48) || 24,
      auctionBidCount: (listing.auction_bid_count as number) || 0,
    },
    photoUrls: (listing.photo_urls as string[]) || [],
  };
}

/** Validates listing sections are complete. Reused by edit and create modes. */
function getListingSectionStatus(formData: import('@/lib/hooks/useListingForm').ListingFormData, existingPhotoUrls: string[]) {
  const isConditionComplete = !!formData.condition;
  const isPhotosComplete = formData.condition !== 'acceptable' || formData.photos.length >= 1 || existingPhotoUrls.length >= 1;
  const isPriceComplete = formData.pricingFormat === 'auction'
    ? (!!formData.price && parseFloat(formData.price) >= 1.00 && !!formData.auctionDurationDays)
    : (!!formData.price && parseFloat(formData.price) > 0);

  return {
    isConditionComplete,
    isPhotosComplete,
    isPriceComplete,
    canPublish: isConditionComplete && isPhotosComplete && isPriceComplete && formData.termsAccepted,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared hooks and handlers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shared data-fetching and handler logic used by both edit and create modes.
 * Extracted to avoid duplication between the two inner components.
 */
function useSharedSellLogic(opts: {
  isEditMode: boolean;
  editListingId: string | null;
  isRelistMode: boolean;
  relistListingId: string | null;
  wantedListingId: string | null;
  formData: import('@/lib/hooks/useListingForm').ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<import('@/lib/hooks/useListingForm').ListingFormData>>;
  setFallbackMode: (v: boolean) => void;
  setFallbackReason: (v: string | undefined) => void;
  setIsLoadingGameDetails: (v: boolean) => void;
  setAvailableExpansions: (v: import('@/lib/bgg-api').BGGExpansionInfo[]) => void;
  setShowExpansionSection: (v: boolean) => void;
  setExpansionsFetched: (v: boolean) => void;
  setExpansionCount: (v: number) => void;
  setVersionCount: (v: number) => void;
  setExistingActiveListings: (v: Array<{ id: string; bgg_game_id: number; price: number; created_at: string }>) => void;
  setIsLoadingExpansions: (v: boolean) => void;
  setExistingPhotoUrls: (v: string[]) => void;
  setIsLoadingListing: (v: boolean) => void;
  setLoadError: (v: string) => void;
  setExpandedSections: React.Dispatch<React.SetStateAction<{ game: boolean; photos: boolean; condition: boolean; pricing: boolean }>>;
  setSellerCapabilities: (v: { canListItems: boolean; isLoading: boolean; listingsToday: number; dailyLimit: number }) => void;
  hasSetInitialListingType: React.MutableRefObject<boolean>;
  expansionsFetched: boolean;
  user: import('@supabase/supabase-js').User | null;
  router: ReturnType<typeof useRouter>;
}) {
  const {
    isEditMode,
    editListingId,
    isRelistMode,
    relistListingId,
    wantedListingId,
    formData,
    setFormData,
    setFallbackMode,
    setFallbackReason,
    setIsLoadingGameDetails,
    setAvailableExpansions,
    setShowExpansionSection,
    setExpansionsFetched,
    setExpansionCount,
    setVersionCount,
    setExistingActiveListings,
    setIsLoadingExpansions,
    setExistingPhotoUrls,
    setIsLoadingListing,
    setLoadError,
    setExpandedSections,
    setSellerCapabilities,
    hasSetInitialListingType,
    expansionsFetched,
    user,
    router,
  } = opts;

  // Phone state
  const [sellerPhone, setSellerPhone] = useState<string | null>(null);
  const [hasPhone, setHasPhone] = useState(true);

  // Wanted listing state
  const [wantedListing, setWantedListing] = useState<WantedListingWithDetails | null>(null);
  const [isLoadingWantedListing, setIsLoadingWantedListing] = useState(false);

  // Pre-fetched versions
  const [prefetchedVersions, setPrefetchedVersions] = useState<BGGVersion[] | null>(null);

  // Onboarding check
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(!isEditMode);

  // ── handleGameSelect ──────────────────────────────────
  const handleGameSelect = useCallback(async (game: BGGGame | null) => {
    setFormData((prev) => ({
      ...prev,
      selectedGame: game,
      selectedVersion: null,
      selectedGameDisplayName: null,
      selectedExpansions: [],
    }));
    setFallbackMode(false);
    setFallbackReason(undefined);
    setPrefetchedVersions(null);
    setAvailableExpansions([]);
    setShowExpansionSection(false);
    setExpansionsFetched(false);
    setExpansionCount(0);
    setVersionCount(0);
    setExistingActiveListings([]);

    if (!game) {
      setIsLoadingGameDetails(false);
      return;
    }

    // Check for existing active listings (only in create mode)
    if (user && !isEditMode) {
      try {
        const existingRes = await fetch(`/api/listings?sellerId=${user.id}&gameId=${game.id}&status=active`);
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          if (existingData.listings && existingData.listings.length > 0) {
            setExistingActiveListings(existingData.listings.map((l: { id: string; bgg_game_id: number; price: number; created_at: string }) => ({
              id: l.id,
              bgg_game_id: l.bgg_game_id,
              price: l.price,
              created_at: l.created_at,
            })));
          }
        }
      } catch {
        // Non-critical
      }
    }

    setIsLoadingGameDetails(true);

    try {
      const response = await fetch(`/api/games/${game.id}`);
      const data = await response.json();

      if (data.game) {
        const fullGameData: BGGGame = {
          id: data.game.id,
          name: data.game.name,
          yearPublished: data.game.yearpublished,
          thumbnail: data.game.thumbnail,
          image: data.game.image,
          playerCount: data.game.player_count,
          minAge: data.game.min_age,
          playingTime: data.game.playing_time,
          alternateNames: data.game.alternate_names,
          isExpansion: data.game.is_expansion,
          matchedAlternateName: game.matchedAlternateName,
        };
        setFormData((prev) => ({
          ...prev,
          selectedGame: fullGameData,
        }));
      }

      if (data.fallbackMode) {
        setFallbackMode(true);
        setFallbackReason(data.reason);
      }

      if (data.versions && Array.isArray(data.versions)) {
        setPrefetchedVersions(data.versions);
      }

      if (typeof data.expansionCount === 'number') {
        setExpansionCount(data.expansionCount);
      }
    } catch {
      setFallbackMode(true);
      setFallbackReason('Failed to load game details');
    } finally {
      setIsLoadingGameDetails(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isEditMode]);

  // ── handleVersionSelect ───────────────────────────────
  const handleVersionSelect = useCallback((version: VersionSelection) => {
    setFormData((prev) => ({
      ...prev,
      selectedVersion: version,
      selectedGameDisplayName: null,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── handleChangeVersion ───────────────────────────────
  const handleChangeVersion = useCallback(() => {
    setFormData((prev) => ({ ...prev, selectedVersion: null }));
    setExpandedSections((prev) => ({ ...prev, game: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── handleChangeName ──────────────────────────────────
  const handleChangeName = useCallback(() => {
    setFormData((prev) => ({ ...prev, selectedGameDisplayName: null }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── handleExpansionsChange ────────────────────────────
  const handleExpansionsChange = useCallback((expansions: SelectedExpansion[]) => {
    setFormData((prev) => ({ ...prev, selectedExpansions: expansions }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── handleEnableExpansions ────────────────────────────
  const handleEnableExpansions = useCallback(async () => {
    if (!formData.selectedGame || expansionsFetched) {
      setShowExpansionSection(true);
      return;
    }

    setShowExpansionSection(true);
    setIsLoadingExpansions(true);

    try {
      const response = await fetch(`/api/games/${formData.selectedGame.id}?expansions=true`);
      const data = await response.json();

      if (data.expansions && Array.isArray(data.expansions)) {
        setAvailableExpansions(data.expansions);
      }
      setExpansionsFetched(true);
    } catch {
      // Non-critical
    } finally {
      setIsLoadingExpansions(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.selectedGame, expansionsFetched]);

  // ── handleDisableExpansions ───────────────────────────
  const handleDisableExpansions = useCallback(() => {
    setShowExpansionSection(false);
    setFormData((prev) => ({ ...prev, selectedExpansions: [] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch seller capabilities ─────────────────────────
  useEffect(() => {
    async function fetchSellerCapabilities() {
      if (!user) return;

      try {
        const response = await fetch('/api/seller/onboarding/status');
        const data = await response.json();

        if (response.ok) {
          const canListItems = data.can_list_items ?? false;

          setHasPhone(data.has_phone ?? true);

          setSellerCapabilities({
            canListItems,
            isLoading: false,
            listingsToday: data.listings_today ?? 0,
            dailyLimit: data.daily_limit ?? 50,
          });

          hasSetInitialListingType.current = true;
        } else {
          setSellerCapabilities({
            canListItems: false,
            isLoading: false,
            listingsToday: 0,
            dailyLimit: 50,
          });
        }
      } catch {
        setSellerCapabilities({
          canListItems: false,
          isLoading: false,
          listingsToday: 0,
          dailyLimit: 50,
        });
      }
    }

    fetchSellerCapabilities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Fetch listing for edit or relist mode ─────────────
  useEffect(() => {
    const listingId = isEditMode ? editListingId : isRelistMode ? relistListingId : null;
    if (!listingId || !user) return;
    const userId = user.id;

    async function fetchListing() {
      try {
        setIsLoadingListing(true);
        setLoadError('');

        const response = await fetch(`/api/listings/${listingId}`);

        if (!response.ok) {
          setLoadError(response.status === 404 ? 'Listing not found' : 'Failed to load listing');
          return;
        }

        const data = await response.json();
        const listing = data.listing;

        if (listing.seller_id !== userId) {
          setLoadError(isEditMode
            ? 'You do not have permission to edit this listing'
            : 'You do not have permission to re-list this item');
          return;
        }

        const mapped = mapListingToFormData(listing, {
          termsAccepted: isEditMode,
        });
        setFormData(mapped.formData);
        setExistingPhotoUrls(mapped.photoUrls);
      } catch {
        setLoadError('Failed to load listing');
      } finally {
        setIsLoadingListing(false);
      }
    }

    fetchListing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editListingId, isRelistMode, relistListingId, user]);

  // ── Fetch wanted listing ──────────────────────────────
  useEffect(() => {
    async function fetchWantedListing() {
      if (!wantedListingId || isEditMode) return;

      try {
        setIsLoadingWantedListing(true);

        const response = await fetch(`/api/wanted/${wantedListingId}`);
        if (!response.ok) return;

        const data = await response.json();
        const wanted = data.wantedListing;
        setWantedListing(wanted);

        const gameData: BGGGame = {
          id: wanted.bgg_game_id,
          name: wanted.game_name,
          yearPublished: wanted.game_year,
          thumbnail: wanted.game?.thumbnail || null,
          image: wanted.game?.image || null,
        };

        handleGameSelect(gameData);
      } catch {
        // Silently fail
      } finally {
        setIsLoadingWantedListing(false);
      }
    }

    fetchWantedListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedListingId, isEditMode]);

  // ── Check seller onboarding ───────────────────────────
  useEffect(() => {
    async function checkSellerOnboarding() {
      if (isEditMode || !user) {
        setIsCheckingOnboarding(false);
        return;
      }

      try {
        const response = await fetch('/api/seller/onboarding/status');
        const data = await response.json();

        if (!data.onboarding_completed || !data.can_list_items) {
          router.push('/seller/onboard');
          return;
        }

        setIsCheckingOnboarding(false);
      } catch {
        setIsCheckingOnboarding(false);
      }
    }

    checkSellerOnboarding();
  }, [user, isEditMode, router]);

  // ── Warn before leaving ───────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formData.selectedGame || formData.selectedVersion || formData.photos.length > 0 || formData.price) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData]);

  return {
    sellerPhone,
    setSellerPhone,
    hasPhone,
    setHasPhone,
    wantedListing,
    isLoadingWantedListing,
    prefetchedVersions,
    isCheckingOnboarding,
    handleGameSelect,
    handleVersionSelect,
    handleChangeVersion,
    handleChangeName,
    handleExpansionsChange,
    handleEnableExpansions,
    handleDisableExpansions,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// EditModeSellContent — preserves existing collapsible-section layout
// ═══════════════════════════════════════════════════════════════════════════

function EditModeSellContent() {
  const t = useTranslations('Sell.page');
  const tEdit = useTranslations('Sell.editMode');
  const tSections = useTranslations('Sell.sections');
  const tTerms = useTranslations('Sell.terms');
  const tActions = useTranslations('Sell.actions');
  const tPreview = useTranslations('Sell.preview');
  const tValidation = useTranslations('Sell.validation');
  const tErrors = useTranslations('Sell.errors');
  const tPrice = useTranslations('Sell.price');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  const listingForm = useListingForm();
  const {
    formData,
    setFormData,
    isPublishing,
    setIsPublishing,
    showMobilePreview,
    setShowMobilePreview,
    existingPhotoUrls,
    setExistingPhotoUrls,
    isLoadingListing,
    loadError,
    expandedSections,
    setExpandedSections,
    validationModal,
    setValidationModal,
    errorModal,
    setErrorModal,
  } = listingForm;

  const editListingId = searchParams.get('edit');

  // useSharedSellLogic handles side effects (fetch listing, seller capabilities, etc.)
  useSharedSellLogic({
    isEditMode: true,
    editListingId,
    isRelistMode: false,
    relistListingId: null,
    wantedListingId: null,
    formData,
    setFormData,
    setFallbackMode: listingForm.setFallbackMode,
    setFallbackReason: listingForm.setFallbackReason,
    setIsLoadingGameDetails: listingForm.setIsLoadingGameDetails,
    setAvailableExpansions: listingForm.setAvailableExpansions,
    setShowExpansionSection: listingForm.setShowExpansionSection,
    setExpansionsFetched: listingForm.setExpansionsFetched,
    setExpansionCount: listingForm.setExpansionCount,
    setVersionCount: listingForm.setVersionCount,
    setExistingActiveListings: listingForm.setExistingActiveListings,
    setIsLoadingExpansions: listingForm.setIsLoadingExpansions,
    setExistingPhotoUrls: listingForm.setExistingPhotoUrls,
    setIsLoadingListing: listingForm.setIsLoadingListing,
    setLoadError: listingForm.setLoadError,
    setExpandedSections: listingForm.setExpandedSections,
    setSellerCapabilities: listingForm.setSellerCapabilities,
    hasSetInitialListingType: listingForm.hasSetInitialListingType,
    expansionsFetched: listingForm.expansionsFetched,
    user,
    router,
  });

  // Progressive disclosure for edit mode
  useEffect(() => {
    const hasAlternateNames = formData.selectedGame?.alternateNames && formData.selectedGame.alternateNames.length > 0;
    let hasEnglish = false;
    if (formData.selectedVersion?.languages && formData.selectedVersion.languages.length > 0) {
      hasEnglish = formData.selectedVersion.languages.includes('English');
    } else if (formData.selectedVersion?.language) {
      hasEnglish = formData.selectedVersion.language === 'English';
    }
    const needsAlternateName = hasAlternateNames && !hasEnglish;
    const gameComplete = !!formData.selectedGame && !!formData.selectedVersion &&
      (!needsAlternateName || !!formData.selectedGameDisplayName);
    const conditionComplete = !!formData.condition;
    const photosComplete = formData.condition !== 'acceptable' || formData.photos.length >= 1;

    setExpandedSections((prev) => ({
      ...prev,
      game: true,
      condition: gameComplete || prev.condition,
      photos: (gameComplete && conditionComplete) || prev.photos,
      pricing: (gameComplete && conditionComplete && photosComplete) || prev.pricing,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.selectedGame,
    formData.selectedVersion,
    formData.selectedGameDisplayName,
    formData.photos.length,
    formData.condition,
    formData.price,
  ]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Section completions (shared utility)
  const sections = getListingSectionStatus(formData, existingPhotoUrls);

  const validateForPublish = (): boolean => {
    if (!sections.isConditionComplete) {
      setValidationModal({ isOpen: true, message: tValidation('selectCondition') });
      return false;
    }
    if (!sections.isPhotosComplete) {
      setValidationModal({ isOpen: true, message: tValidation('photoRequired') });
      return false;
    }
    if (!sections.isPriceComplete) {
      setValidationModal({ isOpen: true, message: tValidation('priceRequired') });
      return false;
    }
    if (!formData.termsAccepted) {
      setValidationModal({ isOpen: true, message: tValidation('termsRequired') });
      return false;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!validateForPublish()) return;

    setIsPublishing(true);

    try {
      const newPhotoUrls = await uploadPhotos(formData.photos);
      const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];

      const updates: Record<string, unknown> = {
        photo_urls: allPhotoUrls,
        condition: formData.condition,
        condition_notes: formData.conditionNotes || null,
        all_components_present: formData.allComponentsPresent,
        missing_components: formData.missingComponents || null,
        price: parseFloat(formData.price),
        // EC-3: include pricing format and auction fields
        pricing_format: formData.pricingFormat,
        listing_type: formData.pricingFormat,
        ...(formData.pricingFormat === 'auction' && {
          auction_duration_days: formData.auctionDurationDays,
          auction_end_strategy: formData.auctionEndStrategy,
          ...(formData.auctionEndStrategy === 'cooldown' && {
            auction_cooldown_hours: formData.auctionCooldownHours,
          }),
        }),
      };

      const response = await fetch(`/api/listings/${editListingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update listing');
      }

      router.push(`/game/${formData.selectedGame?.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorModal({
        isOpen: true,
        message: tErrors('updateFailed', { message: errorMessage }),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Loading state
  if (isLoadingListing) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-frost-ice border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">{t('loadingListing')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-polar-night mb-2">
            {loadError}
          </h2>
          <p className="text-text-secondary mb-6">
            {loadError === 'You do not have permission to edit this listing'
              ? tErrors('permissionDenied')
              : tErrors('listingNotFound')}
          </p>
          <Button variant="primary" onClick={() => router.push('/my-listings')}>
            {tErrors('goToMyListings')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">
          {t('editTitle')}
        </h1>
      </div>

      {/* Two-Column Layout: Form + Preview */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Form Sections */}
        <div className="lg:col-span-8 space-y-4">
          {/* Locked read-only game info */}
          <Card padding="lg" className="bg-bg-secondary">
            <div className="flex items-start gap-4">
              {formData.selectedGame?.image && (
                <img
                  src={formData.selectedGame.image}
                  alt={formData.selectedGameDisplayName || formData.selectedGame.name}
                  className="w-24 h-24 rounded-lg object-cover border-2 border-border"
                />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-polar-night mb-1">
                  {formData.selectedGameDisplayName || formData.selectedGame?.name}
                  {formData.selectedVersion?.yearPublished && (
                    <span className="text-text-muted font-normal"> ({formData.selectedVersion.yearPublished})</span>
                  )}
                </h2>
                <div className="space-y-1 text-sm text-text-secondary">
                  {formData.selectedVersion?.name && (
                    <p><strong>{tEdit('edition')}</strong> {formData.selectedVersion.name}</p>
                  )}
                  {formData.selectedVersion?.language && (
                    <p><strong>{tEdit('language')}</strong> {formData.selectedVersion.language}</p>
                  )}
                  {formData.selectedVersion?.publisher && (
                    <p><strong>{tEdit('publisher')}</strong> {formData.selectedVersion.publisher}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-frost-ice/10 rounded-lg border border-frost-ice/20">
              <p className="text-xs text-frost-ice flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{tEdit('lockedInfo')}</span>
              </p>
            </div>
          </Card>

          {/* Condition */}
          <CollapsibleSection
            title={tSections('condition.title')}
            icon={<ClipboardCheck className="w-6 h-6 text-frost-ice" />}
            isComplete={sections.isConditionComplete}
            isExpanded={expandedSections.condition}
            onToggle={() => toggleSection('condition')}
            required
            subtitle={tSections('condition.subtitle')}
          >
            <ConditionSelector
              condition={formData.condition}
              conditionNotes={formData.conditionNotes}
              allComponentsPresent={formData.allComponentsPresent}
              missingComponents={formData.missingComponents}
              onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
            />
          </CollapsibleSection>

          {/* Photos */}
          <CollapsibleSection
            title={tSections('photos.title')}
            icon={<Camera className="w-6 h-6 text-frost-ice" />}
            isExpanded={expandedSections.photos}
            onToggle={() => toggleSection('photos')}
            required={formData.condition === 'acceptable'}
            subtitle={
              formData.condition === 'acceptable'
                ? tSections('photos.subtitleRequired')
                : tSections('photos.subtitleOptional')
            }
          >
            <PhotoUpload
              photos={formData.photos}
              onPhotosChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
              existingPhotoUrls={existingPhotoUrls}
              onExistingPhotosChange={setExistingPhotoUrls}
              maxPhotos={8}
              condition={formData.condition}
            />
          </CollapsibleSection>

          {/* Pricing */}
          <CollapsibleSection
            title={tSections('pricing.title')}
            icon={<Euro className="w-6 h-6 text-frost-ice" />}
            isComplete={sections.isPriceComplete}
            isExpanded={expandedSections.pricing}
            onToggle={() => toggleSection('pricing')}
            required
            subtitle={tSections('pricing.subtitle')}
          >
            <div className="space-y-6">
              <PricingFormatSelector
                value={formData.pricingFormat}
                onChange={(format) => setFormData((prev) => ({ ...prev, pricingFormat: format }))}
                auctionDuration={formData.auctionDurationDays}
                onAuctionDurationChange={(duration) => setFormData((prev) => ({ ...prev, auctionDurationDays: duration }))}
                auctionEndStrategy={formData.auctionEndStrategy}
                onAuctionEndStrategyChange={(strategy) => setFormData((prev) => ({ ...prev, auctionEndStrategy: strategy }))}
                auctionCooldownHours={formData.auctionCooldownHours}
                onAuctionCooldownHoursChange={(hours) => setFormData((prev) => ({ ...prev, auctionCooldownHours: hours }))}
              />

              {formData.selectedGame && (
                <PricingAssistant
                  bggGameId={formData.selectedGame.id}
                  condition={formData.condition}
                  onFillPrice={(price) => setFormData((prev) => ({ ...prev, price: price.toFixed(2) }))}
                  expansionIds={formData.selectedExpansions.map(e => e.bgg_id)}
                  pricingFormat={formData.pricingFormat}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  {formData.pricingFormat === 'auction' ? tPrice('labelAuction') : tPrice('label')} *
                </label>
                {formData.pricingFormat === 'auction' && (
                  <p className="text-xs text-text-secondary mb-2">{tPrice('helperAuction')}</p>
                )}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">EUR</span>
                  <Input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    onBlur={() => {
                      if (formData.price && !isNaN(parseFloat(formData.price))) {
                        setFormData((prev) => ({ ...prev, price: parseFloat(formData.price).toFixed(2) }));
                      }
                    }}
                    placeholder={formData.pricingFormat === 'auction' ? 'e.g. 5' : 'e.g. 25'}
                    min={formData.pricingFormat === 'auction' ? '1' : '0.01'}
                    step="1"
                    required
                    inputSize="lg"
                    className="pl-14"
                  />
                </div>

                <div className="mt-3 p-3 bg-bg-secondary rounded-lg">
                  <p className="text-xs text-text-secondary">
                    {formData.pricingFormat === 'auction' ? tPrice('commission.auctionNote') : tPrice('commission.fixedNote')}
                  </p>
                  {formData.price && parseFloat(formData.price) > 0 && !isNaN(parseFloat(formData.price)) && (
                    <div className="mt-2 pt-2 border-t border-border-subtle">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-secondary">{tPrice('commission.platformFee')}</span>
                        <span className="text-text-secondary">-{formatPrice(parseFloat(formData.price) * SELLER_COMMISSION_RATE)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="font-medium text-polar-night">{tPrice('commission.youReceive')}</span>
                        <span className="font-semibold text-aurora-green">{formatPrice(parseFloat(formData.price) * (1 - SELLER_COMMISSION_RATE))}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Terms & Publish */}
          <div className="mt-8 space-y-6">
            <div className="bg-bg-secondary rounded-lg p-4 sm:p-6 border-2 border-border">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData((prev) => ({ ...prev, termsAccepted: e.target.checked }))}
                  className="mt-1 w-4 h-4 rounded border-border text-frost-ice focus:ring-frost-ice"
                />
                <div className="flex-1 text-sm text-text-secondary">
                  {tTerms('prefix')}{' '}
                  <a href="/legal/terms" className="text-frost-ice hover:underline">{tTerms('termsLink')}</a>{' '}
                  {tTerms('middle')}
                </div>
              </label>
            </div>

            <div className="mt-8 space-y-3 sm:space-y-0">
              {/* Mobile: Sticky bottom bar */}
              <div className="sm:hidden flex flex-col gap-3 sticky bottom-0 bg-bg-elevated border-t border-border-subtle shadow-lg -mx-4 px-4 py-4">
                <Button variant="primary" onClick={handlePublish} disabled={!sections.canPublish || isPublishing} size="lg" fullWidth>
                  {isPublishing ? tActions('saving') : tActions('saveChanges')}
                </Button>
                <Button variant="secondary" onClick={() => setShowMobilePreview(true)} size="lg" fullWidth>
                  {tActions('preview')}
                </Button>
              </div>

              {/* Desktop: Regular button row */}
              <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
                <Button variant="primary" onClick={handlePublish} disabled={!sections.canPublish || isPublishing} size="lg" className="ml-auto">
                  {isPublishing ? tActions('saving') : tActions('saveChanges')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="sticky top-8">
            <ListingPreviewSidebar
              formData={formData}
              user={user}
              profile={profile}
              existingPhotoUrls={existingPhotoUrls}
            />
          </div>
        </div>
      </div>

      {/* Mobile Preview Modal */}
      <Modal
        open={showMobilePreview}
        onClose={() => setShowMobilePreview(false)}
        title={tPreview('mobileTitle')}
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto pb-4">
          <p className="text-xs text-text-secondary mb-3">{tPreview('mobileSubtitle')}</p>
          <ListingPreviewSidebar
            formData={formData}
            user={user}
            profile={profile}
            existingPhotoUrls={existingPhotoUrls}
          />
        </div>
      </Modal>

      {/* Validation Modal */}
      <NotificationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ isOpen: false, message: '' })}
        type="warning"
        message={validationModal.message}
      />

      {/* Error Modal */}
      <NotificationModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        type="error"
        message={errorModal.message}
        actionUrl={errorModal.actionUrl}
        actionLabel={errorModal.actionLabel}
      />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// CreateModeSellContent — 4-phase wizard with PhaseTracker
// ═══════════════════════════════════════════════════════════════════════════

function CreateModeSellContent() {
  const t = useTranslations('Sell.page');
  const tDraft = useTranslations('Sell.draftBanner');
  const tValidation = useTranslations('Sell.validation');
  const tErrors = useTranslations('Sell.errors');
  const tPhases = useTranslations('Phases.listing');
  const tPreview = useTranslations('Sell.preview');

  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { user, profile, updateProfile } = useAuth();

  // Use phase flow hook (wraps useListingForm)
  const phaseFlow = usePhaseFlow();
  const {
    formData,
    setFormData,
    isPublishing,
    setIsPublishing,
    showDraftBanner,
    hasDraft,
    setHasDraft,
    isLoadingGameDetails,
    existingPhotoUrls,
    setExistingPhotoUrls,
    isLoadingListing,
    loadError,
    availableExpansions,
    isLoadingExpansions,
    showExpansionSection,
    expansionCount,
    versionCount,
    existingActiveListings,
    fallbackMode,
    fallbackReason,
    validationModal,
    setValidationModal,
    errorModal,
    setErrorModal,
    draftSavedModal,
    setDraftSavedModal,
    showMobilePreview,
    setShowMobilePreview,
    setPublishedListingId,
    // Phase state
    currentPhaseIndex,
    completedPhaseIds,
    sparklePhaseId,
    advanceToNextPhase,
    goToPhase,
    isCurrentPhaseComplete,
    flowStartTime,
    saveDraft,
    loadDraftData,
    dismissDraft,
    showPhotosWarning,
    setShowPhotosWarning,
    sellerCapabilities,
    canSubmit: canSubmitFn,
  } = phaseFlow;
  const canSubmit = canSubmitFn();

  // Per-phase completion booleans for desktop layout
  const desktopIsResearchComplete = (() => {
    if (!formData.selectedGame || !formData.selectedVersion) return false;
    const hasAlternateNames = (formData.selectedGame.alternateNames?.length ?? 0) > 0;
    let hasEnglish = false;
    if ((formData.selectedVersion.languages?.length ?? 0) > 0) {
      hasEnglish = formData.selectedVersion.languages!.includes('English');
    } else if (formData.selectedVersion.language) {
      hasEnglish = formData.selectedVersion.language === 'English';
    }
    if (hasAlternateNames && !hasEnglish && !formData.selectedGameDisplayName) return false;
    return true;
  })();
  const desktopIsMarketComplete =
    !!formData.condition &&
    (formData.condition !== 'acceptable' ||
      formData.photos.length >= 1 ||
      existingPhotoUrls.length >= 1);
  const desktopIsActionComplete =
    !!formData.price &&
    parseFloat(formData.price) > 0 &&
    (formData.pricingFormat !== 'auction' ||
      (parseFloat(formData.price) >= 1.0 && !!formData.auctionDurationDays));

  // Relist / wanted / search params
  const relistListingId = searchParams.get('relist');
  const isRelistMode = !!relistListingId;
  const wantedListingId = searchParams.get('wantedListingId');
  const initialSearchQuery = searchParams.get('q');

  // Welcome toast for new sellers (redirected from onboarding)
  const { addToast } = useToast();
  const isWelcome = searchParams.get('welcome') === 'true';

  useEffect(() => {
    if (isWelcome) {
      addToast('success', t('welcome.sellerActivated'));
      cleanUrlParam('welcome');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWelcome]);

  // EC-14: Browser back button support for mobile phases
  const goToPhaseRef = useRef(goToPhase);
  useEffect(() => { goToPhaseRef.current = goToPhase; }, [goToPhase]);

  useEffect(() => {
    // Set initial history state on mount so back-navigation can return to phase 0
    history.replaceState({ sellPhase: 0 }, '');

    const handlePopState = (e: PopStateEvent) => {
      const target = e.state?.sellPhase;
      if (typeof target === 'number') {
        goToPhaseRef.current(target);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only; goToPhase kept current via ref
  }, []);

  const prevPhaseIndexRef = useRef(currentPhaseIndex);
  useEffect(() => {
    if (currentPhaseIndex > prevPhaseIndexRef.current) {
      // Advancing forward — push a new browser history entry
      history.pushState({ sellPhase: currentPhaseIndex }, '');
    } else if (currentPhaseIndex !== prevPhaseIndexRef.current) {
      // Going back (edit links / goToPhase) — replace to keep stack clean
      history.replaceState({ sellPhase: currentPhaseIndex }, '');
    }
    prevPhaseIndexRef.current = currentPhaseIndex;
  }, [currentPhaseIndex]);

  const shared = useSharedSellLogic({
    isEditMode: false,
    editListingId: null,
    isRelistMode,
    relistListingId,
    wantedListingId,
    formData,
    setFormData,
    setFallbackMode: phaseFlow.setFallbackMode,
    setFallbackReason: phaseFlow.setFallbackReason,
    setIsLoadingGameDetails: phaseFlow.setIsLoadingGameDetails,
    setAvailableExpansions: phaseFlow.setAvailableExpansions,
    setShowExpansionSection: phaseFlow.setShowExpansionSection,
    setExpansionsFetched: phaseFlow.setExpansionsFetched,
    setExpansionCount: phaseFlow.setExpansionCount,
    setVersionCount: phaseFlow.setVersionCount,
    setExistingActiveListings: phaseFlow.setExistingActiveListings,
    setIsLoadingExpansions: phaseFlow.setIsLoadingExpansions,
    setExistingPhotoUrls: phaseFlow.setExistingPhotoUrls,
    setIsLoadingListing: phaseFlow.setIsLoadingListing,
    setLoadError: phaseFlow.setLoadError,
    setExpandedSections: phaseFlow.setExpandedSections,
    setSellerCapabilities: phaseFlow.setSellerCapabilities,
    hasSetInitialListingType: phaseFlow.hasSetInitialListingType,
    expansionsFetched: phaseFlow.expansionsFetched,
    user,
    router,
  });

  // ── handleSaveDraft ───────────────────────────────────
  const handleSaveDraft = () => {
    saveDraft();
    setDraftSavedModal(true);
  };

  // ── Publish handler (create mode) ─────────────────────
  const handlePublish = async () => {
    // Check email verification
    if (!user?.email_confirmed_at) {
      setValidationModal({
        isOpen: true,
        message: tValidation('emailVerificationRequired'),
      });
      return;
    }

    // Validate terms
    if (!formData.termsAccepted) {
      setValidationModal({
        isOpen: true,
        message: tValidation('termsRequired'),
      });
      return;
    }

    setIsPublishing(true);

    try {
      // Upload photos
      const newPhotoUrls = await uploadPhotos(formData.photos);
      const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];

      const listingData = {
        selectedGame: {
          ...formData.selectedGame,
          name: formData.selectedGameDisplayName || formData.selectedGame?.name,
        },
        selectedVersion: formData.selectedVersion,
        photoUrls: allPhotoUrls,
        condition: formData.condition,
        conditionNotes: formData.conditionNotes,
        allComponentsPresent: formData.allComponentsPresent,
        missingComponents: formData.missingComponents,
        price: formData.price,
        pricingFormat: formData.pricingFormat,
        ...(formData.pricingFormat === 'auction' ? {
          auctionDurationDays: formData.auctionDurationDays,
          auctionEndStrategy: formData.auctionEndStrategy,
          ...(formData.auctionEndStrategy === 'cooldown' ? {
            auctionCooldownHours: formData.auctionCooldownHours,
          } : {}),
        } : {}),
        includedExpansions: formData.selectedExpansions.map((exp) => ({
          bgg_id: exp.bgg_id,
          name: exp.displayName,
          year: exp.selectedVersion.yearPublished || exp.year,
          version_source: 'bgg' as const,
          bgg_version_id: exp.selectedVersion.id || null,
          version_name: exp.selectedVersion.name || null,
          language: exp.selectedVersion.languages?.join(', ') || exp.selectedVersion.language || null,
          publisher: exp.selectedVersion.publishers?.join(', ') || exp.selectedVersion.publisher || null,
          thumbnail: exp.thumbnail,
          image: exp.image,
        })),
        ...(wantedListingId ? { sourceWantedListingId: wantedListingId } : {}),
        // Phase flow metadata
        flowStartTime,
      };

      // Save phone to profile if needed
      if (shared.sellerPhone && !shared.hasPhone) {
        const { error: phoneError } = await updateProfile({ phone: shared.sellerPhone.trim() });
        if (phoneError) {
          setErrorModal({
            isOpen: true,
            message: tErrors('phoneSaveFailed'),
          });
          setIsPublishing(false);
          return;
        }
        shared.setHasPhone(true);
      }

      const listingResponse = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData),
      });

      if (!listingResponse.ok) {
        const errorData = await listingResponse.json();

        // EC-13: auth expiry — save draft and redirect to login
        if (listingResponse.status === 401) {
          saveDraft();
          router.push(`/${locale}/auth/login?redirect=/${locale}/sell`);
          return;
        }

        if (errorData.requiresOnboarding) {
          router.push(errorData.onboardingUrl || '/seller/onboard');
          return;
        }

        throw new Error(errorData.error || errorData.details || 'Failed to create listing');
      }

      const responseData = await listingResponse.json();
      const { listing } = responseData;

      // Clear draft
      localStorage.removeItem('listing-draft');
      sessionStorage.removeItem('listing-draft-dismissed');
      setHasDraft(false);

      // Store achievements for listing page to display
      if (responseData.achievements?.length) {
        sessionStorage.setItem('new-listing-achievements', JSON.stringify({
          achievements: responseData.achievements,
          listingCount: responseData.listingCount,
          flowDurationMs: Date.now() - flowStartTime,
        }));
      }

      // Redirect to my listings with published flag (no listings/[id] page exists)
      setPublishedListingId(listing.id);
      router.push(`/${locale}/my-listings?published=1`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorModal({
        isOpen: true,
        message: tErrors('publishFailed', { message: errorMessage }),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // ── PhaseTracker label helpers ────────────────────────
  const tTracker = useTranslations('Phases.tracker');
  const getPhaseLabel = useCallback(
    (phaseId: string) => ({
      name: tPhases(`${phaseId}.name` as any),
      subtitle: tPhases(`${phaseId}.subtitle` as any),
      shortName: tPhases(`${phaseId}.shortName` as any),
    }),
    [tPhases],
  );
  const getStepAriaLabel = useCallback(
    (name: string, stepNumber: number, totalSteps: number, status: PhaseStatus) =>
      `${name}, ${tTracker('stepOf', { current: stepNumber, total: totalSteps })}, ${tTracker(`stepStatus.${status}` as any)}`,
    [tTracker],
  );

  // ── Loading / error states ────────────────────────────
  if (shared.isCheckingOnboarding) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-frost-ice animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">{t('preparing') || 'Preparing...'}</p>
        </div>
      </div>
    );
  }

  if (isRelistMode && isLoadingListing) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-frost-ice border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">{t('loadingListing')}</p>
        </div>
      </div>
    );
  }

  if (isRelistMode && loadError) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-polar-night mb-2">{loadError}</h2>
          <p className="text-text-secondary mb-6">{tErrors('listingNotFound')}</p>
          <Button variant="primary" onClick={() => router.push('/my-listings')}>
            {tErrors('goToMyListings')}
          </Button>
        </Card>
      </div>
    );
  }

  // ── Main create mode render ───────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Header with BGG Attribution */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">
          {t('title')}
        </h1>
        <a
          href="https://boardgamegeek.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
          title={t('bggAttribution')}
        >
          <img
            src="/images/powered-by-bgg-rgb.svg"
            alt="Powered by BoardGameGeek"
            className="h-6 sm:h-8 w-auto"
          />
        </a>
      </div>

      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Wanted Listing Context Banner */}
      {shared.wantedListing && (
        <WantedListingContextBanner
          wantedListing={shared.wantedListing}
          isLoading={shared.isLoadingWantedListing}
        />
      )}

      {/* Draft Banner */}
      {showDraftBanner && hasDraft && (
        <Card padding="md" className="mb-4 bg-frost-ice/10 border border-frost-ice/30">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-polar-night mb-1">{tDraft('title')}</p>
              <p className="text-sm text-text-secondary mb-3">{tDraft('subtitle')}</p>
              <div className="flex gap-2">
                <button
                  onClick={loadDraftData}
                  className="px-4 py-2 bg-frost-ice text-snow-white rounded-lg hover:bg-frost-ice/90 transition-colors text-sm font-medium"
                >
                  {tDraft('loadButton')}
                </button>
                <button
                  onClick={dismissDraft}
                  className="px-4 py-2 bg-bg-secondary text-text rounded-lg hover:bg-border transition-colors text-sm font-medium"
                >
                  {tDraft('startFreshButton')}
                </button>
              </div>
            </div>
            <button
              onClick={dismissDraft}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
              title={tDraft('dismiss')}
            >
              <Close className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </Card>
      )}

      {/* Photos warning banner — shown when draft was loaded but photos were stripped */}
      {showPhotosWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 flex-1">{tDraft('photosStripped')}</p>
          <button
            onClick={() => setShowPhotosWarning(false)}
            className="p-0.5 hover:bg-amber-100 rounded transition-colors"
            aria-label="Dismiss"
          >
            <Close className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      )}

      {/* Rate limit warning banner — shown when approaching daily limit (EC-15) */}
      {!sellerCapabilities.isLoading && sellerCapabilities.dailyLimit - sellerCapabilities.listingsToday <= 5 && sellerCapabilities.listingsToday > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {tValidation('rateLimitWarning', {
              remaining: sellerCapabilities.dailyLimit - sellerCapabilities.listingsToday,
            })}
          </p>
        </div>
      )}

      {/* Mobile layout: phase wizard (hidden on md+) */}
      <div className="md:hidden">
        {/* Phase Tracker */}
        <div className="mb-4">
          <PhaseTracker
            phases={LISTING_PHASES}
            currentPhaseIndex={currentPhaseIndex}
            completedPhaseIds={completedPhaseIds}
            flowTitle={tPhases('flowTitle')}
            onPhaseClick={goToPhase}
            sparklePhaseId={sparklePhaseId}
            getPhaseLabel={getPhaseLabel}
            getStepAriaLabel={getStepAriaLabel}
          />
        </div>

        {/* Phase Content */}
        <div>
          {currentPhaseIndex === 0 && (
            <ResearchPhase
              formData={formData}
              setFormData={setFormData}
              onAdvance={advanceToNextPhase}
              isPhaseComplete={isCurrentPhaseComplete}
              handleGameSelect={shared.handleGameSelect}
              handleVersionSelect={shared.handleVersionSelect}
              handleChangeVersion={shared.handleChangeVersion}
              handleChangeName={shared.handleChangeName}
              handleExpansionsChange={shared.handleExpansionsChange}
              handleEnableExpansions={shared.handleEnableExpansions}
              handleDisableExpansions={shared.handleDisableExpansions}
              isLoadingGameDetails={isLoadingGameDetails}
              fallbackMode={fallbackMode}
              fallbackReason={fallbackReason}
              versionCount={versionCount}
              prefetchedVersions={shared.prefetchedVersions}
              expansionCount={expansionCount}
              availableExpansions={availableExpansions}
              isLoadingExpansions={isLoadingExpansions}
              showExpansionSection={showExpansionSection}
              existingActiveListings={existingActiveListings}
              initialSearchQuery={initialSearchQuery || undefined}
            />
          )}

          {currentPhaseIndex === 1 && (
            <MarketPhase
              formData={formData}
              setFormData={setFormData}
              onAdvance={advanceToNextPhase}
              isPhaseComplete={isCurrentPhaseComplete}
              hasPhone={shared.hasPhone}
              sellerPhone={shared.sellerPhone}
              onPhoneChange={(phone) => shared.setSellerPhone(phone)}
              defaultCountry={(profile?.country && ['LV', 'LT', 'EE'].includes(profile.country) ? profile.country : 'LV') as CountryCode}
              existingPhotoUrls={existingPhotoUrls}
              setExistingPhotoUrls={setExistingPhotoUrls}
            />
          )}

          {currentPhaseIndex === 2 && (
            <ActionPhase
              formData={formData}
              setFormData={setFormData}
              onAdvance={advanceToNextPhase}
              isPhaseComplete={isCurrentPhaseComplete}
            />
          )}

          {currentPhaseIndex === 3 && (
            <ScorePhase
              formData={formData}
              setFormData={setFormData}
              goToPhase={goToPhase}
              onPublish={handlePublish}
              isPublishing={isPublishing}
              canSubmit={canSubmit}
              onSaveDraft={handleSaveDraft}
              existingPhotoUrls={existingPhotoUrls}
            />
          )}
        </div>
      </div>

      {/* Desktop layout: collapsible sections (hidden below md) */}
      <div className="hidden md:block">
        <DesktopCreateLayout
          researchProps={{
            formData,
            setFormData,
            handleGameSelect: shared.handleGameSelect,
            handleVersionSelect: shared.handleVersionSelect,
            handleChangeVersion: shared.handleChangeVersion,
            handleChangeName: shared.handleChangeName,
            handleExpansionsChange: shared.handleExpansionsChange,
            handleEnableExpansions: shared.handleEnableExpansions,
            handleDisableExpansions: shared.handleDisableExpansions,
            isLoadingGameDetails,
            fallbackMode,
            fallbackReason,
            versionCount,
            prefetchedVersions: shared.prefetchedVersions,
            expansionCount,
            availableExpansions,
            isLoadingExpansions,
            showExpansionSection,
            existingActiveListings,
            initialSearchQuery: initialSearchQuery || undefined,
          }}
          isResearchComplete={desktopIsResearchComplete}
          marketProps={{
            formData,
            setFormData,
            hasPhone: shared.hasPhone,
            sellerPhone: shared.sellerPhone,
            onPhoneChange: (phone) => shared.setSellerPhone(phone),
            defaultCountry: (profile?.country && ['LV', 'LT', 'EE'].includes(profile.country) ? profile.country : 'LV') as CountryCode,
            existingPhotoUrls,
            setExistingPhotoUrls,
          }}
          isMarketComplete={desktopIsMarketComplete}
          actionProps={{
            formData,
            setFormData,
          }}
          isActionComplete={desktopIsActionComplete}
          user={user}
          profile={profile}
          onPublish={handlePublish}
          isPublishing={isPublishing}
          canSubmit={canSubmit}
          onSaveDraft={handleSaveDraft}
        />
      </div>

      {/* Mobile Preview Modal */}
      <Modal
        open={showMobilePreview}
        onClose={() => setShowMobilePreview(false)}
        title={tPreview('mobileTitle')}
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto pb-4">
          <ListingPreviewSidebar
            formData={formData}
            user={user}
            profile={profile}
            existingPhotoUrls={existingPhotoUrls}
          />
        </div>
      </Modal>

      {/* Validation Modal */}
      <NotificationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ isOpen: false, message: '' })}
        type="warning"
        message={validationModal.message}
      />

      {/* Error Modal */}
      <NotificationModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        type="error"
        message={errorModal.message}
        actionUrl={errorModal.actionUrl}
        actionLabel={errorModal.actionLabel}
      />

      {/* Draft Saved Modal */}
      <NotificationModal
        isOpen={draftSavedModal}
        onClose={() => setDraftSavedModal(false)}
        type="success"
        message={tDraft('savedMessage')}
      />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// SellPageContent — mode-switching shell
// ═══════════════════════════════════════════════════════════════════════════

function SellPageContent() {
  const searchParams = useSearchParams();
  const isEditMode = !!searchParams.get('edit');

  if (isEditMode) {
    return <EditModeSellContent />;
  }

  return <CreateModeSellContent />;
}


// ═══════════════════════════════════════════════════════════════════════════
// Default export — preserves Suspense boundary
// ═══════════════════════════════════════════════════════════════════════════

export default function SellPage() {
  const t = useTranslations('Sell.page');

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-frost-ice border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    }>
      <SellPageContent />
    </Suspense>
  );
}
