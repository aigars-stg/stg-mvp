'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { NavbarSearch } from './NavbarSearch';

export function MobileSearchButton() {
  const [isOpen, setIsOpen] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-text-secondary hover:text-text hover:bg-bg-secondary rounded-lg transition-colors"
        aria-label="Search games"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Search Modal Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-polar-night/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Search Panel */}
          <div className="fixed inset-x-0 top-0 z-50 bg-bg-elevated border-b border-border-subtle shadow-lg animate-in slide-in-from-top duration-200">
            <div className="px-4 py-3">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 -ml-2 text-text-muted hover:text-text hover:bg-bg-secondary rounded-lg transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-text-secondary">Search games</span>
              </div>

              {/* Search Input */}
              <NavbarSearch
                placeholder="Search for board games..."
                isMobile
                onNavigate={() => setIsOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
