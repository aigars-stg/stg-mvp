'use client';

import { Link, useRouter, usePathname } from '@/i18n/navigation';
import { Heart } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSavedListingsContext } from '@/lib/contexts/SavedListingsContext';

export function SavedGamesIcon() {
    const { user } = useAuth();
    const { savedListingIds } = useSavedListingsContext();
    const router = useRouter();
    const pathname = usePathname();

    const savedCount = user ? savedListingIds.size : 0;

    const handleClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            router.push(`/auth?redirectTo=${encodeURIComponent(pathname)}&prompt=wishlist`);
        }
    };

    return (
        <Link
            href="/my-listings?tab=saved"
            onClick={handleClick}
            className="relative p-2 text-text-secondary hover:text-text hover:scale-110 transition-all duration-200"
            aria-label={`Saved games${savedCount > 0 ? `, ${savedCount} items` : ''}`}
        >
            <Heart className="w-6 h-6" />

            {/* Badge - only show if logged in and there are saved games */}
            {savedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-aurora-red text-snow-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {savedCount > 99 ? '99+' : savedCount}
                </span>
            )}
        </Link>
    );
}
