'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/auth/AuthContext';

export function CartIcon() {
  const { user } = useAuth();
  const { itemCount, isLoading } = useCart();

  // Don't show cart icon if not logged in
  if (!user) {
    return null;
  }

  return (
    <Link
      href="/cart"
      className="relative p-2 text-text-secondary hover:text-text transition-colors"
      aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ''}`}
    >
      <ShoppingCart className="w-6 h-6" />

      {/* Badge - only show if there are items */}
      {itemCount > 0 && !isLoading && (
        <span className="absolute -top-0.5 -right-0.5 bg-aurora-orange text-snow-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
