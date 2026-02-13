'use client';

import { Modal, Button } from '@second-turn/design-system';
import { AlertTriangle } from '@/lib/icons';

/**
 * Generic destructive (delete) confirmation modal
 *
 * Consolidated from:
 * - components/listing/DeleteConfirmationModal.tsx
 * - components/wanted/WantedDeleteConfirmationModal.tsx
 */
export interface DestructiveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  /** Modal title */
  title: string;
  /** Main confirmation message (can include item name) */
  message: string;
  /** Secondary description text */
  description: string;
  /** Warning text shown in the red box */
  warning: string;
  /** Cancel button text */
  cancelText: string;
  /** Confirm/delete button text */
  confirmText: string;
  /** Loading state button text */
  loadingText: string;
}

export function DestructiveConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  message,
  description,
  warning,
  cancelText,
  confirmText,
  loadingText,
}: DestructiveConfirmationModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
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
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-aurora-red hover:bg-aurora-red/90"
          >
            {isLoading ? loadingText : confirmText}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <AlertTriangle className="w-12 h-12 text-aurora-red" />
        </div>
        <p className="text-base text-text mb-2 font-medium">
          {message}
        </p>
        <p className="text-sm text-text-secondary">
          {description}
        </p>
        <div className="mt-4 p-3 bg-aurora-red/10 rounded-lg border border-aurora-red/20 w-full">
          <p className="text-xs text-aurora-red font-medium">
            {warning}
          </p>
        </div>
      </div>
    </Modal>
  );
}
