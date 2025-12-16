'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Component that resets scroll position to top on route change.
 * This fixes the issue where navigating to a new page keeps the previous scroll position.
 */
export function ScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
