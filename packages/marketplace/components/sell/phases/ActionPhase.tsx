'use client';

import { useTranslations } from 'next-intl';
import { Button, Card } from '@second-turn/design-system';
import { PhotoUpload } from '@/components/sell/PhotoUpload';
import type { PhotoFile } from '@/components/sell/PhotoUpload';
import type { ListingFormData } from '@/lib/hooks/useListingForm';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActionPhaseProps {
  // Core form state
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  onAdvance: () => void;
  isPhaseComplete: boolean;

  // Existing photos (for relist mode)
  existingPhotoUrls: string[];
  setExistingPhotoUrls: (urls: string[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionPhase({
  formData,
  setFormData,
  onAdvance,
  isPhaseComplete,
  existingPhotoUrls,
  setExistingPhotoUrls,
}: ActionPhaseProps) {
  const tPhases = useTranslations('Phases.listing');

  const handlePhotosChange = (photos: PhotoFile[]) => {
    setFormData((prev) => ({ ...prev, photos }));
  };

  return (
    <div className="space-y-4">
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

      {/* Continue button */}
      <div className="pt-4">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onAdvance}
          disabled={!isPhaseComplete}
        >
          {tPhases('action.continueButton')}
        </Button>
      </div>
    </div>
  );
}
