'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit, Package, Trash2, ExternalLink, RotateCcw } from 'lucide-react';

export interface ListingActionsMenuProps {
  listingId: string;
  status: 'draft' | 'active' | 'sold' | 'removed';
  onStatusChange: (status: 'draft' | 'active' | 'sold' | 'removed') => void;
  onDelete: () => void;
  onLinkCopied?: () => void;
}

export function ListingActionsMenu({
  listingId,
  status,
  onStatusChange,
  onDelete,
  onLinkCopied,
}: ListingActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleEdit = () => {
    setIsOpen(false);
    router.push(`/sell?edit=${listingId}`);
  };

  const handleView = () => {
    setIsOpen(false);
    router.push(`/listing/${listingId}`);
  };

  const handleStatusChange = (newStatus: 'draft' | 'active' | 'sold' | 'removed') => {
    setIsOpen(false);
    onStatusChange(newStatus);
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/listing/${listingId}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsOpen(false);
      onLinkCopied?.();
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      {/* Menu Button - More visible with white background */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-snow-white shadow-md hover:shadow-lg hover:bg-gray-50 transition-all border border-border"
        aria-label="Listing actions"
      >
        <MoreVertical className="w-5 h-5 text-polar-night" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-snow-white rounded-lg shadow-lg border border-border py-2 z-50">
          {/* View Listing */}
          <button
            onClick={handleView}
            className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
          >
            <ExternalLink className="w-4 h-4 text-frost-ice" />
            View Listing
          </button>

          {/* Edit Listing */}
          <button
            onClick={handleEdit}
            className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
          >
            <Edit className="w-4 h-4 text-frost-ice" />
            Edit
          </button>

          <div className="border-t border-border-subtle my-1" />

          {/* Status Actions */}
          {status !== 'active' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <RotateCcw className="w-4 h-4 text-northern-lights-green" />
              {status === 'draft' ? 'Publish' : 'Reactivate'}
            </button>
          )}

          {status === 'active' && (
            <button
              onClick={() => handleStatusChange('sold')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <Package className="w-4 h-4 text-frost-ice" />
              Mark as Sold
            </button>
          )}

          {(status === 'active' || status === 'draft') && (
            <button
              onClick={() => handleStatusChange('removed')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <Trash2 className="w-4 h-4 text-text-muted" />
              Remove Listing
            </button>
          )}

          <div className="border-t border-border-subtle my-1" />

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
          >
            <ExternalLink className="w-4 h-4 text-frost-ice" />
            Copy Link
          </button>

          {/* Delete (only for removed listings) */}
          {status === 'removed' && (
            <>
              <div className="border-t border-border-subtle my-1" />
              <button
                onClick={handleDelete}
                className="flex items-center gap-3 px-4 py-2 text-sm text-aurora-red hover:bg-aurora-red/10 transition-colors w-full text-left"
              >
                <Trash2 className="w-4 h-4" />
                Delete Permanently
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
