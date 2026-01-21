'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import { AlertTriangle, TrashAlt as Trash2 } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from 'next-intl';

export function AccountDeletion() {
  const t = useTranslations('AccountDeletion');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError(t('pleaseTypeDelete'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call API to delete account
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        // Display specific error message from server if available (e.g., for seller balance info)
        setError(data.message || data.error || 'Failed to delete account');
        setLoading(false);
        return;
      }

      // Account deleted successfully on server
      // Force client-side sign out to clear local session and update UI
      await signOut();

      // Redirect to homepage with deleted flag
      // Note: signOut() triggers a redirect to '/', so we push this after to ensure the message is shown
      router.push('/?deleted=true');
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to delete account');
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <div className="p-4 border-2 border-aurora-red/30 rounded-lg bg-aurora-red/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-polar-night mb-1">
              {t('title')}
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              {t('description')}
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('title')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border-2 border-aurora-red rounded-lg bg-aurora-red/5">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-aurora-red flex-shrink-0" />
          <h3 className="text-lg font-bold text-polar-night">
            {t('confirmTitle')}
          </h3>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          {t('immediateEffects')}
        </p>
        <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside mb-4">
          <li>{t('effects.profileHidden')}</li>
          <li>{t('effects.listingsRemoved')}</li>
          <li>{t('effects.signedOut')}</li>
          <li>{t('effects.infoAnonymized')}</li>
          <li>{t('effects.emailAvailable')}</li>
        </ul>

        <div className="p-3 bg-amber-50 rounded border border-amber-200 mb-4">
          <p className="text-xs font-medium text-amber-800 mb-2">
            <strong>{t('forSellers')}</strong>
          </p>
          <p className="text-xs text-amber-700">
            {t('sellerRequirements')}
          </p>
        </div>

        <div className="p-3 bg-frost-ice/10 rounded border border-frost-ice/30 mb-4">
          <p className="text-xs font-medium text-polar-night mb-2">
            <strong>{t('recoveryTitle')}</strong>
          </p>
          <p className="text-xs text-text-secondary">
            {t('recoveryDescription')}
          </p>
        </div>

        <div className="p-3 bg-snow-white rounded border border-border mb-4">
          <p className="text-xs font-medium text-polar-night mb-2">
            <strong>{t('dataRetentionTitle')}</strong>
          </p>
          <p className="text-xs text-text-secondary mb-2">
            {t('dataRetentionDescription')}
          </p>
          <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside ml-2">
            <li>{t('retention.transactions')}</li>
            <li>{t('retention.listings')}</li>
            <li>{t('retention.communications')}</li>
          </ul>
          <p className="text-xs text-text-secondary mt-2">
            {t('dataRetentionAfter')}
          </p>
        </div>

        <p className="text-sm font-semibold text-aurora-red">
          {t('finalWarning')}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
          <p className="text-sm text-aurora-red">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Confirmation Text */}
        <div>
          <label className="block text-sm font-medium text-polar-night mb-2">
            {t('typeDeleteLabel')}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-red/30 focus:border-aurora-red text-polar-night bg-snow-white"
            placeholder={t('typeDeletePlaceholder')}
            disabled={loading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={loading || confirmText !== 'DELETE'}
          >
            {loading ? t('deleting') : t('confirmDelete')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowConfirm(false);
              setConfirmText('');
              setError('');
            }}
            disabled={loading}
          >
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
