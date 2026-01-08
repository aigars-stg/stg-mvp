'use client';

import { Modal, Button } from '@second-turn/design-system';
import { AlertCircle, CheckCircle, Undo as RotateCcw, CloseCircle as XCircle } from 'griddy-icons';
import { useTranslations } from 'next-intl';

export interface WantedStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentStatus: 'active' | 'expired' | 'fulfilled' | 'cancelled';
  newStatus: 'active' | 'expired' | 'fulfilled' | 'cancelled';
  gameName: string;
  isLoading?: boolean;
}

export function WantedStatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  newStatus,
  gameName,
  isLoading = false,
}: WantedStatusChangeModalProps) {
  const t = useTranslations('WantedStatusChangeModal');

  const getStatusConfig = () => {
    switch (newStatus) {
      case 'fulfilled':
        return {
          icon: <CheckCircle className="w-12 h-12 text-northern-lights-green" />,
          title: t('fulfilled.title'),
          message: t('fulfilled.message', { gameName }),
          description: t('fulfilled.description'),
          confirmText: t('fulfilled.confirmText'),
          confirmVariant: 'primary' as const,
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-12 h-12 text-text-muted" />,
          title: t('cancelled.title'),
          message: t('cancelled.message', { gameName }),
          description: t('cancelled.description'),
          confirmText: t('cancelled.confirmText'),
          confirmVariant: 'secondary' as const,
        };
      case 'active':
        return {
          icon: <RotateCcw className="w-12 h-12 text-northern-lights-green" />,
          title: t('active.title'),
          message: t('active.message', { gameName }),
          description: currentStatus === 'expired'
            ? t('active.descriptionExpired')
            : t('active.description'),
          confirmText: t('active.confirmText'),
          confirmVariant: 'primary' as const,
        };
      case 'expired':
        return {
          icon: <AlertCircle className="w-12 h-12 text-text-muted" />,
          title: t('expired.title'),
          message: t('expired.message', { gameName }),
          description: t('expired.description'),
          confirmText: t('expired.confirmText'),
          confirmVariant: 'secondary' as const,
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-text-muted" />,
          title: t('default.title'),
          message: t('default.message', { gameName }),
          description: '',
          confirmText: t('default.confirmText'),
          confirmVariant: 'primary' as const,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={config.title}
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
            variant={config.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? t('processing') : config.confirmText}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          {config.icon}
        </div>
        <p className="text-base text-text mb-2">
          {config.message}
        </p>
        {config.description && (
          <p className="text-sm text-text-secondary">
            {config.description}
          </p>
        )}
      </div>
    </Modal>
  );
}
