'use client';

import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SparkleBurstProps {
  /** Whether the burst animation is active */
  active: boolean;
  /** Horizontal center of the burst in px. Default 22. */
  centerX?: number;
  /** Vertical center of the burst in px. Default 22. */
  centerY?: number;
}

const PARTICLE_COUNT = 8;

const PARTICLE_COLORS = [
  'bg-aurora-orange',
  'bg-aurora-yellow',
  'bg-frost-ice',
] as const;

interface ParticleConfig {
  tx: number;
  ty: number;
  size: number;
  delay: number;
  colorClass: string;
}

function generateParticles(): ParticleConfig[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const distance = 20 + Math.random() * 15; // 20-35px
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const size = 3 + Math.random() * 3; // 3-6px
    const delay = Math.random() * 100; // 0-100ms
    const colorClass = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    return { tx, ty, size, delay, colorClass };
  });
}

/**
 * CSS-only particle burst for phase completion celebrations.
 * Renders 8 small particles that fly outward from a center point.
 */
export function SparkleBurst({
  active,
  centerX = 22,
  centerY = 22,
}: SparkleBurstProps) {
  const reducedMotion = useReducedMotion();
  const particlesRef = useRef<ParticleConfig[]>(generateParticles());

  if (!active || reducedMotion) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    >
      {particlesRef.current.map((particle, i) => (
        <div
          key={i}
          className={`absolute rounded-full animate-sparkle-fly ${particle.colorClass}`}
          style={{
            width: particle.size,
            height: particle.size,
            left: centerX - particle.size / 2,
            top: centerY - particle.size / 2,
            '--tx': `${particle.tx}px`,
            '--ty': `${particle.ty}px`,
            animationDelay: `${particle.delay}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
