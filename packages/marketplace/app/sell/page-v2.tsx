'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import type { BGGGame, BGGVersion } from '@/lib/bgg-api';
import { GameSearch } from '@/components/sell/GameSearch';
import { LanguageVersionSelector } from '@/components/sell/LanguageVersionSelector';
import { GameSelectionPreview } from '@/components/sell/GameSelectionPreview';
import { ConditionSelector } from '@/components/sell/ConditionSelector';
import { PhotoUpload, type PhotoFile } from '@/components/sell/PhotoUpload';
import { PricingShippingSimple } from '@/components/sell/PricingShippingSimple';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';

interface ListingFormData {
  selectedGame: BGGGame | null;
  selectedVersion: BGGVersion | null;
  photos: PhotoFile[];
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | null;
  conditionNotes: string;
  allComponentsPresent: boolean;
  missingComponents: string;
  extras: {
    sleeved: boolean;
    promos: boolean;
    customInsert: boolean;
    other: string;
  };
  price: string;
  acceptOffers: boolean;
  minimumOffer: string;
  shippingOptions: {
    standard: boolean;
    express: boolean;
    localPickup: boolean;
  };
  pickupCity: string;
  shippingNotes: string;
  whySelling: string;
  termsAccepted: boolean;
}

const INITIAL_FORM_DATA: ListingFormData = {
  selectedGame: null,
  selectedVersion: null,
  photos: [],
  condition: null,
  conditionNotes: '',
  allComponentsPresent: true,
  missingComponents: '',
  extras: {
    sleeved: false,
    promos: false,
    customInsert: false,
    other: '',
  },
  price: '',
  acceptOffers: false,
  minimumOffer: '',
  shippingOptions: {
    standard: true,
    express: false,
    localPickup: false,
  },
  pickupCity: '',
  shippingNotes: '',
  whySelling: '',
  termsAccepted: false,
};

export default function SellPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ListingFormData>(INITIAL_FORM_DATA);
  const [isPublishing, setIsPublishing] = useState(false);

  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    game: true,      // Always start with game section open
    photos: false,
    condition: false,
    pricing: false,
    additional: false,
  });

  // Stable callback for version selection
  const handleVersionSelect = useCallback((version: BGGVersion) => {
    setFormData((prev) => ({ ...prev, selectedVersion: version }));
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('listing-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData({ ...INITIAL_FORM_DATA, ...parsed.formData });
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  // Save draft to localStorage when form data changes
  useEffect(() => {
    if (formData.selectedGame || formData.photos.length > 0 || formData.price) {
      localStorage.setItem('listing-draft', JSON.stringify({ formData }));
    }
  }, [formData]);

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
    const gameComplete = !!formData.selectedGame && !!formData.selectedVersion;
    const photosComplete = formData.photos.length >= 3;
    const conditionComplete = !!formData.condition;
    const pricingComplete = !!formData.price && parseFloat(formData.price) > 0 &&
      Object.values(formData.shippingOptions).some((v) => v);

    // Auto-expand next section that needs completion
    setExpandedSections((prev) => ({
      ...prev,
      photos: gameComplete || prev.photos,
      condition: (gameComplete && photosComplete) || prev.condition,
      pricing: (gameComplete && photosComplete && conditionComplete) || prev.pricing,
      additional: true, // Always expanded (optional section)
    }));
  }, [
    formData.selectedGame,
    formData.selectedVersion,
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
  const isGameSectionComplete = !!formData.selectedGame && !!formData.selectedVersion;
  const isPhotosSectionComplete = formData.photos.length >= 3;
  const isConditionSectionComplete = !!formData.condition;
  const isPricingSectionComplete =
    !!formData.price &&
    parseFloat(formData.price) > 0 &&
    Object.values(formData.shippingOptions).some((v) => v) &&
    (!formData.shippingOptions.localPickup || !!formData.pickupCity);

  const canPublish = (): boolean => {
    return (
      isGameSectionComplete &&
      isPhotosSectionComplete &&
      isConditionSectionComplete &&
      isPricingSectionComplete &&
      formData.termsAccepted
    );
  };

  const validateForPublish = (): boolean => {
    if (!isGameSectionComplete) {
      alert('Please select a game and version');
      return false;
    }
    if (!isPhotosSectionComplete) {
      alert('Please upload at least 3 photos');
      return false;
    }
    if (!isConditionSectionComplete) {
      alert('Please select the condition of your game');
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
      if (formData.shippingOptions.localPickup && !formData.pickupCity) {
        alert('Please select your city for local pickup');
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

    setIsPublishing(true);

    try {
      // TODO: Implement photo upload and listing creation
      console.log('Publishing listing:', formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clear draft
      localStorage.removeItem('listing-draft');

      // Show success message
      alert('Success! Your listing has been published.');

      // Redirect to browse page
      router.push('/browse');
    } catch (error) {
      console.error('Error publishing listing:', error);
      alert('Failed to publish listing. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => {
    alert('Draft saved! You can continue later from where you left off.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
          Sell Your Board Game
        </h1>
        <p className="text-text-secondary">
          Fill out the sections below to create your listing
        </p>
      </div>

      {/* BGG Attribution */}
      <div className="mb-6 flex justify-end">
        <a
          href="https://boardgamegeek.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-70 hover:opacity-100 transition-opacity"
          title="Game data provided by BoardGameGeek"
        >
          <img
            src="/images/powered-by-bgg-rgb.svg"
            alt="Powered by BoardGameGeek"
            className="h-8 sm:h-10 w-auto"
          />
        </a>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Section 1: Game Selection */}
        <CollapsibleSection
          title="Find Your Game"
          icon="🎲"
          isComplete={isGameSectionComplete}
          isExpanded={expandedSections.game}
          onToggle={() => toggleSection('game')}
          required
          subtitle="Search BoardGameGeek's database to find your exact edition"
        >
          <div className="space-y-6">
            <GameSearch
              selectedGame={formData.selectedGame}
              onSelect={(game) => setFormData((prev) => ({ ...prev, selectedGame: game, selectedVersion: null }))}
            />

            {formData.selectedGame && (
              <LanguageVersionSelector
                game={formData.selectedGame}
                selectedVersion={formData.selectedVersion}
                onSelect={handleVersionSelect}
              />
            )}

            {formData.selectedVersion && (
              <GameSelectionPreview
                game={formData.selectedGame!}
                version={formData.selectedVersion}
              />
            )}
          </div>
        </CollapsibleSection>

        {/* Section 2: Photos */}
        <CollapsibleSection
          title="Upload Photos"
          icon="📸"
          isComplete={isPhotosSectionComplete}
          isExpanded={expandedSections.photos}
          onToggle={() => toggleSection('photos')}
          required
          subtitle="Add at least 3 quality photos - buyers love seeing what they're getting"
        >
          <PhotoUpload
            photos={formData.photos}
            onChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
            maxPhotos={8}
          />
        </CollapsibleSection>

        {/* Section 3: Condition */}
        <CollapsibleSection
          title="Condition & Details"
          icon="⭐"
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
            extras={formData.extras}
            onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
          />
        </CollapsibleSection>

        {/* Section 4: Pricing & Shipping */}
        <CollapsibleSection
          title="Pricing & Shipping"
          icon="💶"
          isComplete={isPricingSectionComplete}
          isExpanded={expandedSections.pricing}
          onToggle={() => toggleSection('pricing')}
          required
          subtitle="Set your price and shipping options"
        >
          <PricingShippingSimple
            price={formData.price}
            acceptOffers={formData.acceptOffers}
            minimumOffer={formData.minimumOffer}
            shippingOptions={formData.shippingOptions}
            pickupCity={formData.pickupCity}
            onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
          />
        </CollapsibleSection>

        {/* Section 5: Additional Info (Optional - always expanded) */}
        <CollapsibleSection
          title="Additional Information"
          icon="💬"
          isComplete={true}
          isExpanded={expandedSections.additional}
          onToggle={() => toggleSection('additional')}
          subtitle="Optional - Add shipping notes or tell buyers why you're selling"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-base font-medium text-polar-night mb-2">
                Additional Shipping Notes (Optional)
              </label>
              <textarea
                value={formData.shippingNotes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, shippingNotes: e.target.value }))}
                placeholder="e.g., Can combine shipping if buying multiple games, prefer meeting at central locations..."
                className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white resize-none"
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-text-muted mt-1">
                {(formData.shippingNotes || '').length}/300 characters
              </p>
            </div>

            <div>
              <label className="block text-base font-medium text-polar-night mb-2">
                Why I'm Selling (Optional)
              </label>
              <p className="text-sm text-text-secondary mb-3">
                A personal touch helps buyers connect with sellers
              </p>
              <textarea
                value={formData.whySelling || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, whySelling: e.target.value }))}
                placeholder="e.g., Moving abroad and downsizing collection, gaming preferences evolved, completed campaign..."
                className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white resize-none"
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-text-muted mt-1">
                {(formData.whySelling || '').length}/300 characters
              </p>
            </div>
          </div>
        </CollapsibleSection>
      </div>

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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sticky bottom-0 bg-bg pt-4 border-t border-border-subtle -mx-4 sm:mx-0 px-4 sm:px-0 py-4 sm:py-0 sm:pt-4 sm:static sm:border-t-0">
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            size="lg"
            className="order-2 sm:order-1"
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            onClick={handlePublish}
            disabled={!canPublish() || isPublishing}
            size="lg"
            className="order-1 sm:order-2 flex-1 sm:flex-initial"
          >
            {isPublishing ? 'Publishing...' : 'Publish Listing'}
          </Button>
        </div>
      </div>
    </div>
  );
}
