import { Metadata } from 'next';
import { getHelpDocument } from '@/lib/legal';
import { HelpHub } from '@/components/help/HelpHub';
import { HELP_SECTIONS } from '@/components/help/help-sections';

export const metadata: Metadata = {
  title: 'Help Centre | Second Turn Games',
  description:
    'Guides and resources for buying and selling pre-loved board games on Second Turn Games.',
};

function loadAllHelpDocuments() {
  const slugMap: Record<string, string> = {
    overview: 'overview',
    selling: 'selling',
    grading: 'grading-guide',
    shipping: 'shipping',
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
      documents[section.id] = getHelpDocument(fileSlug);
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

export default function HelpPage() {
  const documents = loadAllHelpDocuments();

  return <HelpHub documents={documents} />;
}
