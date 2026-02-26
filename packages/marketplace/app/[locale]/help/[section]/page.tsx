import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getHelpDocument, serializeMdx } from '@/lib/legal';
import { LegalSection } from '@/components/legal/LegalSection';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

const SECTION_SLUGS: Record<string, string> = {
  buying: 'buying',
  selling: 'selling',
  grading: 'grading-guide',
  shipping: 'shipping',
  wallet: 'wallet',
  dac7: 'dac7',
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
    const doc = getHelpDocument(fileSlug, locale);
    return {
      title: doc.frontmatter.title,
      description: doc.frontmatter.description || '',
    };
  } catch {
    return {};
  }
}

export default async function HelpSectionPage({
  params: { locale, section },
}: {
  params: { locale: string; section: string };
}) {
  const fileSlug = SECTION_SLUGS[section];
  if (!fileSlug) notFound();

  const t = await getTranslations('Help.page');

  let doc;
  try {
    doc = getHelpDocument(fileSlug, locale);
  } catch {
    notFound();
  }

  const serialized = await serializeMdx(doc.content);

  return (
    <>
      <BreadcrumbSchema items={[
        { name: t('breadcrumbHome'), url: baseUrl },
        { name: t('breadcrumbHelp'), url: `${baseUrl}/help` },
        { name: doc.frontmatter.title, url: `${baseUrl}/help/${section}` },
      ]} />
      <LegalSection
        title={doc.frontmatter.title}
        lastUpdated={doc.frontmatter.lastUpdated}
        serialized={serialized}
      />
    </>
  );
}
