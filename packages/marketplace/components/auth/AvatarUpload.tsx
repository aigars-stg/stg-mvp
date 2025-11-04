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
    if (!user) {
      setError('You must be logged in to upload an avatar');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase
        .storage
        .from('listing-photos')
        .upload(fileName, file, {
          upsert: true,
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

      if (onUploadComplete) {
        onUploadComplete(data.publicUrl);
      }

      setUploading(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload avatar');
      setUploading(false);
      // Revert preview on error
      setPreview(currentAvatarUrl || null);
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
      // Delete from storage
      const fileName = `${user.id}/avatar`;
      await supabase
        .storage
        .from('listing-photos')
        .remove([fileName]);

      setPreview(null);

      if (onUploadComplete) {
        onUploadComplete('');
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
      <div className="flex items-center gap-4">
        <div className="relative">
          {preview ? (
            <img
              src={preview}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-frost-ice/10 flex items-center justify-center border-2 border-border">
              <User className="w-12 h-12 text-text-muted" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-polar-night/50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-snow-white"></div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-polar-night mb-1">Profile Picture</h3>
          <p className="text-xs text-text-secondary mb-3">
            JPG, PNG or GIF. Max size 5MB.
          </p>
          <div className="flex gap-2">
            {!preview ? (
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
            ) : (
              <>
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploading}
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
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
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
