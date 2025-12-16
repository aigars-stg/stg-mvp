import Link from 'next/link';
import { Metadata } from 'next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getLegalDocument } from '../../lib/legal';

export async function generateMetadata(): Promise<Metadata> {
  const { frontmatter } = getLegalDocument('terms');
  return {
    title: `${frontmatter.title} | Second Turn Games`,
    description: frontmatter.description,
  };
}

export default function TermsOfServicePage() {
  const { content, frontmatter } = getLegalDocument('terms');

  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-polar-night mb-4">
            {frontmatter.title}
          </h1>
          <p className="text-text-secondary">
            Last updated: {frontmatter.lastUpdated}
          </p>
        </div>

        {/* Content */}
        <article className="prose prose-polar-night max-w-none prose-headings:text-polar-night prose-p:text-text-secondary prose-strong:text-polar-night prose-li:text-text-secondary prose-a:text-frost-ice prose-a:no-underline hover:prose-a:underline prose-th:text-polar-night prose-td:text-text-secondary prose-tr:border-b-polar-night/20">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => {
                const isInternal = props.href?.startsWith('/');
                if (isInternal) {
                  return <Link href={props.href!} {...props} className="text-frost-ice hover:underline" />;
                }
                return <a target="_blank" rel="noopener noreferrer" {...props} className="text-frost-ice hover:underline" />;
              }
            }}
          >
            {content}
          </Markdown>
        </article>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-frost-ice hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
