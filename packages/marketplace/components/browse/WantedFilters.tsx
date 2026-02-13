'use client';

import { Input, Checkbox, Button } from '@second-turn/design-system';
import { Star, Tool as Wrench, Sparks as Sparkles, CheckCircle as CircleCheck, LocationPin as MapPin, AlertCircle } from '@/lib/icons';
import { useTranslations } from 'next-intl';

export interface WantedFiltersProps {
  // Acceptable conditions filter
  acceptableConditions: Set<string>;
  onToggleCondition: (condition: string) => void;
  onClearConditions: () => void;

  // Budget filter
  budgetMin: string;
  budgetMax: string;
  onBudgetMinChange: (value: string) => void;
  onBudgetMaxChange: (value: string) => void;
  onClearBudget: () => void;

  // Location filter
  locationFilter: string;
  onLocationChange: (value: string) => void;
  onClearLocation: () => void;

  // Expiring soon filter
  showExpiringOnly: boolean;
  onToggleExpiring: () => void;
}

export function WantedFilters({
  acceptableConditions,
  onToggleCondition,
  onClearConditions,
  budgetMin,
  budgetMax,
  onBudgetMinChange,
  onBudgetMaxChange,
  onClearBudget,
  locationFilter,
  onLocationChange,
  onClearLocation,
  showExpiringOnly,
  onToggleExpiring,
}: WantedFiltersProps) {
  const t = useTranslations('Browse');
  const tListings = useTranslations('Listings');

  const getConditionInfo = (condition: string) => {
    const conditionMap: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
      likeNew: { icon: Star, label: tListings('conditions.likeNew') },
      veryGood: { icon: Sparkles, label: tListings('conditions.veryGood') },
      good: { icon: CircleCheck, label: tListings('conditions.good') },
      acceptable: { icon: Wrench, label: tListings('conditions.acceptable') },
    };
    return conditionMap[condition] || { icon: CircleCheck, label: condition };
  };

  return (
    <>
      {/* Acceptable Conditions Filter */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-aurora-orange" />
            <h3 className="text-sm font-medium text-polar-night">{t('filters.acceptableConditions')}</h3>
          </div>
          {acceptableConditions.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearConditions}
              className="h-auto py-0 px-2 text-xs"
            >
              {t('filters.clear')}
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {['likeNew', 'veryGood', 'good', 'acceptable'].map((condition) => {
            const { icon: Icon, label } = getConditionInfo(condition);
            return (
              <label
                key={condition}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <Checkbox
                  checked={acceptableConditions.has(condition)}
                  onChange={() => onToggleCondition(condition)}
                />
                <Icon className="w-4 h-4 text-text-muted" />
                <span className="text-sm group-hover:text-polar-night transition-colors">
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Budget Range */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-polar-night">{t('filters.budgetEur')}</h3>
          {(budgetMin || budgetMax) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearBudget}
              className="h-auto py-0 px-2 text-xs"
            >
              {t('filters.clear')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={t('filters.minPlaceholder')}
            type="number"
            value={budgetMin}
            onChange={(e) => onBudgetMinChange(e.target.value)}
            inputSize="sm"
          />
          <Input
            placeholder={t('filters.maxPlaceholder')}
            type="number"
            value={budgetMax}
            onChange={(e) => onBudgetMaxChange(e.target.value)}
            inputSize="sm"
          />
        </div>
      </div>

      {/* Location Filter */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-aurora-orange" />
            <h3 className="text-sm font-medium text-polar-night">{t('filters.location')}</h3>
          </div>
          {locationFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearLocation}
              className="h-auto py-0 px-2 text-xs"
            >
              {t('filters.clear')}
            </Button>
          )}
        </div>
        <Input
          placeholder={t('filters.searchLocationPlaceholder')}
          value={locationFilter}
          onChange={(e) => onLocationChange(e.target.value)}
          inputSize="sm"
        />
      </div>

      {/* Expiring Soon Toggle */}
      <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-aurora-orange" />
            <h3 className="text-sm font-medium text-polar-night">{t('filters.expiringSoon')}</h3>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer group">
          <Checkbox
            checked={showExpiringOnly}
            onChange={onToggleExpiring}
          />
          <span className="text-sm group-hover:text-polar-night transition-colors">
            {t('filters.expiringToggle')}
          </span>
        </label>
      </div>
    </>
  );
}
