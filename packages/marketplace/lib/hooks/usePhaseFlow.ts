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
const DRAFT_VERSION = 2;
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

type DraftPayload = DraftV1 | DraftV2;

function isDraftV2(draft: DraftPayload): draft is DraftV2 {
  return 'version' in draft && draft.version === 2;
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

  // Draft persistence
  saveDraft: () => void;
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

function isMarketComplete(formData: ListingFormData): boolean {
  return !!formData.condition && !!formData.price && parseFloat(formData.price) > 0;
}

function isActionComplete(
  formData: ListingFormData,
  existingPhotoUrls: string[],
): boolean {
  return formData.photos.length >= 1 || existingPhotoUrls.length >= 1;
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
      return isMarketComplete(formData);
    case 'isActionComplete':
      return isActionComplete(formData, existingPhotoUrls);
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

function persistDraft(data: DraftV2): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
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
  const [completedPhaseIds, setCompletedPhaseIds] = useState<string[]>([]);
  const [sparklePhaseId, setSparklePhaseId] = useState<string | null>(null);
  const [toastData, setToastData] = useState<ToastData | null>(null);
  const [flowStartTime, setFlowStartTime] = useState<number>(() => Date.now());

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

  // ------- Draft loading on mount -------
  useEffect(() => {
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;

    const draft = loadDraft();
    if (!draft) {
      setFlowStartTime(Date.now());
      return;
    }

    // Restore formData regardless of version
    if (draft.formData) {
      listingForm.setFormData({ ...INITIAL_FORM_DATA, ...draft.formData });
      listingForm.setHasDraft(true);
      listingForm.setShowDraftBanner(true);
    }

    if (isDraftV2(draft)) {
      setCurrentPhaseIndex(draft.currentPhaseIndex);
      setCompletedPhaseIds(draft.completedPhaseIds);
      setFlowStartTime(draft.flowStartTime);
    } else {
      // v1 draft — start at phase 0
      setCurrentPhaseIndex(0);
      setCompletedPhaseIds([]);
      setFlowStartTime(Date.now());
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
    persistDraft({
      version: DRAFT_VERSION,
      formData,
      currentPhaseIndex,
      completedPhaseIds,
      flowStartTime,
    });
    setHasDraft(true);
  }, [formData, setHasDraft, currentPhaseIndex, completedPhaseIds, flowStartTime]);

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
    if (currentPhaseIndex < LISTING_PHASES.length - 1) {
      advanceTimer.current = setTimeout(() => {
        setCurrentPhaseIndex(nextIndex);
      }, ADVANCE_DELAY_MS);
    }

    // 6. Persist draft on phase advance (uses computed values, not stale closure)
    persistDraft({
      version: DRAFT_VERSION,
      formData,
      currentPhaseIndex: nextIndex,
      completedPhaseIds: updatedCompleted,
      flowStartTime,
    });

    return true;
  }, [currentPhaseIndex, formData, existingPhotoUrls, listingForm, completedPhaseIds, flowStartTime]);

  const goToPhase = useCallback(
    (index: number) => {
      if (index < 0 || index >= LISTING_PHASES.length) return;
      // Only allow going to a completed phase or the current+1 if current is complete
      const targetPhase = LISTING_PHASES[index];
      if (!targetPhase) return;

      const isCompleted = completedPhaseIds.includes(targetPhase.id);
      const isNext =
        index === currentPhaseIndex + 1 && isCurrentPhaseComplete;
      const isCurrent = index === currentPhaseIndex;

      if (isCompleted || isNext || isCurrent) {
        setCurrentPhaseIndex(index);
      }
    },
    [completedPhaseIds, currentPhaseIndex, isCurrentPhaseComplete],
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

    // Draft persistence
    saveDraft,
  };
}
