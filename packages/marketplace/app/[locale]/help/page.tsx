import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getHelpDocument } from '@/lib/legal';
import { LegalSection } from '@/components/legal/LegalSection';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'Help.page' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;

export default async function HelpPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('Help');

  let title = 'Help Centre';
  let lastUpdated = '';
  let content = 'This section is coming soon.';

  try {
    const doc = getHelpDocument('overview', locale);
    title = doc.frontmatter.title;
    lastUpdated = doc.frontmatter.lastUpdated;
    content = doc.content;
  } catch {
    // Fall back to placeholder
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_KEYS.map((key) => ({
      '@type': 'Question',
      name: t(`faq.${key}.question`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(`faq.${key}.answer`),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <BreadcrumbSchema items={[
        { name: t('page.breadcrumbHome'), url: baseUrl },
        { name: t('page.breadcrumbHelp'), url: `${baseUrl}/help` },
      ]} />
      <LegalSection
        title={title}
        lastUpdated={lastUpdated}
        content={content}
      />
    </>
  );
}
