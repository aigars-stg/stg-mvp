'use client';

import { Globe, BookOpen, Building as Building2 } from 'griddy-icons';

interface OfferCardVersionInfoProps {
  formattedEdition: string | null;
  language: string | null;
  publisher: string | null;
}

export function OfferCardVersionInfo({ formattedEdition, language, publisher }: OfferCardVersionInfoProps) {
  if (!formattedEdition && !language && !publisher) {
    return null;
  }

  return (
    <div className="text-sm text-text-secondary dark:text-snow-stormLight mb-2 space-y-0.5">
      {formattedEdition && (
        <p className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-text-muted dark:text-snow-stormMedium flex-shrink-0" />
          {formattedEdition}
        </p>
      )}
      {language && (
        <p className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-text-muted dark:text-snow-stormMedium flex-shrink-0" />
          <span>{language.replace(/, /g, ' / ')}</span>
        </p>
      )}
      {publisher && (
        <p className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-text-muted dark:text-snow-stormMedium flex-shrink-0" />
          <span>{publisher.replace(/, /g, ' / ')}</span>
        </p>
      )}
    </div>
  );
}
