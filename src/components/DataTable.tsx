import React, { useState, useMemo } from 'react';
import { 
  Table, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Download, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

interface DataTableProps {
  data: {
    headers: string[];
    rows: (string | number)[][];
    totalRows: number;
  };
  title?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, title = 'GA4 Data Breakdown' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColIndex, setSortColIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRows = useMemo(() => {
    let result = [...data.rows];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row =>
        row.some(cell => String(cell).toLowerCase().includes(term))
      );
    }

    if (sortColIndex !== null) {
      result.sort((a, b) => {
        const valA = a[sortColIndex];
        const valB = b[sortColIndex];

        const numA = Number(valA);
        const numB = Number(valB);

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA || '');
        const strB = String(valB || '');
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [data.rows, searchTerm, sortColIndex, sortDirection]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (index: number) => {
    if (sortColIndex === index) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortColIndex(null);
        setSortDirection('desc');
      }
    } else {
      setSortColIndex(index);
      setSortDirection('desc');
    }
  };

  const exportCSV = () => {
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ga4_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const records = data.rows.map(row => {
      const obj: Record<string, any> = {};
      data.headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });

    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ga4_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCell = (val: string | number, headerName: string) => {
    const num = Number(val);
    const h = headerName.toLowerCase();
    if (!isNaN(num) && typeof val === 'number') {
      if (h.includes('revenue')) {
        return <span className="font-semibold text-slate-900">${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
      if (h.includes('rate') || h.includes('bounce')) {
        const rateVal = num > 1 ? num : num * 100;
        const colorClass = rateVal < 35 ? 'text-green-600 font-semibold' : rateVal < 50 ? 'text-orange-600 font-semibold' : 'text-rose-600 font-semibold';
        return <span className={colorClass}>{rateVal.toFixed(1)}%</span>;
      }
      return <span className="text-slate-800 font-medium">{num.toLocaleString()}</span>;
    }
    return <span className="font-medium text-slate-900">{String(val)}</span>;
  };

  return (
    <div className="my-3 rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">{title}</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-500 border border-slate-200">
            {filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search table..."
              className="w-full pl-8 pr-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-[11px] focus:outline-hidden focus:border-blue-400"
            />
          </div>

          <button
            onClick={exportCSV}
            title="Download CSV"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium transition-colors shadow-2xs"
          >
            <Download className="w-3 h-3 text-slate-500" />
            CSV
          </button>

          <button
            onClick={exportJSON}
            title="Download JSON"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3 h-3 text-slate-500" />
            JSON
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/40">
              {data.headers.map((header, idx) => {
                const isSorted = sortColIndex === idx;
                const isRight = idx > 0;
                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(idx)}
                    className={`py-2 px-3.5 text-[10px] uppercase text-slate-400 font-bold cursor-pointer hover:text-slate-700 transition-colors select-none ${
                      isRight ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 ${isRight ? 'justify-end' : 'justify-start'}`}>
                      <span>{header}</span>
                      {isSorted ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-blue-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={data.headers.length} className="py-6 text-center text-slate-400 text-xs">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td 
                      key={cIdx} 
                      className={`py-2.5 px-3.5 text-xs ${cIdx > 0 ? 'text-right' : 'text-left'}`}
                    >
                      {formatCell(cell, data.headers[cIdx])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-2.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 shadow-2xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
