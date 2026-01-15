'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Card, Modal } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { GameSearch } from '@/components/sell/GameSearch';
import { LanguageVersionSelector } from '@/components/sell/LanguageVersionSelector';
import { GameNameSelector } from '@/components/sell/GameNameSelector';
import { WantedOfferCard } from '@/components/wanted/WantedOfferCard';
import { BudgetAssistant } from '@/components/wanted/BudgetAssistant';
import { ExistingSalesBanner } from '@/components/wanted/ExistingSalesBanner';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import type { BGGGame, VersionSelection } from '@/lib/bgg-types';
import type { ListingCondition } from '@/lib/types/listing';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { PuzzlePiece as Dices, CurrencyEuro as Euro, FileText as NotesIcon, LightbulbOn as Lightbulb, RefreshCw, AlertCircle, Check, Package } from 'griddy-icons';

function CreateWantedListingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const tSuccess = useTranslations('Wanted.SuccessModal');
  const t = useTranslations('Wanted.CreatePage');

  // Edit mode state
  const editListingId = searchParams.get('edit');
  const isEditMode = !!editListingId;
  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Pre-fill search query (from navbar search)
  const initialSearchQuery = searchParams.get('q');

  // Form state
  const [selectedGame, setSelectedGame] = useState<BGGGame | null>(null);
  const [selectedGameDisplayName, setSelectedGameDisplayName] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<VersionSelection | null>(null);
  const [maxPrice, setMaxPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Existing sales banner state
  const [existingSaleListings, setExistingSaleListings] = useState<any[]>([]);
  const [salesBannerDismissed, setSalesBannerDismissed] = useState(false);

  // Default acceptable conditions (all conditions)
  const defaultAcceptableConditions: ListingCondition[] = ['likeNew', 'veryGood', 'good', 'acceptable'];

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingGameDetails, setIsLoadingGameDetails] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    game: true,      // Always start with game section open
    budget: false,
    notes: false,
  });

  // Helper function to convert form data to wanted listing preview format
  const createPreviewWantedListing = (): WantedListingWithDetails => {
    return {
      id: 'preview',
      bgg_game_id: selectedGame?.id || 0,
      game_name: selectedGameDisplayName || selectedGame?.name || 'Select a game to preview',
      game_year: selectedGame?.yearPublished || null,

      // Version/Edition information
      version_source: 'bgg',
      bgg_version_id: selectedVersion?.id || null,
      version_name: selectedVersion?.name || null,
      publisher: selectedVersion?.publishers?.join(' | ') || selectedVersion?.publisher || null,
      language: selectedVersion?.languages?.join(' | ') || selectedVersion?.language || null,
      edition_year: selectedVersion?.yearPublished || null,
      version_thumbnail: selectedVersion?.thumbnail || null,
      version_image: selectedVersion?.image || null,

      // Budget
      min_price: null,
      max_price: parseFloat(maxPrice) || 0,
      currency: 'EUR',

      // Preferences
      acceptable_conditions: defaultAcceptableConditions,
      preferred_language: null,
      location_preferences: null,
      notes: notes || null,
      expansion_preference: 'base_only',

      // Buyer & Status
      buyer_id: user?.id || 'preview-buyer',
      status: 'active',

      // Response tracking
      response_count: 0,

      // Expiration
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now

      // Metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      // Game details
      game: {
        thumbnail: selectedVersion?.thumbnail || selectedGame?.thumbnail || null,
        image: selectedVersion?.image || selectedGame?.image || null,
        player_count: selectedGame?.playerCount || null,
        min_age: selectedGame?.minAge || null,
        playing_time: selectedGame?.playingTime || null,
        is_expansion: null,
      },

      // Buyer details
      buyer: {
        id: user?.id || 'preview-buyer',
        full_name: profile?.full_name || 'Your Name', // From user_profiles table
        email: profile?.email || user?.email || 'you@example.com', // From user_profiles table
        avatar_url: profile?.avatar_url || null, // From user_profiles table
        country: profile?.country || null, // From user_profiles table
      },
    };
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Section completion checks
  const isGameSectionComplete = (() => {
    // Basic requirements: game and version must be selected
    if (!selectedGame || !selectedVersion) {
      return false;
    }

    // Check if alternate name selection is required
    const hasAlternateNames = selectedGame.alternateNames && selectedGame.alternateNames.length > 0;

    // Get version language
    const versionLanguage = selectedVersion.language ||
      (selectedVersion.languages && selectedVersion.languages.length > 0
        ? selectedVersion.languages[0]
        : null);

    const isEnglish = versionLanguage === 'English';

    // If game has alternate names AND version is non-English, require explicit name selection
    if (hasAlternateNames && !isEnglish) {
      return !!selectedGameDisplayName;
    }

    return true;
  })();

  const isBudgetSectionComplete = !!maxPrice && parseFloat(maxPrice) > 0;

  const canPublish = (): boolean => {
    return isGameSectionComplete && isBudgetSectionComplete;
  };

  // Progressive disclosure: Auto-expand next incomplete section
  // Order: Game → Budget → Notes
  useEffect(() => {
    const gameComplete = isGameSectionComplete;
    const budgetComplete = isBudgetSectionComplete;

    setExpandedSections((prev) => ({
      ...prev,
      game: true, // Always keep game section visible
      budget: gameComplete || prev.budget,
      notes: (gameComplete && budgetComplete) || prev.notes,
    }));
  }, [
    isGameSectionComplete,
    isBudgetSectionComplete,
  ]);

  // Fetch wanted listing data for edit mode
  useEffect(() => {
    async function fetchWantedListingForEdit() {
      if (!isEditMode || !editListingId || !user) return;

      try {
        setIsLoadingListing(true);
        setLoadError('');

        const response = await fetch(`/api/wanted/${editListingId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setLoadError(t('errors.listingNotFound'));
          } else {
            setLoadError(t('errors.loadingFailed'));
          }
          return;
        }

        const data = await response.json();
        const listing = data.wantedListing;

        // Check if user owns this wanted listing
        if (listing.buyer_id !== user.id) {
          setLoadError(t('errors.permissionDenied'));
          return;
        }

        // Pre-populate form with wanted listing data
        setSelectedGame({
          id: listing.bgg_game_id,
          name: listing.game_name,
          yearPublished: listing.game_year || listing.edition_year,
          thumbnail: listing.version_thumbnail || listing.game?.thumbnail || null,
          image: listing.version_image || listing.game?.image || null,
          playerCount: listing.game?.player_count || null,
          minAge: listing.game?.min_age || null,
          playingTime: listing.game?.playing_time || null,
          alternateNames: undefined, // Not needed in edit mode
        });

        setSelectedGameDisplayName(listing.game_name);

        setSelectedVersion({
          id: 0,
          isManual: true,
          name: listing.version_name || '',
          publishers: listing.publisher ? listing.publisher.split(' | ') : [],
          publisher: listing.publisher || '',
          languages: listing.language ? listing.language.split(' | ') : [],
          language: listing.language || '',
          yearPublished: listing.edition_year || null,
          thumbnail: listing.version_thumbnail || null,
          image: listing.version_image || null,
        });

        setMaxPrice(listing.max_price?.toString() || '');
        setNotes(listing.notes || '');

        // Expand all sections since we have data
        setExpandedSections({
          game: true,
          budget: true,
          notes: true,
        });
      } catch (err: any) {
        console.error('Error fetching wanted listing for edit:', err);
        setLoadError(err.message || 'Failed to load wanted listing');
      } finally {
        setIsLoadingListing(false);
      }
    }

    fetchWantedListingForEdit();
  }, [isEditMode, editListingId, user]);

  const handleGameSelect = useCallback(async (game: BGGGame | null) => {
    setSelectedGame(game);
    setSelectedVersion(null);
    setSelectedGameDisplayName(null);
    setFallbackMode(false);
    setFallbackReason(undefined);

    // If game is null (clearing selection), clear everything and return
    if (!game) {
      setIsLoadingGameDetails(false);
      setExistingSaleListings([]);
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
          image: data.game.image,
          playerCount: data.game.player_count,
          minAge: data.game.min_age,
          playingTime: data.game.playing_time,
          alternateNames: data.game.alternate_names,
        };
        setSelectedGame(fullGameData);
      }

      if (data.fallbackMode) {
        console.log(`🔄 [Wanted New Page] Entering fallback mode: ${data.reason}`);
        setFallbackMode(true);
        setFallbackReason(data.reason);
      }

      // Check for existing sale listings
      try {
        const listingsRes = await fetch(`/api/games/${game.id}/listings`);
        if (listingsRes.ok) {
          const listingsData = await listingsRes.json();
          setExistingSaleListings(listingsData.listings || []);
          setSalesBannerDismissed(false);
        }
      } catch {
        // Silently fail - banner is optional
      }
    } catch (error) {
      console.error('Error fetching game details:', error);
      setFallbackMode(true);
      setFallbackReason(t('errors.gameDetailsFailed'));
    } finally {
      setIsLoadingGameDetails(false);
    }
  }, [t]);

  const handleVersionSelect = useCallback((version: VersionSelection) => {
    setSelectedVersion(version);
    setSelectedGameDisplayName(null); // Clear display name when version changes
  }, []);

  const handleChangeVersion = useCallback(() => {
    setSelectedVersion(null);
    setExpandedSections((prev) => ({ ...prev, game: true }));
  }, []);

  const handleChangeName = useCallback(() => {
    setSelectedGameDisplayName(null);
  }, []);

  const handlePublish = async () => {
    // Final validation
    if (!selectedGame || !selectedVersion || !maxPrice || parseFloat(maxPrice) <= 0) {
      setError(t('errors.completionRequired'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (isEditMode) {
        // Edit mode: Update existing wanted listing
        console.log('📝 [Wanted New Page] Updating wanted listing...');

        const updates = {
          min_price: null,
          max_price: parseFloat(maxPrice),
          acceptable_conditions: defaultAcceptableConditions,
          location_preferences: null,
          notes: notes || null,
          expansion_preference: 'base_only',
        };

        const response = await fetch(`/api/wanted/${editListingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update wanted listing');
        }

        console.log(`✅ [Wanted New Page] Updated wanted listing ${editListingId}`);

        // Redirect to game page with wanted section
        router.push(`/game/${selectedGame.id}#wanted`);
      } else {
        // Create mode: Create new wanted listing
        console.log('📝 [Wanted New Page] Creating wanted listing...');

        const response = await fetch('/api/wanted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedGame: {
              id: selectedGame.id,
              name: selectedGameDisplayName || selectedGame.name,
              yearPublished: selectedGame.yearPublished,
            },
            selectedVersion: selectedVersion,
            minPrice: null,
            maxPrice: parseFloat(maxPrice),
            acceptableConditions: defaultAcceptableConditions,
            locationPreferences: null,
            notes: notes || null,
            expansionPreference: 'base_only',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create wanted listing');
        }

        console.log('✅ [Wanted New Page] Created wanted listing');

        // Show success modal
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      console.error('Error saving wanted listing:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect to signin if not authenticated
  if (!user) {
    router.push('/auth/signin?redirect=/wanted/new');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Loading State for Edit Mode */}
      {isLoadingListing && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-frost-ice mx-auto mb-4 animate-spin" />
          <p className="text-text-secondary">{t('loading.listing')}</p>
        </div>
      )}

      {/* Load Error */}
      {loadError && (
        <Card padding="lg" className="mb-6 bg-aurora-red/10 border border-aurora-red/20">
          <p className="text-aurora-red text-center">{loadError}</p>
          <div className="mt-4 text-center">
            <Button variant="secondary" onClick={() => router.push('/my-listings?tab=wanted')}>
              {t('buttons.backToListings')}
            </Button>
          </div>
        </Card>
      )}

      {/* Header */}
      {!isLoadingListing && !loadError && (
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            {isEditMode ? t('pageTitleEdit') : t('pageTitle')}
          </h1>
          <p className="text-text-secondary mt-2">
            {isEditMode
              ? t('pageSubtitleEdit')
              : t('pageSubtitle')}
          </p>
        </div>
      )}

      {/* Two-Column Layout: Form + Preview */}
      {!isLoadingListing && !loadError && (
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Form Sections (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Section 1: Game Selection (or locked game info in edit mode) */}
          {isEditMode ? (
            // Locked read-only game info in edit mode
            <Card padding="lg" className="bg-bg-secondary">
              <div className="flex items-start gap-4">
                {(selectedVersion?.image || selectedGame?.image) && (
                  <img
                    src={selectedVersion?.image || selectedGame?.image || ''}
                    alt={selectedGameDisplayName || selectedGame?.name || ''}
                    className="w-24 h-24 rounded-lg object-cover border-2 border-border"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-polar-night mb-1">
                    {selectedGameDisplayName || selectedGame?.name}
                    {selectedVersion?.yearPublished && (
                      <span className="text-text-muted font-normal"> ({selectedVersion.yearPublished})</span>
                    )}
                  </h2>
                  <div className="space-y-1 text-sm text-text-secondary">
                    {selectedVersion?.name && (
                      <p><strong>Edition:</strong> {selectedVersion.name}</p>
                    )}
                    {selectedVersion?.language && (
                      <p><strong>Language:</strong> {selectedVersion.language}</p>
                    )}
                    {selectedVersion?.publisher && (
                      <p><strong>Publisher:</strong> {selectedVersion.publisher}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-aurora-orange/10 rounded-lg border border-aurora-orange/20">
                <p className="text-xs text-aurora-orange flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {t('helpers.editWarning')}
                  </span>
                </p>
              </div>
            </Card>
          ) : (
            <CollapsibleSection
            title={t('sections.findYourGame')}
            icon={<Dices className="w-6 h-6 text-aurora-orange" />}
            isComplete={isGameSectionComplete}
            isExpanded={expandedSections.game}
            onToggle={() => toggleSection('game')}
            required
            subtitle={
              selectedGame
                ? selectedGameDisplayName || selectedGame.name
                : t('sections.findYourGameSubtitle')
            }
          >
            <div className="[&_input:focus]:!ring-aurora-orange/30 [&_input:focus]:!border-aurora-orange space-y-6">
              <GameSearch
                selectedGame={selectedGame}
                selectedVersion={selectedVersion}
                onSelect={handleGameSelect}
                onChangeVersion={handleChangeVersion}
                hideChangeVersionButton={true}
                initialQuery={initialSearchQuery || undefined}
              />

              {/* Only show version selector when game is selected but version is not */}
              {selectedGame && !selectedVersion && (
                <>
                  {isLoadingGameDetails ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-orange" />
                      <p className="mt-4 text-text-secondary">{t('loading.gameDetails')}</p>
                    </div>
                  ) : (
                    <LanguageVersionSelector
                      game={selectedGame}
                      selectedVersion={selectedVersion}
                      onSelect={handleVersionSelect}
                      fallbackMode={fallbackMode}
                      fallbackReason={fallbackReason}
                    />
                  )}
                </>
              )}

              {/* Show game name selector AFTER version is selected (smart logic based on language) */}
              {selectedGame && selectedVersion && !isLoadingGameDetails && (
                <GameNameSelector
                  primaryName={selectedGame.name}
                  alternateNames={selectedGame.alternateNames || null}
                  selectedName={selectedGameDisplayName || ''}
                  selectedVersion={selectedVersion}
                  onChange={(name) => setSelectedGameDisplayName(name)}
                  onAutoComplete={() => {
                    console.log('[GameNameSelector] Auto-completed with primary name');
                  }}
                  onChangeName={handleChangeName}
                  hideChangeNameButton={true}
                />
              )}

              {/* Change Version and Change Name buttons */}
              {selectedGame && selectedVersion && !isLoadingGameDetails && (() => {
                // Determine if name selector was shown (same logic as GameNameSelector)
                const hasAlternateNames = selectedGame.alternateNames && selectedGame.alternateNames.length > 0;

                // Check if ANY language is English (not just the first one)
                let hasEnglish = false;
                if (selectedVersion.languages && selectedVersion.languages.length > 0) {
                  hasEnglish = selectedVersion.languages.includes('English');
                } else if (selectedVersion.language) {
                  hasEnglish = selectedVersion.language === 'English';
                }

                const showChangeName = hasAlternateNames && !hasEnglish && selectedGameDisplayName;

                return (
                  <div className={`grid grid-cols-1 ${showChangeName ? 'md:grid-cols-2' : ''} gap-3`}>
                    <button
                      onClick={handleChangeVersion}
                      className="px-4 py-2 text-sm font-medium text-aurora-orange hover:text-aurora-orange/80 border-2 border-aurora-orange/30 hover:border-aurora-orange rounded-lg hover:bg-aurora-orange/5 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('buttons.changeVersion')}
                    </button>
                    {showChangeName && (
                      <button
                        onClick={handleChangeName}
                        className="px-4 py-2 text-sm font-medium text-aurora-orange hover:text-aurora-orange/80 border-2 border-aurora-orange/30 hover:border-aurora-orange rounded-lg hover:bg-aurora-orange/5 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {t('buttons.changeName')}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </CollapsibleSection>
          )}

          {/* Existing Sales Banner - shown when game has active listings */}
          {existingSaleListings.length > 0 && !salesBannerDismissed && selectedGame && !isEditMode && (
            <ExistingSalesBanner
              gameId={selectedGame.id}
              gameName={selectedGame.name}
              listings={existingSaleListings}
              onDismiss={() => setSalesBannerDismissed(true)}
            />
          )}

          {/* Section 2: Budget */}
          <CollapsibleSection
            title={t('sections.yourBudget')}
            icon={<Euro className="w-6 h-6 text-aurora-orange" />}
            isComplete={isBudgetSectionComplete}
            isExpanded={expandedSections.budget}
            onToggle={() => toggleSection('budget')}
            required
            subtitle={t('sections.yourBudgetSubtitle')}
          >
            <div className="space-y-4">
              {/* Budget Assistant - shows pricing guidance when game is selected */}
              {selectedGame && (
                <BudgetAssistant
                  bggGameId={selectedGame.id}
                  minimumCondition="likeNew"
                  onFillBudget={(price) => setMaxPrice(price.toFixed(2))}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  {t('labels.maximumPrice')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder={t('placeholders.price')}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-orange/30 focus:border-aurora-orange text-text bg-surface-0"
                  required
                />
                <div className="flex items-start gap-2 mt-2 text-xs text-text-secondary">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-aurora-orange" />
                  <p>{t('helpers.budget')}</p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 3: Additional Notes */}
          <CollapsibleSection
            title={t('sections.additionalNotes')}
            icon={<NotesIcon className="w-6 h-6 text-aurora-orange" />}
            isExpanded={expandedSections.notes}
            onToggle={() => toggleSection('notes')}
            subtitle={t('sections.additionalNotesSubtitle')}
          >
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-orange/30 focus:border-aurora-orange text-text bg-surface-0 resize-none"
                rows={4}
                placeholder={t('placeholders.notes')}
              />
              <p className="text-xs text-text-secondary mt-1">
                {t('helpers.notes')}
              </p>
            </div>
          </CollapsibleSection>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg text-aurora-red text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 space-y-3 sm:space-y-0">
            {/* Mobile: Sticky bottom bar */}
            <div className="sm:hidden flex flex-col gap-3 sticky bottom-0 bg-bg-elevated border-t border-border-subtle shadow-lg -mx-4 px-4 py-4">
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={!canPublish() || submitting}
                size="lg"
                fullWidth
              >
                {submitting
                  ? (isEditMode ? t('buttons.updating') : t('buttons.posting'))
                  : (isEditMode ? t('buttons.updateWantedListing') : t('buttons.postWantedGame'))}
              </Button>
            </div>

            {/* Desktop: Regular button row */}
            <div className="hidden sm:flex sm:items-center sm:justify-end sm:gap-4">
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={!canPublish() || submitting}
                size="lg"
              >
                {submitting
                  ? (isEditMode ? t('buttons.updating') : t('buttons.posting'))
                  : (isEditMode ? t('buttons.updateWantedListing') : t('buttons.postWantedGame'))}
              </Button>
            </div>
          </div>
        </div>
        {/* End Left Column */}

        {/* Right Column: Live Preview (4 cols on desktop, hidden on mobile/tablet) */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="sticky top-8 space-y-3">
            {/* Live Preview Header - Orange themed */}
            <div className="px-3 py-2 bg-aurora-orange/10 border border-aurora-orange/30 rounded-lg">
              <span className="text-sm font-semibold text-aurora-orange">{t('preview.title')}</span>
            </div>
            {/* WantedOfferCard Preview - Force mobile layout via CSS overrides like sell page */}
            {selectedGame ? (
              <div className="[&_.sm\:grid]:!hidden [&_.sm\:hidden]:!flex [&_.sm\:hidden]:!flex-col [&_.hidden.sm\:flex]:!hidden [&_.hidden.sm\:block]:!hidden">
                <WantedOfferCard
                  wantedListing={createPreviewWantedListing()}
                  isPreview={true}
                />
              </div>
            ) : (
              <Card className="p-8 text-center border-2 border-dashed border-border">
                <Package className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">{t('preview.selectGame')}</p>
              </Card>
            )}
          </div>
        </div>
        {/* End Right Column */}
      </div>
      )}
      {/* End Two-Column Grid */}

      {/* Success Modal */}
      <Modal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/browse?type=wanted');
        }}
        size="md"
      >
        <div className="text-center py-6">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-aurora-green/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-aurora-green" />
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
              onClick={() => router.push(`/game/${selectedGame?.id}#wanted`)}
              fullWidth
            >
              {tSuccess('viewListing')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowSuccessModal(false);
                // Reset form for another listing
                setSelectedGame(null);
                setSelectedVersion(null);
                setSelectedGameDisplayName(null);
                setMaxPrice('');
                setNotes('');
                setExistingSaleListings([]);
                setSalesBannerDismissed(false);
                setExpandedSections({
                  game: true,
                  budget: false,
                  notes: false,
                });
              }}
              fullWidth
            >
              {tSuccess('postAnother')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/browse');
              }}
              fullWidth
            >
              {tSuccess('browseListings')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function CreateWantedListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-frost-ice mx-auto mb-4 animate-spin" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <CreateWantedListingPageContent />
    </Suspense>
  );
}

