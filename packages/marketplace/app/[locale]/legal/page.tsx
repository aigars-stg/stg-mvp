import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getLegalDocument, serializeMdx } from '@/lib/legal';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { LegalHub } from '@/components/legal/LegalHub';
import { LEGAL_SECTIONS } from '@/components/legal/legal-sections';
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

async function loadAllLegalDocuments(locale: string = 'en') {
  const slugMap: Record<string, string> = {
    overview: 'overview',
    terms: 'terms',
    privacy: 'privacy',
    seller: 'seller-terms',
    buyer: 'buyer-guide',
    cookies: 'cookies',
    fees: 'fees',
  };

  const documents: Record<
    string,
    {
      slug: string;
      frontmatter: { title: string; lastUpdated: string; description?: string };
      serialized: MDXRemoteSerializeResult;
    }
  > = {};

  for (const section of LEGAL_SECTIONS) {
    const fileSlug = slugMap[section.id] || section.id;
    try {
      const doc = getLegalDocument(fileSlug, locale);
      const serialized = await serializeMdx(doc.content);
      documents[section.id] = {
        slug: doc.slug,
        frontmatter: doc.frontmatter,
        serialized,
      };
    } catch {
      // Section content file not yet created — provide placeholder
      const serialized = await serializeMdx('This section is coming soon.');
      documents[section.id] = {
        slug: fileSlug,
        frontmatter: {
          title: section.label,
          lastUpdated: '',
          description: '',
        },
        serialized,
      };
    }
  }

  return documents;
}

export default async function LegalPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('Legal.page');
  const documents = await loadAllLegalDocuments(locale);

  return (
    <>
      <BreadcrumbSchema items={[
        { name: t('breadcrumbHome'), url: baseUrl },
        { name: t('breadcrumbLegal'), url: `${baseUrl}/legal` },
      ]} />
      <LegalHub documents={documents} />
    </>
  );
}
