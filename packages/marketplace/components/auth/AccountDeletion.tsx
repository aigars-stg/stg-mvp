'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import { AlertTriangle, TrashAlt as Trash2 } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';

export function AccountDeletion() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
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
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
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
              Delete account
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              Permanently delete your account and all associated data. This can't be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete account
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
            Are you absolutely sure?
          </h3>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          When you delete your account, the following happens immediately:
        </p>
        <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside mb-4">
          <li>Your profile will be hidden from public view</li>
          <li>All your listings will be removed from public view</li>
          <li>You'll be signed out from all devices</li>
          <li>Your personal information (name, email, phone) will be anonymized</li>
          <li>Your email address becomes available for reuse immediately</li>
        </ul>

        <div className="p-3 bg-amber-50 rounded border border-amber-200 mb-4">
          <p className="text-xs font-medium text-amber-800 mb-2">
            <strong>For Sellers:</strong>
          </p>
          <p className="text-xs text-amber-700">
            If you are a seller, you must have <strong>zero balance</strong>, <strong>no active orders</strong>, and <strong>no open disputes</strong> before you can delete your account. Funds must be paid out to your bank account first.
          </p>
        </div>

        <div className="p-3 bg-frost-ice/10 rounded border border-frost-ice/30 mb-4">
          <p className="text-xs font-medium text-polar-night mb-2">
            <strong>Account Recovery (14-Day Grace Period):</strong>
          </p>
          <p className="text-xs text-text-secondary">
            You can recover your account within <strong>14 days</strong> of deletion. After 14 days,
            recovery is no longer possible, but your data will be retained for an additional 76 days
            for legal compliance. Visit <strong>/account/recover</strong> to restore your account.
          </p>
        </div>

        <div className="p-3 bg-snow-white rounded border border-border mb-4">
          <p className="text-xs font-medium text-polar-night mb-2">
            <strong>Data Retention (GDPR Compliance):</strong>
          </p>
          <p className="text-xs text-text-secondary mb-2">
            For legal compliance and dispute resolution, we retain the following data for <strong>90 days</strong>:
          </p>
          <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside ml-2">
            <li>Transaction and purchase history</li>
            <li>Listing information (hidden from public, kept for disputes)</li>
            <li>Communication records related to sales/purchases</li>
          </ul>
          <p className="text-xs text-text-secondary mt-2">
            After 90 days, all data will be permanently deleted from our systems.
          </p>
        </div>

        <p className="text-sm font-semibold text-aurora-red">
          After the 14-day grace period, this action cannot be undone.
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
            Type <span className="font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-red/30 focus:border-aurora-red text-polar-night bg-snow-white"
            placeholder="Type DELETE"
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
            {loading ? 'Deleting...' : 'Yes, delete my account'}
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
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
