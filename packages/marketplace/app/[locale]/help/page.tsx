import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getHelpDocument } from '@/lib/legal';
import { HelpHub } from '@/components/help/HelpHub';
import { HELP_SECTIONS } from '@/components/help/help-sections';
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

function loadAllHelpDocuments(locale: string = 'en') {
  const slugMap: Record<string, string> = {
    overview: 'overview',
    buying: 'buying',
    selling: 'selling',
    grading: 'grading-guide',
    shipping: 'shipping',
    wallet: 'wallet',
    dac7: 'dac7',
  };

  const documents: Record<
    string,
    {
      slug: string;
      frontmatter: { title: string; lastUpdated: string; description?: string };
      content: string;
    }
  > = {};

  for (const section of HELP_SECTIONS) {
    const fileSlug = slugMap[section.id] || section.id;
    try {
      documents[section.id] = getHelpDocument(fileSlug, locale);
    } catch {
      documents[section.id] = {
        slug: fileSlug,
        frontmatter: {
          title: section.label,
          lastUpdated: '',
          description: '',
        },
        content: 'This section is coming soon.',
      };
    }
  }

  return documents;
}

export default async function HelpPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('Help');
  const documents = loadAllHelpDocuments(locale);

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
      <HelpHub documents={documents} />
    </>
  );
}
