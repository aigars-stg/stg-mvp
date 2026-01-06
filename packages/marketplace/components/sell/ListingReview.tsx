'use client';

import { Card, Button, Badge, Checkbox } from '@second-turn/design-system';
import type { BGGGame, BGGVersion } from '@/lib/bgg-api';
import type { PhotoFile } from './PhotoUpload';
import { useTranslations } from 'next-intl';

interface ListingFormData {
  selectedGame: BGGGame | null;
  selectedVersion: BGGVersion | null;
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | null;
  conditionNotes: string;
  allComponentsPresent: boolean;
  missingComponents: string;
  extras: {
    sleeved: boolean;
    promos: boolean;
    customInsert: boolean;
    other: string;
  };
  photos: PhotoFile[];
  price: string;
  acceptOffers: boolean;
  minimumOffer: string;
  shippingOptions: {
    standard: boolean;
    express: boolean;
    localPickup: boolean;
  };
  pickupCity: string;
  shippingNotes: string;
  whySelling: string;
  termsAccepted: boolean;
}

interface ListingReviewProps {
  formData: ListingFormData;
  onEdit: (step: number) => void;
  onPublish: () => void;
  isPublishing?: boolean;
  onTermsChange?: (accepted: boolean) => void;
}

const CONDITION_LABELS = {
  likeNew: '📦 Like New',
  veryGood: '✨ Very Good',
  good: '🎲 Good',
  acceptable: '🔧 Acceptable',
};

const CONDITION_VARIANTS = {
  likeNew: 'default' as const,
  veryGood: 'success' as const,
  good: 'warning' as const,
  acceptable: 'default' as const,
};

export function ListingReview({ formData, onEdit, onPublish, isPublishing = false, onTermsChange }: ListingReviewProps) {
  const t = useTranslations('Sell.ListingReview');
  const tConditions = useTranslations('Sell.ListingReview.conditions');
  const tExtras = useTranslations('Sell.ListingReview.extras');
  const tSections = useTranslations('Sell.ListingReview.sections');
  const tPricing = useTranslations('Sell.ListingReview.pricing');
  const mainPhoto = formData.photos[0];

  // Condition labels with translations
  const conditionLabels = {
    likeNew: `📦 ${tConditions('likeNew')}`,
    veryGood: `✨ ${tConditions('veryGood')}`,
    good: `🎲 ${tConditions('good')}`,
    acceptable: `🔧 ${tConditions('acceptable')}`,
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-polar-night mb-2">
          {t('title')}
        </h2>
        <p className="text-sm sm:text-base text-text-secondary">
          {t('subtitle')}
        </p>
      </div>

      {/* Preview Card - How it will look to buyers */}
      <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-polar-night">
            {t('preview.title')}
          </h3>
          <Badge variant="default" size="sm">
            {t('preview.badge')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Photo */}
          <div className="aspect-square bg-snow-stormLight rounded-lg overflow-hidden">
            {mainPhoto ? (
              <img
                src={mainPhoto.preview}
                alt="Main listing photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎲</div>
                  <div className="text-sm">{t('preview.noPhoto')}</div>
                </div>
              </div>
            )}
          </div>

          {/* Game Details */}
          <div className="flex flex-col">
            <div className="flex-1">
              <h4 className="text-xl font-bold text-polar-night mb-2">
                {formData.selectedGame?.name || 'Game Title'}
              </h4>

              {formData.selectedVersion && (
                <p className="text-sm text-text-secondary mb-3">
                  {formData.selectedVersion.publisher && `${formData.selectedVersion.publisher} • `}
                  {formData.selectedVersion.languages && formData.selectedVersion.languages.length > 0
                    ? `${formData.selectedVersion.languages.join('/')} • `
                    : formData.selectedVersion.language
                    ? `${formData.selectedVersion.language} • `
                    : ''}
                  {formData.selectedVersion.yearPublished || formData.selectedGame?.yearPublished}
                </p>
              )}

              {formData.condition && (
                <div className="mb-4">
                  <Badge variant={CONDITION_VARIANTS[formData.condition]} size="md">
                    {conditionLabels[formData.condition]}
                  </Badge>
                </div>
              )}

              <div className="text-3xl font-bold text-polar-night mb-1">
                €{formData.price || '0'}
              </div>
              <div className="text-sm text-text-secondary mb-4">
                {formData.shippingOptions.standard && tPricing('standardShipping')}
                {formData.shippingOptions.standard && formData.shippingOptions.express && ` ${tPricing('or')} `}
                {formData.shippingOptions.express && tPricing('expressShipping')}
                {formData.shippingOptions.localPickup && (
                  <span className="text-success">
                    {(formData.shippingOptions.standard || formData.shippingOptions.express) && ` ${tPricing('or')} `}
                    {tPricing('freePickup', { city: formData.pickupCity || tPricing('yourCity') })}
                  </span>
                )}
              </div>

              {formData.acceptOffers && (
                <div className="text-sm text-frost-ice mb-4">
                  {tPricing('acceptsOffers')}
                  {formData.minimumOffer && ` (${tPricing('minimum', { amount: formData.minimumOffer })})`}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Details Sections */}
      <div className="space-y-4">
        {/* Game Information */}
        <Card padding="md">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-polar-night">{tSections('gameInfo')}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(1)}
            >
              {t('edit')}
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">{tSections('game')}:</span>
              <span className="text-polar-night font-medium">{formData.selectedGame?.name || '-'}</span>
            </div>
            {formData.selectedVersion && (
              <>
                <div className="flex justify-between">
                  <span className="text-text-muted">{tSections('version')}:</span>
                  <span className="text-polar-night">{formData.selectedVersion.name}</span>
                </div>
                {formData.selectedVersion.publisher && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{tSections('publisher')}:</span>
                    <span className="text-polar-night">{formData.selectedVersion.publisher}</span>
                  </div>
                )}
                {/* Display all languages for multilingual versions */}
                {formData.selectedVersion.languages && formData.selectedVersion.languages.length > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-text-muted">
                      {formData.selectedVersion.languages.length > 1 ? `${tSections('languages')}:` : `${tSections('language')}:`}
                    </span>
                    <span className="text-polar-night">
                      {formData.selectedVersion.languages.join(' / ')}
                    </span>
                  </div>
                ) : formData.selectedVersion.language ? (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{tSections('language')}:</span>
                    <span className="text-polar-night">{formData.selectedVersion.language}</span>
                  </div>
                ) : null}
                {formData.selectedVersion.yearPublished && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{tSections('year')}:</span>
                    <span className="text-polar-night">{formData.selectedVersion.yearPublished}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Condition */}
        <Card padding="md">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-polar-night">{tSections('condition')}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(1)}
            >
              {t('edit')}
            </Button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-muted">{tSections('overall')}:</span>
              {formData.condition && (
                <Badge variant={CONDITION_VARIANTS[formData.condition]} size="sm">
                  {conditionLabels[formData.condition]}
                </Badge>
              )}
            </div>
            <div>
              <span className="text-text-muted block mb-1">{tSections('description')}:</span>
              <p className="text-polar-night leading-relaxed whitespace-pre-line">
                {formData.conditionNotes || '-'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">{tSections('components')}:</span>
              <span className="text-polar-night">
                {formData.allComponentsPresent ? tSections('allPresent') : tSections('someMissing')}
              </span>
            </div>
            {!formData.allComponentsPresent && formData.missingComponents && (
              <div>
                <span className="text-text-muted block mb-1">{tSections('missingDetails')}:</span>
                <p className="text-polar-night text-sm">{formData.missingComponents}</p>
              </div>
            )}
            {(formData.extras.sleeved || formData.extras.promos || formData.extras.customInsert || formData.extras.other) && (
              <div>
                <span className="text-text-muted block mb-1">{tSections('extrasLabel')}:</span>
                <div className="flex flex-wrap gap-2">
                  {formData.extras.sleeved && <Badge variant="success" size="sm">{tExtras('sleeved')}</Badge>}
                  {formData.extras.promos && <Badge variant="success" size="sm">{tExtras('promos')}</Badge>}
                  {formData.extras.customInsert && <Badge variant="success" size="sm">{tExtras('customInsert')}</Badge>}
                  {formData.extras.other && <Badge variant="success" size="sm">{formData.extras.other}</Badge>}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Photos */}
        <Card padding="md">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-polar-night">{tSections('photos', { count: formData.photos.length })}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(2)}
            >
              {t('edit')}
            </Button>
          </div>
          {formData.photos.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={photo.preview}
                    alt={`${tSections('photoAlt')} ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">{tSections('noPhotos')}</p>
          )}
        </Card>

        {/* Pricing & Shipping */}
        <Card padding="md">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-polar-night">{tSections('pricingShipping')}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(2)}
            >
              {t('edit')}
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">{tPricing('price')}:</span>
              <span className="text-polar-night font-medium">€{formData.price || '0'}</span>
            </div>
            {formData.acceptOffers && (
              <div className="flex justify-between">
                <span className="text-text-muted">{tPricing('acceptsOffersLabel')}:</span>
                <span className="text-polar-night">
                  {tPricing('yes')}{formData.minimumOffer && ` (${tPricing('min')} €${formData.minimumOffer})`}
                </span>
              </div>
            )}
            <div className="flex justify-between items-start">
              <span className="text-text-muted">{tPricing('shipping')}:</span>
              <div className="text-right text-polar-night">
                {formData.shippingOptions.standard && <div>{tPricing('standard')}</div>}
                {formData.shippingOptions.express && <div>{tPricing('express')}</div>}
                {formData.shippingOptions.localPickup && (
                  <div className="text-success">
                    {tPricing('localPickup')}{formData.pickupCity && ` ${tPricing('in')} ${formData.pickupCity}`}
                  </div>
                )}
              </div>
            </div>
            {formData.shippingNotes && (
              <div>
                <span className="text-text-muted block mb-1">{tPricing('shippingNotes')}:</span>
                <p className="text-polar-night">{formData.shippingNotes}</p>
              </div>
            )}
            {formData.whySelling && (
              <div>
                <span className="text-text-muted block mb-1">{tPricing('whySelling')}:</span>
                <p className="text-polar-night">{formData.whySelling}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Terms & Publish */}
      <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="pt-0.5">
              <Checkbox
                checked={formData.termsAccepted}
                onChange={(e) => onTermsChange?.(e.target.checked)}
              />
            </div>
            <div className="flex-1 text-sm text-polar-night">
              {t('termsText')}
            </div>
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => onEdit(1)}
            >
              {t('backToEdit')}
            </Button>
            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={onPublish}
              disabled={!formData.termsAccepted || isPublishing}
            >
              {isPublishing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {t('publishing')}
                </span>
              ) : (
                t('publishButton')
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Help Text */}
      <Card padding="md" className="bg-snow-stormLight">
        <div className="flex gap-3">
          <div className="text-frost-ice flex-shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1 a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 text-sm text-text-secondary">
            {t('helpText')}
          </div>
        </div>
      </Card>
    </div>
  );
}
