import React from 'react';
import { DateRangePicker } from './DateRangePicker';
import { CutoffSelector } from './CutoffSelector';
import { ResolutionToggle } from './ResolutionToggle';

export function ControlBar({
  startDate,
  endDate,
  cutoffHour,
  resolution,
  onDateRangeChange,
  onCutoffChange,
  onResolutionChange,
}) {
  return (
    <section className="card-panel p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex flex-wrap items-end gap-5">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={onDateRangeChange}
          />
          <CutoffSelector
            value={cutoffHour}
            onChange={onCutoffChange}
          />
        </div>

        <div className="flex items-end justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#D9D6CC]/50">
          <ResolutionToggle
            value={resolution}
            onChange={onResolutionChange}
          />
        </div>
      </div>
    </section>
  );
}
