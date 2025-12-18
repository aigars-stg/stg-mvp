'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

// Types (copied from original hook)
interface CartItem {
    item_id: string;
    listing_id: string;
    game_name: string;
    price: number;
    photo_url: string | null;
    condition: string;
    expires_at: string;
    is_expired: boolean;
}

interface CartBasket {
    basket_id: string;
    seller_id: string;
    seller_name: string;
    seller_country: string | null;
    items: CartItem[];
    item_count: number;
    subtotal: number;
}

interface CartSummary {
    basketCount: number;
    totalItems: number;
    totalAmount: number;
    currency: string;
}

interface CartData {
    baskets: CartBasket[];
    summary: CartSummary;
}

interface CartContextType {
    cart: CartData | null;
    baskets: CartBasket[];
    summary: CartSummary;
    itemCount: number;
    isLoading: boolean;
    error: string | null;
    fetchCart: () => Promise<void>;
    addToCart: (listingId: string) => Promise<any>;
    removeFromCart: (listingId: string) => Promise<any>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [cart, setCart] = useState<CartData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCart = useCallback(async () => {
        if (!user) {
            setCart(null);
            return;
        }

        try {
            // Only set loading on initial fetch if cart is empty to avoid flickering
            if (!cart) setIsLoading(true);
            setError(null);

            const response = await fetch('/api/cart');

            if (!response.ok) {
                if (response.status === 401) {
                    setCart(null);
                    return;
                }
                throw new Error('Failed to fetch cart');
            }

            const data = await response.json();
            setCart(data);
        } catch (err: any) {
            console.error('Error fetching cart:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [user]); // Removed 'cart' from dependency to avoid infinite loops, logic handles it

    // Fetch cart on mount and when user changes (wait for auth to finish loading)
    useEffect(() => {
        // Wait for auth to finish loading before making API calls
        if (authLoading) return;

        if (user) {
            fetchCart();
        } else {
            setCart(null);
        }
    }, [user, authLoading, fetchCart]);

    const addToCart = useCallback(async (listingId: string) => {
        if (!user) {
            throw new Error('Must be signed in');
        }

        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to add to cart');
        }

        // Refresh cart after adding
        await fetchCart();
        return data;
    }, [user, fetchCart]);

    const removeFromCart = useCallback(async (listingId: string) => {
        if (!user) {
            throw new Error('Must be signed in');
        }

        const response = await fetch(`/api/cart?listingId=${listingId}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to remove from cart');
        }

        // Refresh cart after removing
        await fetchCart();
        return data;
    }, [user, fetchCart]);

    const value = {
        cart,
        baskets: cart?.baskets || [],
        summary: cart?.summary || { basketCount: 0, totalItems: 0, totalAmount: 0, currency: 'EUR' },
        itemCount: cart?.summary?.totalItems || 0,
        isLoading,
        error,
        fetchCart,
        addToCart,
        removeFromCart,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
