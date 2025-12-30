'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/auth/AuthContext';

export function CartIcon() {
  const { user } = useAuth();
  const { itemCount, isLoading } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      router.push(`/auth?returnTo=${encodeURIComponent(pathname)}&prompt=cart`);
    }
  };

  return (
    <Link
      href="/cart"
      onClick={handleClick}
      className="relative p-2 text-text-secondary hover:text-text hover:scale-110 transition-all duration-200"
      aria-label={`Shopping cart${user && itemCount > 0 ? `, ${itemCount} items` : ''}`}
    >
      <ShoppingCart className="w-6 h-6" />

      {/* Badge - only show if logged in and there are items */}
      {user && itemCount > 0 && !isLoading && (
        <span className="absolute -top-0.5 -right-0.5 bg-aurora-orange text-snow-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
