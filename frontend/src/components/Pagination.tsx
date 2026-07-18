import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number; // 1-indexed
  totalPages: number;
  onPageChange: (page: number) => void;
  theme: 'light' | 'dark';
}

// Sliding-window pagination: always shows first page, last page, and a
// window around the current page, collapsing gaps into "...". Reduces to
// "1 2 3 ... N" while on/near the first page, which is the shape asked for.
function getPageList(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 10) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, 2, 3, totalPages - 2, totalPages - 1, totalPages]);
  for (let p = currentPage - 1; p <= currentPage + 1; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis');
    result.push(p);
    prev = p;
  }
  return result;
}

export default function Pagination({ currentPage, totalPages, onPageChange, theme }: PaginationProps) {
  const isDark = theme === 'dark';
  if (totalPages <= 1) return null;

  const pageList = getPageList(currentPage, totalPages);

  const pillBase = `w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer border`;
  const inactive = isDark
    ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
    : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm';
  const active = 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20';
  const disabled = 'opacity-40 cursor-not-allowed';

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${pillBase} ${currentPage === 1 ? `${inactive} ${disabled}` : inactive}`}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>

      {pageList.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className={`px-1 text-xs font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${pillBase} ${p === currentPage ? active : inactive}`}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${pillBase} ${currentPage === totalPages ? `${inactive} ${disabled}` : inactive}`}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
