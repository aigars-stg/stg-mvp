'use client';

import { useState, useEffect } from 'react';
import { ConversationListItem } from './ConversationListItem';
import { RefreshCw as Loader2, ChatBubble as MessageCircle, AlertCircle } from 'griddy-icons';
import type { ConversationListItem as ConversationListItemType } from '@/lib/types/message';

interface ConversationListProps {
  activeConversationId?: string;
}

export function ConversationList({
  activeConversationId,
}: ConversationListProps) {
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-aurora-red" />
        <p className="text-text-primary">{error}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No conversations yet
          </h3>
          <p className="text-text-secondary max-w-sm">
            When you reach out about a listing - or someone reaches out to you - it&apos;ll show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background-primary">
      <div className="divide-y divide-divider-subtle">
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
