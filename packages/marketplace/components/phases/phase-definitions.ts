/**
 * Phase system definitions for gamified user flows.
 *
 * Phase IDs and icon mappings live here. Translated strings come from the
 * `Phases` i18n namespace at render time — never hardcoded in this file.
 */

export interface PhaseDefinition {
  /** Unique identifier, matches the i18n key under Phases.listing.{id} */
  id: string;
  /** Phosphor icon name from @/lib/icons */
  iconName: 'Search' | 'CurrencyEuro' | 'PhotoCamera' | 'ClipboardCheck';
  /** Key used by usePhaseFlow to look up the validation function */
  validationKey: string;
}

export const LISTING_PHASES: PhaseDefinition[] = [
  { id: 'research', iconName: 'Search', validationKey: 'isResearchComplete' },
  { id: 'market', iconName: 'CurrencyEuro', validationKey: 'isMarketComplete' },
  { id: 'action', iconName: 'PhotoCamera', validationKey: 'isActionComplete' },
  { id: 'score', iconName: 'ClipboardCheck', validationKey: 'isScoreComplete' },
];

/** Total number of phases — avoids .length lookups in render paths */
export const LISTING_PHASE_COUNT = LISTING_PHASES.length;
