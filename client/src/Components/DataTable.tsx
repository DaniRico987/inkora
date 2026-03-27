import { useState, type ReactNode } from 'react';
import { Pagination } from './Pagination';
import { Spinner } from './Spinner';

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => ReactNode;
  width?: string;
}

export interface DataTableAction<T> {
  label: string;
  icon?: string;
  onClick: (row: T) => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  show?: (row: T) => boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  actions?: DataTableAction<T>[];
  isLoading?: boolean;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  actions = [],
  isLoading = false,
  onSearch,
  searchPlaceholder = 'Buscar...',
  pagination,
  emptyMessage = 'No hay datos disponibles',
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {onSearch && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
          />
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-lg border border-border bg-bg-secondary overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="text-lg">{emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full">
            {/* Table Header */}
            <thead className="border-b border-border bg-bg">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="px-6 py-4 text-left text-sm font-semibold text-text"
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border">
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-bg transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="px-6 py-4 text-sm text-text"
                      style={{ width: column.width }}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key])}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {actions
                          .filter(
                            (action) =>
                              !action.show || action.show(row)
                          )
                          .map((action, actionIndex) => (
                            <button
                              key={actionIndex}
                              onClick={() => action.onClick(row)}
                              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                action.variant === 'destructive'
                                  ? 'bg-red-600/20 text-red-600 hover:bg-red-600/30'
                                  : action.variant === 'secondary'
                                    ? 'bg-babyblue-500/20 text-babyblue-600 hover:bg-babyblue-500/30'
                                    : 'bg-primary-500/20 text-primary-600 hover:bg-primary-500/30'
                              }`}
                            >
                              {action.icon && (
                                <span className="mr-1">{action.icon}</span>
                              )}
                              {action.label}
                            </button>
                          ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && !isLoading && data.length > 0 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
