'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import type { BGGGame, BGGVersion } from '@/lib/bgg-api';
import { GameSearch } from '@/components/sell/GameSearch';
import { LanguageVersionSelector } from '@/components/sell/LanguageVersionSelector';
import { GameSelectionPreview } from '@/components/sell/GameSelectionPreview';
import { ConditionSelector } from '@/components/sell/ConditionSelector';
import { PhotoUpload, type PhotoFile } from '@/components/sell/PhotoUpload';
import { PricingShipping } from '@/components/sell/PricingShipping';
import { ListingReview } from '@/components/sell/ListingReview';

interface ListingFormData {
  // Step 1: Game & Version
  selectedGame: BGGGame | null;
  selectedVersion: BGGVersion | null;
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

  // Step 2: Photos & Pricing
  photos: PhotoFile[];
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

  // Step 3: Review
  termsAccepted: boolean;
}

const INITIAL_FORM_DATA: ListingFormData = {
  selectedGame: null,
  selectedVersion: null,
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
  photos: [],
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
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ListingFormData>(INITIAL_FORM_DATA);
  const [isPublishing, setIsPublishing] = useState(false);

  // Stable callback for version selection (prevents useEffect loop in child)
  const handleVersionSelect = useCallback((version: BGGVersion) => {
    setFormData((prev) => ({ ...prev, selectedVersion: version }));
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('listing-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        // Merge with INITIAL_FORM_DATA to ensure all fields exist (handles old drafts)
        setFormData({ ...INITIAL_FORM_DATA, ...parsed.formData });
        setCurrentStep(parsed.currentStep);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  // Save draft to localStorage when form data changes
  useEffect(() => {
    if (formData.selectedGame || formData.photos.length > 0 || formData.price) {
      localStorage.setItem(
        'listing-draft',
        JSON.stringify({ formData, currentStep })
      );
    }
  }, [formData, currentStep]);

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

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleContinue = () => {
    if (currentStep === 1 && canContinue()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePublish = async () => {
    if (!formData.termsAccepted) {
      alert('Please accept the terms and conditions');
      return;
    }

    setIsPublishing(true);

    try {
      // TODO: Implement photo upload and listing creation
      console.log('Publishing listing:', formData);

      // For now, just simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clear draft
      localStorage.removeItem('listing-draft');

      // Show success message
      alert('Success! Your listing has been published.');

      // Redirect to browse page (later will redirect to new listing)
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

  // Check if step is complete (no alerts, just returns boolean)
  const isStepComplete = (step: number): boolean => {
    if (step === 1) {
      // Step 1: Only need game and version selected
      return !!formData.selectedGame && !!formData.selectedVersion;
    }
    if (step === 2) {
      // Step 2: Need condition, photos, price, and shipping
      return (
        !!formData.condition &&
        formData.photos.length >= 3 &&
        !!formData.price &&
        parseFloat(formData.price) > 0 &&
        Object.values(formData.shippingOptions).some((v) => v) &&
        (!formData.shippingOptions.localPickup || !!formData.pickupCity)
      );
    }
    return true;
  };

  const canContinue = (): boolean => {
    return isStepComplete(currentStep);
  };

  // Validate step with user-friendly alerts (only call on Continue click)
  const validateStep2 = (): boolean => {
    // Must have condition selected
    if (!formData.condition) {
      alert('Please select the condition of your game');
      return false;
    }
    // Must have at least 3 photos
    if (formData.photos.length < 3) {
      alert('Please upload at least 3 photos to help buyers understand the condition');
      return false;
    }
    // Must have price
    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert('Please enter a valid price');
      return false;
    }
    // Must have shipping option
    const hasShipping = Object.values(formData.shippingOptions).some((v) => v);
    if (!hasShipping) {
      alert('Please select at least one shipping option');
      return false;
    }
    // If local pickup, must have city
    if (formData.shippingOptions.localPickup && !formData.pickupCity) {
      alert('Please select your city for local pickup');
      return false;
    }
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Progress Indicator */}
      <div className="mb-8 sm:mb-12">
        <div className="flex items-center justify-between">
          {[
            { id: 1, name: 'Game Selection' },
            { id: 2, name: 'Details' },
            { id: 3, name: 'Review' },
          ].map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-colors ${
                    step.id < currentStep
                      ? 'bg-frost-ice text-snow-white'
                      : step.id === currentStep
                      ? 'bg-frost-ice text-snow-white'
                      : 'bg-border text-text-muted'
                  }`}
                >
                  {step.id < currentStep ? '✓' : step.id}
                </div>
                <span className="text-[10px] sm:text-xs mt-1 sm:mt-2 text-center text-text-secondary max-w-[80px] sm:max-w-none">
                  {step.name}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={`h-0.5 flex-1 -mt-4 sm:-mt-6 transition-colors ${
                    step.id < currentStep ? 'bg-frost-ice' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <div className="space-y-8">
            {/* Section 1: Game Search - Always visible */}
            <div className="transition-opacity duration-300">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">
                    What game are you selling?
                  </h2>
                  <p className="text-sm sm:text-base text-text-secondary">
                    Search BoardGameGeek's database to find your game
                  </p>
                </div>
                {/* BGG Attribution - Required by API Terms of Use */}
                <a
                  href="https://boardgamegeek.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                  title="Game data provided by BoardGameGeek"
                >
                  <img
                    src="/images/powered-by-bgg-rgb.svg"
                    alt="Powered by BoardGameGeek"
                    className="h-8 sm:h-10 w-auto"
                  />
                </a>
              </div>
              <GameSearch
                selectedGame={formData.selectedGame}
                onSelect={(game) => setFormData((prev) => ({
                  ...prev,
                  selectedGame: game,
                  selectedVersion: null, // Reset version when game changes
                  condition: null, // Reset condition too
                }))}
              />
            </div>

            {/* Section 2: Version Details - Appears when game is selected */}
            {formData.selectedGame && (
              <div className="transition-opacity duration-300 animate-fade-in border-t border-border-subtle pt-8">
                <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">
                  Which version do you have?
                </h2>
                <p className="text-sm sm:text-base text-text-secondary mb-6">
                  Select the language first, then choose your specific version
                </p>
                <LanguageVersionSelector
                  game={formData.selectedGame}
                  selectedVersion={formData.selectedVersion}
                  onSelect={handleVersionSelect}
                />

                {/* Preview - Appears when version is selected */}
                {formData.selectedVersion && (
                  <GameSelectionPreview
                    game={formData.selectedGame}
                    version={formData.selectedVersion}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8">
            {/* Condition */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">
                Describe the condition
              </h2>
              <p className="text-sm sm:text-base text-text-secondary mb-6">
                Help buyers understand what they're getting
              </p>
              <ConditionSelector
                condition={formData.condition}
                conditionNotes={formData.conditionNotes}
                allComponentsPresent={formData.allComponentsPresent}
                missingComponents={formData.missingComponents}
                extras={formData.extras}
                onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
              />
            </div>

            {/* Photos */}
            <div className="border-t border-border-subtle pt-8">
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">
                Upload photos
              </h2>
              <p className="text-sm sm:text-base text-text-secondary mb-6">
                Add clear photos to show the condition
              </p>
              <PhotoUpload
                photos={formData.photos}
                onPhotosChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
              />
            </div>

            {/* Pricing & Shipping */}
            <div className="border-t border-border-subtle pt-8">
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">
                Pricing & Shipping
              </h2>
              <p className="text-sm sm:text-base text-text-secondary mb-6">
                Set your price and shipping options
              </p>
              <PricingShipping
                price={formData.price}
                acceptOffers={formData.acceptOffers}
                minimumOffer={formData.minimumOffer}
                shippingOptions={formData.shippingOptions}
                pickupCity={formData.pickupCity}
                shippingNotes={formData.shippingNotes}
                whySelling={formData.whySelling}
                onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <ListingReview
            formData={formData}
            onEdit={(step) => setCurrentStep(step)}
            onPublish={handlePublish}
            isPublishing={isPublishing}
            onTermsChange={(accepted) => setFormData((prev) => ({ ...prev, termsAccepted: accepted }))}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 left-0 right-0 bg-bg sm:bg-transparent border-t border-border-subtle sm:border-t-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-4 sm:py-0 sm:pt-8 mt-8 sm:relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-shrink-0">
            {currentStep > 1 && (
              <Button variant="secondary" onClick={handleBack}>
                ← Back
              </Button>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 flex-1 sm:flex-initial justify-end">
            <Button variant="ghost" onClick={handleSaveDraft} size="sm">
              Save Draft
            </Button>

            {currentStep < 3 ? (
              <Button
                variant="primary"
                size="lg"
                onClick={handleContinue}
                disabled={!canContinue()}
              >
                Continue
              </Button>
            ) : (
              <Button variant="accent" size="lg" onClick={handlePublish}>
                Publish Listing
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
