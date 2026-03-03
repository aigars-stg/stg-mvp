'use client';

import type { Icon } from '@phosphor-icons/react/lib';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  Search,
  CurrencyEuro,
  PhotoCamera,
  ClipboardCheck,
  Check,
} from '@/lib/icons';
import type { PhaseDefinition } from './phase-definitions';
import { SparkleBurst } from './SparkleBurst';

/* ─── Icon lookup ──────────────────────────────────────────────────────────── */

const ICON_MAP: Record<PhaseDefinition['iconName'], Icon> = {
  Search,
  CurrencyEuro,
  PhotoCamera,
  ClipboardCheck,
};

/* ─── Props ────────────────────────────────────────────────────────────────── */

interface PhaseTrackerProps {
  phases: PhaseDefinition[];
  currentPhaseIndex: number;
  completedPhaseIds: string[];
  flowTitle: string;
  onPhaseClick?: (index: number) => void;
  sparklePhaseId?: string | null;
  /** Translation function for phase names. Receives phase id, returns labels. */
  getPhaseLabel: (phaseId: string) => {
    name: string;
    subtitle: string;
    shortName: string;
  };
  /** Translation function for step ARIA labels. */
  getStepAriaLabel: (name: string, stepNumber: number, totalSteps: number, status: PhaseStatus) => string;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

export type PhaseStatus = 'completed' | 'active' | 'upcoming';

function getPhaseStatus(
  index: number,
  currentPhaseIndex: number,
  completedPhaseIds: string[],
  phaseId: string,
): PhaseStatus {
  if (completedPhaseIds.includes(phaseId)) return 'completed';
  if (index === currentPhaseIndex) return 'active';
  return 'upcoming';
}

/* ─── Mobile layout ────────────────────────────────────────────────────────── */

function MobileTracker({
  phases,
  currentPhaseIndex,
  completedPhaseIds,
  getPhaseLabel,
  reducedMotion,
}: PhaseTrackerProps & { reducedMotion: boolean }) {
  const currentPhase = phases[currentPhaseIndex];
  const labels = currentPhase ? getPhaseLabel(currentPhase.id) : null;

  return (
    <div className="lg:hidden sticky top-0 z-20 bg-snow-white border-b border-snow-storm px-4 pt-3 pb-3.5">
      {/* Segmented progress bar */}
      <div className="flex gap-1" role="presentation">
        {phases.map((phase, index) => {
          const status = getPhaseStatus(
            index,
            currentPhaseIndex,
            completedPhaseIds,
            phase.id,
          );
          return (
            <div
              key={phase.id}
              className={`h-1 rounded-sm flex-1 transition-all duration-300 relative overflow-hidden ${
                status === 'completed'
                  ? 'bg-frost-arctic'
                  : status === 'active'
                    ? 'bg-aurora-orange'
                    : 'bg-snow-storm'
              }`}
            >
              {status === 'active' && !reducedMotion && (
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              )}
            </div>
          );
        })}
      </div>

      {/* Phase info row */}
      {labels && (
        <div className="flex justify-between items-start mt-2.5">
          <div>
            <div className="font-bold text-[13px] text-polar-night tracking-wide">
              {labels.name}
            </div>
            <div className="text-xs text-polar-nightDark mt-0.5">
              {labels.subtitle}
            </div>
          </div>
          <div className="text-[11px] text-polar-nightDark bg-snow-stormLightest px-2 py-0.5 rounded-full font-medium">
            {currentPhaseIndex + 1}/{phases.length}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Desktop layout ───────────────────────────────────────────────────────── */

function DesktopTracker({
  phases,
  currentPhaseIndex,
  completedPhaseIds,
  onPhaseClick,
  sparklePhaseId,
  getPhaseLabel,
  getStepAriaLabel,
}: PhaseTrackerProps & { reducedMotion: boolean }) {
  return (
    <div className="hidden lg:block bg-snow-white border-b border-snow-storm px-8 py-4">
      {/* Horizontal node-path */}
      <div className="flex items-center">
        {phases.map((phase, index) => {
          const status = getPhaseStatus(
            index,
            currentPhaseIndex,
            completedPhaseIds,
            phase.id,
          );
          const Icon = ICON_MAP[phase.iconName];
          const labels = getPhaseLabel(phase.id);
          const isLast = index === phases.length - 1;
          const ariaLabel = getStepAriaLabel(
            labels.name,
            index + 1,
            phases.length,
            status,
          );

          // Determine connector status (connector after this node)
          // A connector is "completed" if the phase AFTER it is completed or active
          const nextPhaseStatus =
            !isLast
              ? getPhaseStatus(
                  index + 1,
                  currentPhaseIndex,
                  completedPhaseIds,
                  phases[index + 1].id,
                )
              : null;

          const connectorCompleted =
            nextPhaseStatus === 'completed' || status === 'completed';
          const connectorActive =
            status === 'completed' && nextPhaseStatus === 'active';

          return (
            <div key={phase.id} className="flex items-center flex-1 last:flex-initial">
              {/* Node column */}
              <div className="flex flex-col items-center relative z-10">
                {/* Node button */}
                <button
                  type="button"
                  aria-label={ariaLabel}
                  aria-current={status === 'active' ? 'step' : undefined}
                  disabled={status === 'upcoming'}
                  onClick={
                    status === 'completed' && onPhaseClick
                      ? () => onPhaseClick(index)
                      : undefined
                  }
                  className={`
                    w-11 h-11 rounded-xl flex items-center justify-center
                    transition-all duration-400 relative
                    ${
                      status === 'completed'
                        ? 'bg-frost-arctic border-2 border-frost-arctic cursor-pointer'
                        : status === 'active'
                          ? 'bg-snow-white border-2 border-aurora-orange shadow-[0_0_0_4px_rgba(208,135,112,0.15)]'
                          : 'bg-snow-stormLightest border-2 border-snow-storm cursor-not-allowed'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <Check size={18} weight="bold" className="text-white" />
                  ) : (
                    <Icon
                      size={20}
                      weight="duotone"
                      className={
                        status === 'active'
                          ? 'text-aurora-orange'
                          : 'opacity-40 grayscale'
                      }
                    />
                  )}
                </button>

                {/* Sparkle burst — positioned at node center */}
                <div className="absolute top-0 left-0">
                  <SparkleBurst active={sparklePhaseId === phase.id} />
                </div>

                {/* Phase label below node */}
                <div className="mt-2 text-center whitespace-nowrap">
                  {status === 'active' ? (
                    <>
                      <div className="font-bold text-xs text-aurora-orange">
                        {labels.name}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {labels.subtitle}
                      </div>
                    </>
                  ) : status === 'completed' ? (
                    <div className="font-semibold text-xs text-frost-arctic">
                      {labels.name}
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted font-normal">
                      {labels.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector (not after last node) */}
              {!isLast && (
                <div
                  className={`flex-1 h-[3px] mx-[-2px] rounded-sm transition-all duration-500 relative overflow-hidden mb-9 ${
                    connectorCompleted && !connectorActive
                      ? 'bg-frost-arctic'
                      : 'bg-snow-storm'
                  }`}
                >
                  {/* Pulse overlay for connector leading to active node */}
                  {connectorActive && (
                    <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-frost-arctic to-transparent opacity-40 animate-pulse-width" />
                  )}

                  {/* Midpoint dot */}
                  <div
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full ${
                      connectorCompleted && !connectorActive
                        ? 'bg-frost-ice opacity-50'
                        : 'bg-snow-storm opacity-50'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */

/**
 * Hybrid phase tracker — renders both mobile (sticky segmented bar) and desktop
 * (horizontal node-path) layouts using CSS visibility classes to avoid hydration
 * mismatches.
 */
export function PhaseTracker(props: PhaseTrackerProps) {
  const reducedMotion = useReducedMotion();

  return (
    <nav
      role="navigation"
      aria-label={`${props.flowTitle} progress`}
    >
      <MobileTracker {...props} reducedMotion={reducedMotion} />
      <DesktopTracker {...props} reducedMotion={reducedMotion} />
    </nav>
  );
}
