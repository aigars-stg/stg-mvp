import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MessageThread } from '@/components/messaging/MessageThread';
import { ConversationList } from '@/components/messaging/ConversationList';

export const metadata: Metadata = {
  title: 'Conversation',
  description: 'View your conversation',
};

interface ConversationPageProps {
  params: {
    id: string;
  };
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const t = await getTranslations('MessagesPage');
  const conversationId = params.id;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversation list (desktop only) */}
        <div className="hidden md:block md:col-span-1">
          <div className="bg-bg-elevated rounded-lg border border-snow-storm overflow-hidden sticky top-8">
            <div className="border-b border-snow-storm px-4 py-3">
              <h2 className="text-lg font-semibold text-text">
                {t('title')}
              </h2>
            </div>
            <div className="h-[calc(100vh-12rem)] overflow-y-auto">
              <ConversationList activeConversationId={conversationId} />
            </div>
          </div>
        </div>

        {/* Message thread */}
        <div className="col-span-1 md:col-span-2">
          <div className="bg-bg-elevated rounded-lg border border-snow-storm overflow-hidden">
            <div className="h-[calc(100vh-8rem)]">
              <MessageThread conversationId={conversationId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
