import { Metadata } from 'next';
import { MessageThread } from '@/components/messaging/MessageThread';
import { ConversationList } from '@/components/messaging/ConversationList';

export const metadata: Metadata = {
  title: 'Conversation | Second Turn Games',
  description: 'View your conversation',
};

interface ConversationPageProps {
  params: {
    id: string;
  };
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const conversationId = params.id;

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Conversation list (desktop only) */}
          <div className="hidden md:block md:col-span-1">
            <div className="bg-background-secondary rounded-lg border border-divider-subtle overflow-hidden sticky top-8">
              <div className="border-b border-divider-subtle px-4 py-3">
                <h2 className="text-lg font-semibold text-text-primary">
                  Messages
                </h2>
              </div>
              <div className="h-[calc(100vh-12rem)] overflow-y-auto">
                <ConversationList activeConversationId={conversationId} />
              </div>
            </div>
          </div>

          {/* Message thread */}
          <div className="col-span-1 md:col-span-2">
            <div className="bg-background-secondary rounded-lg border border-divider-subtle overflow-hidden">
              <div className="h-[calc(100vh-8rem)]">
                <MessageThread conversationId={conversationId} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
