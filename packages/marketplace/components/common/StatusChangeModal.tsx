'use client';

import { Modal, Button } from '@second-turn/design-system';
import type { ReactNode } from 'react';

export interface StatusConfig {
  icon: ReactNode;
  title: string;
  message: string;
  description?: string;
  confirmText: string;
  confirmVariant: 'primary' | 'secondary' | 'danger';
}

export interface BaseStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  config: StatusConfig;
  cancelText: string;
  processingText: string;
}

/**
 * Base status change modal component.
 * Used by ListingStatusChangeModal and WantedStatusChangeModal.
 *
 * @example
 * ```tsx
 * <BaseStatusChangeModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onConfirm={onConfirm}
 *   isLoading={isLoading}
 *   config={{
 *     icon: <Package className="w-12 h-12 text-frost-ice" />,
 *     title: "Mark as Sold",
 *     message: "Mark Catan as sold?",
 *     description: "This will remove it from the marketplace.",
 *     confirmText: "Mark as Sold",
 *     confirmVariant: "primary",
 *   }}
 *   cancelText="Cancel"
 *   processingText="Processing..."
 * />
 * ```
 */
export function BaseStatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  config,
  cancelText,
  processingText,
}: BaseStatusChangeModalProps) {
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
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? processingText : config.confirmText}
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
