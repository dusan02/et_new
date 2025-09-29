/**
 * 📊 EARNINGS TABLE HEADER
 * Modulárny header komponent pre earnings tabuľku
 */

import { memo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableColumn, SortConfig } from './types';

interface EarningsHeaderProps {
  columns: TableColumn[];
  sortConfig: SortConfig;
  onSort: (field: string) => void;
}

export const EarningsHeader = memo(function EarningsHeader({
  columns,
  sortConfig,
  onSort
}: EarningsHeaderProps) {
  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <thead className="bg-gray-50">
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className={`
              px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
              ${column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
              ${column.align === 'center' ? 'text-center' : ''}
              ${column.align === 'right' ? 'text-right' : ''}
            `}
            style={{ width: column.width }}
            onClick={() => column.sortable && onSort(column.key)}
          >
            <div className="flex items-center gap-1">
              {column.label}
              {column.sortable && getSortIcon(column.key)}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
});
