'use client';

import { useState, useCallback, useRef } from 'react';
import type { BGGGame, BGGExpansionInfo } from '@/lib/bgg-api';
import type { VersionSelection } from '@/lib/bgg-types';
import type { PhotoFile } from '@/components/sell/PhotoUpload';
import type { TransactionMethod, PricingFormat, AuctionDuration, AuctionEndStrategy, AuctionCooldownHours } from '@/lib/types/listing';
import type { SelectedExpansion } from '@/components/sell/ExpansionSelector';

export interface ListingFormData {
  transactionMethod: TransactionMethod;
  pricingFormat: PricingFormat;
  selectedGame: BGGGame | null;
  selectedGameDisplayName: string | null;
  selectedVersion: VersionSelection | null;
  selectedExpansions: SelectedExpansion[];
  photos: PhotoFile[];
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | null;
  conditionNotes: string;
  allComponentsPresent: boolean;
  missingComponents: string;
  price: string;
  termsAccepted: boolean;
  auctionDurationDays: AuctionDuration;
  auctionEndStrategy: AuctionEndStrategy;
  auctionCooldownHours: AuctionCooldownHours;
}

export const INITIAL_FORM_DATA: ListingFormData = {
  transactionMethod: 'instant_buy',
  pricingFormat: 'fixed_price',
  selectedGame: null,
  selectedGameDisplayName: null,
  selectedVersion: null,
  selectedExpansions: [],
  photos: [],
  condition: 'good',
  conditionNotes: '',
  allComponentsPresent: true,
  missingComponents: '',
  price: '',
  termsAccepted: false,
  auctionDurationDays: 3,
  auctionEndStrategy: 'fixed',
  auctionCooldownHours: 24,
};

export interface UseListingFormReturn {
  // Form data
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  resetForm: () => void;

  // UI state
  isPublishing: boolean;
  setIsPublishing: (value: boolean) => void;
  showDraftBanner: boolean;
  setShowDraftBanner: (value: boolean) => void;
  hasDraft: boolean;
  setHasDraft: (value: boolean) => void;
  showSuccessModal: boolean;
  setShowSuccessModal: (value: boolean) => void;
  showMobilePreview: boolean;
  setShowMobilePreview: (value: boolean) => void;
  publishedListingId: string | null;
  setPublishedListingId: (value: string | null) => void;

  // Loading states
  isLoadingGameDetails: boolean;
  setIsLoadingGameDetails: (value: boolean) => void;
  isLoadingListing: boolean;
  setIsLoadingListing: (value: boolean) => void;
  isLoadingExpansions: boolean;
  setIsLoadingExpansions: (value: boolean) => void;

  // Error states
  loadError: string;
  setLoadError: (value: string) => void;

  // Fallback mode
  fallbackMode: boolean;
  setFallbackMode: (value: boolean) => void;
  fallbackReason: string | undefined;
  setFallbackReason: (value: string | undefined) => void;

  // Expansion state
  availableExpansions: BGGExpansionInfo[];
  setAvailableExpansions: (value: BGGExpansionInfo[]) => void;
  showExpansionSection: boolean;
  setShowExpansionSection: (value: boolean) => void;
  expansionsFetched: boolean;
  setExpansionsFetched: (value: boolean) => void;
  expansionCount: number;
  setExpansionCount: (value: number) => void;
  versionCount: number;
  setVersionCount: (value: number) => void;

  // Edit mode state
  existingPhotoUrls: string[];
  setExistingPhotoUrls: (value: string[]) => void;

  // Section expansion state
  expandedSections: { game: boolean; photos: boolean; condition: boolean; pricing: boolean };
  setExpandedSections: React.Dispatch<React.SetStateAction<{ game: boolean; photos: boolean; condition: boolean; pricing: boolean }>>;
  toggleSection: (section: string) => void;

  // Modal state
  validationModal: { isOpen: boolean; message: string };
  setValidationModal: (value: { isOpen: boolean; message: string }) => void;
  errorModal: { isOpen: boolean; message: string; actionUrl?: string; actionLabel?: string };
  setErrorModal: (value: { isOpen: boolean; message: string; actionUrl?: string; actionLabel?: string }) => void;
  draftSavedModal: boolean;
  setDraftSavedModal: (value: boolean) => void;

  // Existing listings
  existingActiveListings: Array<{ id: string; bgg_game_id: number; price: number; created_at: string }>;
  setExistingActiveListings: (value: Array<{ id: string; bgg_game_id: number; price: number; created_at: string }>) => void;

  // Seller capabilities
  sellerCapabilities: {
    canCreateContactSeller: boolean;
    canCreateInstantBuy: boolean;
    isLoading: boolean;
  };
  setSellerCapabilities: (value: { canCreateContactSeller: boolean; canCreateInstantBuy: boolean; isLoading: boolean }) => void;

  // Ref for initial type setting
  hasSetInitialListingType: React.MutableRefObject<boolean>;

  // Helper methods
  updateFormField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  clearGameSelection: () => void;
  canSubmit: () => boolean;
}

export function useListingForm(): UseListingFormReturn {
  // Core form state
  const [formData, setFormData] = useState<ListingFormData>(INITIAL_FORM_DATA);

  // UI state
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);

  // Loading states
  const [isLoadingGameDetails, setIsLoadingGameDetails] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [isLoadingExpansions, setIsLoadingExpansions] = useState(false);

  // Error states
  const [loadError, setLoadError] = useState('');

  // Fallback mode
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>();

  // Expansion state
  const [availableExpansions, setAvailableExpansions] = useState<BGGExpansionInfo[]>([]);
  const [showExpansionSection, setShowExpansionSection] = useState(false);
  const [expansionsFetched, setExpansionsFetched] = useState(false);
  const [expansionCount, setExpansionCount] = useState(0);
  const [versionCount, setVersionCount] = useState(0);

  // Edit mode state
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    game: true,
    photos: false,
    condition: false,
    pricing: false,
  });

  // Modal state
  const [validationModal, setValidationModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  }>({ isOpen: false, message: '' });
  const [draftSavedModal, setDraftSavedModal] = useState(false);

  // Existing listings
  const [existingActiveListings, setExistingActiveListings] = useState<
    Array<{ id: string; bgg_game_id: number; price: number; created_at: string }>
  >([]);

  // Seller capabilities
  const [sellerCapabilities, setSellerCapabilities] = useState({
    canCreateContactSeller: false,
    canCreateInstantBuy: false,
    isLoading: true,
  });

  // Ref for initial type setting
  const hasSetInitialListingType = useRef(false);

  // Helper: reset form
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setExistingPhotoUrls([]);
    setAvailableExpansions([]);
    setShowExpansionSection(false);
    setExpansionsFetched(false);
    setExpansionCount(0);
    setVersionCount(0);
    setExistingActiveListings([]);
    setFallbackMode(false);
    setFallbackReason(undefined);
    setLoadError('');
  }, []);

  // Helper: update single form field
  const updateFormField = useCallback(<K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Helper: clear game selection
  const clearGameSelection = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      selectedGame: null,
      selectedVersion: null,
      selectedGameDisplayName: null,
      selectedExpansions: [],
    }));
    setAvailableExpansions([]);
    setShowExpansionSection(false);
    setExpansionsFetched(false);
    setExpansionCount(0);
    setVersionCount(0);
    setExistingActiveListings([]);
  }, []);

  // Helper: toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  }, []);

  // Helper: can submit form
  const canSubmit = useCallback(() => {
    const { selectedGame, condition, price, termsAccepted, transactionMethod } = formData;

    // Basic requirements
    if (!selectedGame || !condition || !termsAccepted) return false;

    // Price is always required (for fixed_price or auction starting price)
    if (!price || parseFloat(price) <= 0) return false;

    // Check seller capabilities
    if (transactionMethod === 'instant_buy' && !sellerCapabilities.canCreateInstantBuy) return false;
    if (transactionMethod === 'contact_seller' && !sellerCapabilities.canCreateContactSeller) return false;

    return true;
  }, [formData, sellerCapabilities]);

  return {
    // Form data
    formData,
    setFormData,
    resetForm,

    // UI state
    isPublishing,
    setIsPublishing,
    showDraftBanner,
    setShowDraftBanner,
    hasDraft,
    setHasDraft,
    showSuccessModal,
    setShowSuccessModal,
    showMobilePreview,
    setShowMobilePreview,
    publishedListingId,
    setPublishedListingId,

    // Loading states
    isLoadingGameDetails,
    setIsLoadingGameDetails,
    isLoadingListing,
    setIsLoadingListing,
    isLoadingExpansions,
    setIsLoadingExpansions,

    // Error states
    loadError,
    setLoadError,

    // Fallback mode
    fallbackMode,
    setFallbackMode,
    fallbackReason,
    setFallbackReason,

    // Expansion state
    availableExpansions,
    setAvailableExpansions,
    showExpansionSection,
    setShowExpansionSection,
    expansionsFetched,
    setExpansionsFetched,
    expansionCount,
    setExpansionCount,
    versionCount,
    setVersionCount,

    // Edit mode state
    existingPhotoUrls,
    setExistingPhotoUrls,

    // Section expansion state
    expandedSections,
    setExpandedSections,
    toggleSection,

    // Modal state
    validationModal,
    setValidationModal,
    errorModal,
    setErrorModal,
    draftSavedModal,
    setDraftSavedModal,

    // Existing listings
    existingActiveListings,
    setExistingActiveListings,

    // Seller capabilities
    sellerCapabilities,
    setSellerCapabilities,

    // Ref
    hasSetInitialListingType,

    // Helper methods
    updateFormField,
    clearGameSelection,
    canSubmit,
  };
}
