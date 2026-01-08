'use client';

import { Modal, Button } from '@second-turn/design-system';
import { HelpCircle } from 'griddy-icons';
import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: ReactNode;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  icon,
  isLoading = false,
}: ConfirmationModalProps) {
  const t = useTranslations('ConfirmationModal');

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title || t('defaultTitle')}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText || t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? t('processing') : (confirmText || t('confirm'))}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          {icon || <HelpCircle className="w-12 h-12 text-frost-ice" />}
        </div>
        <p className="text-base text-text">
          {message}
        </p>
      </div>
    </Modal>
  );
}
