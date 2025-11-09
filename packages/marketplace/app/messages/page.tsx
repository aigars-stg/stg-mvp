import { Metadata } from 'next';
import { ConversationList } from '@/components/messaging/ConversationList';
import { MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Messages | Second Turn Games',
  description: 'View your messages and conversations',
};

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-frost-ice" />
            <h1 className="text-3xl font-bold text-text-primary">Messages</h1>
          </div>
          <p className="text-text-secondary mt-2">
            Manage your conversations with buyers and sellers
          </p>
        </div>

        {/* Conversation list */}
        <div className="bg-background-secondary rounded-lg border border-divider-subtle overflow-hidden">
          <div className="h-[calc(100vh-16rem)]">
            <ConversationList />
          </div>
        </div>
      </div>
    </div>
  );
}
