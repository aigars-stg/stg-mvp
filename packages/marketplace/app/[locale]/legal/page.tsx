import { Metadata } from 'next';
import { getLegalDocument } from '@/lib/legal';
import { LegalHub } from '@/components/legal/LegalHub';
import { LEGAL_SECTIONS } from '@/components/legal/legal-sections';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

export const metadata: Metadata = {
  title: 'Legal',
  description:
    'Terms of service, privacy policy, seller agreement, and other legal documents for Second Turn Games.',
};

function loadAllLegalDocuments() {
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
      content: string;
    }
  > = {};

  for (const section of LEGAL_SECTIONS) {
    const fileSlug = slugMap[section.id] || section.id;
    try {
      documents[section.id] = getLegalDocument(fileSlug);
    } catch {
      // Section content file not yet created — provide placeholder
      documents[section.id] = {
        slug: fileSlug,
        frontmatter: {
          title: section.label,
          lastUpdated: '',
          description: '',
        },
        content: `This section is coming soon.`,
      };
    }
  }

  return documents;
}

export default function LegalPage() {
  const documents = loadAllLegalDocuments();

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: baseUrl },
        { name: 'Legal', url: `${baseUrl}/legal` },
      ]} />
      <LegalHub documents={documents} />
    </>
  );
}
