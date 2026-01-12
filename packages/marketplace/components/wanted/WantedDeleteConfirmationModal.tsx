'use client';

import { useTranslations } from 'next-intl';
import { DestructiveConfirmationModal } from '@/components/common/DestructiveConfirmationModal';

export interface WantedDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  gameName: string;
  isLoading?: boolean;
}

export function WantedDeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  gameName,
  isLoading = false,
}: WantedDeleteConfirmationModalProps) {
  const t = useTranslations('Wanted.DeleteConfirmationModal');

  return (
    <DestructiveConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      title={t('title')}
      message={t('confirmMessage', { gameName })}
      description={t('description')}
      warning={t('warning')}
      cancelText={t('cancel')}
      confirmText={t('deleteButton')}
      loadingText={t('deleting')}
    />
  );
}
