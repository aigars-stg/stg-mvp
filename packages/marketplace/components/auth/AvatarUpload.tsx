/* eslint-disable @next/next/no-img-element -- avatar previews are blob URLs */
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
// Icons available from griddy-icons if needed
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { getInitials } from '@/lib/auth/utils';
import { useTranslations } from 'next-intl';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onUploadComplete?: (url: string) => void;
  size?: 'default' | 'large';
  /** Custom size class override — when provided, ignores `size` prop */
  sizeClass?: string;
  /** Custom initials font size override */
  initialsSizeClass?: string;
}

export function AvatarUpload({ currentAvatarUrl, onUploadComplete, size = 'default', sizeClass, initialsSizeClass }: AvatarUploadProps) {
  const t = useTranslations('AvatarUpload');
  const { user, profile } = useAuth();

  // Size classes based on prop (sizeClass overrides size)
  const avatarSizeClasses = sizeClass ?? (size === 'large'
    ? 'w-28 h-28 sm:w-32 sm:h-32'
    : 'w-20 h-20 sm:w-24 sm:h-24');
  const initialsFontSize = initialsSizeClass ?? (size === 'large' ? 'text-4xl' : 'text-3xl');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);

  // Get initials for placeholder
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = getInitials(displayName);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      setError(t('mustBeLoggedIn'));
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setError(t('fileTooLarge'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('mustBeImage'));
      return;
    }

    setError('');
    setUploading(true);

    // Store the blob URL temporarily for immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      // Delete old avatar if exists (with timeout)
      if (currentAvatarUrl) {
        try {
          // Extract the file path from the current URL
          const url = new URL(currentAvatarUrl);
          const pathParts = url.pathname.split('/');
          const bucketPath = pathParts.slice(pathParts.indexOf('listing-photos') + 1).join('/');

          // Add timeout to prevent hanging
          const deletePromise = supabase
            .storage
            .from('listing-photos')
            .remove([bucketPath]);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Delete timeout')), 5000)
          );

          await Promise.race([deletePromise, timeoutPromise]);
        } catch {
          // Continue with upload even if delete fails
        }
      }

      // Generate unique file name with timestamp
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${user.id}/avatar-${timestamp}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase
        .storage
        .from('listing-photos')
        .upload(fileName, file, {
          upsert: false, // Don't upsert since we have unique names
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase
        .storage
        .from('listing-photos')
        .getPublicUrl(fileName);

      // Update preview to the actual URL, not the blob
      setPreview(data.publicUrl);

      // Clean up blob URL to prevent memory leak
      URL.revokeObjectURL(objectUrl);

      if (onUploadComplete) {
        onUploadComplete(data.publicUrl);
      }

      setUploading(false);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to upload avatar');
      setUploading(false);
      // Revert preview on error
      setPreview(currentAvatarUrl || null);
      // Clean up blob URL on error
      URL.revokeObjectURL(objectUrl);
    }
  }, [user, currentAvatarUrl, onUploadComplete, t]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleRemove = async () => {
    if (!user) return;

    setUploading(true);
    setError('');

    try {
      // Delete from storage using the current avatar URL
      if (currentAvatarUrl) {
        try {
          // Extract the file path from the URL
          const url = new URL(currentAvatarUrl);
          const pathParts = url.pathname.split('/');
          const bucketPath = pathParts.slice(pathParts.indexOf('listing-photos') + 1).join('/');

          await supabase
            .storage
            .from('listing-photos')
            .remove([bucketPath]);
        } catch {
          // Continue to clear the URL even if file delete fails
        }
      }

      setPreview(null);

      if (onUploadComplete) {
        onUploadComplete(''); // Clear the avatar URL in profile
      }

      setUploading(false);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to remove avatar');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Avatar with hover overlay */}
      <div
        {...getRootProps()}
        className={`group relative ${avatarSizeClasses} cursor-pointer`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className={`${avatarSizeClasses} rounded-xl object-cover border-2 border-border`}
          />
        ) : (
          <div className={`${avatarSizeClasses} rounded-xl bg-frost-ice text-snow-white flex items-center justify-center border-2 border-border ${initialsFontSize} font-bold`}>
            {initials}
          </div>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-polar-night/60 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-snow-white text-xs font-medium">
              {preview ? t('changePhoto') : t('addPhoto')}
            </span>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-polar-night/50 rounded-xl flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-snow-white"></div>
          </div>
        )}
      </div>

      {/* Remove button - only shown when there's a preview */}
      {preview && !uploading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="text-xs text-text-secondary hover:text-aurora-red transition-colors"
        >
          {t('remove')}
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
          <p className="text-xs text-aurora-red">{error}</p>
        </div>
      )}
    </div>
  );
}
