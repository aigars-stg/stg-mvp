'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import type { BGGGame, VersionSelection } from '@/lib/bgg-types';
import type { ListingCondition, ListingWithSeller } from '@/lib/types/listing';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';

// Default acceptable conditions (all conditions)
export const DEFAULT_ACCEPTABLE_CONDITIONS: ListingCondition[] = ['likeNew', 'veryGood', 'good', 'acceptable'];

export interface WantedFormData {
  selectedGame: BGGGame | null;
  selectedGameDisplayName: string | null;
  selectedVersion: VersionSelection | null;
  maxPrice: string;
  notes: string;
}

export interface WantedFormUIState {
  submitting: boolean;
  error: string;
  isLoadingGameDetails: boolean;
  fallbackMode: boolean;
  fallbackReason: string | undefined;
  showSuccessModal: boolean;
}

export interface WantedFormEditState {
  isEditMode: boolean;
  editListingId: string | null;
  isLoadingListing: boolean;
  loadError: string;
}

export interface WantedFormSectionState {
  expandedSections: {
    game: boolean;
    budget: boolean;
    notes: boolean;
  };
}

export interface WantedFormExistingSales {
  existingSaleListings: ListingWithSeller[];
  salesBannerDismissed: boolean;
}

export interface UseWantedListingFormReturn {
  // Form data
  formData: WantedFormData;
  setSelectedGame: (game: BGGGame | null) => void;
  setSelectedGameDisplayName: (name: string | null) => void;
  setSelectedVersion: (version: VersionSelection | null) => void;
  setMaxPrice: (price: string) => void;
  setNotes: (notes: string) => void;

  // UI state
  uiState: WantedFormUIState;
  setSubmitting: (value: boolean) => void;
  setError: (value: string) => void;
  setIsLoadingGameDetails: (value: boolean) => void;
  setFallbackMode: (value: boolean) => void;
  setFallbackReason: (value: string | undefined) => void;
  setShowSuccessModal: (value: boolean) => void;

  // Edit state
  editState: WantedFormEditState;
  setIsLoadingListing: (value: boolean) => void;
  setLoadError: (value: string) => void;

  // Section state
  sectionState: WantedFormSectionState;
  setExpandedSections: React.Dispatch<React.SetStateAction<WantedFormSectionState['expandedSections']>>;
  toggleSection: (section: keyof WantedFormSectionState['expandedSections']) => void;

  // Existing sales
  existingSales: WantedFormExistingSales;
  setExistingSaleListings: (listings: ListingWithSeller[]) => void;
  setSalesBannerDismissed: (value: boolean) => void;

  // Computed values
  isGameSectionComplete: boolean;
  isBudgetSectionComplete: boolean;
  canPublish: boolean;

  // Helpers
  createPreviewWantedListing: () => WantedListingWithDetails;
  resetForm: () => void;
}

export function useWantedListingForm(): UseWantedListingFormReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  // Edit mode detection
  const editListingId = searchParams.get('edit');
  const isEditMode = !!editListingId;

  // Form data state
  const [selectedGame, setSelectedGame] = useState<BGGGame | null>(null);
  const [selectedGameDisplayName, setSelectedGameDisplayName] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<VersionSelection | null>(null);
  const [maxPrice, setMaxPrice] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingGameDetails, setIsLoadingGameDetails] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Edit mode state
  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    game: true,
    budget: false,
    notes: false,
  });

  // Existing sales state
  const [existingSaleListings, setExistingSaleListings] = useState<ListingWithSeller[]>([]);
  const [salesBannerDismissed, setSalesBannerDismissed] = useState(false);

  // Toggle section helper
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Section completion checks
  const isGameSectionComplete = (() => {
    if (!selectedGame || !selectedVersion) {
      return false;
    }

    const hasAlternateNames = selectedGame.alternateNames && selectedGame.alternateNames.length > 0;
    const versionLanguage = selectedVersion.language ||
      (selectedVersion.languages && selectedVersion.languages.length > 0
        ? selectedVersion.languages[0]
        : null);
    const isEnglish = versionLanguage === 'English';

    if (hasAlternateNames && !isEnglish) {
      return !!selectedGameDisplayName;
    }

    return true;
  })();

  const isBudgetSectionComplete = !!maxPrice && parseFloat(maxPrice) > 0;
  const canPublish = isGameSectionComplete && isBudgetSectionComplete;

  // Progressive disclosure: Auto-expand next incomplete section
  useEffect(() => {
    const gameComplete = isGameSectionComplete;
    const budgetComplete = isBudgetSectionComplete;

    setExpandedSections((prev) => ({
      ...prev,
      game: true,
      budget: gameComplete || prev.budget,
      notes: (gameComplete && budgetComplete) || prev.notes,
    }));
  }, [isGameSectionComplete, isBudgetSectionComplete]);

  // Create preview wanted listing
  const createPreviewWantedListing = useCallback((): WantedListingWithDetails => {
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
      acceptable_conditions: DEFAULT_ACCEPTABLE_CONDITIONS,
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
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),

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
        full_name: profile?.full_name || 'Your Name',
        email: profile?.email || user?.email || 'you@example.com',
        avatar_url: profile?.avatar_url || null,
        country: profile?.country || null,
      },
    };
  }, [selectedGame, selectedGameDisplayName, selectedVersion, maxPrice, notes, user, profile]);

  // Reset form helper
  const resetForm = useCallback(() => {
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
  }, []);

  return {
    // Form data
    formData: {
      selectedGame,
      selectedGameDisplayName,
      selectedVersion,
      maxPrice,
      notes,
    },
    setSelectedGame,
    setSelectedGameDisplayName,
    setSelectedVersion,
    setMaxPrice,
    setNotes,

    // UI state
    uiState: {
      submitting,
      error,
      isLoadingGameDetails,
      fallbackMode,
      fallbackReason,
      showSuccessModal,
    },
    setSubmitting,
    setError,
    setIsLoadingGameDetails,
    setFallbackMode,
    setFallbackReason,
    setShowSuccessModal,

    // Edit state
    editState: {
      isEditMode,
      editListingId,
      isLoadingListing,
      loadError,
    },
    setIsLoadingListing,
    setLoadError,

    // Section state
    sectionState: {
      expandedSections,
    },
    setExpandedSections,
    toggleSection,

    // Existing sales
    existingSales: {
      existingSaleListings,
      salesBannerDismissed,
    },
    setExistingSaleListings,
    setSalesBannerDismissed,

    // Computed values
    isGameSectionComplete,
    isBudgetSectionComplete,
    canPublish,

    // Helpers
    createPreviewWantedListing,
    resetForm,
  };
}
