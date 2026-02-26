'use client';

import { Download } from '@/lib/icons';

export function PrintButton() {
  return (
    <button
      data-no-print
      onClick={() => window.print()}
      className="mt-1 flex shrink-0 items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-snow-storm hover:text-polar-night"
      title="Print or save as PDF"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Print / Save</span>
    </button>
  );
}
