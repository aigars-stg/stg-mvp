import { validatePassword, type PasswordStrength } from '@/lib/auth/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = validatePassword(password);

  const colors = {
    0: 'bg-aurora-red',
    1: 'bg-aurora-orange',
    2: 'bg-aurora-yellow',
    3: 'bg-aurora-green',
  };

  const labels = {
    0: 'Weak',
    1: 'Fair',
    2: 'Good',
    3: 'Strong',
  };

  const textColors = {
    0: 'text-aurora-red',
    1: 'text-aurora-orange',
    2: 'text-aurora-yellow',
    3: 'text-aurora-green',
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bars */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength.score ? colors[strength.score] : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Feedback */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${textColors[strength.score]}`}>
          {labels[strength.score]}
        </span>
        <span className="text-xs text-text-secondary">{strength.feedback}</span>
      </div>
    </div>
  );
}
