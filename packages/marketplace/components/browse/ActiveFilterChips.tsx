'use client';

import { Button, Badge } from '@second-turn/design-system';
import { Users, User as Baby, Time as Clock, Close, Star, Sparks as Sparkles, CheckCircle as CircleCheck, Tool as Wrench } from '@/lib/icons';
import { useTranslations } from 'next-intl';

interface ActiveFilterChipsProps {
  // Sell filters
  selectedPlayerCounts: Set<number>;
  selectedMinAges: Set<number>;
  selectedPlayingTimes: Set<string>;
  selectedLanguages: Set<string>;
  selectedConditions: Set<string>;
  priceMin: string;
  priceMax: string;
  priceRange: { min: number; max: number };

  // Callbacks
  onRemovePlayerCount: (count: number) => void;
  onRemoveMinAge: (age: number) => void;
  onRemovePlayingTime: (time: string) => void;
  onRemoveLanguage: (lang: string) => void;
  onRemoveCondition: (condition: string) => void;
  onRemovePrice: () => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({
  selectedPlayerCounts,
  selectedMinAges,
  selectedPlayingTimes,
  selectedLanguages,
  selectedConditions,
  priceMin,
  priceMax,
  priceRange,
  onRemovePlayerCount,
  onRemoveMinAge,
  onRemovePlayingTime,
  onRemoveLanguage,
  onRemoveCondition,
  onRemovePrice,
  onClearAll,
}: ActiveFilterChipsProps) {
  const t = useTranslations('Browse');
  const tListings = useTranslations('Listings');

  const getPlayingTimeLabel = (time: string) => {
    const labels: Record<string, string> = {
      '0-30': t('playingTime.under30'),
      '30-60': t('playingTime.thirtyTo60'),
      '60-120': t('playingTime.oneToTwoHours'),
      '120+': t('playingTime.twoPlus'),
    };
    return labels[time] || time;
  };

  const getConditionInfo = (condition: string) => {
    const conditionMap: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
      likeNew: { icon: Star, label: tListings('conditions.likeNew') },
      veryGood: { icon: Sparkles, label: tListings('conditions.veryGood') },
      good: { icon: CircleCheck, label: tListings('conditions.good') },
      acceptable: { icon: Wrench, label: tListings('conditions.acceptable') },
    };
    return conditionMap[condition] || { icon: CircleCheck, label: condition };
  };

  const hasActiveFilters =
    selectedPlayerCounts.size > 0 ||
    selectedMinAges.size > 0 ||
    selectedPlayingTimes.size > 0 ||
    selectedLanguages.size > 0 ||
    selectedConditions.size > 0 ||
    priceMin ||
    priceMax;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-text-secondary">{t('filters.activeFilters')}</span>

      {/* Player count chips */}
      {Array.from(selectedPlayerCounts).map((count) => (
        <Badge
          key={count}
          variant="default"
          className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
          onClick={() => onRemovePlayerCount(count)}
        >
          <Users className="w-3 h-3" />
          <span>{count === 1 ? t('playerCount.solo') : count >= 8 ? t('playerCount.eightPlus') : count}</span>
          <Close className="w-3 h-3" />
        </Badge>
      ))}

      {/* Min age chips */}
      {Array.from(selectedMinAges).map((age) => (
        <Badge
          key={age}
          variant="default"
          className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
          onClick={() => onRemoveMinAge(age)}
        >
          <Baby className="w-3 h-3" />
          <span>{age}+</span>
          <Close className="w-3 h-3" />
        </Badge>
      ))}

      {/* Playing time chips */}
      {Array.from(selectedPlayingTimes).map((time) => (
        <Badge
          key={time}
          variant="default"
          className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
          onClick={() => onRemovePlayingTime(time)}
        >
          <Clock className="w-3 h-3" />
          <span>{getPlayingTimeLabel(time)}</span>
          <Close className="w-3 h-3" />
        </Badge>
      ))}

      {/* Language chips */}
      {Array.from(selectedLanguages).map((lang) => (
        <Badge
          key={lang}
          variant="default"
          className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
          onClick={() => onRemoveLanguage(lang)}
        >
          <span>{lang}</span>
          <Close className="w-3 h-3" />
        </Badge>
      ))}

      {/* Condition chips */}
      {Array.from(selectedConditions).map((condition) => {
        const { icon: Icon, label } = getConditionInfo(condition);
        return (
          <Badge
            key={condition}
            variant="default"
            className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
            onClick={() => onRemoveCondition(condition)}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
            <Close className="w-3 h-3" />
          </Badge>
        );
      })}

      {/* Price chip */}
      {(priceMin || priceMax) && (
        <Badge
          variant="default"
          className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
          onClick={onRemovePrice}
        >
          <span>
            €{priceMin || priceRange.min} - €{priceMax || priceRange.max}
          </span>
          <Close className="w-3 h-3" />
        </Badge>
      )}

      {/* Clear all link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-auto py-0 px-2"
      >
        {t('filters.clearAll')}
      </Button>
    </div>
  );
}
