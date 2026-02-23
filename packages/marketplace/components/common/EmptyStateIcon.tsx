import type { ComponentType } from 'react';

const COLOR_MAP = {
  'aurora-orange': {
    container: 'from-aurora-orange/15 to-aurora-orange/5 border-aurora-orange/10',
    icon: 'text-aurora-orange',
  },
  'frost-ice': {
    container: 'from-frost-ice/15 to-frost-ice/5 border-frost-ice/10',
    icon: 'text-frost-ice',
  },
  'aurora-red': {
    container: 'from-aurora-red/15 to-aurora-red/5 border-aurora-red/10',
    icon: 'text-aurora-red',
  },
  'aurora-green': {
    container: 'from-aurora-green/15 to-aurora-green/5 border-aurora-green/10',
    icon: 'text-aurora-green',
  },
} as const;

type EmptyStateColor = keyof typeof COLOR_MAP;

interface EmptyStateIconProps {
  icon: ComponentType<{ className?: string }>;
  color: EmptyStateColor;
}

export function EmptyStateIcon({ icon: Icon, color }: EmptyStateIconProps) {
  const { container, icon: iconClass } = COLOR_MAP[color];
  return (
    <div className={`w-16 h-16 bg-gradient-to-br ${container} rounded-2xl flex items-center justify-center shadow-sm border`}>
      <Icon className={`w-8 h-8 ${iconClass}`} />
    </div>
  );
}
