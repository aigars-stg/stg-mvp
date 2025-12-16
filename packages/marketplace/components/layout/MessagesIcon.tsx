'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUnreadMessages } from '@/lib/contexts/UnreadMessagesContext';

export function MessagesIcon() {
    const { user } = useAuth();
    const { unreadCount } = useUnreadMessages();

    // Don't show messages icon if not logged in
    if (!user) {
        return null;
    }

    return (
        <Link
            href="/messages"
            className="relative p-2 text-text-secondary hover:text-text transition-colors"
            aria-label={`Messages${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
            <MessageCircle className="w-6 h-6" />

            {/* Badge - only show if there are unread messages */}
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-aurora-orange text-snow-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
