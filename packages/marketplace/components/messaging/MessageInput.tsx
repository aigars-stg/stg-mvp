'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@second-turn/design-system';
import { Send, RefreshCw as Loader2, ImagePlus, Close } from 'griddy-icons';
import { MESSAGE_CONSTRAINTS } from '@/lib/types/message';
import { supabase } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

interface MessageInputProps {
  onSend: (content: string, photoUrls?: string[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  conversationId?: string;
  allowPhotos?: boolean;
}

interface PhotoPreview {
  file: File;
  previewUrl: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder,
  conversationId,
  allowPhotos = false,
}: MessageInputProps) {
  const t = useTranslations('MessageInput');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoPreview[] = [];
    const remainingSlots = MESSAGE_CONSTRAINTS.MAX_PHOTOS - photos.length;

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];

      // Validate file type
      if (!(MESSAGE_CONSTRAINTS.ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
        continue;
      }

      // Validate file size
      if (file.size > MESSAGE_CONSTRAINTS.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        continue;
      }

      newPhotos.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setPhotos((prev) => [...prev, ...newPhotos]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0 || !conversationId) return [];

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const photo of photos) {
        const fileExt = photo.file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('transaction-photos')
          .upload(fileName, photo.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('transaction-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
    } finally {
      setUploadingPhotos(false);
    }

    return uploadedUrls;
  };

  const handleSend = async () => {
    const trimmedContent = content.trim();
    const hasContent = trimmedContent.length > 0;
    const hasPhotos = photos.length > 0;

    if ((!hasContent && !hasPhotos) || sending || disabled) {
      return;
    }

    if (trimmedContent.length > MESSAGE_CONSTRAINTS.MAX_LENGTH) {
      return;
    }

    setSending(true);

    try {
      // Upload photos first if any
      let photoUrls: string[] = [];
      if (hasPhotos && conversationId) {
        photoUrls = await uploadPhotos();
      }

      await onSend(trimmedContent || '', photoUrls.length > 0 ? photoUrls : undefined);

      setContent('');
      // Clean up photo previews
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const remainingChars = MESSAGE_CONSTRAINTS.MAX_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;
  const showCounter = content.length > MESSAGE_CONSTRAINTS.MAX_LENGTH * 0.8;
  const canAddMorePhotos = photos.length < MESSAGE_CONSTRAINTS.MAX_PHOTOS;
  const hasContent = content.trim().length > 0 || photos.length > 0;

  return (
    <div className="border-t border-divider-subtle bg-background-primary p-4">
      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo.previewUrl}
                alt={`Attachment ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-divider-subtle"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-aurora-red text-snow-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Close className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Photo upload button */}
        {allowPhotos && conversationId && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={MESSAGE_CONSTRAINTS.ALLOWED_PHOTO_TYPES.join(',')}
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAddMorePhotos || disabled || sending}
              className="h-11 px-3"
              title={canAddMorePhotos ? t('addPhotos') : t('maxPhotos', { count: MESSAGE_CONSTRAINTS.MAX_PHOTOS })}
            >
              <ImagePlus className="w-5 h-5" />
            </Button>
          </>
        )}

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            placeholder={placeholder || t('placeholder')}
            className={`w-full resize-none rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 transition-colors ${
              isOverLimit
                ? 'border-aurora-red focus:ring-aurora-red'
                : 'border-divider-subtle focus:ring-frost-ice focus:border-frost-ice'
            } bg-background-primary text-text-primary placeholder:text-text-tertiary disabled:opacity-50 disabled:cursor-not-allowed`}
            rows={1}
            style={{
              minHeight: '44px',
              maxHeight: '120px',
            }}
          />

          {showCounter && (
            <div
              className={`absolute right-2 bottom-2 text-xs ${
                isOverLimit ? 'text-aurora-red' : 'text-text-tertiary'
              }`}
            >
              {remainingChars}
            </div>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={!hasContent || sending || disabled || isOverLimit || uploadingPhotos}
          variant="primary"
          size="md"
          className="h-11 px-4"
        >
          {sending || uploadingPhotos ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              {t('send')}
            </>
          )}
        </Button>
      </div>

      {isOverLimit && (
        <p className="text-sm text-aurora-red mt-2">
          {t('tooLong', { count: Math.abs(remainingChars) })}
        </p>
      )}
    </div>
  );
}
