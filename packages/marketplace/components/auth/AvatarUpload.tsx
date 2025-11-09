'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@second-turn/design-system';
import { Upload, X, User } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onUploadComplete?: (url: string) => void;
}

export function AvatarUpload({ currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('AvatarUpload: onDrop called, user:', user ? 'present' : 'null');
    if (!user) {
      setError('You must be logged in to upload an avatar');
      console.error('❌ AvatarUpload: No user');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) {
      console.log('AvatarUpload: No file selected');
      return;
    }

    console.log('AvatarUpload: File selected:', file.name, file.size, 'bytes');

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      console.error('❌ AvatarUpload: File too large');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      console.error('❌ AvatarUpload: Invalid file type:', file.type);
      return;
    }

    setError('');
    setUploading(true);
    console.log('AvatarUpload: Starting upload...');

    // Store the blob URL temporarily for immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      // Delete old avatar if exists (with timeout)
      if (currentAvatarUrl) {
        console.log('AvatarUpload: Deleting old avatar:', currentAvatarUrl);
        try {
          // Extract the file path from the current URL
          const url = new URL(currentAvatarUrl);
          const pathParts = url.pathname.split('/');
          const bucketPath = pathParts.slice(pathParts.indexOf('listing-photos') + 1).join('/');
          console.log('AvatarUpload: Bucket path:', bucketPath);

          // Add timeout to prevent hanging
          const deletePromise = supabase
            .storage
            .from('listing-photos')
            .remove([bucketPath]);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Delete timeout')), 5000)
          );

          await Promise.race([deletePromise, timeoutPromise]);
          console.log('✅ Deleted old avatar:', bucketPath);
        } catch (deleteError: any) {
          console.warn('⚠️ Could not delete old avatar:', deleteError?.message || deleteError);
          // Continue with upload even if delete fails
        }
      }

      // Generate unique file name with timestamp
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${user.id}/avatar-${timestamp}.${fileExt}`;
      console.log('AvatarUpload: Generated filename:', fileName);

      // Upload to Supabase storage
      console.log('AvatarUpload: Starting Supabase upload...');
      const { error: uploadError } = await supabase
        .storage
        .from('listing-photos')
        .upload(fileName, file, {
          upsert: false, // Don't upsert since we have unique names
          contentType: file.type,
        });

      if (uploadError) {
        console.error('❌ AvatarUpload: Supabase upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ AvatarUpload: File uploaded successfully');

      // Get public URL
      const { data } = supabase
        .storage
        .from('listing-photos')
        .getPublicUrl(fileName);

      console.log('AvatarUpload: Public URL:', data.publicUrl);

      // Update preview to the actual URL, not the blob
      setPreview(data.publicUrl);

      // Clean up blob URL to prevent memory leak
      URL.revokeObjectURL(objectUrl);

      if (onUploadComplete) {
        console.log('AvatarUpload: Calling onUploadComplete callback');
        onUploadComplete(data.publicUrl);
      }

      setUploading(false);
      console.log('✅ AvatarUpload: Upload complete!');
    } catch (err: any) {
      console.error('❌ AvatarUpload: Upload error:', err);
      setError(err.message || 'Failed to upload avatar');
      setUploading(false);
      // Revert preview on error
      setPreview(currentAvatarUrl || null);
      // Clean up blob URL on error
      URL.revokeObjectURL(objectUrl);
    }
  }, [user, currentAvatarUrl, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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

          const { error: deleteError } = await supabase
            .storage
            .from('listing-photos')
            .remove([bucketPath]);

          if (deleteError) {
            console.warn('⚠️ Error deleting file:', deleteError);
            // Continue to clear the URL even if file delete fails
          } else {
            console.log('✅ Deleted avatar:', bucketPath);
          }
        } catch (parseError) {
          console.warn('⚠️ Could not parse avatar URL:', parseError);
        }
      }

      setPreview(null);

      if (onUploadComplete) {
        onUploadComplete(''); // Clear the avatar URL in profile
      }

      setUploading(false);
    } catch (err: any) {
      console.error('Remove error:', err);
      setError(err.message || 'Failed to remove avatar');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Avatar Preview */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative">
          {preview ? (
            <img
              src={preview}
              alt="Avatar"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-border"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-frost-ice/10 flex items-center justify-center border-2 border-border">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-text-muted" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-polar-night/50 rounded-xl flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-snow-white"></div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-polar-night mb-1">Profile Picture</h3>
          <p className="text-xs text-text-secondary mb-2 sm:mb-3">
            JPG, PNG or GIF. Max size 5MB.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {!preview ? (
              <div {...getRootProps()} className="w-full sm:w-auto">
                <input {...getInputProps()} />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploading}
                  fullWidth
                  className="sm:w-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
            ) : (
              <>
                <div {...getRootProps()} className="w-full sm:w-auto">
                  <input {...getInputProps()} />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploading}
                    fullWidth
                    className="sm:w-auto"
                  >
                    Change Photo
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                  fullWidth
                  className="sm:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Drag & Drop Area (when no preview) */}
      {!preview && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-frost-ice bg-frost-ice/5'
              : 'border-border hover:border-frost-ice/50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
          {isDragActive ? (
            <p className="text-sm text-frost-ice">Drop your image here...</p>
          ) : (
            <>
              <p className="text-sm text-polar-night font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-text-secondary">
                PNG, JPG or GIF (max. 5MB)
              </p>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
          <p className="text-sm text-aurora-red">{error}</p>
        </div>
      )}
    </div>
  );
}
