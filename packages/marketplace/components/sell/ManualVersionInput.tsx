'use client';

import { useState } from 'react';
import { Card, Button, Input } from '@second-turn/design-system';
import { ManualVersion } from '@/lib/bgg-types';
import { Info } from 'lucide-react';

interface ManualVersionInputProps {
  gameName: string;
  gameYear?: number;
  onSubmit: (version: ManualVersion) => void;
  onCancel?: () => void;
}

export function ManualVersionInput({ gameName, gameYear, onSubmit, onCancel }: ManualVersionInputProps) {
  const [versionName, setVersionName] = useState('');
  const [publisher, setPublisher] = useState('');
  const [language, setLanguage] = useState('');
  const [editionYear, setEditionYear] = useState<string>(gameYear?.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!publisher.trim()) {
      newErrors.publisher = 'Publisher is required';
    }

    if (!language.trim()) {
      newErrors.language = 'Language is required';
    }

    if (editionYear && (isNaN(Number(editionYear)) || Number(editionYear) < 1900 || Number(editionYear) > new Date().getFullYear() + 1)) {
      newErrors.editionYear = 'Please enter a valid year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const manualVersion: ManualVersion = {
      id: 0,
      isManual: true,
      name: versionName.trim() || `${publisher} Edition`,
      publisher: publisher.trim(),
      language: language.trim(),
      yearPublished: editionYear ? Number(editionYear) : undefined,
    };

    onSubmit(manualVersion);
  };

  return (
    <Card padding="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-polar-night">Specify Your Edition</h3>
          <p className="text-sm text-text-secondary">
            Tell us about your copy of <span className="font-semibold text-polar-night">{gameName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Banner */}
          <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary space-y-1">
                <p>We couldn't automatically retrieve version information from BoardGameGeek.</p>
                <p>Please provide details about your copy to help buyers understand what they're purchasing.</p>
              </div>
            </div>
          </div>

          {/* Publisher - Required */}
          <div className="space-y-2">
            <label htmlFor="publisher" className="block text-sm font-medium text-polar-night">
              Publisher <span className="text-error">*</span>
            </label>
            <Input
              id="publisher"
              type="text"
              placeholder="e.g., Stonemaier Games, Z-Man Games, etc."
              value={publisher}
              onChange={(e) => {
                setPublisher(e.target.value);
                if (errors.publisher) {
                  setErrors({ ...errors, publisher: '' });
                }
              }}
              required
            />
            {errors.publisher && (
              <p className="text-sm text-aurora-red">{errors.publisher}</p>
            )}
          </div>

          {/* Language - Required */}
          <div className="space-y-2">
            <label htmlFor="language" className="block text-sm font-medium text-polar-night">
              Language <span className="text-error">*</span>
            </label>
            <Input
              id="language"
              type="text"
              placeholder="e.g., English, German, French, etc."
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                if (errors.language) {
                  setErrors({ ...errors, language: '' });
                }
              }}
              required
            />
            {errors.language && (
              <p className="text-sm text-aurora-red">{errors.language}</p>
            )}
          </div>

          {/* Edition/Version Name - Optional */}
          <div className="space-y-2">
            <label htmlFor="versionName" className="block text-sm font-medium text-polar-night">
              Edition/Version Name <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <Input
              id="versionName"
              type="text"
              placeholder="e.g., Retail Edition, Kickstarter Edition, Second Edition"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
            />
            <p className="text-sm text-text-secondary">
              If left blank, we'll use "{publisher || 'Publisher'} Edition"
            </p>
          </div>

          {/* Edition Year - Optional */}
          <div className="space-y-2">
            <label htmlFor="editionYear" className="block text-sm font-medium text-polar-night">
              Edition Year <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <Input
              id="editionYear"
              type="number"
              placeholder={gameYear?.toString() || 'e.g., 2023'}
              value={editionYear}
              onChange={(e) => {
                setEditionYear(e.target.value);
                if (errors.editionYear) {
                  setErrors({ ...errors, editionYear: '' });
                }
              }}
              min={1900}
              max={new Date().getFullYear() + 1}
            />
            {errors.editionYear && (
              <p className="text-sm text-aurora-red">{errors.editionYear}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
            >
              Continue
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}
