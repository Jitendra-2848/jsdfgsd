import React from 'react';

const CUTOFF_OPTIONS = [
  { hour: 9, label: '09:00 UTC', note: 'Pre-bidding prep' },
  { hour: 11, label: '11:00 UTC', note: 'Official UK Gate Closure', isDefault: true },
  { hour: 12, label: '12:00 UTC', note: 'Auction matching' },
  { hour: 14, label: '14:00 UTC', note: 'Post-clearing' },
  { hour: 17, label: '17:00 UTC', note: 'Intraday handoff' },
];

export function CutoffSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66665D]">
        Forecast Decision Cutoff (D-1)
      </label>
      <div className="inline-flex rounded-md border border-[#D9D6CC] bg-[#FFFFFF] p-0.5 shadow-sm">
        {CUTOFF_OPTIONS.map((opt) => {
          const isSelected = value === opt.hour;
          return (
            <button
              key={opt.hour}
              type="button"
              onClick={() => onChange(opt.hour)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#22221F] text-[#FFFFFF] shadow-sm font-semibold'
                  : 'text-[#66665D] hover:text-[#22221F] hover:bg-[#F2F2F2]'
              }`}
              title={`${opt.label} (${opt.note})`}
            >
              {opt.label}
              {opt.isDefault && (
                <span className={`ml-1 text-[10px] ${isSelected ? 'text-[#D9D6CC]' : 'text-[#96732D]'}`}>
                  ★
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
