import React from 'react';
import { Calendar } from 'lucide-react';

const PRESETS = [
  { label: 'Jan 2026 (Full)', start: '2026-01-01', end: '2026-01-31' },
  { label: 'Wk 1', start: '2026-01-01', end: '2026-01-07' },
  { label: 'Wk 2', start: '2026-01-08', end: '2026-01-14' },
  { label: 'Wk 3', start: '2026-01-15', end: '2026-01-21' },
  { label: 'Wk 4', start: '2026-01-22', end: '2026-01-28' },
  { label: 'High Wind Days', start: '2026-01-22', end: '2026-01-26' },
];

export function DateRangePicker({ startDate, endDate, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66665D] flex items-center gap-1">
          <Calendar className="w-3 h-3 text-[#527D68]" />
          Delivery Horizon
        </label>
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => {
            const isActive = startDate === p.start && endDate === p.end;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.start, p.end)}
                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#527D68]/20 text-[#527D68] font-semibold'
                    : 'text-[#66665D] hover:bg-[#F2F2F2] hover:text-[#22221F]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#D9D6CC] rounded-md px-2.5 py-1.5 shadow-sm">
        <input
          type="date"
          value={startDate}
          min="2026-01-01"
          max="2026-01-31"
          onChange={(e) => onChange(e.target.value, endDate)}
          className="text-xs text-[#22221F] bg-transparent border-none outline-none font-medium cursor-pointer"
        />
        <span className="text-[#66665D] text-xs font-semibold">&rarr;</span>
        <input
          type="date"
          value={endDate}
          min={startDate || '2026-01-01'}
          max="2026-01-31"
          onChange={(e) => onChange(startDate, e.target.value)}
          className="text-xs text-[#22221F] bg-transparent border-none outline-none font-medium cursor-pointer"
        />
      </div>
    </div>
  );
}
