'use client';

import { Modal, Button } from '@second-turn/design-system';
import { AlertTriangle } from 'griddy-icons';
import { useTranslations } from 'next-intl';

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
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('title')}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-aurora-red hover:bg-aurora-red/90"
          >
            {isLoading ? t('deleting') : t('delete')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <AlertTriangle className="w-12 h-12 text-aurora-red" />
        </div>
        <p className="text-base text-text mb-2 font-medium">
          {t('message', { gameName })}
        </p>
        <p className="text-sm text-text-secondary">
          {t('warning')}
        </p>
        <div className="mt-4 p-3 bg-aurora-red/10 rounded-lg border border-aurora-red/20 w-full">
          <p className="text-xs text-aurora-red font-medium">
            {t('permanentWarning')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
