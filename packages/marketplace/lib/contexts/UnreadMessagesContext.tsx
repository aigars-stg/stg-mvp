'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

interface UnreadMessagesContextType {
    unreadCount: number;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        try {
            // Don't set global loading state for background polling
            // Only set it if we want to show a spinner somewhere specific
            // setIsLoading(true); 

            const response = await fetch('/api/messages');
            if (response.ok) {
                const data = await response.json();
                const total = data.conversations?.reduce(
                    (sum: number, conv: any) => sum + (conv.unread_count || 0),
                    0
                ) || 0;
                setUnreadCount(total);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        // Wait for auth to finish loading before making API calls
        if (authLoading) return;

        if (!user) {
            setUnreadCount(0);
            setIsLoading(false);
            return;
        }

        // Initial fetch
        setIsLoading(true);
        fetchUnreadCount();

        // Poll every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);

        return () => clearInterval(interval);
    }, [user, authLoading, fetchUnreadCount]);

    return (
        <UnreadMessagesContext.Provider value={{ unreadCount, isLoading, refresh: fetchUnreadCount }}>
            {children}
        </UnreadMessagesContext.Provider>
    );
}

export function useUnreadMessages() {
    const context = useContext(UnreadMessagesContext);
    if (context === undefined) {
        throw new Error('useUnreadMessages must be used within an UnreadMessagesProvider');
    }
    return context;
}
