'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Checkbox, Card, Badge, Modal } from '@second-turn/design-system';
import { searchBGGGames, getBGGGameById, type BGGGame } from '../../../lib/bgg-games';
import { conditionConfig } from '../../../lib/condition-config';
import { mockGames } from '../../../lib/mock-data';
import { NotificationModal } from '@/components/common/NotificationModal';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

const STEPS = [
  { id: 1, name: 'Game Selection', shortName: 'Game', mobileShort: 'Game' },
  { id: 2, name: 'Condition Details', shortName: 'Condition', mobileShort: 'Condition' },
  { id: 3, name: 'Photos', shortName: 'Photos', mobileShort: 'Photos' },
  { id: 4, name: 'Pricing & Shipping', shortName: 'Pricing', mobileShort: 'Price' },
  { id: 5, name: 'Review & Publish', shortName: 'Review', mobileShort: 'Review' },
];

interface PhotoFile {
  file: File;
  preview: string;
  isMain: boolean;
}

interface ListingFormData {
  // Step 1
  selectedGame: BGGGame | null;
  manualEntry: {
    title: string;
    year: string;
    designer: string;
    playerCount: string;
    playingTime: string;
  };

  // Step 2
  condition: keyof typeof conditionConfig | '';
  boxCondition: keyof typeof conditionConfig | '';
  componentCondition: keyof typeof conditionConfig | '';
  description: string;
  completeness: Record<string, boolean>;
  missingNotes: Record<string, string>;
  features: {
    originalBox: boolean;
    rulebookIncluded: boolean;
    cardsSleeved: boolean;
    includesExpansion: boolean;
    customInsert: boolean;
    smokeFree: boolean;
  };

  // Step 3
  photos: PhotoFile[];

  // Step 4
  price: string;
  shippingOptions: {
    standard: boolean;
    express: boolean;
    localPickup: boolean;
  };
  pickupCity: string;
  shippingNotes: string;
  whySelling: string;

  // Step 5
  termsAccepted: boolean;
}

export default function NewListingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BGGGame[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Modal states
  const [showLoadDraftConfirm, setShowLoadDraftConfirm] = useState(false);
  const [showDraftSavedModal, setShowDraftSavedModal] = useState(false);
  const [savedDraftData, setSavedDraftData] = useState<any>(null);

  const [formData, setFormData] = useState<ListingFormData>({
    selectedGame: null,
    manualEntry: {
      title: '',
      year: '',
      designer: '',
      playerCount: '',
      playingTime: '',
    },
    condition: '',
    boxCondition: '',
    componentCondition: '',
    description: '',
    completeness: {},
    missingNotes: {},
    features: {
      originalBox: true,
      rulebookIncluded: true,
      cardsSleeved: false,
      includesExpansion: false,
      customInsert: false,
      smokeFree: true,
    },
    photos: [],
    price: '',
    shippingOptions: {
      standard: true,
      express: false,
      localPickup: false,
    },
    pickupCity: '',
    shippingNotes: '',
    whySelling: '',
    termsAccepted: false,
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('listing-draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Ask user if they want to restore
        setSavedDraftData(parsed);
        setShowLoadDraftConfirm(true);
      } catch (e) {
        console.error('Failed to parse saved draft:', e);
      }
    }
  }, []);

  // Handler to load draft
  const handleLoadDraft = () => {
    if (savedDraftData) {
      setFormData(savedDraftData.formData);
      setCurrentStep(savedDraftData.currentStep);
    }
    setShowLoadDraftConfirm(false);
    setSavedDraftData(null);
  };

  // Handler to dismiss draft
  const handleDismissDraft = () => {
    localStorage.removeItem('listing-draft');
    setShowLoadDraftConfirm(false);
    setSavedDraftData(null);
  };

  // Search BGG games
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = searchBGGGames(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Initialize completeness checklist when game is selected
  useEffect(() => {
    if (formData.selectedGame && Object.keys(formData.completeness).length === 0) {
      const initialCompleteness: Record<string, boolean> = {};
      formData.selectedGame.components.forEach((component) => {
        initialCompleteness[component] = true;
      });
      setFormData((prev) => ({ ...prev, completeness: initialCompleteness }));
    }
  }, [formData.selectedGame]);

  const handleGameSelect = (game: BGGGame) => {
    setFormData((prev) => ({ ...prev, selectedGame: game }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoFile[] = [];
    Array.from(files).forEach((file) => {
      if (file.size <= 5 * 1024 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png')) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
          isMain: formData.photos.length === 0 && newPhotos.length === 0,
        });
      }
    });

    setFormData((prev) => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => {
      const newPhotos = [...prev.photos];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      // If removed photo was main, make first photo main
      if (newPhotos.length > 0 && !newPhotos.some((p) => p.isMain)) {
        newPhotos[0].isMain = true;
      }
      return { ...prev, photos: newPhotos };
    });
  };

  const setMainPhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((p, i) => ({ ...p, isMain: i === index })),
    }));
  };

  const saveDraft = () => {
    localStorage.setItem('listing-draft', JSON.stringify({ formData, currentStep }));
    setShowDraftSavedModal(true);
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1:
        return formData.selectedGame !== null || (
          formData.manualEntry.title &&
          formData.manualEntry.year &&
          formData.manualEntry.designer
        );
      case 2:
        return formData.condition && formData.description.length >= 50;
      case 3:
        return formData.photos.length >= 3;
      case 4:
        return formData.price && (
          formData.shippingOptions.standard ||
          formData.shippingOptions.express ||
          formData.shippingOptions.localPickup
        );
      case 5:
        return formData.termsAccepted;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePublish = () => {
    // Create mock listing
    const newListing = {
      id: `${Date.now()}`,
      title: formData.selectedGame?.title || formData.manualEntry.title,
      designer: formData.selectedGame?.designer || formData.manualEntry.designer,
      year: formData.selectedGame?.year || parseInt(formData.manualEntry.year),
      condition: formData.condition as any,
      price: parseFloat(formData.price),
      shipping: formData.shippingOptions.standard ? 5 : formData.shippingOptions.express ? 12 : 0,
      location: formData.pickupCity || 'Riga',
      playerCount: formData.selectedGame?.playerCount || formData.manualEntry.playerCount,
      playingTime: formData.selectedGame?.playingTime || formData.manualEntry.playingTime,
      category: 'strategy',
      seller: {
        username: 'you',
        rating: 5.0,
        verified: false,
      },
      imageUrl: formData.photos[0]?.preview || '/images/placeholder.jpg',
      images: formData.photos.map((p) => p.preview),
      detailedCondition: formData.description,
      completeness: Object.entries(formData.completeness).map(([item, present]) => ({
        item,
        present,
        note: formData.missingNotes[item] || undefined,
      })),
      description: formData.selectedGame?.description || '',
      bggRating: formData.selectedGame?.bggRating,
      ageRecommendation: formData.selectedGame?.ageRecommendation,
      complexity: formData.selectedGame?.complexity,
      shippingOptions: {
        standard: formData.shippingOptions.standard ? 5 : 0,
        express: formData.shippingOptions.express ? 12 : undefined,
        localPickup: formData.shippingOptions.localPickup,
      },
    };

    console.log('Publishing listing:', newListing);

    // Clear draft
    localStorage.removeItem('listing-draft');

    // Show success modal
    setSuccessModalOpen(true);
  };

  const handleSuccessClose = () => {
    setSuccessModalOpen(false);
    router.push('/browse');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Progress Indicator */}
      <div className="mb-8 sm:mb-12">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
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
                <span className="text-[10px] sm:text-xs mt-1 sm:mt-2 text-center text-text-secondary max-w-[50px] sm:max-w-none truncate">
                  {step.mobileShort}
                </span>
              </div>
              {index < STEPS.length - 1 && (
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

      {/* Step 1: Game Selection */}
      {currentStep === 1 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">{STEPS[0].name}</h2>
          <p className="text-sm sm:text-base text-text-secondary mb-6 sm:mb-8">
            Let's find your game in our database to automatically fill in details
          </p>

          {!formData.selectedGame && !showManualEntry && (
            <>
              <Input
                label=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for your game - try Catan, Wingspan, Pandemic..."
                className="text-lg mb-4"
              />

              {searchResults.length > 0 && (
                <div className="space-y-2 mb-6">
                  {searchResults.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className="w-full p-4 border border-border rounded-lg hover:border-frost-ice hover:bg-frost-ice/5 transition-all text-left"
                    >
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-bg-elevated rounded flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-text">{game.title}</h3>
                          <p className="text-sm text-text-secondary">
                            ({game.year}) • {game.designer}
                          </p>
                          <p className="text-xs text-text-muted">
                            {game.playerCount} players • {game.playingTime} min
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowManualEntry(true)}
              >
                Can't find your game? Enter manually
              </Button>
            </>
          )}

          {formData.selectedGame && (
            <Card>
              <div className="flex gap-6">
                <div className="w-32 h-32 bg-bg-elevated rounded flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-text mb-2">
                    {formData.selectedGame.title}
                  </h3>
                  <p className="text-text-secondary mb-4">
                    ({formData.selectedGame.year}) • {formData.selectedGame.designer}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-muted">Players:</span>{' '}
                      <span className="text-text">{formData.selectedGame.playerCount}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Time:</span>{' '}
                      <span className="text-text">{formData.selectedGame.playingTime} min</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Age:</span>{' '}
                      <span className="text-text">{formData.selectedGame.ageRecommendation}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Complexity:</span>{' '}
                      <span className="text-text">{formData.selectedGame.complexity}/5</span>
                    </div>
                  </div>
                  <p className="text-xs text-frost-ice mt-4">
                    ✓ Auto-filled from BoardGameGeek
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, selectedGame: null }))}
                    className="mt-2"
                  >
                    Change game
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {showManualEntry && !formData.selectedGame && (
            <Card>
              <h3 className="font-semibold text-text mb-4">Enter Game Details Manually</h3>
              <div className="space-y-4">
                <Input
                  label="Game Title *"
                  value={formData.manualEntry.title}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      manualEntry: { ...prev.manualEntry, title: e.target.value },
                    }))
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Year Published *"
                    value={formData.manualEntry.year}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        manualEntry: { ...prev.manualEntry, year: e.target.value },
                      }))
                    }
                    required
                  />
                  <Input
                    label="Designer *"
                    value={formData.manualEntry.designer}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        manualEntry: { ...prev.manualEntry, designer: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Player Count"
                    value={formData.manualEntry.playerCount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        manualEntry: { ...prev.manualEntry, playerCount: e.target.value },
                      }))
                    }
                    placeholder="e.g., 2-4"
                  />
                  <Input
                    label="Playing Time (minutes)"
                    value={formData.manualEntry.playingTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        manualEntry: { ...prev.manualEntry, playingTime: e.target.value },
                      }))
                    }
                    placeholder="e.g., 60"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowManualEntry(false)}
                >
                  Back to search
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Condition Details */}
      {currentStep === 2 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">{STEPS[1].name}</h2>
          <p className="text-sm sm:text-base text-text-secondary mb-6 sm:mb-8">
            Help buyers understand your game's condition with honest details
          </p>

          <div className="space-y-8">
            {/* Condition Selection */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-text mb-3 sm:mb-4">Overall Condition *</h3>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {(Object.keys(conditionConfig) as Array<keyof typeof conditionConfig>).map((key) => {
                  const config = conditionConfig[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setFormData((prev) => ({ ...prev, condition: key }))}
                      className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all min-h-[56px] ${
                        formData.condition === key
                          ? 'border-frost-ice bg-frost-ice/5'
                          : 'border-border hover:border-frost-ice/50'
                      }`}
                    >
                      <Badge variant={config.variant} size="sm" className="mb-2">
                        {config.label}
                      </Badge>
                      <p className="text-xs sm:text-sm text-text-secondary">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block font-medium text-text mb-2">
                Detailed Condition Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Example: Played about 10 times over 2 years. All cards were sleeved immediately so they're in perfect condition. Box has minor shelf wear on two corners but no tears or water damage. Stored in climate-controlled, smoke-free home. Selling because I'm moving abroad and need to reduce my collection."
                className="w-full min-h-[150px] px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-text bg-bg resize-none"
              />
              <p className="text-sm text-text-muted mt-2">
                {formData.description.length} characters (minimum 50 recommended)
              </p>
              <p className="text-xs text-text-secondary mt-1">
                💡 Detailed descriptions build buyer trust - mention how often you played it, any protective measures like sleeving, storage conditions, and why you're selling
              </p>
            </div>

            {/* Completeness Checklist */}
            {formData.selectedGame && (
              <div>
                <h3 className="font-semibold text-text mb-4">Verify All Components Are Present</h3>
                <Card>
                  <div className="space-y-3">
                    {formData.selectedGame.components.map((component) => (
                      <div key={component}>
                        <Checkbox
                          checked={formData.completeness[component] || false}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              completeness: { ...prev.completeness, [component]: e.target.checked },
                            }))
                          }
                          label={component}
                        />
                        {!formData.completeness[component] && (
                          <input
                            type="text"
                            value={formData.missingNotes[component] || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                missingNotes: { ...prev.missingNotes, [component]: e.target.value },
                              }))
                            }
                            placeholder="Explain what's missing and if there are workarounds..."
                            className="ml-6 mt-2 px-3 py-2 border border-border rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-frost-ice/30"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-text-muted">
                    ✓ {Object.values(formData.completeness).filter(Boolean).length} of{' '}
                    {formData.selectedGame.components.length} components marked as present
                  </p>
                </Card>
              </div>
            )}

            {/* Additional Features */}
            <div>
              <h3 className="font-semibold text-text mb-4">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Checkbox
                  checked={formData.features.originalBox}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      features: { ...prev.features, originalBox: e.target.checked },
                    }))
                  }
                  label="Original box included"
                />
                <Checkbox
                  checked={formData.features.rulebookIncluded}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      features: { ...prev.features, rulebookIncluded: e.target.checked },
                    }))
                  }
                  label="Rulebook included"
                />
                <Checkbox
                  checked={formData.features.cardsSleeved}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      features: { ...prev.features, cardsSleeved: e.target.checked },
                    }))
                  }
                  label="Cards are sleeved"
                />
                <Checkbox
                  checked={formData.features.includesExpansion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      features: { ...prev.features, includesExpansion: e.target.checked },
                    }))
                  }
                  label="Includes expansion(s)"
                />
                <Checkbox
                  checked={formData.features.customInsert}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      features: { ...prev.features, customInsert: e.target.checked },
                    }))
                  }
                  label="Custom insert/organizer"
                />
                <Checkbox
                  checked={formData.features.smokeFree}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      features: { ...prev.features, smokeFree: e.target.checked },
                    }))
                  }
                  label="Smoke-free home"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Photos */}
      {currentStep === 3 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">{STEPS[2].name}</h2>
          <p className="text-sm sm:text-base text-text-secondary mb-6 sm:mb-8">
            Clear photos help buyers understand condition and build trust
          </p>

          {/* Upload Zone */}
          <label className="block mb-6">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <div className="border-2 border-dashed border-border rounded-lg p-8 sm:p-12 text-center cursor-pointer hover:border-frost-ice hover:bg-frost-ice/5 transition-all min-h-[140px] flex flex-col items-center justify-center">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📷</div>
              <p className="text-sm sm:text-base font-medium text-text mb-1 sm:mb-2">Tap to upload photos</p>
              <p className="text-xs sm:text-sm text-text-secondary">
                JPEG or PNG, max 5MB per image
              </p>
            </div>
          </label>

          {/* Photo Grid */}
          {formData.photos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm sm:text-base font-semibold text-text mb-3 sm:mb-4">
                Uploaded Photos ({formData.photos.length}/8)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    {photo.isMain && (
                      <Badge variant="default" size="sm" className="absolute top-2 left-2">
                        Main Photo
                      </Badge>
                    )}
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 w-8 h-8 sm:w-7 sm:h-7 bg-polar-night/80 text-snow-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center text-lg sm:text-base"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                    {!photo.isMain && (
                      <button
                        onClick={() => setMainPhoto(index)}
                        className="absolute bottom-2 left-2 right-2 px-2 py-1.5 sm:py-1 bg-polar-night/80 text-snow-white text-xs rounded sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        Set as main
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidance */}
          <Card className="bg-frost-ice/5 border-frost-ice/20">
            <h4 className="font-semibold text-text mb-3">Photo Guidelines</h4>
            <div className="space-y-2 text-sm">
              <p className="text-text-secondary">
                <strong>Required photos (minimum 3):</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-text-secondary ml-2">
                <li>Game box front showing condition clearly</li>
                <li>Game components laid out to show completeness</li>
                <li>Any wear, damage, or imperfections close-up</li>
              </ul>
              <p className="text-text-secondary mt-3">
                <strong>Suggested optional photos:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-text-secondary ml-2">
                <li>Box back and sides</li>
                <li>Close-up of card condition</li>
                <li>Rulebook pages if included</li>
              </ul>
              <p className="text-frost-ice mt-3">
                💡 Honest photos build buyer trust and reduce returns
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Step 4: Pricing & Shipping */}
      {currentStep === 4 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">{STEPS[3].name}</h2>
          <p className="text-sm sm:text-base text-text-secondary mb-6 sm:mb-8">
            Set a fair price and choose shipping options
          </p>

          <div className="space-y-8">
            {/* Price */}
            <div>
              <Input
                label="Asking Price (€) *"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="25.00"
                required
              />
              {formData.selectedGame && (
                <p className="text-sm text-text-secondary mt-2">
                  💡 Similar games in {formData.condition ? conditionConfig[formData.condition as keyof typeof conditionConfig].label : 'used'} condition typically sell for €20-35
                </p>
              )}
            </div>

            {/* Shipping Options */}
            <div>
              <h3 className="font-semibold text-text mb-4">Shipping Options *</h3>
              <div className="space-y-3">
                <Checkbox
                  checked={formData.shippingOptions.standard}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shippingOptions: { ...prev.shippingOptions, standard: e.target.checked },
                    }))
                  }
                  label="Standard shipping - €5 (2-4 business days)"
                />
                <Checkbox
                  checked={formData.shippingOptions.express}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shippingOptions: { ...prev.shippingOptions, express: e.target.checked },
                    }))
                  }
                  label="Express shipping - €12 (1-2 business days)"
                />
                <Checkbox
                  checked={formData.shippingOptions.localPickup}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shippingOptions: { ...prev.shippingOptions, localPickup: e.target.checked },
                    }))
                  }
                  label="Local pickup - Free (meet at public location)"
                />
              </div>

              {formData.shippingOptions.localPickup && (
                <div className="mt-4">
                  <Select
                    label="Your City"
                    value={formData.pickupCity}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, pickupCity: value }))
                    }
                    options={[
                      { value: '', label: 'Select your city' },
                      { value: 'Riga', label: 'Riga' },
                      { value: 'Vilnius', label: 'Vilnius' },
                      { value: 'Tallinn', label: 'Tallinn' },
                      { value: 'Tartu', label: 'Tartu' },
                      { value: 'Kaunas', label: 'Kaunas' },
                      { value: 'Klaipeda', label: 'Klaipėda' },
                      { value: 'Pärnu', label: 'Pärnu' },
                    ]}
                  />
                  <p className="text-xs text-text-secondary mt-2">
                    💡 Local pickup is highlighted to buyers in your city
                  </p>
                </div>
              )}
            </div>

            {/* Shipping Notes */}
            <div>
              <label className="block font-medium text-text mb-2">
                Additional Shipping Notes (Optional)
              </label>
              <textarea
                value={formData.shippingNotes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, shippingNotes: e.target.value }))
                }
                placeholder="e.g., Can combine shipping if buying multiple games, prefer meeting at central locations..."
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-text bg-bg resize-none"
                rows={3}
              />
            </div>

            {/* Why Selling */}
            <div>
              <label className="block font-medium text-text mb-2">
                Why I'm Selling (Optional)
              </label>
              <textarea
                value={formData.whySelling}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, whySelling: e.target.value }))
                }
                placeholder="e.g., Moving abroad and downsizing, gaming preferences evolved, completed campaign..."
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-text bg-bg resize-none"
                rows={3}
              />
              <p className="text-xs text-text-secondary mt-2">
                💡 Personal context helps buyers connect with sellers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Review & Publish */}
      {currentStep === 5 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">{STEPS[4].name}</h2>
          <p className="text-sm sm:text-base text-text-secondary mb-6 sm:mb-8">
            Review your listing carefully before publishing
          </p>

          <Card className="mb-8">
            <div className="space-y-6">
              {/* Game Info */}
              <div>
                <h3 className="font-semibold text-text mb-3">Game Information</h3>
                <div className="flex gap-4 mb-4">
                  {formData.photos.length > 0 && (
                    <img
                      src={formData.photos[0].preview}
                      alt="Main"
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h4 className="text-lg font-bold text-text">
                      {formData.selectedGame?.title || formData.manualEntry.title}
                    </h4>
                    <p className="text-text-secondary">
                      {formData.selectedGame?.designer || formData.manualEntry.designer} (
                      {formData.selectedGame?.year || formData.manualEntry.year})
                    </p>
                    {formData.condition && (
                      <Badge variant={conditionConfig[formData.condition as keyof typeof conditionConfig].variant} className="mt-2">
                        {conditionConfig[formData.condition as keyof typeof conditionConfig].label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-text mb-2">Condition Description</h3>
                <p className="text-text-secondary">{formData.description}</p>
              </div>

              {/* Price */}
              <div>
                <h3 className="font-semibold text-text mb-2">Price</h3>
                <p className="text-2xl font-bold text-text">€{formData.price}</p>
                <p className="text-sm text-text-secondary">
                  + shipping{' '}
                  {formData.shippingOptions.standard && '(€5 standard)'}
                  {formData.shippingOptions.express && formData.shippingOptions.standard && ' or '}
                  {formData.shippingOptions.express && '(€12 express)'}
                  {formData.shippingOptions.localPickup && ' or free local pickup'}
                </p>
              </div>

              {/* Photos */}
              <div>
                <h3 className="font-semibold text-text mb-2">Photos ({formData.photos.length})</h3>
                <div className="grid grid-cols-4 gap-2">
                  {formData.photos.slice(0, 4).map((photo, i) => (
                    <img
                      key={i}
                      src={photo.preview}
                      alt={`${i + 1}`}
                      className="w-full aspect-square object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted mt-6 pt-6 border-t border-border-subtle">
              💡 This is how buyers will see your listing
            </p>
          </Card>

          {/* Terms */}
          <Card className="bg-frost-ice/5 border-frost-ice/20 mb-6">
            <Checkbox
              checked={formData.termsAccepted}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, termsAccepted: e.target.checked }))
              }
              label="I accurately described this game's condition including any wear or missing components, and I agree to ship within 2 business days or respond within 1 day to arrange local pickup"
              required
            />
          </Card>
        </div>
      )}

      {/* Navigation - Sticky on mobile */}
      <div className="sticky bottom-0 left-0 right-0 bg-bg sm:bg-transparent border-t border-border-subtle sm:border-t-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-4 sm:py-0 sm:pt-8 sm:relative">
        <div className="flex items-center justify-between gap-3 sm:gap-0">
          <div className="flex-shrink-0">
            {currentStep > 1 && (
              <>
                <Button variant="secondary" onClick={handleBack} className="hidden sm:inline-flex">
                  Back
                </Button>
                <Button variant="ghost" size="sm" onClick={handleBack} className="sm:hidden">
                  ← Back
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 flex-1 sm:flex-initial justify-end">
            <Button variant="ghost" onClick={saveDraft} size="sm" className="hidden sm:inline-flex">
              Save as Draft
            </Button>
            <Button variant="ghost" onClick={saveDraft} size="sm" className="sm:hidden">
              Save
            </Button>

            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                disabled={!canContinue()}
                className="flex-1 sm:flex-initial"
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="accent"
                size="lg"
                onClick={handlePublish}
                disabled={!canContinue()}
                className="flex-1 sm:flex-initial"
              >
                <span className="hidden sm:inline">🚀 Publish Listing</span>
                <span className="sm:hidden">Publish</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        open={successModalOpen}
        onClose={handleSuccessClose}
        title="Your game is now listed!"
      >
        <div className="text-center py-6">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-text mb-2">
            {formData.selectedGame?.title || formData.manualEntry.title}
          </h3>
          <p className="text-text-secondary mb-1">
            {formData.condition && conditionConfig[formData.condition as keyof typeof conditionConfig].label} • €{formData.price}
          </p>

          <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4 my-6">
            <p className="text-sm text-text-secondary">
              Your listing is now visible to buyers. We'll notify you when someone asks a question or makes a purchase. Fast responses build trust and increase sales!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="primary" fullWidth onClick={handleSuccessClose}>
              View My Listing
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setSuccessModalOpen(false);
                window.location.reload();
              }}
            >
              List Another Game
            </Button>
          </div>
        </div>
      </Modal>

      {/* Load Draft Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLoadDraftConfirm}
        onClose={handleDismissDraft}
        onConfirm={handleLoadDraft}
        title="Restore Draft"
        message="You have a saved draft. Would you like to continue where you left off?"
        confirmText="Continue"
        cancelText="Start Fresh"
      />

      {/* Draft Saved Modal */}
      <NotificationModal
        isOpen={showDraftSavedModal}
        onClose={() => setShowDraftSavedModal(false)}
        type="success"
        message="Draft saved! You can return later to continue."
      />
    </div>
  );
}
