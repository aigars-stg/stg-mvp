import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PlainTermsBox } from './PlainTermsBox';

interface LegalSectionProps {
  title: string;
  lastUpdated?: string;
  content: string;
}

/**
 * Renders a legal document section with react-markdown.
 * Supports :::plain-terms blocks that render as PlainTermsBox callouts.
 *
 * Markdown syntax:
 *   :::plain-terms
 *   Your plain-language explanation here.
 *   :::
 */
export function LegalSection({ title, lastUpdated, content }: LegalSectionProps) {
  const segments = parsePlainTermsBlocks(content);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-polar-night dark:text-snow-stormLightest sm:text-4xl">
          {title}
        </h1>
        {lastUpdated && (
          <p className="mt-2 text-text-secondary dark:text-snow-stormLight">
            Last updated: {lastUpdated}
          </p>
        )}
      </div>

      <article className="prose prose-polar-night max-w-none prose-headings:text-polar-night prose-p:text-text-secondary prose-strong:text-polar-night prose-li:text-text-secondary prose-a:text-frost-ice prose-a:no-underline hover:prose-a:underline prose-th:text-polar-night prose-td:text-text-secondary prose-tr:border-b-polar-night/20 dark:prose-headings:text-snow-stormLightest dark:prose-p:text-snow-stormLight dark:prose-strong:text-snow-stormLightest dark:prose-li:text-snow-stormLight dark:prose-th:text-snow-stormLightest dark:prose-td:text-snow-stormLight">
        {segments.map((segment, i) =>
          segment.type === 'plain-terms' ? (
            <PlainTermsBox key={i}>
              <MarkdownContent content={segment.text} />
            </PlainTermsBox>
          ) : (
            <MarkdownContent key={i} content={segment.text} />
          )
        )}
      </article>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node: _node, ...props }) => {
          const isInternal = props.href?.startsWith('/');
          if (isInternal) {
            return (
              <Link href={props.href!} {...props} className="text-frost-ice hover:underline" />
            );
          }
          return (
            <a
              target="_blank"
              rel="noopener noreferrer"
              {...props}
              className="text-frost-ice hover:underline"
            />
          );
        },
      }}
    >
      {content}
    </Markdown>
  );
}

interface Segment {
  type: 'markdown' | 'plain-terms';
  text: string;
}

function parsePlainTermsBlocks(content: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /:::plain-terms\n([\s\S]*?):::/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'markdown', text: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'plain-terms', text: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'markdown', text: content.slice(lastIndex) });
  }

  return segments.filter((s) => s.text.trim().length > 0);
}
