import Image from 'next/image';

export type TurniMood =
  | 'neutral'
  | 'searching'
  | 'celebrating'
  | 'supportive'
  | 'holding-meeple'
  | 'confused'
  | 'waiting';

interface TurniReactionProps {
  mood: TurniMood;
  message: string;
  /** Additional message line (e.g., encouragement after loss reveal) */
  secondaryMessage?: string;
  /** sm = 64px, md = 96px, lg = 128px */
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { px: 64, class: 'w-16 h-16' },
  md: { px: 96, class: 'w-24 h-24' },
  lg: { px: 128, class: 'w-32 h-32' },
};

export function TurniReaction({
  mood,
  message,
  secondaryMessage,
  size = 'md',
}: TurniReactionProps) {
  const { px, class: sizeClass } = sizeConfig[size];

  return (
    <div className="flex items-start gap-3">
      {/* Speech bubble (left side) */}
      <div className="relative flex-1">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
          <p>{message}</p>
          {secondaryMessage && (
            <p className="mt-1 text-gray-500 dark:text-gray-400">{secondaryMessage}</p>
          )}
        </div>
        {/* Triangle pointer pointing right toward Turni */}
        <div
          className="absolute top-3 -right-2 w-0 h-0
            border-t-[6px] border-t-transparent
            border-b-[6px] border-b-transparent
            border-l-[8px] border-l-blue-50 dark:border-l-blue-950/30"
        />
      </div>

      {/* Turni image (right side, facing left toward speech) */}
      <div className={`flex-shrink-0 ${sizeClass}`}>
        <Image
          src={`/images/turni/turni-${mood}-${px}.png`}
          alt="Turni"
          width={px}
          height={px}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
