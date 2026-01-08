'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Card } from '@second-turn/design-system';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { GameSearch } from '@/components/sell/GameSearch';
import { LanguageVersionSelector } from '@/components/sell/LanguageVersionSelector';
import { GameNameSelector } from '@/components/sell/GameNameSelector';
import { MinimumConditionSelector } from '@/components/wanted/MinimumConditionSelector';
import { WantedListingCard } from '@/components/wanted/WantedListingCard';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import type { BGGGame, VersionSelection } from '@/lib/bgg-types';
import type { ListingCondition } from '@/lib/types/listing';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import {  PuzzlePiece as Dices, CurrencyEuro as Euro, ClipboardCheck, LocationPin as MapPin, LightbulbOn as Lightbulb, RefreshCw, AlertCircle  } from 'griddy-icons';

function CreateWantedListingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  // Edit mode state
  const editListingId = searchParams.get('edit');
  const isEditMode = !!editListingId;
  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Form state
  const [selectedGame, setSelectedGame] = useState<BGGGame | null>(null);
  const [selectedGameDisplayName, setSelectedGameDisplayName] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<VersionSelection | null>(null);
  const [maxPrice, setMaxPrice] = useState('');
  const [minimumCondition, setMinimumCondition] = useState<ListingCondition | null>(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingGameDetails, setIsLoadingGameDetails] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>();

  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    game: true,      // Always start with game section open
    budget: false,
    condition: false,
    location: false,
  });

  // Helper to convert minimum condition to acceptable conditions array
  const getAcceptableConditions = (minimum: ListingCondition): ListingCondition[] => {
    const conditionHierarchy: ListingCondition[] = ['likeNew', 'veryGood', 'good', 'acceptable'];
    const minIndex = conditionHierarchy.indexOf(minimum);
    return conditionHierarchy.slice(0, minIndex + 1);
  };

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
      acceptable_conditions: minimumCondition ? getAcceptableConditions(minimumCondition) : [],
      preferred_language: null,
      location_preferences: location || null,
      notes: notes || null,

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
  const isConditionSectionComplete = !!minimumCondition;
  const isLocationSectionComplete = true; // Optional section, always "complete"

  const canPublish = (): boolean => {
    return isGameSectionComplete && isBudgetSectionComplete && isConditionSectionComplete;
  };

  // Progressive disclosure: Auto-expand next incomplete section
  useEffect(() => {
    const gameComplete = isGameSectionComplete;
    const budgetComplete = isBudgetSectionComplete;
    const conditionComplete = isConditionSectionComplete;

    setExpandedSections((prev) => ({
      ...prev,
      game: true, // Always keep game section visible
      budget: gameComplete || prev.budget,
      condition: (gameComplete && budgetComplete) || prev.condition,
      location: (gameComplete && budgetComplete && conditionComplete) || prev.location,
    }));
  }, [
    isGameSectionComplete,
    isBudgetSectionComplete,
    isConditionSectionComplete,
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
            setLoadError('Wanted listing not found');
          } else {
            setLoadError('Failed to load wanted listing');
          }
          return;
        }

        const data = await response.json();
        const listing = data.wantedListing;

        // Check if user owns this wanted listing
        if (listing.buyer_id !== user.id) {
          setLoadError('You do not have permission to edit this wanted listing');
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

        // Find the minimum acceptable condition (highest in hierarchy)
        if (listing.acceptable_conditions && listing.acceptable_conditions.length > 0) {
          const conditionHierarchy: ListingCondition[] = ['likeNew', 'veryGood', 'good', 'acceptable'];
          const acceptableSet = new Set(listing.acceptable_conditions);
          // Find the best (first in hierarchy) that's included
          const minCondition = conditionHierarchy.find(c => acceptableSet.has(c));
          if (minCondition) {
            setMinimumCondition(minCondition);
          }
        }

        setLocation(listing.location_preferences || '');
        setNotes(listing.notes || '');

        // Expand all sections since we have data
        setExpandedSections({
          game: true,
          budget: true,
          condition: true,
          location: true,
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
    } catch (error) {
      console.error('Error fetching game details:', error);
      setFallbackMode(true);
      setFallbackReason('Failed to load game details');
    } finally {
      setIsLoadingGameDetails(false);
    }
  }, []);

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
    if (!selectedGame || !selectedVersion || !maxPrice || parseFloat(maxPrice) <= 0 || !minimumCondition) {
      setError('Please complete all required fields');
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
          acceptable_conditions: getAcceptableConditions(minimumCondition),
          location_preferences: location || null,
          notes: notes || null,
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

        // Redirect to wanted listing detail page
        router.push(`/wanted/${editListingId}`);
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
            acceptableConditions: getAcceptableConditions(minimumCondition),
            locationPreferences: location || null,
            notes: notes || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create wanted listing');
        }

        console.log('✅ [Wanted New Page] Created wanted listing');

        // Success! Redirect to my listings page with wanted tab active
        router.push('/my-listings?tab=wanted');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Loading State for Edit Mode */}
      {isLoadingListing && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-frost-ice mx-auto mb-4 animate-spin" />
          <p className="text-text-secondary">Loading wanted listing...</p>
        </div>
      )}

      {/* Load Error */}
      {loadError && (
        <Card padding="lg" className="mb-6 bg-aurora-red/10 border border-aurora-red/20">
          <p className="text-aurora-red text-center">{loadError}</p>
          <div className="mt-4 text-center">
            <Button variant="secondary" onClick={() => router.push('/my-listings?tab=wanted')}>
              Back to My Listings
            </Button>
          </div>
        </Card>
      )}

      {/* Header */}
      {!isLoadingListing && !loadError && (
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            {isEditMode ? 'Edit Wanted Listing' : 'Post a Wanted Game'}
          </h1>
          <p className="text-text-secondary mt-2">
            {isEditMode
              ? 'Update your wanted game preferences'
              : 'Let sellers know what game you\'re looking for and they can offer to sell it to you'}
          </p>
        </div>
      )}

      {/* Two-Column Layout: Form + Preview */}
      {!isLoadingListing && !loadError && (
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Form Sections (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
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
                    Game and edition details cannot be changed. If you need to change the game, please delete this wanted listing and create a new one.
                  </span>
                </p>
              </div>
            </Card>
          ) : (
            <CollapsibleSection
            title="Find Your Game"
            icon={<Dices className="w-6 h-6 text-aurora-orange" />}
            isComplete={isGameSectionComplete}
            isExpanded={expandedSections.game}
            onToggle={() => toggleSection('game')}
            required
            subtitle={
              selectedGame
                ? selectedGameDisplayName || selectedGame.name
                : "Start typing to search thousands of board games"
            }
          >
            <div className="[&_input:focus]:!ring-aurora-orange/30 [&_input:focus]:!border-aurora-orange space-y-6">
              <GameSearch
                selectedGame={selectedGame}
                selectedVersion={selectedVersion}
                onSelect={handleGameSelect}
                onChangeVersion={handleChangeVersion}
                hideChangeVersionButton={true}
              />

              {/* Only show version selector when game is selected but version is not */}
              {selectedGame && !selectedVersion && (
                <>
                  {isLoadingGameDetails ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-orange" />
                      <p className="mt-4 text-text-secondary">Loading game details...</p>
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
                      Change Version
                    </button>
                    {showChangeName && (
                      <button
                        onClick={handleChangeName}
                        className="px-4 py-2 text-sm font-medium text-aurora-orange hover:text-aurora-orange/80 border-2 border-aurora-orange/30 hover:border-aurora-orange rounded-lg hover:bg-aurora-orange/5 transition-all flex items-center justify-center gap-2"
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
          )}

          {/* Section 2: Budget */}
          <CollapsibleSection
            title="Your Budget"
            icon={<Euro className="w-6 h-6 text-aurora-orange" />}
            isComplete={isBudgetSectionComplete}
            isExpanded={expandedSections.budget}
            onToggle={() => toggleSection('budget')}
            required
            subtitle="Set the maximum amount you're willing to pay"
          >
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Maximum Price (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="50.00"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-orange/30 focus:border-aurora-orange text-text bg-surface-0"
                required
              />
              <div className="flex items-start gap-2 mt-2 text-xs text-text-secondary">
                <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-aurora-orange" />
                <p>Sellers can offer games at any price, but setting a clear budget helps them understand your expectations</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 3: Minimum Condition */}
          <CollapsibleSection
            title="Minimum Condition"
            icon={<ClipboardCheck className="w-6 h-6 text-aurora-orange" />}
            isComplete={isConditionSectionComplete}
            isExpanded={expandedSections.condition}
            onToggle={() => toggleSection('condition')}
            required
            subtitle="What's the minimum condition you'll accept?"
          >
            <MinimumConditionSelector
              value={minimumCondition}
              onChange={setMinimumCondition}
            />
          </CollapsibleSection>

          {/* Section 4: Location & Details */}
          <CollapsibleSection
            title="Location & Details"
            icon={<MapPin className="w-6 h-6 text-aurora-orange" />}
            isExpanded={expandedSections.location}
            onToggle={() => toggleSection('location')}
            subtitle="Help sellers understand your location and preferences (optional)"
          >
            <div className="space-y-6">
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Your Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Riga, Latvia"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-orange/30 focus:border-aurora-orange text-text bg-surface-0"
                />
                <div className="flex items-start gap-2 mt-1 text-xs text-text-secondary">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-aurora-orange" />
                  <p>Helps sellers estimate shipping costs and timing</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-orange/30 focus:border-aurora-orange text-text bg-surface-0 resize-none"
                  rows={4}
                  placeholder="Any additional details about what you're looking for..."
                />
                <p className="text-xs text-text-secondary mt-1">
                  Examples: language preference, specific edition, local pickup preferred, etc.
                </p>
              </div>
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
                  ? (isEditMode ? 'Updating...' : 'Posting...')
                  : (isEditMode ? 'Update Wanted Listing' : 'Post Wanted Game')}
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
                  ? (isEditMode ? 'Updating...' : 'Posting...')
                  : (isEditMode ? 'Update Wanted Listing' : 'Post Wanted Game')}
              </Button>
            </div>
          </div>
        </div>
        {/* End Left Column */}

        {/* Right Column: Live Preview (5 cols on desktop, hidden on mobile/tablet) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-8">
            {/* Live Preview with Card */}
            <div className="border-2 border-border rounded-lg overflow-hidden [&>a>div]:border-0 [&>a>div]:rounded-none">
              <div className="px-4 py-2 bg-bg-elevated border-b-2 border-border">
                <span className="text-sm font-semibold text-polar-night">Live Preview</span>
              </div>
              <WantedListingCard
                wantedListing={createPreviewWantedListing()}
                showBuyer={false}
              />
            </div>
          </div>
        </div>
        {/* End Right Column */}
      </div>
      )}
      {/* End Two-Column Grid */}
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
