'use client';

import { Input, Checkbox, Button, Badge } from '@second-turn/design-system';
import { Users, User as Baby, Time as Clock } from '@/lib/icons';
import { useTranslations } from 'next-intl';

export interface SellFiltersProps {
  // Player count filter
  selectedPlayerCounts: Set<number>;
  availablePlayerCounts: number[];
  onTogglePlayerCount: (count: number) => void;
  onClearPlayerCounts: () => void;

  // Min age filter
  selectedMinAges: Set<number>;
  availableMinAges: number[];
  onToggleMinAge: (age: number) => void;
  onClearMinAges: () => void;

  // Playing time filter
  selectedPlayingTimes: Set<string>;
  availablePlayingTimes: string[];
  onTogglePlayingTime: (time: string) => void;
  onClearPlayingTimes: () => void;

  // Language filter
  selectedLanguages: Set<string>;
  availableLanguages: string[];
  onToggleLanguage: (lang: string) => void;
  onClearLanguages: () => void;

  // Price filter
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onClearPrice: () => void;
  priceRange: { min: number; max: number };
}

export function SellFilters({
  selectedPlayerCounts,
  availablePlayerCounts,
  onTogglePlayerCount,
  onClearPlayerCounts,
  selectedMinAges,
  availableMinAges,
  onToggleMinAge,
  onClearMinAges,
  selectedPlayingTimes,
  availablePlayingTimes,
  onTogglePlayingTime,
  onClearPlayingTimes,
  selectedLanguages,
  availableLanguages,
  onToggleLanguage,
  onClearLanguages,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  onClearPrice,
  priceRange,
}: SellFiltersProps) {
  const t = useTranslations('Browse');

  const getPlayingTimeLabel = (time: string) => {
    const labels: Record<string, string> = {
      '0-30': t('playingTime.under30'),
      '30-60': t('playingTime.thirtyTo60'),
      '60-120': t('playingTime.oneToTwoHours'),
      '120+': t('playingTime.twoPlus'),
    };
    return labels[time] || time;
  };

  return (
    <>
      {/* Player Count Filter */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-text-muted" />
            <h3 className="text-sm font-medium text-polar-night">{t('filters.players')}</h3>
          </div>
          {selectedPlayerCounts.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearPlayerCounts}
              className="h-auto py-0 px-2 text-xs"
            >
              {t('filters.clear')}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availablePlayerCounts.map((count) => (
            <Badge
              key={count}
              variant={selectedPlayerCounts.has(count) ? 'trust' : 'default'}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => onTogglePlayerCount(count)}
            >
              {count === 1 ? t('playerCount.solo') : count >= 8 ? t('playerCount.eightPlus') : count}
            </Badge>
          ))}
          {availablePlayerCounts.length === 0 && (
            <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
          )}
        </div>
      </div>

      {/* Min Age Filter */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Baby className="w-4 h-4 text-text-muted" />
            <h3 className="text-sm font-medium text-polar-night">{t('filters.minAge')}</h3>
          </div>
          {selectedMinAges.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearMinAges}
              className="h-auto py-0 px-2 text-xs"
            >
              {t('filters.clear')}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableMinAges.map((age) => (
            <Badge
              key={age}
              variant={selectedMinAges.has(age) ? 'trust' : 'default'}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => onToggleMinAge(age)}
            >
              {age}+
            </Badge>
          ))}
          {availableMinAges.length === 0 && (
            <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
          )}
        </div>
      </div>

      {/* Playing Time Filter */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" />
            <h3 className="text-sm font-medium text-polar-night">{t('filters.playTime')}</h3>
          </div>
          {selectedPlayingTimes.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearPlayingTimes}
              className="h-auto py-0 px-2 text-xs"
            >
              {t('filters.clear')}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availablePlayingTimes.map((time) => (
            <Badge
              key={time}
              variant={selectedPlayingTimes.has(time) ? 'trust' : 'default'}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => onTogglePlayingTime(time)}
            >
              {getPlayingTimeLabel(time)}
            </Badge>
          ))}
          {availablePlayingTimes.length === 0 && (
            <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
          )}
        </div>
      </div>

      {/* Language Filter */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-polar-night">{t('filters.language')}</h3>
          {selectedLanguages.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearLanguages}
              className="h-auto py-0 px-2 text-xs"
            >
              {t('filters.clear')}
            </Button>
          )}
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {availableLanguages.map((lang) => (
            <label
              key={lang}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <Checkbox
                checked={selectedLanguages.has(lang)}
                onChange={() => onToggleLanguage(lang)}
              />
              <span className="text-sm group-hover:text-polar-night transition-colors">
                {lang}
              </span>
            </label>
          ))}
          {availableLanguages.length === 0 && (
            <p className="text-sm text-text-muted italic">{t('messages.noLanguagesAvailable')}</p>
          )}
        </div>
      </div>

      {/* Price Range */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-polar-night">{t('filters.priceEur')}</h3>
          {(priceMin || priceMax) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearPrice}
              className="h-auto py-0 px-2 text-xs"
            >
              {t('filters.clear')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={`${priceRange.min}`}
            type="number"
            value={priceMin}
            onChange={(e) => onPriceMinChange(e.target.value)}
            inputSize="sm"
          />
          <Input
            placeholder={`${priceRange.max}`}
            type="number"
            value={priceMax}
            onChange={(e) => onPriceMaxChange(e.target.value)}
            inputSize="sm"
          />
        </div>
        <p className="text-xs text-text-muted mt-2">
          €{priceRange.min} - €{priceRange.max}
        </p>
      </div>
    </>
  );
}
