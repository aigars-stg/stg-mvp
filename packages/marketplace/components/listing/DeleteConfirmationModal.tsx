'use client';

import { Modal, Button } from '@second-turn/design-system';
import { AlertTriangle } from 'griddy-icons';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  gameName: string;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  gameName,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Delete Listing"
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
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-aurora-red hover:bg-aurora-red/90"
          >
            {isLoading ? 'Deleting...' : 'Delete Listing'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <AlertTriangle className="w-12 h-12 text-aurora-red" />
        </div>
        <p className="text-base text-text mb-2 font-medium">
          Are you sure you want to permanently delete "{gameName}"?
        </p>
        <p className="text-sm text-text-secondary">
          This action cannot be undone. The listing will be permanently removed from the database.
        </p>
        <div className="mt-4 p-3 bg-aurora-red/10 rounded-lg border border-aurora-red/20 w-full">
          <p className="text-xs text-aurora-red font-medium">
            Warning: This is a permanent action and cannot be reversed.
          </p>
        </div>
      </div>
    </Modal>
  );
}
