'use client';

import { useState, useEffect } from 'react';
import { Button } from '@second-turn/design-system';
import {
  Close,
  RefreshCw as Loader2,
  AlertCircle,
  CheckCircleAlt01 as CheckCircle2,
  InfoCircle as Info,
} from 'griddy-icons';

interface PayoutSettings {
  payout_threshold: number;
  payout_type: 'auto' | 'manual';
}

interface PayoutSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const THRESHOLD_OPTIONS = [
  { value: 1000, label: '€10' },
  { value: 2000, label: '€20' },
  { value: 5000, label: '€50' },
  { value: 10000, label: '€100' },
];

export function PayoutSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: PayoutSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<PayoutSettings>({
    payout_threshold: 2000,
    payout_type: 'auto',
  });

  useEffect(() => {
    if (isOpen) {
      setSaved(false);
      setError(null);
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/seller/payout-settings');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings({
        payout_threshold: data.payout_threshold,
        payout_type: data.payout_type,
      });
    } catch {
      setError('Could not load payout settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/seller/payout-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-polar-night/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-snow-white rounded-xl shadow-xl max-w-md w-full p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-text-muted hover:text-polar-night transition-colors"
          disabled={saving}
        >
          <Close className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-polar-night mb-6 pr-8">
          Payout Settings
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-frost-ice" />
          </div>
        ) : saved ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-aurora-green/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-aurora-green" />
            </div>
            <h3 className="text-lg font-semibold text-polar-night">
              Settings saved
            </h3>
          </div>
        ) : (
          <>
            {/* Auto-payout toggle */}
            <div className="mb-6">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-polar-night">
                  Automatic payouts
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.payout_type === 'auto'}
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      payout_type:
                        s.payout_type === 'auto' ? 'manual' : 'auto',
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.payout_type === 'auto'
                      ? 'bg-aurora-green'
                      : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      settings.payout_type === 'auto'
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <p className="text-xs text-text-muted mt-1">
                {settings.payout_type === 'auto'
                  ? 'Your balance is paid out automatically every Monday when it reaches the threshold.'
                  : 'You request payouts manually from your dashboard.'}
              </p>
            </div>

            {/* Threshold selector */}
            {settings.payout_type === 'auto' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Payout threshold
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {THRESHOLD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          payout_threshold: opt.value,
                        }))
                      }
                      className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                        settings.payout_threshold === opt.value
                          ? 'border-frost-ice bg-frost-ice/10 text-frost-ice'
                          : 'border-border text-text-secondary hover:border-frost-ice/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Payouts are processed every Monday at 9:00 UTC if your balance meets the threshold.
                </p>
              </div>
            )}

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 bg-frost-ice/5 rounded-lg mb-6">
              <Info className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
              <span className="text-sm text-text-secondary">
                Payouts are free. The full balance is transferred to your bank account.
              </span>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-aurora-red">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
