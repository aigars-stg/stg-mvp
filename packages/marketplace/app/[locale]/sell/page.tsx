/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Button, Modal } from '@second-turn/design-system';
import type { BGGGame } from '@/lib/bgg-api';
import type { BGGVersion, VersionSelection } from '@/lib/bgg-types';
import { GameSearch } from '@/components/sell/GameSearch';
import { GameNameSelector } from '@/components/sell/GameNameSelector';
import { LanguageVersionSelector } from '@/components/sell/LanguageVersionSelector';
import { ConditionSelector } from '@/components/sell/ConditionSelector';
import { PhotoUpload } from '@/components/sell/PhotoUpload';
import { Input } from '@second-turn/design-system';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import { ExpansionSelector, type SelectedExpansion } from '@/components/sell/ExpansionSelector';
import { TransactionMethodSelector } from '@/components/sell/TransactionMethodSelector';
import type { CountryCode } from '@/lib/country-utils';
import { PricingFormatSelector } from '@/components/sell/PricingFormatSelector';
import { ListingPreviewSidebar } from '@/components/sell/ListingPreviewSidebar';
import { SELLER_COMMISSION_RATE } from '@/lib/pricing/constants';
import { PuzzlePiece as Dices, PhotoCamera as Camera, ClipboardCheck, CurrencyEuro as Euro, InfoCircle as Info, Close, CheckCircleAlt01 as CheckCircle2, RefreshCw, AlertCircle, PuzzlePiece as Puzzle, RefreshCw as Loader2 } from '@/lib/icons';
import { Card } from '@second-turn/design-system';
import { useAuth } from '@/lib/auth/AuthContext';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import type { TransactionMethod, PricingFormat } from '@/lib/types/listing';


// AuctionSettings available via @/components/sell/AuctionSettings when auctions are enabled
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { NotificationModal } from '@/components/common/NotificationModal';
import { PricingAssistant } from '@/components/sell/PricingAssistant';
import { WantedListingContextBanner } from '@/components/sell/WantedListingContextBanner';
import { useTranslations } from 'next-intl';
import { useListingForm, INITIAL_FORM_DATA } from '@/lib/hooks/useListingForm';
import { formatDate } from '@/lib/date-utils';
import { formatPrice } from '@/lib/services/pricing';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

function SellPageContent() {
  // Translations
  const t = useTranslations('Sell.page');
  const tDraft = useTranslations('Sell.draftBanner');
  const tExisting = useTranslations('Sell.existingListings');
  const tEdit = useTranslations('Sell.editMode');
  const tSections = useTranslations('Sell.sections');
  const tTerms = useTranslations('Sell.terms');
  const tActions = useTranslations('Sell.actions');
  const tPreview = useTranslations('Sell.preview');
  const tSuccess = useTranslations('Sell.successModal');
  const tValidation = useTranslations('Sell.validation');
  const tErrors = useTranslations('Sell.errors');
  const tPrice = useTranslations('Sell.price');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, updateProfile } = useAuth();
  const [sellerPhone, setSellerPhone] = useState<string | null>(null);
  const [hasPhone, setHasPhone] = useState(true); // default true to avoid flash

  // Use the listing form hook for all form state
  const listingForm = useListingForm();
  const {
    formData,
    setFormData,
    isPublishing,
    setIsPublishing,
    showDraftBanner,
    setShowDraftBanner,
    hasDraft,
    setHasDraft,
    fallbackMode,
    setFallbackMode,
    fallbackReason,
    setFallbackReason,
    isLoadingGameDetails,
    setIsLoadingGameDetails,
    showSuccessModal,
    setShowSuccessModal,
    showMobilePreview,
    setShowMobilePreview,
    setPublishedListingId,
    existingPhotoUrls,
    setExistingPhotoUrls,
    isLoadingListing,
    setIsLoadingListing,
    loadError,
    setLoadError,
    availableExpansions,
    setAvailableExpansions,
    isLoadingExpansions,
    setIsLoadingExpansions,
    showExpansionSection,
    setShowExpansionSection,
    expansionsFetched,
    setExpansionsFetched,
    expansionCount,
    setExpansionCount,
    versionCount,
    setVersionCount,
    existingActiveListings,
    setExistingActiveListings,
    sellerCapabilities,
    setSellerCapabilities,
    hasSetInitialListingType,
    expandedSections,
    setExpandedSections,
    validationModal,
    setValidationModal,
    errorModal,
    setErrorModal,
    draftSavedModal,
    setDraftSavedModal,
  } = listingForm;

  // Edit mode state
  const editListingId = searchParams.get('edit');
  const isEditMode = !!editListingId;

  // Re-list mode state (pre-fills form from existing listing, but creates a new one)
  const relistListingId = searchParams.get('relist');
  const isRelistMode = !!relistListingId && !isEditMode;

  // Pre-fill search query (from navbar search)
  const initialSearchQuery = searchParams.get('q');

  // Wanted listing context state (when creating from "I have this" flow)
  const wantedListingId = searchParams.get('wantedListingId');
  const [wantedListing, setWantedListing] = useState<WantedListingWithDetails | null>(null);
  const [isLoadingWantedListing, setIsLoadingWantedListing] = useState(false);

  // Pre-fetched versions from /api/games/{id} response (avoids duplicate fetch)
  const [prefetchedVersions, setPrefetchedVersions] = useState<BGGVersion[] | null>(null);

  // Onboarding check state (prevents flash of form for non-onboarded users)
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(!isEditMode);

  // Fetch game details with fallback detection when game is selected
  const handleGameSelect = useCallback(async (game: BGGGame | null) => {
    setFormData((prev) => ({
      ...prev,
      selectedGame: game,
      selectedVersion: null,
      selectedGameDisplayName: null, // Clear display name when changing game
      selectedExpansions: [], // Clear expansions when changing game
    }));
    setFallbackMode(false);
    setFallbackReason(undefined);
    setPrefetchedVersions(null); // Clear pre-fetched versions
    setAvailableExpansions([]); // Clear available expansions
    setShowExpansionSection(false); // Reset expansion section
    setExpansionsFetched(false); // Reset fetched flag
    setExpansionCount(0); // Reset expansion count
    setVersionCount(0); // Reset version count
    setExistingActiveListings([]); // Clear existing listings warning

    // If game is null (clearing selection), just return
    if (!game) {
      setIsLoadingGameDetails(false);
      return;
    }

    // Check for existing active listings (only in create mode, not edit mode)
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
        // Non-critical error checking existing listings, continue with game selection
      }
    }

    setIsLoadingGameDetails(true);

    try {
      // Fetch game details WITHOUT expansions (lazy load later)
      const response = await fetch(`/api/games/${game.id}`);
      const data = await response.json();

      // Update selectedGame with full details including image and alternate names
      if (data.game) {
        const fullGameData: BGGGame = {
          id: data.game.id,
          name: data.game.name,
          yearPublished: data.game.yearpublished,
          thumbnail: data.game.thumbnail,
          image: data.game.image, // Full-size BGG image
          playerCount: data.game.player_count,
          minAge: data.game.min_age,
          playingTime: data.game.playing_time,
          alternateNames: data.game.alternate_names, // For localized versions
          isExpansion: data.game.is_expansion, // Track if game is an expansion
          // Preserve matchedAlternateName from search for auto-selection
          matchedAlternateName: game.matchedAlternateName,
        };
        setFormData((prev) => ({
          ...prev,
          selectedGame: fullGameData,
          // Don't set selectedGameDisplayName here - let GameNameSelector handle it
          // This ensures section doesn't complete before user chooses alternate name
        }));
      }

      if (data.fallbackMode) {
        setFallbackMode(true);
        setFallbackReason(data.reason);
      }

      // Store pre-fetched versions (avoids duplicate fetch in LanguageVersionSelector)
      if (data.versions && Array.isArray(data.versions)) {
        setPrefetchedVersions(data.versions);
      }

      // Store expansion count (used to show/hide expansion toggle)
      if (typeof data.expansionCount === 'number') {
        setExpansionCount(data.expansionCount);
      }
    } catch {
      // If error, assume fallback mode
      setFallbackMode(true);
      setFallbackReason('Failed to load game details');
    } finally {
      setIsLoadingGameDetails(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, [user, isEditMode]);

  // Stable callback for version selection
  const handleVersionSelect = useCallback((version: VersionSelection) => {
    setFormData((prev) => ({
      ...prev,
      selectedVersion: version,
      // Clear display name when version changes - GameNameSelector will set it
      selectedGameDisplayName: null
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, []);

  // Handler to allow changing version after selection
  const handleChangeVersion = useCallback(() => {
    // Clear selected version and keep game section expanded
    setFormData((prev) => ({ ...prev, selectedVersion: null }));
    setExpandedSections((prev) => ({ ...prev, game: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, []);

  // Handler to allow changing display name after selection
  const handleChangeName = useCallback(() => {
    // Clear selected display name to show selector again
    setFormData((prev) => ({ ...prev, selectedGameDisplayName: null }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, []);

  // Handler for expansion selection changes
  const handleExpansionsChange = useCallback((expansions: SelectedExpansion[]) => {
    setFormData((prev) => ({ ...prev, selectedExpansions: expansions }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, []);

  // Handler to enable expansion section and fetch expansions
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
      // Non-critical error, expansions are optional
    } finally {
      setIsLoadingExpansions(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, [formData.selectedGame, expansionsFetched]);

  // Handler to disable expansion section
  const handleDisableExpansions = useCallback(() => {
    setShowExpansionSection(false);
    setFormData((prev) => ({ ...prev, selectedExpansions: [] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, []);

  // Fetch seller capabilities on mount
  useEffect(() => {
    async function fetchSellerCapabilities() {
      if (!user) return;

      try {
        const response = await fetch('/api/seller/onboarding/status');
        const data = await response.json();

        if (response.ok) {
          const canCreateContactSeller = data.can_create_contact_seller ?? false;
          const canCreateInstantBuy = data.can_create_instant_buy ?? false;

          setHasPhone(data.has_phone ?? true);

          setSellerCapabilities({
            canCreateContactSeller,
            canCreateInstantBuy,
            isLoading: false,
          });

          // Default to instant_buy if available and in a supported country, otherwise contact_seller
          if (!hasSetInitialListingType.current) {
            hasSetInitialListingType.current = true;
            const isInstantBuyCountry = profile?.country === 'LV' || !profile?.country;
            setFormData((prev) => ({
              ...prev,
              transactionMethod: (canCreateInstantBuy && isInstantBuyCountry) ? 'instant_buy' : 'contact_seller',
            }));
          }
        } else {
          setSellerCapabilities({
            canCreateContactSeller: false,
            canCreateInstantBuy: false,
            isLoading: false,
          });
        }
      } catch {
        setSellerCapabilities({
          canCreateContactSeller: false,
          canCreateInstantBuy: false,
          isLoading: false,
        });
      }
    }

    fetchSellerCapabilities();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, [user]);

  // Fetch listing data for edit mode
  useEffect(() => {
    async function fetchListingForEdit() {
      if (!isEditMode || !editListingId || !user) return;

      try {
        setIsLoadingListing(true);
        setLoadError('');

        const response = await fetch(`/api/listings/${editListingId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setLoadError('Listing not found');
          } else {
            setLoadError('Failed to load listing');
          }
          return;
        }

        const data = await response.json();
        const listing = data.listing;

        // Check if user owns this listing
        if (listing.seller_id !== user.id) {
          setLoadError('You do not have permission to edit this listing');
          return;
        }

        // Derive transaction method and pricing format from listing data
        // Support both old (listing_type) and new (transaction_method, pricing_format) models
        const transactionMethod: TransactionMethod = listing.transaction_method
          || (listing.listing_type === 'contact_seller' ? 'contact_seller' : 'instant_buy');
        const pricingFormat: PricingFormat = listing.pricing_format
          || (listing.listing_type === 'auction' ? 'auction' : 'fixed_price');

        // Pre-populate form with listing data
        setFormData({
          transactionMethod,
          pricingFormat,
          selectedGame: {
            id: listing.bgg_game_id,
            name: listing.game_name,
            yearPublished: listing.game_year || listing.edition_year,
            thumbnail: listing.game?.thumbnail || null,
            image: listing.game?.image || null,
            playerCount: listing.game?.player_count || null,
            minAge: listing.game?.min_age || null,
            playingTime: listing.game?.playing_time || null,
            alternateNames: undefined, // Not needed in edit mode
          },
          selectedGameDisplayName: listing.game_name,
          selectedVersion: {
            id: 0,
            isManual: true,
            name: listing.version_name || '',
            publishers: listing.publisher ? listing.publisher.split(', ') : [],
            publisher: listing.publisher || '',
            languages: listing.language ? listing.language.split(', ') : [],
            language: listing.language || '',
            yearPublished: listing.edition_year || null,
            thumbnail: listing.game?.thumbnail || null,
            image: listing.game?.image || null,
          },
          selectedExpansions: [], // Expansions not editable in edit mode
          photos: [], // New photos to upload
          condition: listing.condition,
          conditionNotes: listing.condition_notes || '',
          allComponentsPresent: listing.all_components_present,
          missingComponents: listing.missing_components || '',
          price: listing.price.toString(),
          termsAccepted: true, // Already accepted when originally published
          auctionDurationDays: listing.auction_duration_days || 3,
        });

        setExistingPhotoUrls(listing.photo_urls || []);
      } catch {
        setLoadError('Failed to load listing');
      } finally {
        setIsLoadingListing(false);
      }
    }

    fetchListingForEdit();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, [isEditMode, editListingId, user]);

  // Fetch listing data for relist mode (pre-fills form but creates a new listing)
  useEffect(() => {
    async function fetchListingForRelist() {
      if (!isRelistMode || !relistListingId || !user) return;

      try {
        setIsLoadingListing(true);
        setLoadError('');

        const response = await fetch(`/api/listings/${relistListingId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setLoadError('Listing not found');
          } else {
            setLoadError('Failed to load listing');
          }
          return;
        }

        const data = await response.json();
        const listing = data.listing;

        // Check if user owns this listing
        if (listing.seller_id !== user.id) {
          setLoadError('You do not have permission to re-list this item');
          return;
        }

        // Derive transaction method and pricing format from listing data
        const transactionMethod: TransactionMethod = listing.transaction_method
          || (listing.listing_type === 'contact_seller' ? 'contact_seller' : 'instant_buy');
        const pricingFormat: PricingFormat = listing.pricing_format
          || (listing.listing_type === 'auction' ? 'auction' : 'fixed_price');

        // Pre-populate form with listing data (same as edit, but termsAccepted = false)
        setFormData({
          transactionMethod,
          pricingFormat,
          selectedGame: {
            id: listing.bgg_game_id,
            name: listing.game_name,
            yearPublished: listing.game_year || listing.edition_year,
            thumbnail: listing.game?.thumbnail || null,
            image: listing.game?.image || null,
            playerCount: listing.game?.player_count || null,
            minAge: listing.game?.min_age || null,
            playingTime: listing.game?.playing_time || null,
          },
          selectedGameDisplayName: listing.game_name,
          selectedVersion: {
            id: 0,
            isManual: true,
            name: listing.version_name || '',
            publishers: listing.publisher ? listing.publisher.split(', ') : [],
            publisher: listing.publisher || '',
            languages: listing.language ? listing.language.split(', ') : [],
            language: listing.language || '',
            yearPublished: listing.edition_year || null,
            thumbnail: listing.game?.thumbnail || null,
            image: listing.game?.image || null,
          },
          selectedExpansions: [],
          photos: [],
          condition: listing.condition,
          conditionNotes: listing.condition_notes || '',
          allComponentsPresent: listing.all_components_present,
          missingComponents: listing.missing_components || '',
          price: listing.price.toString(),
          termsAccepted: false, // Must re-accept terms for new listing
          auctionDurationDays: listing.auction_duration_days || 3,
        });

        // Carry over existing photos
        setExistingPhotoUrls(listing.photo_urls || []);
      } catch {
        setLoadError('Failed to load listing');
      } finally {
        setIsLoadingListing(false);
      }
    }

    fetchListingForRelist();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
  }, [isRelistMode, relistListingId, user]);

  // Fetch wanted listing data when coming from "I have this" flow
  useEffect(() => {
    async function fetchWantedListing() {
      if (!wantedListingId || isEditMode) return;

      try {
        setIsLoadingWantedListing(true);

        const response = await fetch(`/api/wanted/${wantedListingId}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const wanted = data.wantedListing;
        setWantedListing(wanted);

        // Auto-select the game from the wanted listing
        const gameData: BGGGame = {
          id: wanted.bgg_game_id,
          name: wanted.game_name,
          yearPublished: wanted.game_year,
          thumbnail: wanted.game?.thumbnail || null,
          image: wanted.game?.image || null,
        };

        // Set the game selection
        handleGameSelect(gameData);
      } catch {
        // Silently fail - wanted listing context is optional
      } finally {
        setIsLoadingWantedListing(false);
      }
    }

    fetchWantedListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedListingId, isEditMode]);

  // Check seller onboarding status (only for non-edit mode)
  useEffect(() => {
    async function checkSellerOnboarding() {
      // Skip check in edit mode or if no user
      if (isEditMode || !user) {
        setIsCheckingOnboarding(false);
        return;
      }

      try {
        const response = await fetch('/api/seller/onboarding/status');
        const data = await response.json();

        // If seller hasn't completed onboarding, redirect to onboarding page
        if (!data.onboarding_completed || !data.can_list_items) {
          router.push('/seller/onboard');
          return; // Keep loading state while redirecting
        }

        setIsCheckingOnboarding(false);
      } catch {
        setIsCheckingOnboarding(false); // Allow through but API will catch it
      }
    }

    checkSellerOnboarding();
  }, [user, isEditMode, router]);

  // Check for saved draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('listing-draft');
    if (draft) {
      setHasDraft(true);
      setShowDraftBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  }, []);

  // Load draft handler
  const handleLoadDraft = () => {
    const draft = localStorage.getItem('listing-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData({ ...INITIAL_FORM_DATA, ...parsed.formData });
        setShowDraftBanner(false);
      } catch {
        setErrorModal({
          isOpen: true,
          message: 'Failed to load draft. Please start fresh.',
        });
      }
    }
  };

  // Dismiss draft banner
  const handleDismissDraft = () => {
    setShowDraftBanner(false);
    localStorage.removeItem('listing-draft');
    setHasDraft(false);
  };

  // Warn before leaving if form has data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formData.selectedGame || formData.photos.length > 0 || formData.price) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData]);

  // Progressive disclosure: Auto-expand next incomplete section
  useEffect(() => {
    // Check if game section is complete (including alternate name selection if needed)
    const hasAlternateNames = formData.selectedGame?.alternateNames && formData.selectedGame.alternateNames.length > 0;

    // Check if ANY language is English (not just the first one)
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
    // Photos required only for Acceptable condition
    const photosComplete = formData.condition !== 'acceptable' || formData.photos.length >= 1;

    // Auto-expand next section that needs completion
    setExpandedSections((prev) => ({
      ...prev,
      game: true, // Always keep game section visible
      condition: gameComplete || prev.condition,
      photos: (gameComplete && conditionComplete) || prev.photos,
      pricing: (gameComplete && conditionComplete && photosComplete) || prev.pricing,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters are stable
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

  // Section completion checks
  const isGameSectionComplete = (() => {
    // Basic requirements: game and version must be selected
    if (!formData.selectedGame || !formData.selectedVersion) {
      return false;
    }

    // Check if alternate name selection is required
    const hasAlternateNames = formData.selectedGame.alternateNames && formData.selectedGame.alternateNames.length > 0;

    // Get version language
    const versionLanguage = formData.selectedVersion.language ||
      (formData.selectedVersion.languages && formData.selectedVersion.languages.length > 0
        ? formData.selectedVersion.languages[0]
        : null);

    const isEnglish = versionLanguage === 'English';

    // If game has alternate names AND version is non-English, require explicit name selection
    if (hasAlternateNames && !isEnglish) {
      // Require that user has explicitly selected a display name
      return !!formData.selectedGameDisplayName;
    }

    // Otherwise, complete when game and version are selected
    return true;
  })();

  const isConditionSectionComplete = !!formData.condition;
  // Photos required only for Acceptable condition - check both new and existing photos
  const isPhotosSectionComplete = formData.condition !== 'acceptable' || formData.photos.length >= 1 || existingPhotoUrls.length >= 1;
  // Pricing validation - all listings now require a price
  // For auctions, also require valid duration
  const isPriceSectionComplete = formData.pricingFormat === 'auction'
    ? (!!formData.price && parseFloat(formData.price) >= 1.00 && !!formData.auctionDurationDays)
    : (!!formData.price && parseFloat(formData.price) > 0);
  // Shipping is now always T2T, no user selection needed
  const isPricingSectionComplete = isPriceSectionComplete;

  const isPhoneComplete = formData.transactionMethod !== 'instant_buy' || hasPhone || (!!sellerPhone && sellerPhone.trim().length >= 8);

  const canPublish = (): boolean => {
    return (
      isGameSectionComplete &&
      isConditionSectionComplete &&
      isPhotosSectionComplete &&
      isPricingSectionComplete &&
      isPhoneComplete &&
      formData.termsAccepted
    );
  };

  const validateForPublish = (): boolean => {
    if (!isGameSectionComplete) {
      setValidationModal({
        isOpen: true,
        message: tValidation('selectGameVersion'),
      });
      return false;
    }
    if (!isConditionSectionComplete) {
      setValidationModal({
        isOpen: true,
        message: tValidation('selectCondition'),
      });
      return false;
    }
    if (!isPhotosSectionComplete) {
      setValidationModal({
        isOpen: true,
        message: tValidation('photoRequired'),
      });
      return false;
    }
    if (!isPricingSectionComplete) {
      setValidationModal({
        isOpen: true,
        message: tValidation('priceRequired'),
      });
      return false;
    }
    // Validate phone is provided for instant_buy if seller doesn't have one
    if (formData.transactionMethod === 'instant_buy' && !hasPhone && (!sellerPhone || sellerPhone.trim().length < 8)) {
      setValidationModal({
        isOpen: true,
        message: tValidation('phoneRequired'),
      });
      return false;
    }
    if (!formData.termsAccepted) {
      setValidationModal({
        isOpen: true,
        message: tValidation('termsRequired'),
      });
      return false;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!validateForPublish()) {
      return;
    }

    // Check email verification (only for new listings)
    if (!isEditMode && !user?.email_confirmed_at) {
      setValidationModal({
        isOpen: true,
        message: tValidation('emailVerificationRequired'),
      });
      return;
    }

    setIsPublishing(true);

    try {
      // Step 1: Upload new photos (if any)
      let newPhotoUrls: string[] = [];
      if (formData.photos.length > 0) {
        const photoFormData = new FormData();
        formData.photos.forEach((photoFile) => {
          photoFormData.append('photos', photoFile.file);
        });

        const uploadResponse = await fetch('/api/upload/photos', {
          method: 'POST',
          body: photoFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload photos');
        }

        const uploadData = await uploadResponse.json();
        newPhotoUrls = uploadData.urls;
      }

      // Combine existing and new photo URLs
      const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];

      if (isEditMode) {
        // Edit mode: Update existing listing
        const updates = {
          photo_urls: allPhotoUrls,
          condition: formData.condition,
          condition_notes: formData.conditionNotes || null,
          all_components_present: formData.allComponentsPresent,
          missing_components: formData.missingComponents || null,
          price: parseFloat(formData.price),
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

        // Redirect to game page
        router.push(`/game/${formData.selectedGame?.id}`);
      } else {
        // Create mode: Create new listing
        const listingData = {
          selectedGame: {
            ...formData.selectedGame,
            name: formData.selectedGameDisplayName || formData.selectedGame?.name
          },
          selectedVersion: formData.selectedVersion,
          photoUrls: allPhotoUrls,
          condition: formData.condition,
          conditionNotes: formData.conditionNotes,
          allComponentsPresent: formData.allComponentsPresent,
          missingComponents: formData.missingComponents,
          price: formData.price, // Used for both fixed price and auction starting bid
          // New 2-dimensional model
          transactionMethod: formData.transactionMethod,
          pricingFormat: formData.pricingFormat,
          // Auction fields (only included when pricing format is auction)
          ...(formData.pricingFormat === 'auction' ? {
            auctionDurationDays: formData.auctionDurationDays,
          } : {}),
          // Convert selected expansions to API format
          includedExpansions: formData.selectedExpansions.map((exp) => ({
            bgg_id: exp.bgg_id,
            name: exp.displayName, // Use localized display name
            year: exp.selectedVersion.yearPublished || exp.year, // Prefer version year
            version_source: 'bgg' as const,
            bgg_version_id: exp.selectedVersion.id || null,
            version_name: exp.selectedVersion.name || null,
            language: exp.selectedVersion.languages?.join(', ') || exp.selectedVersion.language || null,
            publisher: exp.selectedVersion.publishers?.join(', ') || exp.selectedVersion.publisher || null,
            thumbnail: exp.thumbnail,
            image: exp.image,
          })),
          // Source wanted listing (for "I have this" flow)
          ...(wantedListingId ? { sourceWantedListingId: wantedListingId } : {}),
        };

        // Save phone to profile if newly entered
        if (formData.transactionMethod === 'instant_buy' && sellerPhone && !hasPhone) {
          const { error: phoneError } = await updateProfile({ phone: sellerPhone.trim() });
          if (phoneError) {
            setErrorModal({
              isOpen: true,
              message: tErrors('phoneSaveFailed'),
            });
            setIsPublishing(false);
            return;
          }
          setHasPhone(true);
        }

        const listingResponse = await fetch('/api/listings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(listingData),
        });

        if (!listingResponse.ok) {
          const errorData = await listingResponse.json();

          // Handle special error cases with redirects
          if (errorData.requiresOnboarding) {
            router.push(errorData.onboardingUrl || '/seller/onboard');
            return;
          }

          throw new Error(errorData.error || errorData.details || 'Failed to create listing');
        }

        const { listing } = await listingResponse.json();

        // Clear draft
        localStorage.removeItem('listing-draft');
        setHasDraft(false);

        // Show success modal
        setPublishedListingId(listing.id);
        setShowSuccessModal(true);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorModal({
        isOpen: true,
        message: isEditMode
          ? tErrors('updateFailed', { message: errorMessage })
          : tErrors('publishFailed', { message: errorMessage }),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('listing-draft', JSON.stringify({ formData }));
    setHasDraft(true);
    setDraftSavedModal(true);
  };

  // Show loading state while checking onboarding (prevents flash of form for non-onboarded users)
  if (isCheckingOnboarding && !isEditMode) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-frost-ice animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">{t('preparing') || 'Preparing...'}</p>
        </div>
      </div>
    );
  }

  // Show loading state for edit/relist mode
  if ((isEditMode || isRelistMode) && isLoadingListing) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-frost-ice border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">{t('loadingListing')}</p>
        </div>
      </div>
    );
  }

  // Show error state for edit/relist mode
  if ((isEditMode || isRelistMode) && loadError) {
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
      {/* Header with BGG Attribution */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">
          {isEditMode ? t('editTitle') : t('title')}
        </h1>
        {!isEditMode && (
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
              className="h-6 sm:h-10 w-auto"
            />
          </a>
        )}
      </div>

      {/* Email Verification Banner (only in create mode) */}
      {!isEditMode && <EmailVerificationBanner />}

      {/* Wanted Listing Context Banner (for "I have this" flow) */}
      {wantedListing && !isEditMode && (
        <WantedListingContextBanner
          wantedListing={wantedListing}
          isLoading={isLoadingWantedListing}
        />
      )}

      {/* Draft Banner */}
      {showDraftBanner && hasDraft && (
        <Card padding="md" className="mb-6 bg-frost-ice/10 border border-frost-ice/30">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-polar-night mb-1">
                {tDraft('title')}
              </p>
              <p className="text-sm text-text-secondary mb-3">
                {tDraft('subtitle')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleLoadDraft}
                  className="px-4 py-2 bg-frost-ice text-snow-white rounded-lg hover:bg-frost-ice/90 transition-colors text-sm font-medium"
                >
                  {tDraft('loadButton')}
                </button>
                <button
                  onClick={handleDismissDraft}
                  className="px-4 py-2 bg-bg-secondary text-text rounded-lg hover:bg-border transition-colors text-sm font-medium"
                >
                  {tDraft('startFreshButton')}
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissDraft}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
              title={tDraft('dismiss')}
            >
              <Close className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </Card>
      )}

      {/* Two-Column Layout: Form + Preview */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Form Sections (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-4">
        {/* Transaction Method Selection (only in create mode) */}
        {!isEditMode && !sellerCapabilities.isLoading && (
          <Card padding="lg">
            <TransactionMethodSelector
              value={formData.transactionMethod}
              onChange={(method) => setFormData((prev) => ({
                ...prev,
                transactionMethod: method,
              }))}
              canUseInstantBuy={sellerCapabilities.canCreateInstantBuy}
              sellerCountry={profile?.country}
              onUpgradeClick={() => router.push('/seller/dashboard?tab=earnings')}
              hasPhone={hasPhone}
              phoneValue={sellerPhone || ''}
              onPhoneChange={(phone) => setSellerPhone(phone)}
              defaultCountry={(profile?.country && ['LV', 'LT', 'EE'].includes(profile.country) ? profile.country : 'LV') as CountryCode}
            />
          </Card>
        )}

        {/* Section 1: Game Selection (or locked game info in edit mode) */}
        {isEditMode ? (
          // Locked read-only game info in edit mode
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
                <span>
                  {tEdit('lockedInfo')}
                </span>
              </p>
            </div>
          </Card>
        ) : (
          // Normal game selection in create mode
          <CollapsibleSection
            title={tSections('game.title')}
            icon={<Dices className="w-6 h-6 text-frost-ice" />}
            isComplete={isGameSectionComplete}
            isExpanded={expandedSections.game}
            onToggle={() => toggleSection('game')}
            required
            subtitle={
              formData.selectedGame
                ? formData.selectedGameDisplayName || formData.selectedGame.name
                : tSections('game.subtitle')
            }
          >
            <div className="space-y-6">
              <GameSearch
                selectedGame={formData.selectedGame}
                selectedVersion={formData.selectedVersion}
                selectedDisplayName={formData.selectedGameDisplayName}
                onSelect={handleGameSelect}
                onChangeVersion={handleChangeVersion}
                initialQuery={initialSearchQuery || undefined}
                hideChangeVersionButton={true}
              />

              {/* Only show version selector when game is selected but version is not */}
              {formData.selectedGame && !formData.selectedVersion && (
                <>
                  {isLoadingGameDetails ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice" />
                      <p className="mt-4 text-text-secondary">{t('loadingGameDetails')}</p>
                    </div>
                  ) : (
                    <LanguageVersionSelector
                      game={formData.selectedGame}
                      selectedVersion={formData.selectedVersion}
                      onSelect={handleVersionSelect}
                      fallbackMode={fallbackMode}
                      fallbackReason={fallbackReason}
                      onVersionCountChange={setVersionCount}
                      initialVersions={prefetchedVersions ?? undefined}
                    />
                  )}
                </>
              )}

              {/* Show game name selector AFTER version is selected (smart logic based on language) */}
              {formData.selectedGame && formData.selectedVersion && !isLoadingGameDetails && (
                <GameNameSelector
                  primaryName={formData.selectedGame.name}
                  alternateNames={formData.selectedGame.alternateNames || null}
                  selectedName={formData.selectedGameDisplayName || ''}
                  selectedVersion={formData.selectedVersion}
                  onChange={(name) => setFormData(prev => ({ ...prev, selectedGameDisplayName: name }))}
                  onAutoComplete={() => {
                    // Auto-completed, can mark section as complete
                  }}
                  onChangeName={handleChangeName}
                  hideChangeNameButton={true}
                  matchedAlternateName={formData.selectedGame.matchedAlternateName}
                />
              )}

              {/* Change Version and Change Name buttons */}
              {formData.selectedGame && formData.selectedVersion && !isLoadingGameDetails && (() => {
                // Determine if name selector was shown (same logic as GameNameSelector)
                const hasAlternateNames = formData.selectedGame.alternateNames && formData.selectedGame.alternateNames.length > 0;

                // Check if ANY language is English (not just the first one)
                let hasEnglish = false;
                if (formData.selectedVersion.languages && formData.selectedVersion.languages.length > 0) {
                  hasEnglish = formData.selectedVersion.languages.includes('English');
                } else if (formData.selectedVersion.language) {
                  hasEnglish = formData.selectedVersion.language === 'English';
                }

                const showChangeVersion = versionCount > 1; // Only show if multiple versions available
                const showChangeName = hasAlternateNames && !hasEnglish && formData.selectedGameDisplayName;

                // Don't render anything if neither button should show
                if (!showChangeVersion && !showChangeName) {
                  return null;
                }

                const gridCols = showChangeVersion && showChangeName ? 'md:grid-cols-2' : '';

                return (
                  <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
                    {showChangeVersion && (
                      <button
                        onClick={handleChangeVersion}
                        className="px-4 py-2 text-sm font-medium text-frost-ice hover:text-aurora-blue border-2 border-frost-ice/30 hover:border-frost-ice rounded-lg hover:bg-frost-ice/5 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {tSections('game.changeVersion')}
                      </button>
                    )}
                    {showChangeName && (
                      <button
                        onClick={handleChangeName}
                        className="px-4 py-2 text-sm font-medium text-frost-ice hover:text-aurora-blue border-2 border-frost-ice/30 hover:border-frost-ice rounded-lg hover:bg-frost-ice/5 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {tSections('game.changeName')}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </CollapsibleSection>
        )}

        {/* Warning: User already has active listing(s) for this game */}
        {existingActiveListings.length > 0 && (
          <div className="bg-polar-night/5 border-l-4 border-polar-night/30 rounded-r-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-polar-night/60 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-polar-night mb-1">
                  {tExisting(existingActiveListings.length === 1 ? 'warningTitle_one' : 'warningTitle_other', { count: existingActiveListings.length })}
                </p>
                <p className="text-sm text-text-secondary mb-3">
                  {tExisting(existingActiveListings.length === 1 ? 'warningSubtitle_one' : 'warningSubtitle_other')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {existingActiveListings.map((listing) => (
                    <a
                      key={listing.id}
                      href={`/game/${listing.bgg_game_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-snow-white border border-border rounded-lg text-sm text-frost-ice hover:text-aurora-blue hover:border-frost-ice transition-colors"
                    >
                      {formatPrice(listing.price)} • {formatDate(listing.created_at)}
                      <span className="text-xs">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expansion Section - Only show for base games with expansions after version is selected */}
        {!isEditMode && formData.selectedGame && formData.selectedVersion && !formData.selectedGame.isExpansion && expansionCount > 0 && (
          <>
            {!showExpansionSection ? (
              /* Toggle button to enable expansion section */
              <Card padding="md" className="border-dashed border-2 border-border hover:border-frost-ice/50 transition-colors">
                <button
                  onClick={handleEnableExpansions}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-frost-ice/10 flex items-center justify-center">
                      <Puzzle className="w-5 h-5 text-frost-ice" />
                    </div>
                    <div>
                      <p className="font-medium text-polar-night">{tSections('expansions.toggleTitle')}</p>
                      <p className="text-sm text-text-secondary">{tSections('expansions.toggleSubtitle')}</p>
                    </div>
                  </div>
                  <div className="text-frost-ice font-medium text-sm">{tSections('expansions.addButton')}</div>
                </button>
              </Card>
            ) : (
              /* Expansion selector section */
              <CollapsibleSection
                title={tSections('expansions.title')}
                icon={<Puzzle className="w-6 h-6 text-frost-ice" />}
                isExpanded={true}
                onToggle={() => {}}
                subtitle={
                  formData.selectedExpansions.length > 0
                    ? tSections(formData.selectedExpansions.length === 1 ? 'expansions.subtitle' : 'expansions.subtitle_other', { count: formData.selectedExpansions.length })
                    : tSections('expansions.toggleSubtitle')
                }
              >
                <div className="space-y-4">
                  <ExpansionSelector
                    expansions={availableExpansions}
                    baseGameVersion={formData.selectedVersion}
                    selectedExpansions={formData.selectedExpansions}
                    onExpansionsChange={handleExpansionsChange}
                    isLoading={isLoadingExpansions}
                  />

                  {/* Close/Cancel button */}
                  {formData.selectedExpansions.length === 0 && !isLoadingExpansions && (
                    <button
                      onClick={handleDisableExpansions}
                      className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {tSections('expansions.cancelButton')}
                    </button>
                  )}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}

        {/* Section 2: Condition */}
        <CollapsibleSection
          title={tSections('condition.title')}
          icon={<ClipboardCheck className="w-6 h-6 text-frost-ice" />}
          isComplete={isConditionSectionComplete}
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

        {/* Section 3: Photos */}
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

        {/* Section 4: Pricing (always shown - all listings require price) */}
        <CollapsibleSection
          title={tSections('pricing.title')}
          icon={<Euro className="w-6 h-6 text-frost-ice" />}
          isComplete={isPriceSectionComplete}
          isExpanded={expandedSections.pricing}
          onToggle={() => toggleSection('pricing')}
          required
          subtitle={tSections('pricing.subtitle')}
        >
          <div className="space-y-6">
            {/* Pricing Format Selector */}
            <PricingFormatSelector
              value={formData.pricingFormat}
              onChange={(format) => setFormData((prev) => ({ ...prev, pricingFormat: format }))}
              auctionDuration={formData.auctionDurationDays}
              onAuctionDurationChange={(duration) => setFormData((prev) => ({ ...prev, auctionDurationDays: duration }))}
            />

            {/* Pricing Assistant - shows market data after game selection (for all listing types) */}
            {formData.selectedGame && (
              <PricingAssistant
                bggGameId={formData.selectedGame.id}
                condition={formData.condition}
                onFillPrice={(price) => setFormData((prev) => ({ ...prev, price: price.toFixed(2) }))}
                expansionIds={formData.selectedExpansions.map(e => e.bgg_id)}
                pricingFormat={formData.pricingFormat}
              />
            )}

            {/* Price Input */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-2">
                {formData.pricingFormat === 'auction'
                  ? tPrice('labelAuction')
                  : tPrice('label')
                } *
              </label>
              {formData.pricingFormat === 'auction' && (
                <p className="text-xs text-text-secondary mb-2">
                  {tPrice('helperAuction')}
                </p>
              )}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                  EUR
                </span>
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

              {/* Commission Note */}
              <div className="mt-3 p-3 bg-bg-secondary rounded-lg">
                <p className="text-xs text-text-secondary">
                  {formData.pricingFormat === 'auction'
                    ? tPrice('commission.auctionNote')
                    : tPrice('commission.fixedNote')
                  }
                </p>
                {formData.price && parseFloat(formData.price) > 0 && !isNaN(parseFloat(formData.price)) && (
                  <div className="mt-2 pt-2 border-t border-border-subtle">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">{tPrice('commission.platformFee')}</span>
                      <span className="text-text-secondary">
                        -{formatPrice(parseFloat(formData.price) * SELLER_COMMISSION_RATE)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="font-medium text-polar-night">{tPrice('commission.youReceive')}</span>
                      <span className="font-semibold text-aurora-green">
                        {formatPrice(parseFloat(formData.price) * (1 - SELLER_COMMISSION_RATE))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Terms & Publish */}
        <div className="mt-8 space-y-6">
          {/* Terms */}
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
              <a href="/terms" className="text-frost-ice hover:underline">
                {tTerms('termsLink')}
              </a>{' '}
              {tTerms('middle')}
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3 sm:space-y-0">
          {/* Mobile: Sticky bottom bar */}
          <div className="sm:hidden flex flex-col gap-3 sticky bottom-0 bg-bg-elevated border-t border-border-subtle shadow-lg -mx-4 px-4 py-4">
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={!canPublish() || isPublishing}
              size="lg"
              fullWidth
            >
              {isPublishing
                ? (isEditMode ? tActions('saving') : tActions('publishing'))
                : (isEditMode ? tActions('saveChanges') : tActions('publishListing'))}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowMobilePreview(true)}
              size="lg"
              fullWidth
            >
              {tActions('preview')}
            </Button>

            {!isEditMode && (
              <Button
                variant="ghost"
                onClick={handleSaveDraft}
                size="lg"
                fullWidth
              >
                {tActions('saveDraft')}
              </Button>
            )}
          </div>

          {/* Desktop: Regular button row */}
          <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
            {!isEditMode && (
              <Button
                variant="ghost"
                onClick={handleSaveDraft}
                size="lg"
              >
                {tActions('saveDraft')}
              </Button>
            )}

            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={!canPublish() || isPublishing}
              size="lg"
              className={isEditMode ? 'ml-auto' : ''}
            >
              {isPublishing
                ? (isEditMode ? tActions('saving') : tActions('publishing'))
                : (isEditMode ? tActions('saveChanges') : tActions('publishListing'))}
            </Button>
          </div>
        </div>
        </div>
        {/* End Left Column */}
      </div>

        {/* Right Column: Live Preview (4 cols on desktop, hidden on mobile/tablet) */}
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
        {/* End Right Column */}
      </div>
      {/* End Two-Column Grid */}

      {/* Success Modal */}
      <Modal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/browse');
        }}
        size="md"
      >
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-aurora-green/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-aurora-green" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-polar-night mb-3">
            {tSuccess('title')}
          </h2>
          <p className="text-text-secondary mb-8">
            {tSuccess('subtitle')}
          </p>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={() => router.push(`/game/${formData.selectedGame?.id}`)}
              fullWidth
            >
              {tSuccess('viewListing')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowSuccessModal(false);
                setFormData(INITIAL_FORM_DATA);
                setPublishedListingId(null);
              }}
              fullWidth
            >
              {tSuccess('listAnother')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/browse');
              }}
              fullWidth
            >
              {tSuccess('browseAll')}
            </Button>
          </div>
        </div>
      </Modal>

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
