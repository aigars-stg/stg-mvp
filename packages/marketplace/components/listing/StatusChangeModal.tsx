'use client';

import { AlertCircle, Package, Undo as RotateCcw, Eye, EyeOff } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import { BaseStatusChangeModal, type StatusConfig } from '@/components/common/StatusChangeModal';

export interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentStatus: 'draft' | 'active' | 'sold' | 'removed';
  newStatus: 'draft' | 'active' | 'sold' | 'removed';
  gameName: string;
  isLoading?: boolean;
}

export function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  newStatus,
  gameName,
  isLoading = false,
}: StatusChangeModalProps) {
  const t = useTranslations('StatusChangeModal');

  const getStatusConfig = (): StatusConfig => {
    switch (newStatus) {
      case 'sold':
        return {
          icon: <Package className="w-12 h-12 text-frost-ice" />,
          title: t('sold.title'),
          message: t('sold.message', { gameName }),
          description: t('sold.description'),
          confirmText: t('sold.confirm'),
          confirmVariant: 'primary',
        };
      case 'removed':
        return {
          icon: <EyeOff className="w-12 h-12 text-text-muted" />,
          title: t('removed.title'),
          message: t('removed.message', { gameName }),
          description: t('removed.description'),
          confirmText: t('removed.confirm'),
          confirmVariant: 'secondary',
        };
      case 'active':
        return {
          icon: <RotateCcw className="w-12 h-12 text-northern-lights-green" />,
          title: currentStatus === 'draft' ? t('publish.title') : t('reactivate.title'),
          message: currentStatus === 'draft'
            ? t('publish.message', { gameName })
            : t('reactivate.message', { gameName }),
          description: currentStatus === 'draft'
            ? t('publish.description')
            : t('reactivate.description'),
          confirmText: currentStatus === 'draft' ? t('publish.confirm') : t('reactivate.confirm'),
          confirmVariant: 'primary',
        };
      case 'draft':
        return {
          icon: <Eye className="w-12 h-12 text-text-muted" />,
          title: t('unpublish.title'),
          message: t('unpublish.message', { gameName }),
          description: t('unpublish.description'),
          confirmText: t('unpublish.confirm'),
          confirmVariant: 'secondary',
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-text-muted" />,
          title: t('default.title'),
          message: t('default.message', { gameName }),
          description: '',
          confirmText: t('default.confirm'),
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
