'use client';

import { Button } from '@second-turn/design-system';
import { ChevronLeft, ChevronRight } from '@/lib/icons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  itemLabel = 'items',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-text-secondary">
        Showing {from} to {to} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-text-secondary">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
