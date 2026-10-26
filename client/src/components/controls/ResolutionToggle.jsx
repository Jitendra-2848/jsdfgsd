import React from 'react';

export function ResolutionToggle({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66665D]">
        Granularity
      </label>
      <div className="inline-flex rounded-md border border-[#D9D6CC] bg-[#FFFFFF] p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => onChange('hourly')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
            value === 'hourly'
              ? 'bg-[#527D68] text-[#FFFFFF] shadow-sm font-semibold'
              : 'text-[#66665D] hover:text-[#22221F] hover:bg-[#F2F2F2]'
          }`}
          title="Aggregated into 24 clock hours per day (MW average)"
        >
          Hourly (60m)
        </button>
        <button
          type="button"
          onClick={() => onChange('settlement')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
            value === 'settlement'
              ? 'bg-[#527D68] text-[#FFFFFF] shadow-sm font-semibold'
              : 'text-[#66665D] hover:text-[#22221F] hover:bg-[#F2F2F2]'
          }`}
          title="UK Elexon Settlement Periods (48 half-hour intervals per day)"
        >
          Settlement (30m)
        </button>
      </div>
    </div>
  );
}
