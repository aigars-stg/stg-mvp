'use client';

import { useState, FormEvent } from 'react';
// Button from design-system available if needed
import { At as AtSign, AlertCircle, CheckCircleAlt01 as CheckCircle2, Edit as Pencil, Check, Close } from '@/lib/icons';
import { supabase } from '@/lib/supabase/client';
import { validateEmail } from '@/lib/auth/utils';
import { mapAuthError } from '@/lib/auth/errors';
import { useTranslations } from 'next-intl';

interface EmailChangeProps {
  currentEmail: string;
  compact?: boolean;
}

export function EmailChange({ currentEmail, compact = false }: EmailChangeProps) {
  const t = useTranslations('EmailChange');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(newEmail)) {
      setError(t('validation.invalidEmail'));
      return;
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError(t('validation.sameEmail'));
      return;
    }

    setLoading(true);

    try {
      // Update email - Supabase will send verification to new email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        setError(mapAuthError(updateError));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setNewEmail('');
      setIsEditing(false);
    } catch (error: unknown) {
      setError(mapAuthError(error));
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 bg-aurora-green/10 border border-aurora-green/20 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-aurora-green mb-1">
              {t('verificationSent')}
            </p>
            <p className="text-xs text-text-secondary">
              {t('verificationDescription', { currentEmail, newEmail })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Collapsed State (Read-only)
  if (!isEditing) {
    return (
      <div
        className={`group relative flex items-center justify-between ${compact ? '' : 'p-3 border border-transparent'} rounded-lg hover:bg-bg-secondary transition-colors cursor-pointer`}
        onClick={() => setIsEditing(true)}
      >
        <div className="flex items-center gap-3">
          <AtSign className="w-5 h-5 text-text-muted" />
          <span className="text-sm font-medium text-polar-night">
            {currentEmail}
          </span>
        </div>
        <button
          type="button"
          className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-frost-ice/10 hover:text-frost-ice rounded"
          aria-label="Edit email"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Expanded State (Editing)
  return (
    <div className="p-3 border-2 border-frost-ice/20 rounded-lg bg-snow-white space-y-3">
      {error && (
        <div className="p-2 bg-aurora-red/10 border border-aurora-red/20 rounded flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
          <p className="text-xs text-aurora-red">{error}</p>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <AtSign className="h-4 w-4 text-text-muted" />
          </div>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-white"
            placeholder={t('placeholder')}
            required
            disabled={loading}
            autoComplete="email"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditing(false);
                setNewEmail('');
                setError('');
              }
              if (e.key === 'Enter') {
                handleSubmit(e);
              }
            }}
          />
        </div>

        {/* Inline Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="p-2 text-aurora-green hover:bg-aurora-green/10 rounded-md transition-colors disabled:opacity-50"
            title="Update email"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-aurora-green border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setNewEmail('');
              setError('');
            }}
            disabled={loading}
            className="p-2 text-aurora-red hover:bg-aurora-red/10 rounded-md transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <Close className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-text-secondary">
        {t('hint')}
      </p>
    </div>
  );
}
