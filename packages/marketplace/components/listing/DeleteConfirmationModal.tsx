'use client';

import { useTranslations } from 'next-intl';
import { DestructiveConfirmationModal } from '@/components/common/DestructiveConfirmationModal';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  gameName: string;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  gameName,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  const t = useTranslations('DeleteConfirmationModal');

  return (
    <DestructiveConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      title={t('title')}
      message={t('message', { gameName })}
      description={t('warning')}
      warning={t('permanentWarning')}
      cancelText={t('cancel')}
      confirmText={t('delete')}
      loadingText={t('deleting')}
    />
  );
}
