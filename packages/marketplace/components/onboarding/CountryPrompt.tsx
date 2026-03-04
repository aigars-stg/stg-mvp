'use client';

import { useState, useEffect } from 'react';
import { LocationPin as MapPin, RefreshCw as Loader2 } from '@/lib/icons';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from 'next-intl';
import type { CountryCode } from '@/lib/country-utils';

interface CountryPromptProps {
  onComplete?: (country: CountryCode) => void;
}

const COUNTRIES: { code: CountryCode; flagClass: string }[] = [
  { code: 'LV', flagClass: 'fi fi-lv' },
  { code: 'EE', flagClass: 'fi fi-ee' },
  { code: 'LT', flagClass: 'fi fi-lt' },
];

export function CountryPrompt({ onComplete }: CountryPromptProps) {
  const t = useTranslations('CountryPrompt');
  const tCountry = useTranslations('Countries');
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState<CountryCode | null>(null);
  const [error, setError] = useState('');
  const [detectedCountry, setDetectedCountry] = useState<CountryCode | null>(null);
  const [showAllCountries, setShowAllCountries] = useState(false);

  useEffect(() => {
    if (!user || profile?.country) return;
    fetch('/api/geo/detect')
      .then(res => res.json())
      .then(data => {
        if (data.detected && data.country) {
          setDetectedCountry(data.country as CountryCode);
        }
      })
      .catch(() => {});
  }, [user, profile?.country]);

  // Don't show if user already has a country or is not logged in
  if (!user || profile?.country) {
    return null;
  }

  const handleSelect = async (country: CountryCode) => {
    if (!user || loading) return;

    setLoading(country);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ country })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      await refreshProfile();
      onComplete?.(country);
    } catch (err) {
      console.error('Failed to save country:', err);
      setError(t('somethingWentWrong'));
      setLoading(null);
    }
  };

  // Variant A: Geo-detected Baltic country — personalized confirm
  if (detectedCountry && !showAllCountries) {
    const countryName = tCountry(detectedCountry);
    const flagClass = COUNTRIES.find(c => c.code === detectedCountry)?.flagClass;
    return (
      <div className="mb-4 px-4 py-3 bg-aurora-orange/10 border border-aurora-orange/30 rounded-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-polar-night">
            <MapPin className="w-4 h-4 text-aurora-orange flex-shrink-0" />
            <span>{t('looksLikeYoureIn', { country: countryName })}</span>
          </div>

          <button
            onClick={() => handleSelect(detectedCountry)}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-aurora-orange text-snow-white hover:bg-aurora-orange/90 border border-aurora-orange rounded-md transition-colors disabled:opacity-50"
          >
            {loading === detectedCountry ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              flagClass && <span className={flagClass} />
            )}
            <span>{t('yesImIn', { country: countryName })}</span>
          </button>

          <button
            onClick={() => setShowAllCountries(true)}
            className="text-sm text-polar-night/60 hover:text-polar-night underline underline-offset-2"
          >
            {t('notInCountry', { country: countryName })}
          </button>

          {error && (
            <span className="text-sm text-aurora-red">{error}</span>
          )}
        </div>
      </div>
    );
  }

  // Variant B: Fallback — three equal flag buttons
  return (
    <div className="mb-4 px-4 py-3 bg-aurora-orange/10 border border-aurora-orange/30 rounded-lg">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-polar-night">
          <MapPin className="w-4 h-4 text-aurora-orange flex-shrink-0" />
          <span>{t('pickCountry')}</span>
        </div>

        <div className="flex items-center gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleSelect(c.code)}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-snow-white hover:bg-frost-ice/20 border border-border rounded-md transition-colors disabled:opacity-50"
            >
              {loading === c.code ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className={c.flagClass} />
              )}
              <span>{tCountry(c.code)}</span>
            </button>
          ))}
        </div>

        {error && (
          <span className="text-sm text-aurora-red">{error}</span>
        )}
      </div>
    </div>
  );
}
