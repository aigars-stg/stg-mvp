'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

interface UnreadNotificationsContextType {
    unreadCount: number;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const UnreadNotificationsContext = createContext<UnreadNotificationsContextType | undefined>(undefined);

export function UnreadNotificationsProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        try {
            const response = await fetch('/api/notifications/unread-count');
            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch unread notification count:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setUnreadCount(0);
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
                fetchUnreadCount();
            }, { timeout: 2000 });
        } else {
            idleCallbackId = window.setTimeout(() => {
                setIsLoading(true);
                fetchUnreadCount();
            }, 100) as unknown as number;
        }

        // Poll every 30 seconds, but only when tab is visible
        let interval: NodeJS.Timeout | null = null;

        const startPolling = () => {
            if (!interval) {
                interval = setInterval(fetchUnreadCount, 30000);
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
                fetchUnreadCount();
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
    }, [user, authLoading, fetchUnreadCount]);

    return (
        <UnreadNotificationsContext.Provider value={{ unreadCount, isLoading, refresh: fetchUnreadCount }}>
            {children}
        </UnreadNotificationsContext.Provider>
    );
}

export function useUnreadNotifications() {
    const context = useContext(UnreadNotificationsContext);
    if (context === undefined) {
        throw new Error('useUnreadNotifications must be used within an UnreadNotificationsProvider');
    }
    return context;
}
