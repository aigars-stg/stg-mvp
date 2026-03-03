'use client';

import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface MilestoneToastProps {
  title: string;
  subtitle?: string;
  visible: boolean;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Default 4500. */
  durationMs?: number;
}

/**
 * Celebration toast for achievement milestones.
 *
 * Standalone fixed-position component with die icon, green left border accent,
 * and polar-night background. Not based on the design-system Toast — the layout
 * (icon area + title/subtitle + green border) differs from the standard pattern.
 */
export function MilestoneToast({
  title,
  subtitle,
  visible,
  onDismiss,
  durationMs = 4500,
}: MilestoneToastProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed bottom-8 left-1/2 z-[200] pointer-events-none
        ${reducedMotion
          ? visible ? 'opacity-100' : 'opacity-0'
          : `transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
             ${visible
               ? 'opacity-100 translate-y-0'
               : 'opacity-0 translate-y-[100px]'
             }`
        }
      `}
      style={{ transform: 'translateX(-50%)' }}
    >
      <div
        className="
          pointer-events-auto cursor-pointer
          bg-polar-night text-snow-stormLightest
          rounded-xl px-5 py-3.5
          flex items-center gap-3.5
          shadow-xl border-l-4 border-aurora-green
          max-w-[380px]
        "
        onClick={onDismiss}
      >
        {/* Die icon area */}
        <div
          className="
            w-10 h-10 rounded-[10px] flex-shrink-0
            bg-gradient-to-br from-frost-ice to-frost-arctic
            flex items-center justify-center
            text-xl
          "
          aria-hidden="true"
        >
          🎲
        </div>

        <div>
          <div className="font-semibold text-sm">{title}</div>
          {subtitle && (
            <div className="text-xs text-snow-storm/80 mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}
