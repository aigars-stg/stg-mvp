'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSavedListings } from '@/lib/hooks/useSavedListings';

export function SavedGamesIcon() {
    const { user } = useAuth();
    const { savedListings } = useSavedListings();

    // Don't show saved games icon if not logged in
    if (!user) {
        return null;
    }

    const savedCount = savedListings.length;

    return (
        <Link
            href="/my-listings?tab=saved"
            className="relative p-2 text-text-secondary hover:text-text transition-colors"
            aria-label={`Saved games${savedCount > 0 ? `, ${savedCount} items` : ''}`}
        >
            <Heart className="w-6 h-6" />

            {/* Badge - only show if there are saved games */}
            {savedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-aurora-red text-snow-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {savedCount > 99 ? '99+' : savedCount}
                </span>
            )}
        </Link>
    );
}
