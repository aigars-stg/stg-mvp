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

// Expired item preserved in session state after reservation expires
export interface ExpiredCartItem {
    listing_id: string;
    game_name: string;
    bgg_game_id: number;
    price: number;
    photo_url: string | null;
    game_thumbnail: string | null;
    condition: string;
    is_expansion: boolean;
    expired_at: string;
}

// Input type for capturing expired items (accepts CartItemData-shaped objects)
interface ExpiredCartItemInput {
    listing_id: string;
    game_name: string;
    bgg_game_id: number;
    price: number;
    photo_url: string | null;
    game_thumbnail: string | null;
    condition: string;
    is_expansion: boolean;
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

interface CartOperationResult {
    success: boolean;
    message?: string;
}

interface CartContextType {
    cart: CartData | null;
    baskets: CartBasket[];
    summary: CartSummary;
    itemCount: number;
    isLoading: boolean;
    error: string | null;
    fetchCart: () => Promise<void>;
    addToCart: (listingId: string) => Promise<CartOperationResult>;
    removeFromCart: (listingId: string) => Promise<CartOperationResult>;
    expiredItems: ExpiredCartItem[];
    captureExpiredItems: (items: ExpiredCartItemInput[]) => void;
    dismissExpiredItem: (listingId: string) => void;
    clearExpiredItems: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [cart, setCart] = useState<CartData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expiredItems, setExpiredItems] = useState<ExpiredCartItem[]>([]);

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
        } catch (err: unknown) {
            console.error('Error fetching cart:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch cart');
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cart intentionally excluded to avoid infinite loops
    }, [user]);

    // Fetch cart on mount and when user changes (wait for auth to finish loading)
    useEffect(() => {
        // Wait for auth to finish loading before making API calls
        if (authLoading) return;

        if (user) {
            // Defer initial fetch to avoid blocking main thread during hydration
            let idleCallbackId: number;
            let useIdleCallback = false;

            const win = window as typeof window & {
                requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
                cancelIdleCallback?: (id: number) => void;
            };

            if (win.requestIdleCallback) {
                useIdleCallback = true;
                idleCallbackId = win.requestIdleCallback(() => {
                    fetchCart();
                }, { timeout: 2000 });
            } else {
                idleCallbackId = window.setTimeout(() => {
                    fetchCart();
                }, 100) as unknown as number;
            }

            return () => {
                if (useIdleCallback && win.cancelIdleCallback) {
                    win.cancelIdleCallback(idleCallbackId);
                } else {
                    window.clearTimeout(idleCallbackId);
                }
            };
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

    const captureExpiredItems = useCallback((items: ExpiredCartItemInput[]) => {
        setExpiredItems(prev => {
            const existingIds = new Set(prev.map(i => i.listing_id));
            const newItems: ExpiredCartItem[] = items
                .filter(item => !existingIds.has(item.listing_id))
                .map(item => ({
                    listing_id: item.listing_id,
                    game_name: item.game_name,
                    bgg_game_id: item.bgg_game_id,
                    price: item.price,
                    photo_url: item.photo_url,
                    game_thumbnail: item.game_thumbnail,
                    condition: item.condition,
                    is_expansion: item.is_expansion,
                    expired_at: new Date().toISOString(),
                }));
            return newItems.length > 0 ? [...prev, ...newItems] : prev;
        });
    }, []);

    const dismissExpiredItem = useCallback((listingId: string) => {
        setExpiredItems(prev => prev.filter(i => i.listing_id !== listingId));
    }, []);

    const clearExpiredItems = useCallback(() => {
        setExpiredItems([]);
    }, []);

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
        expiredItems,
        captureExpiredItems,
        dismissExpiredItem,
        clearExpiredItems,
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
