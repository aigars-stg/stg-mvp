'use client';

import { useTranslations } from 'next-intl';
import { Button, Card } from '@second-turn/design-system';
import { ConditionSelector } from '@/components/sell/ConditionSelector';
import { PhotoUpload } from '@/components/sell/PhotoUpload';
import type { PhotoFile } from '@/components/sell/PhotoUpload';
import { PhoneInput } from '@/components/common/PhoneInput';
import { ClipboardCheck, Phone } from '@/lib/icons';
import type { ListingFormData } from '@/lib/hooks/useListingForm';
import type { CountryCode } from '@/lib/country-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MarketPhaseProps {
  // Core form state
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  onAdvance?: () => void;
  isPhaseComplete?: boolean;

  // Phone state
  hasPhone: boolean;
  sellerPhone: string | null;
  onPhoneChange: (phone: string) => void;
  defaultCountry: CountryCode;

  // Photo state
  existingPhotoUrls: string[];
  setExistingPhotoUrls: (urls: string[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarketPhase({
  formData,
  setFormData,
  onAdvance,
  isPhaseComplete,
  hasPhone,
  sellerPhone,
  onPhoneChange,
  defaultCountry,
  existingPhotoUrls,
  setExistingPhotoUrls,
}: MarketPhaseProps) {
  const tSections = useTranslations('Sell.sections');
  const tPhases = useTranslations('Phases.listing');

  const handlePhotosChange = (photos: PhotoFile[]) => {
    setFormData((prev) => ({ ...prev, photos }));
  };

  return (
    <div className="space-y-4">
      {/* Phone prompt — required for shipping labels */}
      {!hasPhone && onPhoneChange && (
        <div className="bg-snow-white border border-border rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-aurora-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Phone className="w-4 h-4 text-aurora-orange" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-sm font-medium text-polar-night">
                  {tSections('phone.label')}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {tSections('phone.description')}
                </p>
              </div>
              <PhoneInput
                value={sellerPhone || ''}
                onChange={onPhoneChange}
                compact
                defaultCountry={defaultCountry}
                id="seller-phone-inline"
              />
            </div>
          </div>
        </div>
      )}

      {/* Condition Section */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardCheck className="w-4 h-4 text-frost-ice" />
          <h3 className="text-sm font-semibold text-polar-night">
            {tSections('condition.title')} <span className="text-aurora-red">*</span>
          </h3>
        </div>
        <ConditionSelector
          condition={formData.condition}
          conditionNotes={formData.conditionNotes}
          allComponentsPresent={formData.allComponentsPresent}
          missingComponents={formData.missingComponents}
          onChange={(field, value) =>
            setFormData((prev) => ({ ...prev, [field]: value }))
          }
        />
      </Card>

      {/* Photos Section */}
      <Card padding="md">
        <PhotoUpload
          photos={formData.photos}
          onPhotosChange={handlePhotosChange}
          existingPhotoUrls={existingPhotoUrls}
          onExistingPhotosChange={setExistingPhotoUrls}
          maxPhotos={8}
          condition={formData.condition}
        />
      </Card>

      {/* Continue button — sticky at bottom (EC-18); omitted on desktop */}
      {onAdvance && (
        <div className="pt-4 sticky bottom-4 z-10">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onAdvance}
            disabled={!isPhaseComplete}
          >
            {tPhases('market.continueButton')}
          </Button>
        </div>
      )}
    </div>
  );
}
