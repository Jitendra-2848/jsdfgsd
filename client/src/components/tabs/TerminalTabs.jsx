import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// Risk distribution buckets — literal MW labels, no marketing adjectives
const RISK_BUCKETS = [
  { key: 'severeOver',  label: '>+1500 MW',         test: (e) => e > 1500,               desc: 'Extreme over-forecast' },
  { key: 'modOver',    label: '+500 to +1500 MW',   test: (e) => e > 500 && e <= 1500,  desc: 'Moderate over-forecast' },
  { key: 'balanced',   label: '±500 MW',             test: (e) => e >= -500 && e <= 500, desc: 'Within tolerance band' },
  { key: 'modUnder',   label: '-500 to -1500 MW',   test: (e) => e < -500 && e >= -1500, desc: 'Moderate under-forecast' },
  { key: 'severeUnder',label: '<-1500 MW',           test: (e) => e < -1500,             desc: 'Extreme under-forecast' },
];

export function TerminalTabs({
  data = [],
  cutoffComparisons = [],
  selectedCutoff = 11,
  onSelectCutoff,
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState('risk');
  const [sortField, setSortField] = useState('mae');
  const [sortOrder, setSortOrder] = useState('asc');

  // --- Risk Distribution ---
  const riskDistribution = useMemo(() => {
    const n = data.length;
    if (!n) return RISK_BUCKETS.map((b) => ({ ...b, count: 0, pct: 0 }));

    const counts = {};
    RISK_BUCKETS.forEach((b) => { counts[b.key] = 0; });
    for (const d of data) {
      for (const b of RISK_BUCKETS) {
        if (b.test(d.errorMW ?? 0)) { counts[b.key]++; break; }
      }
    }

    return RISK_BUCKETS.map((b) => ({
      ...b,
      count: counts[b.key],
      pct: (counts[b.key] / n) * 100,
    }));
  }, [data]);

  const maxPct = Math.max(...riskDistribution.map((b) => b.pct), 1);

  // --- Cutoff Sensitivity ---
  const sortedComparisons = useMemo(() => {
    if (!cutoffComparisons.length) return [];
    const bestMae = Math.min(...cutoffComparisons.map((c) => c.mae));
    const enriched = cutoffComparisons.map((c) => ({
      ...c,
      deltaVsBest: c.mae - bestMae,
      isBest: Math.abs(c.mae - bestMae) < 0.01,
    }));
    return [...enriched].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [cutoffComparisons, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <section
      aria-label="Risk Distribution and Cutoff Sensitivity Analysis"
      className={`bg-[var(--bg-surface)] hairline-b flex flex-col w-full select-none transition-opacity duration-150 ${
        loading && data.length > 0 ? 'opacity-90' : 'opacity-100'
      }`}
    >
      {/* Tab Header */}
      <div
        role="tablist"
        aria-label="Analysis tabs"
        className="h-9 hairline-b px-4 sm:px-6 flex items-center justify-between text-[12px] font-semibold flex-shrink-0"
      >
        <div className="flex items-center gap-4 sm:gap-6 h-full">
          <button
            type="button"
            role="tab"
            id="tab-risk"
            aria-selected={activeTab === 'risk'}
            aria-controls="tabpanel-risk"
            onClick={() => setActiveTab('risk')}
            className={`h-full flex items-center border-b-2 cursor-pointer transition-colors ${
              activeTab === 'risk'
                ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Risk Distribution
          </button>
          <button
            type="button"
            role="tab"
            id="tab-sensitivity"
            aria-selected={activeTab === 'sensitivity'}
            aria-controls="tabpanel-sensitivity"
            onClick={() => setActiveTab('sensitivity')}
            className={`h-full flex items-center border-b-2 cursor-pointer transition-colors ${
              activeTab === 'sensitivity'
                ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Cutoff Sensitivity
          </button>
        </div>

        <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-mono hidden sm:inline tabular-nums">
          {activeTab === 'risk'
            ? `${data.length.toLocaleString()} obs · Jan 2026`
            : 'D-1 gate closure comparison'}
        </div>
      </div>

      {/* Tab 1: Risk Distribution */}
      {activeTab === 'risk' && (
        <div
          id="tabpanel-risk"
          role="tabpanel"
          aria-labelledby="tab-risk"
          className="p-4 sm:p-6"
        >
          {loading && !data.length ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-3 w-32 skeleton-shimmer" />
                  <div className="flex-1 h-5 skeleton-shimmer" />
                  <div className="h-3 w-16 skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5 max-w-3xl">
              {riskDistribution.map((bucket) => {
                const barW = Math.max(0.5, (bucket.pct / (maxPct * 1.05)) * 100);
                return (
                  <div
                    key={bucket.label}
                    className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-[12px]"
                    title={`${bucket.desc}: ${bucket.count} periods (${bucket.pct.toFixed(1)}%)`}
                  >
                    {/* Literal MW range label */}
                    <div className="font-mono font-semibold text-[var(--text-primary)] w-32 sm:w-40 text-right pr-1 flex-shrink-0 text-[10px] sm:text-[11px]">
                      {bucket.label}
                    </div>

                    {/* Horizontal bar */}
                    <div
                      className="flex-1 h-5 bg-[var(--bg-page)] rounded-[2px] overflow-hidden relative"
                      role="progressbar"
                      aria-valuenow={bucket.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${bucket.label}: ${bucket.pct.toFixed(1)}%`}
                    >
                      <div
                        className="h-full bg-[var(--chart-forecast)] transition-all duration-300"
                        style={{ width: `${barW}%` }}
                      />
                    </div>

                    {/* Percentage + count */}
                    <div className="font-mono tabular-nums text-[var(--text-secondary)] flex items-center gap-1 flex-shrink-0 text-[11px]">
                      <span className="font-semibold text-[var(--text-primary)] w-10 text-right">
                        {bucket.pct.toFixed(1)}%
                      </span>
                      <span className="text-[var(--text-muted)] text-[10px] hidden sm:inline">
                        ({bucket.count}h)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Cutoff Sensitivity Table */}
      {activeTab === 'sensitivity' && (
        <div
          id="tabpanel-sensitivity"
          role="tabpanel"
          aria-labelledby="tab-sensitivity"
          className="overflow-x-auto"
        >
          {loading && sortedComparisons.length === 0 ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-6">
                  <div className="h-3 w-20 skeleton-shimmer" />
                  <div className="h-3 w-16 skeleton-shimmer" />
                  <div className="h-3 w-16 skeleton-shimmer" />
                  <div className="h-3 w-16 skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : sortedComparisons.length === 0 ? (
            <div className="p-6 text-[12px] font-mono text-[var(--text-secondary)]">
              No cutoff comparison data available.
            </div>
          ) : (
            <table
              className="w-full text-left border-collapse text-[11px] sm:text-[12px]"
              aria-label="Cutoff sensitivity comparison table"
            >
              <thead>
                <tr className="hairline-b bg-[var(--bg-page)]/50 text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-2 sm:py-2.5 px-4 sm:px-6 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('cutoffTime')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]"
                      aria-sort={sortField === 'cutoffTime' ? sortOrder : 'none'}
                    >
                      Cutoff Time <SortIcon field="cutoffTime" />
                    </button>
                  </th>
                  <th className="py-2 sm:py-2.5 px-4 sm:px-6 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('mae')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]"
                      aria-sort={sortField === 'mae' ? sortOrder : 'none'}
                    >
                      MAE <SortIcon field="mae" />
                    </button>
                  </th>
                  <th className="py-2 sm:py-2.5 px-4 sm:px-6 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('rmse')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]"
                      aria-sort={sortField === 'rmse' ? sortOrder : 'none'}
                    >
                      RMSE <SortIcon field="rmse" />
                    </button>
                  </th>
                  <th className="py-2 sm:py-2.5 px-4 sm:px-6 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('deltaVsBest')}
                      className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]"
                      aria-sort={sortField === 'deltaVsBest' ? sortOrder : 'none'}
                    >
                      Δ vs best <SortIcon field="deltaVsBest" />
                    </button>
                  </th>
                  <th className="py-2 sm:py-2.5 px-4 sm:px-6 font-semibold text-right hidden sm:table-cell">
                    Gate Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedComparisons.map((row) => {
                  const isActive = Number(row.cutoffHour) === Number(selectedCutoff);
                  return (
                    <tr
                      key={row.cutoffHour}
                      onClick={() => onSelectCutoff && onSelectCutoff(row.cutoffHour)}
                      className={`hairline-b transition-colors cursor-pointer hover:bg-[var(--bg-page)]/60 ${
                        row.isBest
                          ? 'border-l-2 border-l-[var(--color-accent)] bg-[var(--bg-page)]/20'
                          : 'border-l-2 border-l-transparent'
                      }`}
                      aria-label={`${row.cutoffTime}: MAE ${Math.round(row.mae)} MW${row.isBest ? ', best performing' : ''}${isActive ? ', currently active' : ''}`}
                    >
                      <td className="py-2 sm:py-2.5 px-4 sm:px-6 font-mono text-[var(--text-primary)] tabular-nums">
                        {row.cutoffTime}
                        {isActive && (
                          <span className="ml-1.5 text-[10px] text-[var(--color-accent)] font-semibold uppercase">
                            active
                          </span>
                        )}
                      </td>
                      <td className="py-2 sm:py-2.5 px-4 sm:px-6 font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                        {Math.round(row.mae).toLocaleString()} MW
                      </td>
                      <td className="py-2 sm:py-2.5 px-4 sm:px-6 font-mono tabular-nums text-[var(--text-secondary)]">
                        {Math.round(row.rmse).toLocaleString()} MW
                      </td>
                      <td className="py-2 sm:py-2.5 px-4 sm:px-6 font-mono tabular-nums text-[var(--text-secondary)]">
                        {row.isBest ? (
                          <span className="text-[var(--color-accent)] font-semibold">0 MW (best)</span>
                        ) : (
                          `+${Math.round(row.deltaVsBest).toLocaleString()} MW`
                        )}
                      </td>
                      <td className="py-2 sm:py-2.5 px-4 sm:px-6 text-right text-[11px] text-[var(--text-secondary)] hidden sm:table-cell">
                        {row.milestone}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
