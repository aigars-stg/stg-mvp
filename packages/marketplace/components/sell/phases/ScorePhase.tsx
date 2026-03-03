/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, Badge } from '@second-turn/design-system';
import { SELLER_COMMISSION_RATE } from '@/lib/pricing/constants';
import { formatPrice } from '@/lib/services/pricing';
import { getConditionBadgeVariant } from '@/lib/utils/condition-utils';
import {
  Search,
  CurrencyEuro,
  PhotoCamera,
  Edit,
} from '@/lib/icons';
import type { ListingFormData } from '@/lib/hooks/useListingForm';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScorePhaseProps {
  // Core form state
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;

  // Phase navigation
  goToPhase: (index: number) => void;

  // Publish
  onPublish: () => void;
  isPublishing: boolean;

  // Draft
  onSaveDraft: () => void;

  // Existing photos (for relist)
  existingPhotoUrls: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Small "edit" pencil link for navigating back to a phase */
function EditLink({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-frost-ice hover:text-aurora-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frost-ice focus-visible:ring-offset-2 rounded transition-colors"
    >
      <Edit size={12} />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScorePhase({
  formData,
  setFormData,
  goToPhase,
  onPublish,
  isPublishing,
  onSaveDraft,
  existingPhotoUrls,
}: ScorePhaseProps) {
  const tSections = useTranslations('Sell.sections');
  const tTerms = useTranslations('Sell.terms');
  const tActions = useTranslations('Sell.actions');
  const tPrice = useTranslations('Sell.price');
  const tPhases = useTranslations('Phases.listing');
  const tCondition = useTranslations('Sell.ConditionSelector.condition');

  const allPhotoUrls = [
    ...existingPhotoUrls,
    ...formData.photos.map((p) => p.preview),
  ];

  const gameName =
    formData.selectedGameDisplayName || formData.selectedGame?.name || '';
  const gameImage =
    formData.selectedGame?.image || formData.selectedGame?.thumbnail || null;

  const conditionKey = formData.condition || 'good';

  return (
    <div className="space-y-4">
      {/* ── Game Summary ─────────────────────────────────────── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-polar-night flex items-center gap-2">
            <Search size={16} className="text-frost-ice" />
            {tSections('game.title')}
          </h3>
          <EditLink
            onClick={() => goToPhase(0)}
            label={tActions('edit') || 'Edit'}
          />
        </div>

        <div className="flex items-start gap-4">
          {gameImage && (
            <img
              src={gameImage}
              alt={gameName}
              className="w-20 h-20 rounded-lg object-cover border border-border flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-polar-night text-base truncate">
              {gameName}
            </p>
            {formData.selectedVersion && (
              <div className="text-sm text-text-secondary mt-1 space-y-0.5">
                {formData.selectedVersion.language && (
                  <p>{formData.selectedVersion.language}</p>
                )}
                {formData.selectedVersion.publisher && (
                  <p>{formData.selectedVersion.publisher}</p>
                )}
                {formData.selectedVersion.yearPublished && (
                  <p>{formData.selectedVersion.yearPublished}</p>
                )}
              </div>
            )}
            {formData.selectedExpansions.length > 0 && (
              <p className="text-xs text-text-muted mt-1.5">
                +{formData.selectedExpansions.length}{' '}
                {tSections('game.expansionCount', { count: formData.selectedExpansions.length })}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ── Condition & Price Summary ────────────────────────── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-polar-night flex items-center gap-2">
            <CurrencyEuro size={16} className="text-frost-ice" />
            {tSections('condition.title')} &amp; {tSections('pricing.title')}
          </h3>
          <EditLink
            onClick={() => goToPhase(1)}
            label={tActions('edit') || 'Edit'}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {formData.condition && (
              <Badge variant={getConditionBadgeVariant(formData.condition)}>
                {tCondition(conditionKey)}
              </Badge>
            )}
            {formData.conditionNotes && (
              <span className="text-xs text-text-muted truncate max-w-[180px]">
                {formData.conditionNotes}
              </span>
            )}
          </div>
          <span className="text-xl font-bold text-polar-night">
            {formData.price ? `€${parseFloat(formData.price).toFixed(2)}` : '—'}
          </span>
        </div>

        {/* Fee breakdown */}
        {formData.price &&
          parseFloat(formData.price) > 0 &&
          !isNaN(parseFloat(formData.price)) && (
            <div className="mt-4 pt-3 border-t border-border-subtle">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">
                  {tPrice('commission.platformFee')}
                </span>
                <span className="text-text-secondary">
                  -
                  {formatPrice(
                    parseFloat(formData.price) * SELLER_COMMISSION_RATE,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="font-medium text-polar-night">
                  {tPrice('commission.youReceive')}
                </span>
                <span className="font-semibold text-aurora-green">
                  {formatPrice(
                    parseFloat(formData.price) * (1 - SELLER_COMMISSION_RATE),
                  )}
                </span>
              </div>
            </div>
          )}
      </Card>

      {/* ── Photos Summary ───────────────────────────────────── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-polar-night flex items-center gap-2">
            <PhotoCamera size={16} className="text-frost-ice" />
            {tSections('photos.title')}
          </h3>
          <EditLink
            onClick={() => goToPhase(2)}
            label={tActions('edit') || 'Edit'}
          />
        </div>

        {allPhotoUrls.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allPhotoUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Photo ${idx + 1}`}
                className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0"
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            {tSections('photos.subtitleOptional')}
          </p>
        )}
      </Card>

      {/* ── Terms Checkbox ───────────────────────────────────── */}
      <div className="bg-bg-secondary rounded-lg p-4 sm:p-6 border-2 border-border">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                termsAccepted: e.target.checked,
              }))
            }
            className="mt-1 w-4 h-4 rounded border-border text-frost-ice focus:ring-frost-ice"
          />
          <div className="flex-1 text-sm text-text-secondary">
            {tTerms('prefix')}{' '}
            <a
              href="/legal/terms"
              className="text-frost-ice hover:underline"
            >
              {tTerms('termsLink')}
            </a>{' '}
            {tTerms('middle')}
          </div>
        </label>
      </div>

      {/* ── Action Buttons ───────────────────────────────────── */}
      <div className="space-y-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onPublish}
          disabled={isPublishing || !formData.termsAccepted}
        >
          {isPublishing
            ? tActions('publishing')
            : tPhases('score.publishButton')}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={onSaveDraft}
          disabled={isPublishing}
        >
          {tActions('saveDraft')}
        </Button>
      </div>
    </div>
  );
}
