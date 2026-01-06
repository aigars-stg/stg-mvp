'use client';

import { Modal, Button } from '@second-turn/design-system';
import { AlertCircle, Package, RotateCcw, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ListingType } from '@/lib/types/listing';

export interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentStatus: 'draft' | 'active' | 'sold' | 'removed';
  newStatus: 'draft' | 'active' | 'sold' | 'removed';
  gameName: string;
  isLoading?: boolean;
  listingType?: ListingType;
}

export function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  newStatus,
  gameName,
  isLoading = false,
  listingType = 'instant_buy',
}: StatusChangeModalProps) {
  const t = useTranslations('StatusChangeModal');
  const isContactSeller = listingType === 'contact_seller';

  const getStatusConfig = () => {
    switch (newStatus) {
      case 'sold':
        return {
          icon: isContactSeller
            ? <MessageSquare className="w-12 h-12 text-frost-ice" />
            : <Package className="w-12 h-12 text-frost-ice" />,
          title: t('sold.title'),
          message: t('sold.message', { gameName }),
          description: isContactSeller
            ? t('sold.descriptionContactSeller')
            : t('sold.description'),
          confirmText: t('sold.confirm'),
          confirmVariant: 'primary' as const,
        };
      case 'removed':
        return {
          icon: <EyeOff className="w-12 h-12 text-text-muted" />,
          title: t('removed.title'),
          message: t('removed.message', { gameName }),
          description: t('removed.description'),
          confirmText: t('removed.confirm'),
          confirmVariant: 'secondary' as const,
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
          confirmVariant: 'primary' as const,
        };
      case 'draft':
        return {
          icon: <Eye className="w-12 h-12 text-text-muted" />,
          title: t('unpublish.title'),
          message: t('unpublish.message', { gameName }),
          description: t('unpublish.description'),
          confirmText: t('unpublish.confirm'),
          confirmVariant: 'secondary' as const,
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-text-muted" />,
          title: t('default.title'),
          message: t('default.message', { gameName }),
          description: '',
          confirmText: t('default.confirm'),
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
