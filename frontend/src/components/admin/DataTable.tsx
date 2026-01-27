import React, { useEffect, useMemo, useRef } from 'react';
import { FaEdit, FaEye, FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  selection?: {
    selectedRowIds: Array<string | number>;
    onChange: (nextSelectedRowIds: Array<string | number>) => void;
    getRowId?: (row: any) => string | number;
  };
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
}

export default function DataTable({
  columns,
  data,
  selection,
  onView,
  onEdit,
  onDelete,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  loading = false
}: DataTableProps) {
  const hasActions = !!(onView || onEdit || onDelete);
  const getRowId = selection?.getRowId ?? ((row: any) => row?.id);
  const visibleRowIds = useMemo(
    () => (selection ? data.map((row) => getRowId(row)) : []),
    [data, selection, getRowId],
  );

  const selectedSet = useMemo(
    () => new Set(selection?.selectedRowIds ?? []),
    [selection?.selectedRowIds],
  );

  const allVisibleSelected =
    !!selection && visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedSet.has(id));
  const someVisibleSelected =
    !!selection && visibleRowIds.some((id) => selectedSet.has(id)) && !allVisibleSelected;

  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const toggleAllVisible = () => {
    if (!selection) return;

    if (allVisibleSelected) {
      selection.onChange(selection.selectedRowIds.filter((id) => !visibleRowIds.includes(id)));
      return;
    }

    const next = new Set(selection.selectedRowIds);
    visibleRowIds.forEach((id) => next.add(id));
    selection.onChange(Array.from(next));
  };

  const toggleOne = (row: any) => {
    if (!selection) return;
    const id = getRowId(row);
    const next = new Set(selection.selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(Array.from(next));
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-visible" style={{ scrollbarWidth: 'auto', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600">
            <tr>
              {selection && (
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="h-4 w-4 rounded border-gray-300 text-white accent-white"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {(onView || onEdit || onDelete) && (
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0) + (hasActions ? 1 : 0)} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0) + (hasActions ? 1 : 0)} className="px-6 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  {selection && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(getRowId(row))}
                        onChange={() => toggleOne(row)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render ? column.render(row[column.key], row) : row[column.key] || '-'}
                    </td>
                  ))}
                  {(onView || onEdit || onDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {onView && (
                          <button
                            onClick={() => onView(row)}
                            className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <FaEye size={16} />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-50 rounded"
                            title="Edit"
                          >
                            <FaEdit size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="text-red-600 hover:text-red-900 transition-colors p-2 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <FaTrash size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Page <span className="font-semibold">{currentPage}</span> of{' '}
            <span className="font-semibold">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronLeft className="inline mr-1" />
              Previous
            </button>
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <FaChevronRight className="inline ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
