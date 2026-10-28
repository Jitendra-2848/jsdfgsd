import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Toolbar } from './components/controls/Toolbar';
import { MetricStrip } from './components/kpi/MetricStrip';
import { TerminalChart } from './components/charts/TerminalChart';
import { TerminalTabs } from './components/tabs/TerminalTabs';
import { Footer } from './components/layout/Footer';
import { useDashboardData } from './hooks/useDashboardData';
import { exportMatchedDataToCsv } from './utils/csvExport';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-31');
  const [cutoffHour, setCutoffHour] = useState(11);
  const [resolution, setResolution] = useState('hourly');
  const [resetKey, setResetKey] = useState(0);
  const {
    dayAhead,
    metrics,
    cutoffComparison,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useDashboardData({
    startDate,
    endDate,
    cutoffHour,
    resolution,
  });

  const handleDateRangeChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setResetKey((prev) => prev + 1);
  };

  const handleExport = () => {
    if (dayAhead?.data) {
      exportMatchedDataToCsv(
        dayAhead.data,
        `uk_wind_${startDate}_to_${endDate}_cutoff_${cutoffHour}h_${resolution}.csv`
      );
    }
  };

  const dataRecords = dayAhead?.data || [];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col font-sans select-text">
      {/* 1. Header: product name (left), last-sync pulse dot + timestamp + export icon (right). One line, no subtitle */}
      <Header
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        onExport={handleExport}
        loading={loading}
      />

      {/* Error Notification Bar (if any API issue occurs) */}
      {error && (
        <div className="hairline-b bg-[var(--color-danger)]/10 px-6 py-2.5 text-[12px] text-[var(--color-danger)] flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="underline hover:opacity-80 cursor-pointer font-semibold"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* 2. Toolbar: single row — period segmented control, date range (click-to-open calendar), cutoff dropdown, resolution toggle (60m/30m). 36-40px height, bottom hairline border only */}
      <Toolbar
        startDate={startDate}
        endDate={endDate}
        cutoffHour={cutoffHour}
        resolution={resolution}
        onDateRangeChange={handleDateRangeChange}
        onCutoffChange={setCutoffHour}
        onResolutionChange={setResolution}
      />

      {/* Main Single-Column Terminal Body */}
      <main className="w-full flex-1 flex flex-col">
        {/* 3. Metric strip: inline flex row, divided by 1px vertical hairlines, NOT cards. Max 4 metrics: MAE, Bias, Coverage %, Avg Actual */}
        <MetricStrip
          summary={metrics?.summary || dayAhead?.summary}
          data={dataRecords}
          loading={loading}
        />

        {/* Empty state check */}
        {!loading && dataRecords.length === 0 && !error && (
          <div className="p-12 text-center text-[var(--text-secondary)] font-mono text-[12px] hairline-b">
            No settlement periods matched for {startDate} &rarr; {endDate} at {cutoffHour}:00 UTC.
          </div>
        )}

        {/* 4 & 5. Main chart (~55% vh, solid actual, dashed forecast) + Delta sub-chart (88px error bars) */}
        <TerminalChart
          data={dataRecords}
          loading={loading}
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          resetKey={resetKey}
        />

        {/* 6. Tabs below chart: "Risk Distribution" | "Cutoff Sensitivity" */}
        <TerminalTabs
          data={dataRecords}
          cutoffComparisons={cutoffComparison?.comparisons || []}
          selectedCutoff={cutoffHour}
          onSelectCutoff={setCutoffHour}
          loading={loading}
        />
      </main>

      {/* 7. Footer: "Last updated {time} UTC · source: {name}" — 11px, muted */}
      <Footer
        lastUpdated={lastUpdated}
        source="Elexon BMRS (FUELHH / WINDFOR)"
      />
    </div>
  );
}