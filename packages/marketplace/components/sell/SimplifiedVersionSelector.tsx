'use client';

import { Card, Select, Input, Button } from '@second-turn/design-system';
import type { BGGGame } from '@/lib/bgg-api';

interface SimplifiedVersionSelectorProps {
  game: BGGGame;
  language: string;
  year: string;
  versionNotes: string;
  onChange: (field: 'language' | 'year' | 'versionNotes', value: string) => void;
  onSkip: () => void;
}

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Select language' },
  { value: 'English', label: 'English' },
  { value: 'Latvian', label: 'Latvian' },
  { value: 'Lithuanian', label: 'Lithuanian' },
  { value: 'Estonian', label: 'Estonian' },
  { value: 'Russian', label: 'Russian' },
  { value: 'German', label: 'German' },
  { value: 'French', label: 'French' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Other', label: 'Other' },
];

export function SimplifiedVersionSelector({
  game,
  language,
  year,
  versionNotes,
  onChange,
  onSkip,
}: SimplifiedVersionSelectorProps) {
  return (
    <Card padding="md" className="bg-snow-stormLight">
      <div className="space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-1">
            Version Details (Optional)
          </h3>
          <p className="text-sm text-text-secondary">
            Help buyers find the right version - you can skip this if you're not sure
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Language */}
          <div>
            <Select
              label="Language"
              value={language}
              onChange={(e) => onChange('language', e.target.value)}
              options={LANGUAGE_OPTIONS}
            />
          </div>

          {/* Year */}
          <div>
            <Input
              label="Edition Year (if known)"
              type="number"
              value={year}
              onChange={(e) => onChange('year', e.target.value)}
              placeholder={`e.g., ${game.yearPublished || '2019'}`}
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>
        </div>

        {/* Version Notes */}
        <div>
          <label className="block text-sm font-medium text-polar-night mb-2">
            Version Notes (Optional)
          </label>
          <input
            type="text"
            value={versionNotes}
            onChange={(e) => onChange('versionNotes', e.target.value)}
            placeholder='e.g., "Second edition", "Retail version", "Kickstarter edition"'
            className="w-full px-4 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
          />
          <p className="text-xs text-text-muted mt-1">
            Add any details that help identify your specific version
          </p>
        </div>

        {/* Skip Button */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
          >
            Skip version details →
          </Button>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Help Text */}
        <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-3">
          <p className="text-xs text-text-secondary">
            💡 <strong className="text-polar-night">Not sure?</strong> That's okay! Check your game box
            for language and year. Most buyers care mainly about the language.
          </p>
        </div>
      </div>
    </Card>
  );
}
