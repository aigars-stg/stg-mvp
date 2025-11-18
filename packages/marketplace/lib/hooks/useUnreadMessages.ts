import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Hook to fetch and track unread message count
 * Polls the messages API every 30 seconds when user is authenticated
 * @returns Object with unreadCount and isLoading state
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        setIsLoading(true);
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
    };

    // Initial fetch
    fetchUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return { unreadCount, isLoading };
}
