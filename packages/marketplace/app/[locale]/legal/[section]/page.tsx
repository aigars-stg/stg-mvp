import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getLegalDocument } from '@/lib/legal';
import { LegalSection } from '@/components/legal/LegalSection';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

const SECTION_SLUGS: Record<string, string> = {
  terms: 'terms',
  privacy: 'privacy',
  seller: 'seller-terms',
  cookies: 'cookies',
  fees: 'fees',
};

export function generateStaticParams() {
  return Object.keys(SECTION_SLUGS).map((section) => ({ section }));
}

export async function generateMetadata({
  params: { locale, section },
}: {
  params: { locale: string; section: string };
}): Promise<Metadata> {
  const fileSlug = SECTION_SLUGS[section];
  if (!fileSlug) return {};

  try {
    const doc = getLegalDocument(fileSlug, locale);
    return {
      title: doc.frontmatter.title,
      description: doc.frontmatter.description || '',
    };
  } catch {
    return {};
  }
}

export default async function LegalSectionPage({
  params: { locale, section },
}: {
  params: { locale: string; section: string };
}) {
  const fileSlug = SECTION_SLUGS[section];
  if (!fileSlug) notFound();

  const t = await getTranslations('Legal.page');

  let doc;
  try {
    doc = getLegalDocument(fileSlug, locale);
  } catch {
    notFound();
  }

  return (
    <>
      <BreadcrumbSchema items={[
        { name: t('breadcrumbHome'), url: baseUrl },
        { name: t('breadcrumbLegal'), url: `${baseUrl}/legal` },
        { name: doc.frontmatter.title, url: `${baseUrl}/legal/${section}` },
      ]} />
      <LegalSection
        title={doc.frontmatter.title}
        lastUpdated={doc.frontmatter.lastUpdated}
        content={doc.content}
      />
    </>
  );
}
