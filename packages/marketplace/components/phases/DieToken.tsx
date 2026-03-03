'use client';

interface DieTokenProps {
  /** Width and height in pixels. Default 26. */
  size?: number;
}

/**
 * Small CSS-only die marker — a rounded orange square with a white "2" at center.
 * Parent controls positioning and bounce animation.
 */
export function DieToken({ size = 26 }: DieTokenProps) {
  return (
    <div
      aria-hidden="true"
      className="bg-gradient-to-br from-aurora-orange to-aurora-red shadow-md flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
      }}
    >
      <span
        className="text-white font-bold leading-none select-none"
        style={{ fontSize: size * 0.5 }}
      >
        2
      </span>
    </div>
  );
}
