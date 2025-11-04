'use client';

import { useState, useRef, useCallback } from 'react';
import { Card } from '@second-turn/design-system';
import { Camera, X, Star } from 'lucide-react';

export interface PhotoFile {
  file: File;
  preview: string;
  isMain: boolean;
}

interface PhotoUploadProps {
  photos: PhotoFile[];
  onPhotosChange: (photos: PhotoFile[]) => void;
  maxPhotos?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 8 }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Only JPEG, PNG, WebP, and AVIF images are allowed`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size must be less than 5MB (current: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }
    return null;
  }, []);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    setUploadError(null);
    const files = Array.from(fileList);

    // Check max photos limit
    if (photos.length + files.length > maxPhotos) {
      setUploadError(`Maximum ${maxPhotos} photos allowed. You can upload ${maxPhotos - photos.length} more.`);
      return;
    }

    const newPhotos: PhotoFile[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
          isMain: photos.length === 0 && newPhotos.length === 0, // First photo is main
        });
      }
    });

    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
    }

    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
    }
  }, [photos, maxPhotos, validateFile, onPhotosChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    const removedPhoto = newPhotos[index];

    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(removedPhoto.preview);

    newPhotos.splice(index, 1);

    // If removed photo was main and there are still photos, make first one main
    if (removedPhoto.isMain && newPhotos.length > 0) {
      newPhotos[0].isMain = true;
    }

    onPhotosChange(newPhotos);
    setUploadError(null);
  };

  const setMainPhoto = (index: number) => {
    const newPhotos = photos.map((photo, i) => ({
      ...photo,
      isMain: i === index,
    }));
    onPhotosChange(newPhotos);
  };

  // Drag-to-reorder handlers
  const handlePhotoDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handlePhotoDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newPhotos = [...photos];
      const [removed] = newPhotos.splice(draggedIndex, 1);
      newPhotos.splice(dragOverIndex, 0, removed);
      onPhotosChange(newPhotos);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const hasPhotos = photos.length > 0;

  return (
    <div className="space-y-6">
      {/* Guidelines Card - only show when no photos */}
      {!hasPhotos && (
        <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
          <div className="space-y-3 text-sm">
            <p className="text-frost-ice font-medium flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Honest photos build buyer trust
            </p>
            <div>
              <ul className="list-disc list-inside space-y-1 text-text-secondary ml-2">
                <li>Photograph the box, components</li>
                <li>Show any damage or wear</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Upload Zone - compact when photos exist */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />

        <div
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg
            text-center cursor-pointer transition-all
            ${
              hasPhotos
                ? 'p-4 min-h-[60px]' // Compact when photos exist
                : 'p-8 sm:p-12 min-h-[160px]' // Full size when empty
            }
            flex flex-col items-center justify-center
            ${
              isDragging
                ? 'border-frost-ice bg-frost-ice/10'
                : 'border-border hover:border-frost-ice hover:bg-frost-ice/5'
            }
            ${photos.length >= maxPhotos ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {/* Large icon - only show when no photos */}
          {!hasPhotos && (
            <div className="mb-4">
              <Camera className="w-12 h-12 sm:w-16 sm:h-16 text-frost-ice mx-auto" />
            </div>
          )}

          {/* Compact layout when photos exist */}
          {hasPhotos ? (
            <div className="flex items-center gap-2 text-sm">
              <Camera className="w-5 h-5 text-frost-ice flex-shrink-0" />
              <span className="font-medium text-polar-night">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
              </span>
              {photos.length < maxPhotos && (
                <span className="text-text-secondary text-xs">(up to {maxPhotos})</span>
              )}
            </div>
          ) : (
            // Full layout when no photos
            <>
              <p className="text-base sm:text-lg font-medium text-polar-night mb-2">
                Click or drag photos here
              </p>
              <div className="text-sm text-text-secondary space-y-1">
                <p>JPEG, PNG, WebP, or AVIF</p>
                <p>Max 5MB per image</p>
                <p>{photos.length}/{maxPhotos} uploaded</p>
              </div>
            </>
          )}
        </div>

        {uploadError && (
          <div className="mt-3 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
            <p className="text-sm text-aurora-red whitespace-pre-line">{uploadError}</p>
          </div>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-4">
            Your Photos ({photos.length}/{maxPhotos})
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handlePhotoDragStart(e, index)}
                onDragOver={(e) => handlePhotoDragOver(e, index)}
                onDragEnd={handlePhotoDragEnd}
                className={`relative group aspect-square cursor-move transition-all ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? 'ring-2 ring-frost-ice ring-offset-2'
                    : ''
                }`}
              >
                {/* Photo Preview */}
                <img
                  src={photo.preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg pointer-events-none"
                />

                {/* Main Photo Badge */}
                {photo.isMain && (
                  <div className="absolute top-2 left-2 bg-frost-ice text-snow-white px-2 py-1 rounded-md shadow-lg flex items-center gap-1.5 text-xs font-semibold">
                    <Star className="w-3 h-3 fill-current" />
                    Main
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => removePhoto(index)}
                  className="
                    absolute top-2 right-2
                    w-8 h-8 sm:w-7 sm:h-7
                    bg-polar-night/80 text-snow-white
                    rounded-full
                    sm:opacity-0 sm:group-hover:opacity-100
                    transition-opacity
                    flex items-center justify-center
                    hover:bg-polar-night
                  "
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Set as Main Button */}
                {!photo.isMain && (
                  <button
                    onClick={() => setMainPhoto(index)}
                    className="
                      absolute bottom-2 left-2 right-2
                      px-2 py-1.5 sm:py-1
                      bg-polar-night/80 text-snow-white
                      text-xs rounded
                      sm:opacity-0 sm:group-hover:opacity-100
                      transition-opacity
                      hover:bg-polar-night
                    "
                  >
                    Set as main
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
