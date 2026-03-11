'use client';

import { Link } from '@/i18n/navigation';
import { ShoppingBag } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useActiveOrders } from '@/lib/contexts/ActiveOrdersContext';

export function OrdersIcon() {
    const { user } = useAuth();
    const { activeCount } = useActiveOrders();

    return (
        <Link
            href="/orders"
            className={`relative p-2 transition-all duration-200 ${
                user
                    ? 'text-text-secondary hover:text-text hover:scale-110'
                    : 'text-text-secondary/40 cursor-default'
            }`}
            aria-label={`Orders${user && activeCount > 0 ? `, ${activeCount} active` : ''}`}
        >
            <ShoppingBag className="w-6 h-6" />

            {/* Badge - only show if logged in and there are active orders */}
            {user && activeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-aurora-orange text-snow-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {activeCount > 99 ? '99+' : activeCount}
                </span>
            )}
        </Link>
    );
}
