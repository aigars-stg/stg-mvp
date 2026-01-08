'use client';

import { Modal, Button } from '@second-turn/design-system';
import { CheckCircle, AlertCircle, InfoCircle as Info, CloseCircle as XCircle } from 'griddy-icons';
import { useTranslations } from 'next-intl';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: NotificationType;
}

export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}: NotificationModalProps) {
  const t = useTranslations('NotificationModal');

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-12 h-12 text-northern-lights-green" />,
          defaultTitle: t('successTitle'),
          bgColor: 'bg-northern-lights-green/10',
          borderColor: 'border-northern-lights-green/20',
          textColor: 'text-northern-lights-green',
        };
      case 'error':
        return {
          icon: <XCircle className="w-12 h-12 text-aurora-red" />,
          defaultTitle: t('errorTitle'),
          bgColor: 'bg-aurora-red/10',
          borderColor: 'border-aurora-red/20',
          textColor: 'text-aurora-red',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-12 h-12 text-midnight-sun-yellow" />,
          defaultTitle: t('warningTitle'),
          bgColor: 'bg-midnight-sun-yellow/10',
          borderColor: 'border-midnight-sun-yellow/20',
          textColor: 'text-midnight-sun-yellow',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-12 h-12 text-frost-ice" />,
          defaultTitle: t('infoTitle'),
          bgColor: 'bg-frost-ice/10',
          borderColor: 'border-frost-ice/20',
          textColor: 'text-frost-ice',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title || config.defaultTitle}
      size="sm"
      footer={
        <Button
          variant="primary"
          onClick={onClose}
        >
          {t('ok')}
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          {config.icon}
        </div>
        <p className="text-base text-text">
          {message}
        </p>
      </div>
    </Modal>
  );
}
