'use client';

import { Modal, Button } from '@second-turn/design-system';
import { AlertCircle, CheckCircle, RotateCcw, XCircle } from 'lucide-react';

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
  const getStatusConfig = () => {
    switch (newStatus) {
      case 'fulfilled':
        return {
          icon: <CheckCircle className="w-12 h-12 text-northern-lights-green" />,
          title: 'Mark as Fulfilled',
          message: `Are you sure you want to mark "${gameName}" as fulfilled?`,
          description: 'This indicates you have found and acquired this game. The listing will be hidden from public search.',
          confirmText: 'Mark as Fulfilled',
          confirmVariant: 'primary' as const,
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-12 h-12 text-text-muted" />,
          title: 'Cancel Listing',
          message: `Are you sure you want to cancel "${gameName}"?`,
          description: 'This will hide the listing from public search. You can reactivate or permanently delete it later.',
          confirmText: 'Cancel Listing',
          confirmVariant: 'secondary' as const,
        };
      case 'active':
        return {
          icon: <RotateCcw className="w-12 h-12 text-northern-lights-green" />,
          title: 'Reactivate Listing',
          message: `Are you sure you want to reactivate "${gameName}"?`,
          description: currentStatus === 'expired'
            ? 'This will make your wanted listing visible to sellers again and reset the expiration date.'
            : 'This will make your wanted listing visible to sellers again.',
          confirmText: 'Reactivate',
          confirmVariant: 'primary' as const,
        };
      case 'expired':
        return {
          icon: <AlertCircle className="w-12 h-12 text-text-muted" />,
          title: 'Mark as Expired',
          message: `Are you sure you want to mark "${gameName}" as expired?`,
          description: 'This will hide the listing from public search. You can reactivate it later if needed.',
          confirmText: 'Mark as Expired',
          confirmVariant: 'secondary' as const,
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-text-muted" />,
          title: 'Change Status',
          message: `Change status of "${gameName}"?`,
          description: '',
          confirmText: 'Confirm',
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
            Cancel
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : config.confirmText}
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
