'use client';

import { useState } from 'react';
import { Card, Button, Input } from '@second-turn/design-system';
import { ManualVersion } from '@/lib/bgg-types';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ManualVersionInputProps {
  gameName: string;
  gameYear?: number;
  onSubmit: (version: ManualVersion) => void;
  onCancel?: () => void;
}

export function ManualVersionInput({ gameName, gameYear, onSubmit, onCancel }: ManualVersionInputProps) {
  const t = useTranslations('Sell.ManualVersionInput');
  const tPublisher = useTranslations('Sell.ManualVersionInput.publisher');
  const tLanguage = useTranslations('Sell.ManualVersionInput.language');
  const tVersionName = useTranslations('Sell.ManualVersionInput.versionName');
  const tEditionYear = useTranslations('Sell.ManualVersionInput.editionYear');
  const tInfoBanner = useTranslations('Sell.ManualVersionInput.infoBanner');

  const [versionName, setVersionName] = useState('');
  const [publisher, setPublisher] = useState('');
  const [language, setLanguage] = useState('');
  const [editionYear, setEditionYear] = useState<string>(gameYear?.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!publisher.trim()) {
      newErrors.publisher = tPublisher('error');
    }

    if (!language.trim()) {
      newErrors.language = tLanguage('error');
    }

    if (editionYear && (isNaN(Number(editionYear)) || Number(editionYear) < 1900 || Number(editionYear) > new Date().getFullYear() + 1)) {
      newErrors.editionYear = tEditionYear('error');
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
          <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
          <p className="text-sm text-text-secondary">
            {t('subtitle', { gameName: '' })} <span className="font-semibold text-polar-night">{gameName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Banner */}
          <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary space-y-1">
                <p>{tInfoBanner('line1')}</p>
                <p>{tInfoBanner('line2')}</p>
              </div>
            </div>
          </div>

          {/* Publisher - Required */}
          <div className="space-y-2">
            <label htmlFor="publisher" className="block text-sm font-medium text-polar-night">
              {tPublisher('label')} <span className="text-error">*</span>
            </label>
            <Input
              id="publisher"
              type="text"
              placeholder={tPublisher('placeholder')}
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
              {tLanguage('label')} <span className="text-error">*</span>
            </label>
            <Input
              id="language"
              type="text"
              placeholder={tLanguage('placeholder')}
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
              {tVersionName('label')} <span className="text-text-secondary font-normal">{tVersionName('optional')}</span>
            </label>
            <Input
              id="versionName"
              type="text"
              placeholder={tVersionName('placeholder')}
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
            />
            <p className="text-sm text-text-secondary">
              {tVersionName('hint', { publisher: publisher || 'Publisher' })}
            </p>
          </div>

          {/* Edition Year - Optional */}
          <div className="space-y-2">
            <label htmlFor="editionYear" className="block text-sm font-medium text-polar-night">
              {tEditionYear('label')} <span className="text-text-secondary font-normal">{tEditionYear('optional')}</span>
            </label>
            <Input
              id="editionYear"
              type="number"
              placeholder={gameYear?.toString() || tEditionYear('placeholder')}
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
              {t('continueButton')}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
              >
                {t('cancelButton')}
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}
