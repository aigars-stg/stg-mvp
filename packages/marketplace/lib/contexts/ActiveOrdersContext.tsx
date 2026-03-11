'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

interface ActiveOrdersContextType {
    activeCount: number;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const ActiveOrdersContext = createContext<ActiveOrdersContextType | undefined>(undefined);

export function ActiveOrdersProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [activeCount, setActiveCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchActiveCount = useCallback(async () => {
        if (!user) {
            setActiveCount(0);
            return;
        }

        try {
            const response = await fetch('/api/orders/active-count');
            if (response.ok) {
                const data = await response.json();
                setActiveCount(data.count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch active order count:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setActiveCount(0);
            setIsLoading(false);
            return;
        }

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
                setIsLoading(true);
                fetchActiveCount();
            }, { timeout: 2000 });
        } else {
            idleCallbackId = window.setTimeout(() => {
                setIsLoading(true);
                fetchActiveCount();
            }, 100) as unknown as number;
        }

        // Poll every 30 seconds, but only when tab is visible
        let interval: NodeJS.Timeout | null = null;

        const startPolling = () => {
            if (!interval) {
                interval = setInterval(fetchActiveCount, 30000);
            }
        };

        const stopPolling = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchActiveCount();
                startPolling();
            } else {
                stopPolling();
            }
        };

        if (document.visibilityState === 'visible') {
            startPolling();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (useIdleCallback && win.cancelIdleCallback) {
                win.cancelIdleCallback(idleCallbackId);
            } else {
                window.clearTimeout(idleCallbackId);
            }
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, authLoading, fetchActiveCount]);

    return (
        <ActiveOrdersContext.Provider value={{ activeCount, isLoading, refresh: fetchActiveCount }}>
            {children}
        </ActiveOrdersContext.Provider>
    );
}

export function useActiveOrders() {
    const context = useContext(ActiveOrdersContext);
    if (context === undefined) {
        throw new Error('useActiveOrders must be used within an ActiveOrdersProvider');
    }
    return context;
}
