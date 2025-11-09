'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '@second-turn/design-system';
import type { BGGGame } from '@/lib/bgg-api';
import type { VersionSelection } from '@/lib/bgg-types';
import { GameSearch } from '@/components/sell/GameSearch';
import { GameNameSelector } from '@/components/sell/GameNameSelector';
import { LanguageVersionSelector } from '@/components/sell/LanguageVersionSelector';
import { ConditionSelector } from '@/components/sell/ConditionSelector';
import { PhotoUpload, type PhotoFile } from '@/components/sell/PhotoUpload';
import { PricingShippingSimple } from '@/components/sell/PricingShippingSimple';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import { ListingCard } from '@/components/listing/ListingCard';
import { Dices, Camera, ClipboardCheck, Euro, Info, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '@second-turn/design-system';
import { useAuth } from '@/lib/auth/AuthContext';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import type { ListingWithSeller } from '@/lib/types/listing';

interface ListingFormData {
  selectedGame: BGGGame | null;
  selectedGameDisplayName: string | null; // Chosen display name (primary or alternate)
  selectedVersion: VersionSelection | null;
  photos: PhotoFile[];
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | null;
  conditionNotes: string;
  allComponentsPresent: boolean;
  missingComponents: string;
  price: string;
  shippingOptions: {
    localPickup: boolean;
    parcelLocker: boolean;
  };
  shippingNotes: string;
  termsAccepted: boolean;
}

const INITIAL_FORM_DATA: ListingFormData = {
  selectedGame: null,
  selectedGameDisplayName: null,
  selectedVersion: null,
  photos: [],
  condition: null,
  conditionNotes: '',
  allComponentsPresent: true,
  missingComponents: '',
  price: '',
  shippingOptions: {
    localPickup: false,
    parcelLocker: false,
  },
  shippingNotes: '',
  termsAccepted: false,
};

// Helper function to convert form data to listing preview format
function createPreviewListing(
  formData: ListingFormData,
  user: any,
  profile: any
): ListingWithSeller {
  // Convert user photos to blob URLs
  const userPhotoUrls = formData.photos.map(photo => URL.createObjectURL(photo.file));

  return {
    id: 'preview',
    bgg_game_id: formData.selectedGame?.id || 0,
    game_name: formData.selectedGameDisplayName || formData.selectedGame?.name || 'Select a game to preview',
    game_year: formData.selectedGame?.yearPublished || null,
    version_source: 'bgg',
    bgg_version_id: null,
    version_name: formData.selectedVersion?.name || null,
    publisher: formData.selectedVersion?.publishers?.join(', ') || formData.selectedVersion?.publisher || null,
    language: formData.selectedVersion?.languages?.join(', ') || formData.selectedVersion?.language || null,
    edition_year: formData.selectedVersion?.yearPublished || null,
    photo_urls: userPhotoUrls, // User photos only
    condition: formData.condition || 'good',
    condition_notes: formData.conditionNotes || null,
    all_components_present: formData.allComponentsPresent,
    missing_components: formData.missingComponents || null,
    price: parseFloat(formData.price) || 0,
    currency: 'EUR',
    shipping_local_pickup: formData.shippingOptions.localPickup,
    shipping_parcel_locker: formData.shippingOptions.parcelLocker,
    shipping_notes: formData.shippingNotes || null,
    seller_id: user?.id || 'preview-seller',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    game: {
      thumbnail: formData.selectedVersion?.thumbnail || formData.selectedGame?.thumbnail || null,
      // Priority: 1) Version image, 2) Base game image, 3) User photos (in photo_urls)
      image: formData.selectedVersion?.image || formData.selectedGame?.image || null,
      player_count: formData.selectedGame?.playerCount || null,
      min_age: formData.selectedGame?.minAge || null,
      playing_time: formData.selectedGame?.playingTime || null,
    },
    seller: {
      id: user?.id || 'preview-seller',
      full_name: profile?.full_name || 'Your Name', // From user_profiles table
      email: profile?.email || user?.email || 'you@example.com', // From user_profiles table
      avatar_url: profile?.avatar_url || null, // From user_profiles table
      country: profile?.country || null, // From user_profiles table
    },
  };
}

export default function SellPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState<ListingFormData>(INITIAL_FORM_DATA);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>();
  const [isLoadingGameDetails, setIsLoadingGameDetails] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);

  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    game: true,      // Always start with game section open
    photos: false,
    condition: false,
    pricing: false,
  });

  // Fetch game details with fallback detection when game is selected
  const handleGameSelect = useCallback(async (game: BGGGame | null) => {
    setFormData((prev) => ({
      ...prev,
      selectedGame: game,
      selectedVersion: null,
      selectedGameDisplayName: null // Clear display name when changing game
    }));
    setFallbackMode(false);
    setFallbackReason(undefined);

    // If game is null (clearing selection), just return
    if (!game) {
      setIsLoadingGameDetails(false);
      return;
    }

    setIsLoadingGameDetails(true);

    try {
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
        };
        setFormData((prev) => ({
          ...prev,
          selectedGame: fullGameData,
          // Don't set selectedGameDisplayName here - let GameNameSelector handle it
          // This ensures section doesn't complete before user chooses alternate name
        }));
      }

      if (data.fallbackMode) {
        console.log(`🔄 [Sell Page] Entering fallback mode: ${data.reason}`);
        setFallbackMode(true);
        setFallbackReason(data.reason);
      }
    } catch (error) {
      console.error('Error fetching game details:', error);
      // If error, assume fallback mode
      setFallbackMode(true);
      setFallbackReason('Failed to load game details');
    } finally {
      setIsLoadingGameDetails(false);
    }
  }, []);

  // Stable callback for version selection
  const handleVersionSelect = useCallback((version: VersionSelection) => {
    setFormData((prev) => ({
      ...prev,
      selectedVersion: version,
      // Clear display name when version changes - GameNameSelector will set it
      selectedGameDisplayName: null
    }));
  }, []);

  // Handler to allow changing version after selection
  const handleChangeVersion = useCallback(() => {
    // Clear selected version and keep game section expanded
    setFormData((prev) => ({ ...prev, selectedVersion: null }));
    setExpandedSections((prev) => ({ ...prev, game: true }));
  }, []);

  // Handler to allow changing display name after selection
  const handleChangeName = useCallback(() => {
    // Clear selected display name to show selector again
    setFormData((prev) => ({ ...prev, selectedGameDisplayName: null }));
  }, []);

  // Check for saved draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('listing-draft');
    if (draft) {
      setHasDraft(true);
      setShowDraftBanner(true);
    }
  }, []);

  // Load draft handler
  const handleLoadDraft = () => {
    const draft = localStorage.getItem('listing-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData({ ...INITIAL_FORM_DATA, ...parsed.formData });
        setShowDraftBanner(false);
      } catch (error) {
        console.error('Error loading draft:', error);
        alert('Failed to load draft. Please start fresh.');
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
    const pricingComplete = !!formData.price && parseFloat(formData.price) > 0 &&
      Object.values(formData.shippingOptions).some((v) => v);

    // Auto-expand next section that needs completion
    setExpandedSections((prev) => ({
      ...prev,
      game: true, // Always keep game section visible
      condition: gameComplete || prev.condition,
      photos: (gameComplete && conditionComplete) || prev.photos,
      pricing: (gameComplete && conditionComplete && photosComplete) || prev.pricing,
    }));
  }, [
    formData.selectedGame,
    formData.selectedVersion,
    formData.selectedGameDisplayName,
    formData.photos.length,
    formData.condition,
    formData.price,
    formData.shippingOptions,
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
  // Photos required only for Acceptable condition
  const isPhotosSectionComplete = formData.condition !== 'acceptable' || formData.photos.length >= 1;
  const isPricingSectionComplete =
    !!formData.price &&
    parseFloat(formData.price) > 0 &&
    Object.values(formData.shippingOptions).some((v) => v);

  const canPublish = (): boolean => {
    return (
      isGameSectionComplete &&
      isConditionSectionComplete &&
      isPhotosSectionComplete &&
      isPricingSectionComplete &&
      formData.termsAccepted
    );
  };

  const validateForPublish = (): boolean => {
    if (!isGameSectionComplete) {
      alert('Please select a game and version');
      return false;
    }
    if (!isConditionSectionComplete) {
      alert('Please select the condition of your game');
      return false;
    }
    if (!isPhotosSectionComplete) {
      alert('Please upload at least 1 photo for Acceptable condition items');
      return false;
    }
    if (!isPricingSectionComplete) {
      if (!formData.price || parseFloat(formData.price) <= 0) {
        alert('Please enter a valid price');
        return false;
      }
      const hasShipping = Object.values(formData.shippingOptions).some((v) => v);
      if (!hasShipping) {
        alert('Please select at least one shipping option');
        return false;
      }
    }
    if (!formData.termsAccepted) {
      alert('Please accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!validateForPublish()) {
      return;
    }

    // Check email verification
    if (!user?.email_confirmed_at) {
      alert('Please verify your email address before creating a listing. Check your inbox for the verification link.');
      return;
    }

    setIsPublishing(true);

    try {
      console.log('📤 [Sell Page] Starting listing publication...');

      // Step 1: Upload photos (if any)
      let photoUrls: string[] = [];
      if (formData.photos.length > 0) {
        console.log(`📸 [Sell Page] Uploading ${formData.photos.length} photos...`);
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
        photoUrls = uploadData.urls;
        console.log(`✅ [Sell Page] Uploaded ${photoUrls.length} photos`);
      } else {
        console.log('📸 [Sell Page] No photos to upload');
      }

      // Step 2: Create listing
      console.log('📝 [Sell Page] Creating listing...');

      // Seller ID will be extracted from auth session on the server
      const listingData = {
        selectedGame: {
          ...formData.selectedGame,
          name: formData.selectedGameDisplayName || formData.selectedGame?.name // Use chosen display name
        },
        selectedVersion: formData.selectedVersion,
        photoUrls,
        condition: formData.condition,
        conditionNotes: formData.conditionNotes,
        allComponentsPresent: formData.allComponentsPresent,
        missingComponents: formData.missingComponents,
        price: formData.price,
        shippingLocalPickup: formData.shippingOptions.localPickup,
        shippingParcelLocker: formData.shippingOptions.parcelLocker,
        shippingNotes: formData.shippingNotes,
      };

      const listingResponse = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });

      if (!listingResponse.ok) {
        const errorData = await listingResponse.json();
        throw new Error(errorData.details || 'Failed to create listing');
      }

      const { listing } = await listingResponse.json();
      console.log(`✅ [Sell Page] Created listing ${listing.id}`);

      // Clear draft
      localStorage.removeItem('listing-draft');
      setHasDraft(false);

      // Show success modal
      setPublishedListingId(listing.id);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('❌ [Sell Page] Error publishing listing:', error);
      alert(`Failed to publish listing: ${error.message || 'Please try again.'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('listing-draft', JSON.stringify({ formData }));
    setHasDraft(true);
    alert('Draft saved! You can continue later from where you left off.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header with BGG Attribution */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">
          Sell a Game
        </h1>
        <a
          href="https://boardgamegeek.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
          title="Game data provided by BoardGameGeek"
        >
          <img
            src="/images/powered-by-bgg-rgb.svg"
            alt="Powered by BoardGameGeek"
            className="h-6 sm:h-10 w-auto"
          />
        </a>
      </div>

      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Draft Banner */}
      {showDraftBanner && hasDraft && (
        <Card padding="md" className="mb-6 bg-frost-ice/10 border border-frost-ice/30">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-polar-night mb-1">
                You have a saved draft
              </p>
              <p className="text-sm text-text-secondary mb-3">
                Would you like to continue where you left off?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleLoadDraft}
                  className="px-4 py-2 bg-frost-ice text-snow-white rounded-lg hover:bg-frost-ice/90 transition-colors text-sm font-medium"
                >
                  Load Draft
                </button>
                <button
                  onClick={handleDismissDraft}
                  className="px-4 py-2 bg-bg-secondary text-text rounded-lg hover:bg-border transition-colors text-sm font-medium"
                >
                  Start Fresh
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissDraft}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </Card>
      )}

      {/* Two-Column Layout: Form + Preview */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Form Sections (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
        {/* Section 1: Game Selection */}
        <CollapsibleSection
          title="Find Your Game"
          icon={<Dices className="w-6 h-6 text-frost-ice" />}
          isComplete={isGameSectionComplete}
          isExpanded={expandedSections.game}
          onToggle={() => toggleSection('game')}
          required
          subtitle={
            formData.selectedGame
              ? formData.selectedGameDisplayName || formData.selectedGame.name
              : "Start typing to search thousands of board games"
          }
        >
          <div className="space-y-6">
            <GameSearch
              selectedGame={formData.selectedGame}
              selectedVersion={formData.selectedVersion}
              onSelect={handleGameSelect}
              onChangeVersion={handleChangeVersion}
              hideChangeVersionButton={true}
            />

            {/* Only show version selector when game is selected but version is not */}
            {formData.selectedGame && !formData.selectedVersion && (
              <>
                {isLoadingGameDetails ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice" />
                    <p className="mt-4 text-text-secondary">Loading game details...</p>
                  </div>
                ) : (
                  <LanguageVersionSelector
                    game={formData.selectedGame}
                    selectedVersion={formData.selectedVersion}
                    onSelect={handleVersionSelect}
                    fallbackMode={fallbackMode}
                    fallbackReason={fallbackReason}
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
                  console.log('[GameNameSelector] Auto-completed with primary name');
                }}
                onChangeName={handleChangeName}
                hideChangeNameButton={true}
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

              const showChangeName = hasAlternateNames && !hasEnglish && formData.selectedGameDisplayName;

              return (
                <div className={`grid grid-cols-1 ${showChangeName ? 'md:grid-cols-2' : ''} gap-3`}>
                  <button
                    onClick={handleChangeVersion}
                    className="px-4 py-2 text-sm font-medium text-frost-ice hover:text-aurora-blue border-2 border-frost-ice/30 hover:border-frost-ice rounded-lg hover:bg-frost-ice/5 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Change Version
                  </button>
                  {showChangeName && (
                    <button
                      onClick={handleChangeName}
                      className="px-4 py-2 text-sm font-medium text-frost-ice hover:text-aurora-blue border-2 border-frost-ice/30 hover:border-frost-ice rounded-lg hover:bg-frost-ice/5 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Change Name
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </CollapsibleSection>

        {/* Section 2: Condition */}
        <CollapsibleSection
          title="Condition & Details"
          icon={<ClipboardCheck className="w-6 h-6 text-frost-ice" />}
          isComplete={isConditionSectionComplete}
          isExpanded={expandedSections.condition}
          onToggle={() => toggleSection('condition')}
          required
          subtitle="Be honest - buyers appreciate transparency"
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
          title="Upload Photos"
          icon={<Camera className="w-6 h-6 text-frost-ice" />}
          isExpanded={expandedSections.photos}
          onToggle={() => toggleSection('photos')}
          required={formData.condition === 'acceptable'}
          subtitle={
            formData.condition === 'acceptable'
              ? 'At least 1 photo required to show condition'
              : 'Add up to 8 photos (optional but recommended)'
          }
        >
          <PhotoUpload
            photos={formData.photos}
            onPhotosChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
            maxPhotos={8}
            condition={formData.condition}
          />
        </CollapsibleSection>

        {/* Section 4: Pricing & Shipping */}
        <CollapsibleSection
          title="Pricing & Shipping"
          icon={<Euro className="w-6 h-6 text-frost-ice" />}
          isComplete={isPricingSectionComplete}
          isExpanded={expandedSections.pricing}
          onToggle={() => toggleSection('pricing')}
          required
          subtitle="Set your price and shipping options"
        >
          <PricingShippingSimple
            price={formData.price}
            shippingOptions={formData.shippingOptions}
            shippingNotes={formData.shippingNotes}
            onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
          />
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
              I agree to the{' '}
              <a href="/terms" className="text-frost-ice hover:underline">
                Terms of Service
              </a>{' '}
              and confirm that all information provided is accurate. I understand that Second
              Turn Games reserves the right to remove listings that don't meet our guidelines.
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
              {isPublishing ? 'Publishing...' : 'Publish Listing'}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowMobilePreview(true)}
              size="lg"
              fullWidth
            >
              Preview
            </Button>

            <Button
              variant="ghost"
              onClick={handleSaveDraft}
              size="lg"
              fullWidth
            >
              Save Draft
            </Button>
          </div>

          {/* Desktop: Regular button row */}
          <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
            <Button
              variant="ghost"
              onClick={handleSaveDraft}
              size="lg"
            >
              Save Draft
            </Button>

            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={!canPublish() || isPublishing}
              size="lg"
            >
              {isPublishing ? 'Publishing...' : 'Publish Listing'}
            </Button>
          </div>
        </div>
        </div>
        {/* End Left Column */}
      </div>

        {/* Right Column: Live Preview (5 cols on desktop, hidden on mobile/tablet) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-8">
            {/* Live Preview with Card */}
            <div className="border-2 border-border rounded-lg overflow-hidden [&>a>div]:border-0 [&>a>div]:rounded-none">
              <div className="px-4 py-2 bg-bg-elevated border-b-2 border-border">
                <span className="text-sm font-semibold text-polar-night">Live Preview</span>
              </div>
              <ListingCard
                listing={createPreviewListing(formData, user, profile)}
                showSeller={true}
              />
            </div>
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
            Listing Published Successfully!
          </h2>
          <p className="text-text-secondary mb-8">
            Your game is now live and ready for buyers to discover.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={() => router.push(`/listing/${publishedListingId}`)}
              fullWidth
            >
              View Your Listing
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
              List Another Game
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/browse');
              }}
              fullWidth
            >
              Browse Marketplace
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mobile Preview Modal */}
      <Modal
        open={showMobilePreview}
        onClose={() => setShowMobilePreview(false)}
        title="Live Preview"
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto pb-4">
          <ListingCard
            listing={createPreviewListing(formData, user, profile)}
            showSeller={true}
          />
        </div>
      </Modal>
    </div>
  );
}
