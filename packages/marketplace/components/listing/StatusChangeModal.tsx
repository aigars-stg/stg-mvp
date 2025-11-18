'use client';

import { Modal, Button } from '@second-turn/design-system';
import { AlertCircle, Package, RotateCcw, Eye, EyeOff } from 'lucide-react';

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
  const getStatusConfig = () => {
    switch (newStatus) {
      case 'sold':
        return {
          icon: <Package className="w-12 h-12 text-frost-ice" />,
          title: 'Mark as Sold',
          message: `Are you sure you want to mark "${gameName}" as sold?`,
          description: 'This will hide the listing from public search. You can reactivate it later if needed.',
          confirmText: 'Mark as Sold',
          confirmVariant: 'primary' as const,
        };
      case 'removed':
        return {
          icon: <EyeOff className="w-12 h-12 text-text-muted" />,
          title: 'Remove Listing',
          message: `Are you sure you want to remove "${gameName}"?`,
          description: 'This will hide the listing from public search. You can reactivate or permanently delete it later.',
          confirmText: 'Remove Listing',
          confirmVariant: 'secondary' as const,
        };
      case 'active':
        return {
          icon: <RotateCcw className="w-12 h-12 text-northern-lights-green" />,
          title: currentStatus === 'draft' ? 'Publish Listing' : 'Reactivate Listing',
          message: `Are you sure you want to ${currentStatus === 'draft' ? 'publish' : 'reactivate'} "${gameName}"?`,
          description: currentStatus === 'draft'
            ? 'This will make your listing visible to buyers on the marketplace.'
            : 'This will make your listing visible to buyers again.',
          confirmText: currentStatus === 'draft' ? 'Publish' : 'Reactivate',
          confirmVariant: 'primary' as const,
        };
      case 'draft':
        return {
          icon: <Eye className="w-12 h-12 text-text-muted" />,
          title: 'Unpublish Listing',
          message: `Are you sure you want to unpublish "${gameName}"?`,
          description: 'This will hide the listing from public search and save it as a draft.',
          confirmText: 'Unpublish',
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
