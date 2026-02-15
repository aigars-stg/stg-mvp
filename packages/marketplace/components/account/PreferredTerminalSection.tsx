'use client';

import { useState, useCallback } from 'react';
import { Card, Button } from '@second-turn/design-system';
import { LocationPin as MapPin, Close, AlertCircle, CheckCircleAlt01 as CheckCircle2 } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from 'next-intl';
import { TerminalSelectorWithMap } from '@/components/checkout/TerminalSelectorWithMap';
import type { Terminal, TerminalCountry } from '@/lib/unisend/types';

const COUNTRY_FLAGS: Record<string, string> = {
  LT: 'fi fi-lt',
  LV: 'fi fi-lv',
  EE: 'fi fi-ee',
};

export function PreferredTerminalSection() {
  const t = useTranslations('AccountSettings.preferredTerminal');
  const { profile, updateProfile, refreshProfile } = useAuth();

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<TerminalCountry>(
    (profile?.preferred_delivery_country as TerminalCountry) || 'LV'
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const hasSavedTerminal = !!profile?.preferred_terminal_id;

  const handleSelect = useCallback(async (terminal: Terminal) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await updateProfile({
        preferred_terminal_id: terminal.id,
        preferred_terminal_name: terminal.name,
        preferred_terminal_address: `${terminal.address}, ${terminal.city}`,
        preferred_delivery_country: terminal.countryCode,
      });

      if (updateError) throw updateError;

      setSuccess(t('updated'));
      setIsSelecting(false);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorUpdate'));
    } finally {
      setLoading(false);
    }
  }, [updateProfile, refreshProfile, t]);

  const handleRemove = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await updateProfile({
        preferred_terminal_id: null,
        preferred_terminal_name: null,
        preferred_terminal_address: null,
        preferred_delivery_country: null,
      });

      if (updateError) throw updateError;

      setSuccess(t('removed'));
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorRemove'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg" className="mb-6 sm:p-6 p-4">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-5 h-5 text-frost-ice flex-shrink-0" />
        <h2 className="text-lg sm:text-xl font-semibold text-polar-night">{t('title')}</h2>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-aurora-green/10 border border-aurora-green/20 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0 mt-0.5" />
          <p className="text-sm text-aurora-green">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
          <p className="text-sm text-aurora-red">{error}</p>
        </div>
      )}

      {/* Saved Terminal Display */}
      {hasSavedTerminal && !isSelecting && (
        <div className="p-4 bg-bg-secondary rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {profile.preferred_delivery_country && (
                  <span className={COUNTRY_FLAGS[profile.preferred_delivery_country]} />
                )}
                <span className="text-sm font-medium text-polar-night">
                  {profile.preferred_terminal_name}
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                {profile.preferred_terminal_address}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedCountry((profile.preferred_delivery_country as TerminalCountry) || 'LV');
                setIsSelecting(true);
                setSuccess('');
              }}
              disabled={loading}
            >
              {t('change')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={loading}
            >
              {t('remove')}
            </Button>
          </div>
        </div>
      )}

      {/* No Terminal Set */}
      {!hasSavedTerminal && !isSelecting && (
        <div>
          <p className="text-sm text-text-secondary mb-4">
            {t('description')}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsSelecting(true);
              setSuccess('');
            }}
          >
            {t('choose')}
          </Button>
        </div>
      )}

      {/* Terminal Selector (Expanded) */}
      {isSelecting && (
        <div className="mt-4">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setIsSelecting(false)}
              className="p-1.5 text-text-muted hover:text-polar-night hover:bg-bg-secondary rounded transition-colors"
              title="Cancel"
            >
              <Close className="w-5 h-5" />
            </button>
          </div>
          <TerminalSelectorWithMap
            country={selectedCountry}
            onCountryChange={setSelectedCountry}
            selectedTerminal={null}
            onSelect={handleSelect}
          />
          {loading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
              <div className="w-4 h-4 border-2 border-frost-ice border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
