'use client';

import { AlertCircle, CheckCircle, Undo as RotateCcw, CloseCircle as XCircle } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import { BaseStatusChangeModal, type StatusConfig } from '@/components/common/StatusChangeModal';

export interface WantedStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentStatus: 'active' | 'fulfilled' | 'cancelled';
  newStatus: 'active' | 'fulfilled' | 'cancelled';
  gameName: string;
  isLoading?: boolean;
}

export function WantedStatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus: _currentStatus,
  newStatus,
  gameName,
  isLoading = false,
}: WantedStatusChangeModalProps) {
  const t = useTranslations('WantedStatusChangeModal');

  const getStatusConfig = (): StatusConfig => {
    switch (newStatus) {
      case 'fulfilled':
        return {
          icon: <CheckCircle className="w-12 h-12 text-northern-lights-green" />,
          title: t('fulfilled.title'),
          message: t('fulfilled.message', { gameName }),
          description: t('fulfilled.description'),
          confirmText: t('fulfilled.confirmText'),
          confirmVariant: 'primary',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-12 h-12 text-text-muted" />,
          title: t('cancelled.title'),
          message: t('cancelled.message', { gameName }),
          description: t('cancelled.description'),
          confirmText: t('cancelled.confirmText'),
          confirmVariant: 'secondary',
        };
      case 'active':
        return {
          icon: <RotateCcw className="w-12 h-12 text-northern-lights-green" />,
          title: t('active.title'),
          message: t('active.message', { gameName }),
          description: t('active.description'),
          confirmText: t('active.confirmText'),
          confirmVariant: 'primary',
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-text-muted" />,
          title: t('default.title'),
          message: t('default.message', { gameName }),
          description: '',
          confirmText: t('default.confirmText'),
          confirmVariant: 'primary',
        };
    }
  };

  return (
    <BaseStatusChangeModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      config={getStatusConfig()}
      cancelText={t('cancel')}
      processingText={t('processing')}
    />
  );
}
