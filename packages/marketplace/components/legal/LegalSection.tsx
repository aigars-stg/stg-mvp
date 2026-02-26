'use client';

import { MDXRemote } from 'next-mdx-remote';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { Download } from '@/lib/icons';
import { legalMdxComponents } from './mdx-components';

interface LegalSectionProps {
  title: string;
  lastUpdated?: string;
  serialized: MDXRemoteSerializeResult;
}

export function LegalSection({ title, lastUpdated, serialized }: LegalSectionProps) {
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
        <button
          data-no-print
          onClick={() => window.print()}
          className="mt-1 flex shrink-0 items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-snow-storm hover:text-polar-night"
          title="Print or save as PDF"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Print / Save</span>
        </button>
      </div>

      <article className="prose prose-polar-night max-w-none prose-headings:text-polar-night prose-p:text-text-secondary prose-strong:text-polar-night prose-li:text-text-secondary prose-a:text-frost-ice prose-a:no-underline hover:prose-a:underline prose-th:text-polar-night prose-td:text-text-secondary prose-tr:border-b-polar-night/20">
        <MDXRemote {...serialized} components={legalMdxComponents} />
      </article>
    </div>
  );
}
