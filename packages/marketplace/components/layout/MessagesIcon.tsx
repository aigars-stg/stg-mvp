'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChatBubble as MessageCircle } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUnreadMessages } from '@/lib/contexts/UnreadMessagesContext';

export function MessagesIcon() {
    const { user } = useAuth();
    const { unreadCount } = useUnreadMessages();
    const router = useRouter();
    const pathname = usePathname();

    const handleClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            router.push(`/auth?returnTo=${encodeURIComponent(pathname)}&prompt=messages`);
        }
    };

    return (
        <Link
            href={user ? '/messages' : '#'}
            onClick={handleClick}
            className={`relative p-2 transition-all duration-200 ${
                user
                    ? 'text-text-secondary hover:text-text hover:scale-110'
                    : 'text-text-secondary/40 cursor-default'
            }`}
            aria-label={`Messages${user && unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
            <MessageCircle className="w-6 h-6" />

            {/* Badge - only show if logged in and there are unread messages */}
            {user && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-aurora-orange text-snow-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
