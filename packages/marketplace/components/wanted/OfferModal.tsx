'use client';

import { useState } from 'react';
import { SlidePanel, Button, Input, Select, Badge } from '@second-turn/design-system';
import { Upload, Flash as Zap, AlertTriangle, Check } from 'griddy-icons';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';

interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  wantedListing: WantedListingWithDetails;
  onSubmit: (offer: {
    offered_price: string;
    offered_condition: string;
    response_notes?: string;
    photo_urls?: string[];
  }) => Promise<void>;
}

export function OfferModal({
  open,
  onClose,
  wantedListing,
  onSubmit,
}: OfferModalProps) {
  // Form state
  const [offeredPrice, setOfferedPrice] = useState(
    wantedListing.max_price ? wantedListing.max_price.toString() : ''
  );
  const [offeredCondition, setOfferedCondition] = useState<string>('');
  const [responseNotes, setResponseNotes] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Validation
  const priceValue = parseFloat(offeredPrice);
  const isPriceValid = !isNaN(priceValue) && priceValue > 0;
  const isPriceInBudget =
    isPriceValid &&
    (!wantedListing.min_price || priceValue >= wantedListing.min_price) &&
    priceValue <= wantedListing.max_price;
  const isConditionValid =
    offeredCondition && wantedListing.acceptable_conditions.includes(offeredCondition as ListingCondition);
  const canSubmit = isPriceValid && isConditionValid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError('');

      await onSubmit({
        offered_price: offeredPrice,
        offered_condition: offeredCondition,
        response_notes: responseNotes || undefined,
        photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
      });

      // Success - close modal
      onClose();
    } catch (err: any) {
      console.error('Error submitting offer:', err);
      setError(err.message || 'Failed to submit offer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate if this would be a quick response (< 2 hours)
  const createdAt = new Date(wantedListing.created_at);
  const now = new Date();
  const hoursSincePosted = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const isQuickResponse = hoursSincePosted <= 2;

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="I Have This Game!"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {/* Game Info Summary */}
        <div className="mb-6 p-4 bg-surface-1 rounded-lg border border-border-subtle">
          <div className="flex gap-4">
            {wantedListing.game?.thumbnail && (
              <img
                src={wantedListing.game.thumbnail}
                alt={wantedListing.game_name}
                className="w-20 h-20 object-contain rounded"
              />
            )}
            <div>
              <h3 className="font-bold text-polar-night">{wantedListing.game_name}</h3>
              <p className="text-sm text-text-secondary mt-1">
                Buyer's budget: €{wantedListing.min_price || 0}–€{wantedListing.max_price}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {wantedListing.acceptable_conditions.map((condition) => (
                  <Badge key={condition} variant={condition as any} size="sm">
                    {getConditionLabel(condition)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Response Badge */}
        {isQuickResponse && (
          <div className="mb-4 p-3 bg-aurora-orange/10 border border-aurora-orange/20 rounded-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-aurora-orange" />
            <div className="flex-1">
              <p className="text-sm font-medium text-aurora-orange">
                Quick Responder Badge Available!
              </p>
              <p className="text-xs text-aurora-orange/80">
                Respond now to earn the ⚡ Quick Responder badge (within 2 hours of posting)
              </p>
            </div>
          </div>
        )}

        {/* Condition Selection */}
        <div className="mb-4">
          <Select
            label="Condition *"
            options={wantedListing.acceptable_conditions.map((condition) => ({
              value: condition,
              label: getConditionLabel(condition),
            }))}
            value={offeredCondition}
            onChange={setOfferedCondition}
            placeholder="Select condition..."
            error={
              offeredCondition && !isConditionValid
                ? 'This condition is not acceptable for this wanted listing'
                : undefined
            }
          />
        </div>

        {/* Price Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-polar-night mb-2">
            Your Price <span className="text-aurora-red">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              €
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={offeredPrice}
              onChange={(e) => setOfferedPrice(e.target.value)}
              className="pl-8"
              placeholder="0.00"
              required
            />
          </div>
          {isPriceValid && !isPriceInBudget && (
            <div className="flex items-start gap-2 text-xs text-aurora-yellow mt-1">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Your price (€{priceValue}) is outside the buyer's budget range</p>
            </div>
          )}
          {isPriceValid && isPriceInBudget && (
            <div className="flex items-center gap-2 text-xs text-aurora-green mt-1">
              <Check className="w-4 h-4 flex-shrink-0" />
              <p>Within buyer's budget</p>
            </div>
          )}
        </div>

        {/* Photos Upload (Optional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-polar-night mb-2">
            Photos (Optional)
          </label>
          <div className="text-sm text-text-secondary mb-2">
            Add up to 3 photos of your game to help the buyer decide
          </div>

          {/* Photo Upload Placeholder - To be implemented with actual upload logic */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-secondary">
              Photo upload coming soon
            </p>
            <p className="text-xs text-text-disabled mt-1">
              For now, you can add photos in your message after responding
            </p>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-polar-night mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice min-h-[100px] resize-none"
            placeholder="E.g., Available for local pickup in Riga, photos available upon request, etc."
            maxLength={500}
          />
          <div className="text-xs text-text-secondary mt-1">
            {responseNotes.length}/500 characters
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg text-aurora-red text-sm">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            disabled={!canSubmit}
            loading={submitting}
          >
            {submitting ? 'Sending...' : 'Send Offer & Start Chat'}
          </Button>
        </div>
      </form>
    </SlidePanel>
  );
}
