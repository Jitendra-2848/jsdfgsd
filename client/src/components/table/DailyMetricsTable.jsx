import React, { useState, useMemo } from 'react';
import { Download, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function DailyMetricsTable({ days = [], loading = false }) {
  const [sortField, setSortField] = useState('deliveryDate');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter & Sort
  const processedDays = useMemo(() => {
    let result = [...days];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.deliveryDate.toLowerCase().includes(term) ||
          d.decisionDate.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    });

    return result;
  }, [days, searchTerm, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedDays.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedDays.slice(start, start + pageSize);
  }, [processedDays, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!days.length) return;
    const headers = [
      'Delivery Date',
      'Decision Date (D-1)',
      'MAE (MW)',
      'RMSE (MW)',
      'MAPE (%)',
      'MBE (MW)',
      'Avg Actual (MW)',
      'Avg Forecast (MW)',
      'Net Imbalance (MWh)',
    ];
    const rows = days.map((d) => [
      d.deliveryDate,
      d.decisionDate,
      d.mae,
      d.rmse,
      d.mape,
      d.mbe,
      d.avgActualMW,
      d.avgForecastMW,
      d.netImbalanceMWh,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `uk_wind_day_ahead_metrics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card-panel p-5">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#22221F] tracking-tight">
              Daily Quantitative Accuracy Breakdown
            </h3>
            <Badge variant="neutral">{days.length} Days</Badge>
          </div>
          <p className="text-xs text-[#66665D] mt-0.5">
            Audit-ready metrics per delivery day for trading reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#66665D] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search date..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs pl-8 pr-2.5 py-1.5 border border-[#D9D6CC] rounded-md outline-none focus:border-[#22221F] bg-[#FFFFFF] w-36"
            />
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!days.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FFFFFF] hover:bg-[#F2F2F2] text-[#22221F] border border-[#D9D6CC] rounded-md transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#527D68]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[#D9D6CC] rounded-md">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F2F2F2] text-[#66665D] uppercase text-[10px] font-semibold tracking-wider border-b border-[#D9D6CC]">
            <tr>
              <th
                onClick={() => handleSort('deliveryDate')}
                className="px-3.5 py-2.5 cursor-pointer hover:text-[#22221F]"
              >
                <div className="flex items-center gap-1">
                  Delivery Date
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('mae')}
                className="px-3.5 py-2.5 cursor-pointer hover:text-[#22221F] text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  MAE (MW)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('rmse')}
                className="px-3.5 py-2.5 cursor-pointer hover:text-[#22221F] text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  RMSE (MW)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('mape')}
                className="px-3.5 py-2.5 cursor-pointer hover:text-[#22221F] text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  MAPE (%)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('mbe')}
                className="px-3.5 py-2.5 cursor-pointer hover:text-[#22221F] text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  MBE (Bias)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avgActualMW')}
                className="px-3.5 py-2.5 cursor-pointer hover:text-[#22221F] text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  Avg Actual
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('netImbalanceMWh')}
                className="px-3.5 py-2.5 cursor-pointer hover:text-[#22221F] text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  Imbalance (MWh)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-3.5 py-2.5 text-center">Desk Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D6CC]/60 bg-[#FFFFFF]">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#66665D]">
                  Loading daily reconciliation records...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#66665D]">
                  No delivery days match your criteria.
                </td>
              </tr>
            ) : (
              paginatedData.map((d) => {
                const isOver = d.mbe > 0;
                return (
                  <tr key={d.deliveryDate} className="hover:bg-[#F2F2F2]/60 transition-colors">
                    <td className="px-3.5 py-2.5 font-medium text-[#22221F] font-mono">
                      {d.deliveryDate}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#96732D]">
                      {Math.round(d.mae).toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#66665D]">
                      {Math.round(d.rmse).toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#22221F]">
                      {d.mape.toFixed(1)}%
                    </td>
                    <td
                      className={`px-3.5 py-2.5 text-right font-mono font-semibold ${
                        isOver ? 'text-[#B84F49]' : 'text-[#416F9C]'
                      }`}
                    >
                      {d.mbe > 0 ? '+' : ''}{Math.round(d.mbe).toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#527D68] font-medium">
                      {Math.round(d.avgActualMW).toLocaleString()} MW
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#22221F]">
                      {Math.round(d.netImbalanceMWh).toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <Badge variant={isOver ? 'error' : 'surplus'}>
                        {isOver ? 'Deficit' : 'Surplus'}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between mt-3 text-xs text-[#66665D]">
        <span>
          Showing {(currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, processedDays.length)} of {processedDays.length} days
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded border border-[#D9D6CC] hover:bg-[#F2F2F2] disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded border border-[#D9D6CC] hover:bg-[#F2F2F2] disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
