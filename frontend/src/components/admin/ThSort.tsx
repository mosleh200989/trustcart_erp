import React from 'react';
import type { SortDir } from '@/hooks/useSortableData';

interface ThSortProps {
  /** The data key this column sorts by */
  col: string;
  /** Column header label */
  label: React.ReactNode;
  /** Currently active sort key */
  sortKey: string | null;
  /** Current sort direction */
  sortDir: SortDir;
  /** Callback to toggle sort on this column */
  onSort: (col: string) => void;
  /** Extra Tailwind classes for the <th> */
  className?: string;
}

/**
 * Drop-in replacement for plain <th> cells in custom HTML tables.
 * Renders a clickable button with a sort direction indicator.
 */
export default function ThSort({ col, label, sortKey, sortDir, onSort, className = '' }: ThSortProps) {
  const isActive = sortKey === col;

  return (
    <th className={`${className} cursor-pointer select-none`} onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1 group">
        <span>{label}</span>
        <span
          className={`text-xs transition-opacity ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'}`}
          aria-hidden="true"
        >
          {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  );
}
