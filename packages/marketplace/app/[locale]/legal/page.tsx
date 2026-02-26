import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getLegalDocument } from '@/lib/legal';
import { LegalSection } from '@/components/legal/LegalSection';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'Legal.page' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LegalPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('Legal.page');

  let title = 'Legal';
  let lastUpdated = '';
  let content = 'This section is coming soon.';

  try {
    const doc = getLegalDocument('overview', locale);
    title = doc.frontmatter.title;
    lastUpdated = doc.frontmatter.lastUpdated;
    content = doc.content;
  } catch {
    // Fall back to placeholder
  }

  return (
    <>
      <BreadcrumbSchema items={[
        { name: t('breadcrumbHome'), url: baseUrl },
        { name: t('breadcrumbLegal'), url: `${baseUrl}/legal` },
      ]} />
      <LegalSection
        title={title}
        lastUpdated={lastUpdated}
        content={content}
      />
    </>
  );
}
