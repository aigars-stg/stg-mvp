'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit, CheckCircle, Trash2, ExternalLink, RotateCcw, Clock } from 'lucide-react';

export interface WantedListingActionsMenuProps {
  listingId: string;
  status: 'active' | 'expired' | 'fulfilled' | 'cancelled';
  onStatusChange: (status: 'active' | 'expired' | 'fulfilled' | 'cancelled') => void;
  onExtend: () => void;
  onDelete: () => void;
  onLinkCopied?: () => void;
}

export function WantedListingActionsMenu({
  listingId,
  status,
  onStatusChange,
  onExtend,
  onDelete,
  onLinkCopied,
}: WantedListingActionsMenuProps) {
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
    router.push(`/wanted/new?edit=${listingId}`);
  };

  const handleView = () => {
    setIsOpen(false);
    router.push(`/wanted/${listingId}`);
  };

  const handleStatusChange = (newStatus: 'active' | 'expired' | 'fulfilled' | 'cancelled') => {
    setIsOpen(false);
    onStatusChange(newStatus);
  };

  const handleExtend = () => {
    setIsOpen(false);
    onExtend();
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/wanted/${listingId}`;
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
        aria-label="Wanted listing actions"
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

          {/* Extend Expiration (for active or expired) */}
          {(status === 'active' || status === 'expired') && (
            <button
              onClick={handleExtend}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <Clock className="w-4 h-4 text-frost-ice" />
              Extend +30 Days
            </button>
          )}

          {/* Reactivate (for expired or cancelled) */}
          {(status === 'expired' || status === 'cancelled') && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <RotateCcw className="w-4 h-4 text-northern-lights-green" />
              Reactivate
            </button>
          )}

          {/* Mark as Fulfilled (only for active) */}
          {status === 'active' && (
            <button
              onClick={() => handleStatusChange('fulfilled')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <CheckCircle className="w-4 h-4 text-northern-lights-green" />
              Mark as Fulfilled
            </button>
          )}

          {/* Cancel Listing (for active) */}
          {status === 'active' && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <Trash2 className="w-4 h-4 text-text-muted" />
              Cancel Listing
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

          {/* Delete (only for cancelled listings) */}
          {status === 'cancelled' && (
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
