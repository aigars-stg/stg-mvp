import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PlayGame } from '@/components/play';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Play');

  return {
    title: t('title'),
    description: t('subtitle'),
    openGraph: {
      title: t('title'),
      description: t('subtitle'),
    },
  };
}

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <PlayGame />
    </main>
  );
}
