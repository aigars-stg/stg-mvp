import { Metadata } from 'next';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatBubble as MessageCircle } from 'griddy-icons';
import { Card } from '@second-turn/design-system';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Messages | Second Turn Games',
  description: 'View your messages and conversations',
};

export default async function MessagesPage() {
  const t = await getTranslations('MessagesPage');

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-frost-ice" />
            <h1 className="text-3xl font-bold text-text-primary">{t('title')}</h1>
          </div>
          <p className="text-text-secondary mt-2">
            {t('subtitle')}
          </p>
        </div>

        {/* Conversation list */}
        <Card className="h-[calc(100vh-16rem)] overflow-hidden" padding="none">
          <ConversationList />
        </Card>
      </div>
    </div>
  );
}
