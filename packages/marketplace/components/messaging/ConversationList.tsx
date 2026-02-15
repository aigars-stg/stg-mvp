'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ConversationListItem } from './ConversationListItem';
import { ChatBubble as MessageCircle, AlertCircle } from '@/lib/icons';
import type { ConversationListItem as ConversationListItemType } from '@/lib/types/message';

interface ConversationListProps {
  activeConversationId?: string;
}

export function ConversationList({
  activeConversationId,
}: ConversationListProps) {
  const t = useTranslations('MessagesPage');
  const [conversations, setConversations] = useState<ConversationListItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/messages');

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load conversations');
        }

        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (err: unknown) {
        console.error('Error fetching conversations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Refresh conversations every 60 seconds to show new messages
    const interval = setInterval(fetchConversations, 60000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="divide-y divide-snow-storm">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-bg-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-bg-secondary rounded" />
                <div className="h-3 w-12 bg-bg-secondary rounded" />
              </div>
              <div className="h-3 w-full bg-bg-secondary rounded" />
              <div className="h-3 w-3/4 bg-bg-secondary rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-aurora-red" />
        <p className="text-text">{error}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <div>
          <h3 className="text-lg font-semibold text-text mb-2">
            {t('noConversations')}
          </h3>
          <p className="text-text-secondary max-w-sm">
            {t('noConversationsHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-bg-elevated">
      <div className="divide-y divide-snow-storm">
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeConversationId}
          />
        ))}
      </div>
    </div>
  );
}
