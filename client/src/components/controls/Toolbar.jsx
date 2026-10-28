import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

const PERIOD_PRESETS = [
  { label: 'ALL JAN', start: '2026-01-01', end: '2026-01-31' },
  { label: 'W1', start: '2026-01-01', end: '2026-01-07' },
  { label: 'W2', start: '2026-01-08', end: '2026-01-14' },
  { label: 'W3', start: '2026-01-15', end: '2026-01-21' },
  { label: 'W4', start: '2026-01-22', end: '2026-01-28' },
  { label: 'PEAK WIND', start: '2026-01-24', end: '2026-01-26' },
];

const CUTOFF_OPTIONS = [
  { value: 7, label: '07:30 UTC' },
  { value: 9, label: '09:30 UTC' },
  { value: 11, label: '11:00 UTC' },
  { value: 12, label: '12:00 UTC' },
  { value: 16, label: '16:00 UTC' },
  { value: 18, label: '18:00 UTC' },
];

export function Toolbar({
  startDate,
  endDate,
  cutoffHour,
  resolution,
  onDateRangeChange,
  onCutoffChange,
  onResolutionChange,
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef(null);

  // Close calendar on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setCalendarOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setCalendarOpen(false);
    }
    if (calendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [calendarOpen]);

  // Active preset check
  const activePreset = PERIOD_PRESETS.find(
    (p) => p.start === startDate && p.end === endDate
  )?.label;

  // Arrow key navigation for cutoff select
  const handleCutoffKeyDown = (e) => {
    const idx = CUTOFF_OPTIONS.findIndex((c) => c.value === Number(cutoffHour));
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx > 0) onCutoffChange(CUTOFF_OPTIONS[idx - 1].value);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (idx < CUTOFF_OPTIONS.length - 1) onCutoffChange(CUTOFF_OPTIONS[idx + 1].value);
    }
  };

  const activeCutoffLabel = CUTOFF_OPTIONS.find((c) => c.value === Number(cutoffHour))?.label || `${cutoffHour}:00 UTC`;

  return (
    /* toolbar-scroll allows horizontal scrolling on small screens without native scrollbar showing */
    <div
      id="toolbar"
      className="toolbar-scroll hairline-b bg-[var(--bg-surface)] flex-shrink-0"
      role="toolbar"
      aria-label="Dashboard Filters"
    >
      <div className="h-[38px] px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 w-max min-w-full">
        {/* ---- LEFT: Period segmented control + date range ---- */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Period Segmented Control */}
          <div
            className="inline-flex hairline-all rounded-[var(--radius-ctrl)] p-[1px] bg-[var(--bg-page)]"
            role="group"
            aria-label="Period presets"
          >
            {PERIOD_PRESETS.map((p) => {
              const isActive = activePreset === p.label;
              return (
                <button
                  key={p.label}
                  type="button"
                  id={`period-${p.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onDateRangeChange(p.start, p.end)}
                  aria-pressed={isActive}
                  className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold tracking-wide rounded-[4px] transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] hairline-all'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Date Range Trigger */}
          <div className="relative" ref={calendarRef}>
            <button
              type="button"
              id="date-range-picker"
              onClick={() => setCalendarOpen(!calendarOpen)}
              aria-expanded={calendarOpen}
              aria-haspopup="dialog"
              aria-label="Select custom date range"
              className="inline-flex items-center gap-1 sm:gap-1.5 h-7 px-2 sm:px-2.5 hairline-all rounded-[var(--radius-ctrl)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono text-[10px] sm:text-[11px] tabular-nums hover:border-[var(--color-accent)] cursor-pointer whitespace-nowrap"
            >
              <Calendar className="w-3 h-3 text-[var(--text-secondary)] flex-shrink-0" />
              <span className="hidden sm:inline">{startDate} → {endDate}</span>
              <span className="sm:hidden">{startDate.slice(5)} → {endDate.slice(5)}</span>
              <ChevronDown className="w-3 h-3 text-[var(--text-secondary)] flex-shrink-0" />
            </button>

            {/* Date Range Popover — fixed on mobile to prevent clipping by scrollable toolbar */}
            {calendarOpen && (
              <div
                role="dialog"
                aria-label="Custom date range selector"
                aria-modal="true"
                className="fixed left-4 right-4 top-[92px] z-[100] max-w-[320px] mx-auto sm:max-w-none sm:mx-0 sm:absolute sm:left-0 sm:right-auto sm:top-[34px] sm:z-50 p-3 hairline-all bg-[var(--bg-surface)] rounded-[var(--radius-ctrl)] flex flex-col gap-2.5 text-[12px] w-[280px] sm:w-[300px] shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                    Custom Window
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(false)}
                    aria-label="Close date picker"
                    className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-end gap-2 font-mono">
                  <div className="flex-1">
                    <label className="block text-[10px] text-[var(--text-muted)] mb-0.5" htmlFor="date-start">
                      START
                    </label>
                    <input
                      id="date-start"
                      type="date"
                      min="2026-01-01"
                      max={endDate}
                      value={startDate}
                      onChange={(e) => { if (e.target.value) onDateRangeChange(e.target.value, endDate); }}
                      className="w-full hairline-all bg-[var(--bg-page)] px-2 py-1 rounded-[4px] text-[11px] text-[var(--text-primary)] tabular-nums cursor-pointer"
                    />
                  </div>
                  <span className="text-[var(--text-muted)] pb-1.5">→</span>
                  <div className="flex-1">
                    <label className="block text-[10px] text-[var(--text-muted)] mb-0.5" htmlFor="date-end">
                      END
                    </label>
                    <input
                      id="date-end"
                      type="date"
                      min={startDate}
                      max="2026-01-31"
                      value={endDate}
                      onChange={(e) => { if (e.target.value) onDateRangeChange(startDate, e.target.value); }}
                      className="w-full hairline-all bg-[var(--bg-page)] px-2 py-1 rounded-[4px] text-[11px] text-[var(--text-primary)] tabular-nums cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDateRangeChange(startDate, endDate);
                      setCalendarOpen(false);
                    }}
                    className="px-3 py-1 text-[11px] font-semibold bg-[var(--color-accent)] text-white rounded-[4px] cursor-pointer hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- RIGHT: Cutoff + Resolution ---- */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cutoff Dropdown */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <label
              htmlFor="cutoff-select"
              className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap"
            >
              Cutoff
            </label>
            <div className="relative">
              <select
                id="cutoff-select"
                value={cutoffHour}
                onChange={(e) => onCutoffChange(Number(e.target.value))}
                onKeyDown={handleCutoffKeyDown}
                title="Use arrow keys to step through cutoff milestones"
                aria-label={`Current cutoff: ${activeCutoffLabel}`}
                className="h-7 pl-2 pr-6 hairline-all rounded-[var(--radius-ctrl)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-[10px] sm:text-[11px] font-mono tabular-nums appearance-none cursor-pointer hover:border-[var(--color-accent)] touch-manipulation relative z-10"
              >
                {CUTOFF_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[var(--text-secondary)] absolute right-1.5 top-2 pointer-events-none z-20" />
            </div>
          </div>

          {/* Resolution Toggle: 60m / 30m */}
          <div
            className="inline-flex hairline-all rounded-[var(--radius-ctrl)] p-[1px] bg-[var(--bg-page)]"
            role="radiogroup"
            aria-label="Data resolution"
          >
            <button
              type="button"
              id="resolution-60m"
              role="radio"
              aria-checked={resolution === 'hourly'}
              onClick={() => onResolutionChange('hourly')}
              className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-mono tracking-wide rounded-[4px] transition-colors cursor-pointer ${
                resolution === 'hourly'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] hairline-all font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              60m
            </button>
            <button
              type="button"
              id="resolution-30m"
              role="radio"
              aria-checked={resolution === 'half_hourly'}
              onClick={() => onResolutionChange('half_hourly')}
              className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-mono tracking-wide rounded-[4px] transition-colors cursor-pointer ${
                resolution === 'half_hourly'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] hairline-all font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              30m
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
