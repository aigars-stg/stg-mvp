'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useListingForm, INITIAL_FORM_DATA } from './useListingForm';
import type { UseListingFormReturn, ListingFormData } from './useListingForm';
import { LISTING_PHASES } from '@/components/phases/phase-definitions';
import type { PhaseDefinition } from '@/components/phases/phase-definitions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'listing-draft';
const DRAFT_DISMISSED_KEY = 'listing-draft-dismissed';
const DRAFT_VERSION = 3;
const SPARKLE_DURATION_MS = 700;
const ADVANCE_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToastData {
  /** Completed phase ID — caller translates via i18n */
  phaseId: string;
  /** Next phase ID (if any) — caller translates via i18n */
  nextPhaseId?: string;
}

interface DraftV1 {
  formData: Partial<ListingFormData>;
}

interface DraftV2 {
  version: 2;
  formData: Partial<ListingFormData>;
  currentPhaseIndex: number;
  completedPhaseIds: string[];
  flowStartTime: number;
}

interface DraftV3 {
  version: 3;
  formData: Partial<ListingFormData>;
  currentPhaseIndex: number;
  highestVisitedPhaseIndex: number;
  completedPhaseIds: string[];
  flowStartTime: number;
  savedAt: number;
  hadPhotos: boolean;
}

type DraftPayload = DraftV1 | DraftV2 | DraftV3;

function isDraftV2(draft: DraftPayload): draft is DraftV2 {
  return 'version' in draft && draft.version === 2;
}

function isDraftV3(draft: DraftPayload): draft is DraftV3 {
  return 'version' in draft && draft.version === 3;
}

export interface PhaseFlowState extends UseListingFormReturn {
  // Phase navigation
  currentPhaseIndex: number;
  completedPhaseIds: string[];
  sparklePhaseId: string | null;
  advanceToNextPhase: () => boolean;
  goToPhase: (index: number) => void;

  // Toast
  toastData: ToastData | null;
  dismissToast: () => void;

  // Flow status
  isFlowComplete: boolean;
  isCurrentPhaseComplete: boolean;
  flowStartTime: number;
  highestVisitedPhaseIndex: number;

  // Draft persistence
  saveDraft: () => void;
  loadDraftData: () => void;
  dismissDraft: () => void;

  // Photos warning (shown when draft was loaded but photos were stripped)
  showPhotosWarning: boolean;
  setShowPhotosWarning: (value: boolean) => void;
}

// ---------------------------------------------------------------------------
// Phase validation helpers
// ---------------------------------------------------------------------------

function isResearchComplete(formData: ListingFormData): boolean {
  if (!formData.selectedGame || !formData.selectedVersion) return false;
  // If the game has alternate names and the version is non-English,
  // a display name is needed
  const hasAlternateNames =
    formData.selectedGame.alternateNames &&
    formData.selectedGame.alternateNames.length > 0;
  let hasEnglish = false;
  if (
    formData.selectedVersion.languages &&
    formData.selectedVersion.languages.length > 0
  ) {
    hasEnglish = formData.selectedVersion.languages.includes('English');
  } else if (formData.selectedVersion.language) {
    hasEnglish = formData.selectedVersion.language === 'English';
  }
  const needsDisplayName = hasAlternateNames && !hasEnglish;
  if (needsDisplayName && !formData.selectedGameDisplayName) return false;
  return true;
}

function isMarketComplete(
  formData: ListingFormData,
  existingPhotoUrls: string[],
): boolean {
  if (!formData.condition) return false;
  // Acceptable condition requires at least 1 photo
  if (formData.condition === 'acceptable') {
    return formData.photos.length >= 1 || existingPhotoUrls.length >= 1;
  }
  return true;
}

function isActionComplete(formData: ListingFormData): boolean {
  if (!formData.price || parseFloat(formData.price) <= 0) return false;
  if (formData.pricingFormat === 'auction') {
    return parseFloat(formData.price) >= 1.0 && !!formData.auctionDurationDays;
  }
  return parseFloat(formData.price) >= 0.01;
}

function isScoreComplete(): boolean {
  return true;
}

function isPhaseComplete(
  phase: PhaseDefinition,
  formData: ListingFormData,
  existingPhotoUrls: string[],
): boolean {
  switch (phase.validationKey) {
    case 'isResearchComplete':
      return isResearchComplete(formData);
    case 'isMarketComplete':
      return isMarketComplete(formData, existingPhotoUrls);
    case 'isActionComplete':
      return isActionComplete(formData);
    case 'isScoreComplete':
      return isScoreComplete();
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Draft helpers
// ---------------------------------------------------------------------------

function loadDraft(): DraftPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

function persistDraft(data: DraftV3): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    // Clear dismissal flag so banner shows for newly saved drafts
    sessionStorage.removeItem(DRAFT_DISMISSED_KEY);
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePhaseFlow(): PhaseFlowState {
  const listingForm = useListingForm();

  // ------- Phase state -------
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [highestVisitedPhaseIndex, setHighestVisitedPhaseIndex] = useState(0);
  const [completedPhaseIds, setCompletedPhaseIds] = useState<string[]>([]);
  const [sparklePhaseId, setSparklePhaseId] = useState<string | null>(null);
  const [toastData, setToastData] = useState<ToastData | null>(null);
  const [flowStartTime, setFlowStartTime] = useState<number>(() => Date.now());
  const [showPhotosWarning, setShowPhotosWarning] = useState(false);

  // Track whether we've loaded from a draft on mount
  const hasLoadedDraft = useRef(false);

  // Timer refs for cleanup on unmount
  const sparkleTimer = useRef<ReturnType<typeof setTimeout>>();
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (sparkleTimer.current) clearTimeout(sparkleTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  // ------- EC-1: Re-evaluate market completion when condition or photos change -------
  // If user changes condition to 'acceptable' after marking market complete,
  // remove 'market' from completedPhaseIds until a photo is uploaded.
  useEffect(() => {
    const { formData: fd, existingPhotoUrls: epUrls } = listingForm;
    setCompletedPhaseIds((prev) => {
      if (!prev.includes('market')) return prev;
      if (!isMarketComplete(fd, epUrls)) {
        return prev.filter((id) => id !== 'market');
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingForm.formData.condition, listingForm.formData.photos.length, listingForm.existingPhotoUrls.length]);

  // ------- Draft detection on mount (check only, do NOT load data) -------
  useEffect(() => {
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;

    const draft = loadDraft();
    if (!draft || !draft.formData) {
      setFlowStartTime(Date.now());
      return;
    }

    // Draft exists — flag it, but do NOT apply data to form state
    listingForm.setHasDraft(true);

    // Only show banner if not already dismissed this session
    const wasDismissed =
      typeof window !== 'undefined' &&
      sessionStorage.getItem(DRAFT_DISMISSED_KEY) === 'true';

    if (!wasDismissed) {
      listingForm.setShowDraftBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  }, []);

  // ------- Destructure stable references from listing form -------
  const { formData, setHasDraft, existingPhotoUrls } = listingForm;

  // ------- Derived state -------
  const currentPhase = LISTING_PHASES[currentPhaseIndex];
  const isCurrentPhaseComplete = currentPhase
    ? isPhaseComplete(currentPhase, formData, existingPhotoUrls)
    : false;

  // Score phase is completed when the publish handler calls advanceToNextPhase
  // on the last phase, which adds 'score' to completedPhaseIds.
  const isFlowComplete =
    currentPhaseIndex >= LISTING_PHASES.length - 1 &&
    completedPhaseIds.includes(LISTING_PHASES[LISTING_PHASES.length - 1]?.id ?? '');

  // ------- Toast -------
  const dismissToast = useCallback(() => {
    setToastData(null);
  }, []);

  // ------- Draft persistence -------

  const saveDraft = useCallback(() => {
    // Strip photos (File objects can't be serialized) and force termsAccepted=false
    const { photos, ...formDataWithoutPhotos } = formData;
    persistDraft({
      version: DRAFT_VERSION,
      formData: { ...formDataWithoutPhotos, termsAccepted: false },
      currentPhaseIndex,
      highestVisitedPhaseIndex,
      completedPhaseIds,
      flowStartTime,
      savedAt: Date.now(),
      hadPhotos: photos.length > 0,
    });
    setHasDraft(true);
  }, [formData, setHasDraft, currentPhaseIndex, highestVisitedPhaseIndex, completedPhaseIds, flowStartTime]);

  const loadDraftData = useCallback(() => {
    const draft = loadDraft();
    if (!draft || !draft.formData) return;

    // Always restore form data with photos cleared and termsAccepted forced false
    listingForm.setFormData({
      ...INITIAL_FORM_DATA,
      ...draft.formData,
      photos: [],
      termsAccepted: false,
    });
    listingForm.setHasDraft(true);
    listingForm.setShowDraftBanner(false);

    // Apply phase state
    if (isDraftV3(draft)) {
      setCurrentPhaseIndex(draft.currentPhaseIndex);
      setHighestVisitedPhaseIndex(draft.highestVisitedPhaseIndex);
      setCompletedPhaseIds(draft.completedPhaseIds);
      setFlowStartTime(draft.flowStartTime);
      if (draft.hadPhotos) {
        setShowPhotosWarning(true);
      }
    } else if (isDraftV2(draft)) {
      setCurrentPhaseIndex(draft.currentPhaseIndex);
      setHighestVisitedPhaseIndex(draft.currentPhaseIndex);
      setCompletedPhaseIds(draft.completedPhaseIds);
      setFlowStartTime(draft.flowStartTime);
    } else {
      setCurrentPhaseIndex(0);
      setHighestVisitedPhaseIndex(0);
      setCompletedPhaseIds([]);
      setFlowStartTime(Date.now());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs
  }, []);

  const dismissDraft = useCallback(() => {
    // Hide banner and clear draft flag
    listingForm.setShowDraftBanner(false);
    listingForm.setHasDraft(false);

    // Remove draft from localStorage, mark dismissed for this session
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_KEY);
      sessionStorage.setItem(DRAFT_DISMISSED_KEY, 'true');
    }

    // Reset form data to initial state
    listingForm.resetForm();

    // Reset phase state
    setCurrentPhaseIndex(0);
    setHighestVisitedPhaseIndex(0);
    setCompletedPhaseIds([]);
    setFlowStartTime(Date.now());
    setShowPhotosWarning(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs
  }, []);

  // ------- Phase navigation -------
  const advanceToNextPhase = useCallback((): boolean => {
    const phase = LISTING_PHASES[currentPhaseIndex];
    if (!phase) return false;

    // 1. Validate current phase — show validation modal if incomplete
    if (!isPhaseComplete(phase, formData, existingPhotoUrls)) {
      listingForm.setValidationModal({
        isOpen: true,
        message: `validation.${phase.id}Incomplete`,
      });
      return false;
    }

    // 2. Sparkle animation on completed phase
    setSparklePhaseId(phase.id);
    sparkleTimer.current = setTimeout(() => setSparklePhaseId(null), SPARKLE_DURATION_MS);

    // 3. Mark phase completed
    const updatedCompleted = completedPhaseIds.includes(phase.id)
      ? completedPhaseIds
      : [...completedPhaseIds, phase.id];
    setCompletedPhaseIds(updatedCompleted);

    // 4. Show completion toast (phase IDs — caller translates via i18n)
    const nextPhase = LISTING_PHASES[currentPhaseIndex + 1];
    setToastData({
      phaseId: phase.id,
      nextPhaseId: nextPhase?.id,
    });

    // 5. Advance after delay (animation plays concurrently)
    const nextIndex = currentPhaseIndex < LISTING_PHASES.length - 1
      ? currentPhaseIndex + 1
      : currentPhaseIndex;
    const nextHighest = Math.max(highestVisitedPhaseIndex, nextIndex);
    if (currentPhaseIndex < LISTING_PHASES.length - 1) {
      advanceTimer.current = setTimeout(() => {
        setCurrentPhaseIndex(nextIndex);
        setHighestVisitedPhaseIndex(nextHighest);
      }, ADVANCE_DELAY_MS);
    }

    // 6. Persist draft on phase advance (uses computed values, not stale closure)
    const { photos, ...formDataWithoutPhotos } = formData;
    persistDraft({
      version: DRAFT_VERSION,
      formData: { ...formDataWithoutPhotos, termsAccepted: false },
      currentPhaseIndex: nextIndex,
      highestVisitedPhaseIndex: nextHighest,
      completedPhaseIds: updatedCompleted,
      flowStartTime,
      savedAt: Date.now(),
      hadPhotos: photos.length > 0,
    });

    return true;
  }, [currentPhaseIndex, formData, existingPhotoUrls, listingForm, completedPhaseIds, flowStartTime, highestVisitedPhaseIndex]);

  const goToPhase = useCallback(
    (index: number) => {
      if (index < 0 || index >= LISTING_PHASES.length) return;
      const targetPhase = LISTING_PHASES[index];
      if (!targetPhase) return;

      const isCompleted = completedPhaseIds.includes(targetPhase.id);
      const isNext = index === currentPhaseIndex + 1 && isCurrentPhaseComplete;
      const isCurrent = index === currentPhaseIndex;
      // EC-9: allow navigating to any previously visited phase
      const isPreviouslyVisited = index <= highestVisitedPhaseIndex;

      if (isCompleted || isNext || isCurrent || isPreviouslyVisited) {
        setCurrentPhaseIndex(index);
      }
    },
    [completedPhaseIds, currentPhaseIndex, isCurrentPhaseComplete, highestVisitedPhaseIndex],
  );

  // ------- Return -------
  return {
    // Spread the entire listing form interface
    ...listingForm,

    // Phase navigation
    currentPhaseIndex,
    completedPhaseIds,
    sparklePhaseId,
    advanceToNextPhase,
    goToPhase,

    // Toast
    toastData,
    dismissToast,

    // Flow status
    isFlowComplete,
    isCurrentPhaseComplete,
    flowStartTime,
    highestVisitedPhaseIndex,

    // Draft persistence
    saveDraft,
    loadDraftData,
    dismissDraft,

    // Photos warning
    showPhotosWarning,
    setShowPhotosWarning,
  };
}
