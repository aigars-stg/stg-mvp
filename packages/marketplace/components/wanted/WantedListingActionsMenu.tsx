'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MoreVertical, Edit, CheckCircle, TrashAlt as Trash2, LinkExternal as ExternalLink, Undo as RotateCcw } from 'griddy-icons';

export interface WantedListingActionsMenuProps {
  listingId: string;
  bggGameId: number;
  status: 'active' | 'fulfilled' | 'cancelled';
  onStatusChange: (status: 'active' | 'fulfilled' | 'cancelled') => void;
  onDelete: () => void;
  onLinkCopied?: () => void;
}

export function WantedListingActionsMenu({
  listingId,
  bggGameId,
  status,
  onStatusChange,
  onDelete,
  onLinkCopied,
}: WantedListingActionsMenuProps) {
  const t = useTranslations('WantedListingActionsMenu');
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
    router.push(`/game/${bggGameId}#wanted`);
  };

  const handleStatusChange = (newStatus: 'active' | 'fulfilled' | 'cancelled') => {
    setIsOpen(false);
    onStatusChange(newStatus);
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/game/${bggGameId}#wanted`;
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
        aria-label={t('ariaLabel')}
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
            {t('viewListing')}
          </button>

          {/* Edit Listing */}
          <button
            onClick={handleEdit}
            className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
          >
            <Edit className="w-4 h-4 text-frost-ice" />
            {t('edit')}
          </button>

          <div className="border-t border-border-subtle my-1" />

          {/* Reactivate (for cancelled) */}
          {status === 'cancelled' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <RotateCcw className="w-4 h-4 text-northern-lights-green" />
              {t('reactivate')}
            </button>
          )}

          {/* Mark as Fulfilled (only for active) */}
          {status === 'active' && (
            <button
              onClick={() => handleStatusChange('fulfilled')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <CheckCircle className="w-4 h-4 text-northern-lights-green" />
              {t('markAsFulfilled')}
            </button>
          )}

          {/* Cancel Listing (for active) */}
          {status === 'active' && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
            >
              <Trash2 className="w-4 h-4 text-text-muted" />
              {t('cancelListing')}
            </button>
          )}

          <div className="border-t border-border-subtle my-1" />

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-bg-secondary transition-colors w-full text-left"
          >
            <ExternalLink className="w-4 h-4 text-frost-ice" />
            {t('copyLink')}
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
                {t('deletePermanently')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
