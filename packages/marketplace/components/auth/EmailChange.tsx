'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@second-turn/design-system';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { validateEmail } from '@/lib/auth/utils';
import { mapAuthError } from '@/lib/auth/errors';

interface EmailChangeProps {
  currentEmail: string;
}

export function EmailChange({ currentEmail }: EmailChangeProps) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError('New email must be different from current email');
      return;
    }

    if (!password) {
      setError('Password is required to change email');
      return;
    }

    setLoading(true);

    try {
      // First, verify the password
      const { error: signInError } = await (supabase as any).auth.signInWithPassword({
        email: currentEmail,
        password,
      });

      if (signInError) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      // Update email - Supabase will send verification to new email
      const { error: updateError } = await (supabase as any).auth.updateUser({
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
      setPassword('');
      setIsEditing(false);
    } catch (err: any) {
      setError(mapAuthError(err));
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
              Verification email sent!
            </p>
            <p className="text-xs text-text-secondary">
              We've sent verification links to both <strong>{currentEmail}</strong> and{' '}
              <strong>{newEmail}</strong>. Click the link in the new email to complete the change.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setIsEditing(true)}
      >
        Change Email
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
          <p className="text-sm text-aurora-red">{error}</p>
        </div>
      )}

      {/* New Email */}
      <div>
        <label className="block text-sm font-medium text-polar-night mb-2">
          New Email Address *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-text-muted" />
          </div>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
            placeholder="newemail@example.com"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>
      </div>

      {/* Password Confirmation */}
      <div>
        <label className="block text-sm font-medium text-polar-night mb-2">
          Confirm Your Password *
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
          placeholder="Enter your current password"
          required
          disabled={loading}
          autoComplete="current-password"
        />
        <p className="mt-1 text-xs text-text-secondary">
          For security, please confirm your password to change your email
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {loading ? 'Sending verification...' : 'Change Email'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setIsEditing(false);
            setNewEmail('');
            setPassword('');
            setError('');
          }}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
