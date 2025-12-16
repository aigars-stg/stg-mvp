'use client';

import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import type { CountryCode } from '@/lib/country-utils';

interface CountryPromptProps {
  onComplete?: (country: CountryCode) => void;
}

const COUNTRIES: { code: CountryCode; flagClass: string; name: string }[] = [
  { code: 'LV', flagClass: 'fi fi-lv', name: 'Latvia' },
  { code: 'EE', flagClass: 'fi fi-ee', name: 'Estonia' },
  { code: 'LT', flagClass: 'fi fi-lt', name: 'Lithuania' },
];

export function CountryPrompt({ onComplete }: CountryPromptProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState<CountryCode | null>(null);
  const [error, setError] = useState('');

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
      setError('Something went wrong');
      setLoading(null);
    }
  };

  return (
    <div className="mb-4 px-4 py-3 bg-aurora-orange/10 border border-aurora-orange/30 rounded-lg">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-polar-night">
          <MapPin className="w-4 h-4 text-aurora-orange flex-shrink-0" />
          <span>Pick your country to see games near you</span>
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
              <span>{c.name}</span>
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
