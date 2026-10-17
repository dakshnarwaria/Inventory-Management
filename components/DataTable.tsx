'use client';

import React, { ReactNode } from 'react';
import { Search, Inbox } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  headerActions?: ReactNode;
  rowKey: (item: T) => string | number;
}

export default function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
  emptyAction,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  headerActions,
  rowKey,
}: DataTableProps<T>) {
  return (
    <div className="card-theme overflow-hidden shadow-xs flex flex-col">
      {/* Header toolbar */}
      {(onSearchChange || headerActions) && (
        <div className="p-4 border-b border-theme flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {onSearchChange ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-muted-theme absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="input-theme w-full pl-9"
              />
            </div>
          ) : (
            <div />
          )}

          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          )}
        </div>
      )}

      {/* Table Body */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-theme bg-surface-hover/60">
              {columns.map((col, idx) => {
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';
                return (
                  <th
                    key={idx}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-theme ${alignClass} ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme">
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5">
                      <div className="h-4 bg-surface-hover rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center text-muted-theme mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-theme mb-1">{emptyMessage}</p>
                    <p className="text-xs text-muted-theme mb-4">
                      No matching data currently available in database.
                    </p>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={rowKey(item)}
                  className="hover:bg-surface-hover/60 transition-colors group"
                >
                  {columns.map((col, cIdx) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    const content = col.cell
                      ? col.cell(item)
                      : col.accessorKey
                      ? String(item[col.accessorKey] ?? '')
                      : null;

                    return (
                      <td
                        key={cIdx}
                        className={`px-4 py-3.5 text-theme ${alignClass} ${col.className || ''}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
