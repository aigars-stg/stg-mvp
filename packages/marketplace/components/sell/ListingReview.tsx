'use client';

import { Card, Button, Badge, Checkbox } from '@second-turn/design-system';
import type { BGGGame, BGGVersion } from '@/lib/bgg-api';
import type { PhotoFile } from './PhotoUpload';

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
  const mainPhoto = formData.photos.find(p => p.isMain) || formData.photos[0];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-polar-night mb-2">
          Review Your Listing
        </h2>
        <p className="text-sm sm:text-base text-text-secondary">
          Make sure everything looks good before publishing
        </p>
      </div>

      {/* Preview Card - How it will look to buyers */}
      <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-polar-night">
            Listing Preview
          </h3>
          <Badge variant="default" size="sm">
            How buyers will see it
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
                  <div className="text-sm">No photo</div>
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
                    {CONDITION_LABELS[formData.condition]}
                  </Badge>
                </div>
              )}

              <div className="text-3xl font-bold text-polar-night mb-1">
                €{formData.price || '0'}
              </div>
              <div className="text-sm text-text-secondary mb-4">
                {formData.shippingOptions.standard && '+ €5 standard shipping'}
                {formData.shippingOptions.standard && formData.shippingOptions.express && ' or '}
                {formData.shippingOptions.express && '+ €12 express'}
                {formData.shippingOptions.localPickup && (
                  <span className="text-success">
                    {(formData.shippingOptions.standard || formData.shippingOptions.express) && ' or '}
                    Free local pickup in {formData.pickupCity || 'your city'}
                  </span>
                )}
              </div>

              {formData.acceptOffers && (
                <div className="text-sm text-frost-ice mb-4">
                  ✓ Seller accepts offers
                  {formData.minimumOffer && ` (minimum €${formData.minimumOffer})`}
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
            <h3 className="font-semibold text-polar-night">Game Information</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(1)}
            >
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Game:</span>
              <span className="text-polar-night font-medium">{formData.selectedGame?.name || '-'}</span>
            </div>
            {formData.selectedVersion && (
              <>
                <div className="flex justify-between">
                  <span className="text-text-muted">Version:</span>
                  <span className="text-polar-night">{formData.selectedVersion.name}</span>
                </div>
                {formData.selectedVersion.publisher && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Publisher:</span>
                    <span className="text-polar-night">{formData.selectedVersion.publisher}</span>
                  </div>
                )}
                {/* Display all languages for multilingual versions */}
                {formData.selectedVersion.languages && formData.selectedVersion.languages.length > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-text-muted">
                      {formData.selectedVersion.languages.length > 1 ? 'Languages:' : 'Language:'}
                    </span>
                    <span className="text-polar-night">
                      {formData.selectedVersion.languages.join(' / ')}
                    </span>
                  </div>
                ) : formData.selectedVersion.language ? (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Language:</span>
                    <span className="text-polar-night">{formData.selectedVersion.language}</span>
                  </div>
                ) : null}
                {formData.selectedVersion.yearPublished && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Year:</span>
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
            <h3 className="font-semibold text-polar-night">Condition</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(1)}
            >
              Edit
            </Button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Overall:</span>
              {formData.condition && (
                <Badge variant={CONDITION_VARIANTS[formData.condition]} size="sm">
                  {CONDITION_LABELS[formData.condition]}
                </Badge>
              )}
            </div>
            <div>
              <span className="text-text-muted block mb-1">Description:</span>
              <p className="text-polar-night leading-relaxed whitespace-pre-line">
                {formData.conditionNotes || '-'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Components:</span>
              <span className="text-polar-night">
                {formData.allComponentsPresent ? '✓ All present' : '⚠️ Some missing'}
              </span>
            </div>
            {!formData.allComponentsPresent && formData.missingComponents && (
              <div>
                <span className="text-text-muted block mb-1">Missing details:</span>
                <p className="text-polar-night text-sm">{formData.missingComponents}</p>
              </div>
            )}
            {(formData.extras.sleeved || formData.extras.promos || formData.extras.customInsert || formData.extras.other) && (
              <div>
                <span className="text-text-muted block mb-1">Extras:</span>
                <div className="flex flex-wrap gap-2">
                  {formData.extras.sleeved && <Badge variant="success" size="sm">Sleeved Cards</Badge>}
                  {formData.extras.promos && <Badge variant="success" size="sm">Promo Items</Badge>}
                  {formData.extras.customInsert && <Badge variant="success" size="sm">Custom Insert</Badge>}
                  {formData.extras.other && <Badge variant="success" size="sm">{formData.extras.other}</Badge>}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Photos */}
        <Card padding="md">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-polar-night">Photos ({formData.photos.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(2)}
            >
              Edit
            </Button>
          </div>
          {formData.photos.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={photo.preview}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                  {photo.isMain && (
                    <div className="absolute inset-0 bg-frost-ice/20 rounded flex items-center justify-center">
                      <Badge variant="default" size="sm">Main</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">No photos uploaded</p>
          )}
        </Card>

        {/* Pricing & Shipping */}
        <Card padding="md">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-polar-night">Pricing & Shipping</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(2)}
            >
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Price:</span>
              <span className="text-polar-night font-medium">€{formData.price || '0'}</span>
            </div>
            {formData.acceptOffers && (
              <div className="flex justify-between">
                <span className="text-text-muted">Accepts offers:</span>
                <span className="text-polar-night">
                  Yes{formData.minimumOffer && ` (min €${formData.minimumOffer})`}
                </span>
              </div>
            )}
            <div className="flex justify-between items-start">
              <span className="text-text-muted">Shipping:</span>
              <div className="text-right text-polar-night">
                {formData.shippingOptions.standard && <div>Standard (€5)</div>}
                {formData.shippingOptions.express && <div>Express (€12)</div>}
                {formData.shippingOptions.localPickup && (
                  <div className="text-success">
                    Local pickup{formData.pickupCity && ` in ${formData.pickupCity}`}
                  </div>
                )}
              </div>
            </div>
            {formData.shippingNotes && (
              <div>
                <span className="text-text-muted block mb-1">Shipping notes:</span>
                <p className="text-polar-night">{formData.shippingNotes}</p>
              </div>
            )}
            {formData.whySelling && (
              <div>
                <span className="text-text-muted block mb-1">Why selling:</span>
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
              I confirm that I have accurately described this game's condition including any wear or
              missing components, and I agree to ship within 2 business days or respond within 1 day
              to arrange local pickup. I understand that dishonest listings may result in account
              suspension.
            </div>
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => onEdit(1)}
            >
              ← Back to Edit
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
                  Publishing...
                </span>
              ) : (
                '🚀 Publish Listing'
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
            Once published, your listing will be visible to all buyers. You'll receive notifications
            when someone asks a question or makes an offer. Fast responses build trust and increase
            sales!
          </div>
        </div>
      </Card>
    </div>
  );
}
