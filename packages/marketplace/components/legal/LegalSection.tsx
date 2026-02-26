import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { PrintButton } from './PrintButton';
import { legalMdxComponents } from './mdx-components';

interface LegalSectionProps {
  title: string;
  lastUpdated?: string;
  content: string;
}

export function LegalSection({ title, lastUpdated, content }: LegalSectionProps) {
  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-polar-night sm:text-4xl">
            {title}
          </h1>
          {lastUpdated && (
            <p className="mt-2 text-text-secondary">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>
        <PrintButton />
      </div>

      <article className="prose prose-polar-night max-w-none prose-headings:text-polar-night prose-p:text-text-secondary prose-strong:text-polar-night prose-li:text-text-secondary prose-a:text-frost-ice prose-a:no-underline hover:prose-a:underline prose-th:text-polar-night prose-td:text-text-secondary prose-tr:border-b-polar-night/20">
        <MDXRemote
          source={content}
          components={legalMdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [rehypeSlug],
            },
          }}
        />
      </article>
    </div>
  );
}
