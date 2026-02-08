import { Metadata } from 'next';
import { getHelpDocument } from '@/lib/legal';
import { HelpHub } from '@/components/help/HelpHub';
import { HELP_SECTIONS } from '@/components/help/help-sections';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

export const metadata: Metadata = {
  title: 'Help Centre | Second Turn Games',
  description:
    'Guides and resources for buying and selling pre-loved board games on Second Turn Games.',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Second Turn Games?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Second Turn Games is a peer-to-peer marketplace for buying and selling pre-loved board games in the Baltic region (Latvia, Lithuania, Estonia). Every listing is verified against BoardGameGeek\'s database of 170,000+ games.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where can I sell board games in Latvia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Second Turn Games is the dedicated marketplace for selling board games in Latvia, Lithuania, and Estonia. List your games with verified BoardGameGeek data, set your price, and ship via parcel lockers. Sellers receive 90% of the sale price.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Second Turn Games safe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Second Turn Games uses EveryPay (via Swedbank) for secure payment processing, offers buyer protection with a dispute resolution window, and verifies all listings against BoardGameGeek\'s database. The platform is operated by Second Turn Games SIA, registered in Latvia.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are the fees on Second Turn Games?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Buyers pay the item price plus a flat €2.00 shipping fee (no service fee). Sellers pay a 10% commission on the item price, deducted automatically. Listing is free.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does selling on Second Turn Games work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Search for your game in the BoardGameGeek database, grade its condition, set a price, add photos, and publish. When someone buys, you confirm the order within 24 hours, pack the game, and drop it off at a parcel terminal. Your earnings are credited to your wallet after delivery.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does shipping work on Second Turn Games?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Second Turn Games uses Unisend parcel terminals across the Baltic region. Shipping costs a flat €2.00 per order. After confirming an order, sellers receive a shipping code, pack the game, and drop it off at any Unisend terminal. Tracking updates automatically.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I get paid as a seller?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'After a buyer confirms delivery (or after the automatic 2-day dispute window), your earnings (90% of item price) are credited to your platform wallet. You can request a withdrawal to your IBAN bank account at any time.',
      },
    },
    {
      '@type': 'Question',
      name: 'What board game conditions are accepted?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Second Turn Games uses four condition grades: Like New (played 1-2 times, all components present), Very Good (light wear, fully playable), Good (moderate wear, complete and playable), and Acceptable (noticeable wear but complete). All grades require complete, playable games.',
      },
    },
  ],
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: baseUrl },
        { name: 'Help Centre', url: `${baseUrl}/help` },
      ]} />
      <HelpHub documents={documents} />
    </>
  );
}
