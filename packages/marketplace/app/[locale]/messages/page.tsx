import { Metadata } from 'next';
import { ConversationList } from '@/components/messaging/ConversationList';
import { Card } from '@second-turn/design-system';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'View your messages and conversations',
};

export default async function MessagesPage() {
  const t = await getTranslations('MessagesPage');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-1">
        {t('title')}
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        {t('subtitle')}
      </p>

      <Card className="h-[calc(100vh-16rem)] overflow-hidden" padding="none">
        <ConversationList />
      </Card>
    </div>
  );
}
