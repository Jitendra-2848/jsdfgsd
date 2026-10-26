import React, { useMemo } from 'react';
import { Badge } from '../ui/Badge';

export function ErrorDistributionChart({ data = [] }) {
  const buckets = useMemo(() => {
    if (!data || data.length === 0) return [];

    const defs = [
      { key: 'severe_under', label: '< -1500 MW', sub: 'Severe Surplus', color: '#416F9C', count: 0, min: -Infinity, max: -1500 },
      { key: 'mod_under', label: '-1500 to -500', sub: 'Mod Surplus', color: '#416F9C', count: 0, min: -1500, max: -500 },
      { key: 'accurate', label: '± 500 MW', sub: 'Balanced', color: '#527D68', count: 0, min: -500, max: 500 },
      { key: 'mod_over', label: '+500 to +1500', sub: 'Mod Shortfall', color: '#B84F49', count: 0, min: 500, max: 1500 },
      { key: 'severe_over', label: '> +1500 MW', sub: 'Severe Shortfall', color: '#B84F49', count: 0, min: 1500, max: Infinity },
    ];

    for (const d of data) {
      const err = d.errorMW;
      for (const b of defs) {
        if (err >= b.min && err < b.max) {
          b.count++;
          break;
        }
      }
    }

    return defs;
  }, [data]);

  const total = data.length || 1;
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="card-panel p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#22221F] tracking-tight">
              Error Distribution & Risk Tails
            </h3>
            <Badge variant="neutral">Spread Histogram</Badge>
          </div>
          <p className="text-xs text-[#66665D] mt-0.5">
            Breakdown of intervals by thermal shortfall vs renewable surplus
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {buckets.map((b) => {
          const pct = ((b.count / total) * 100).toFixed(1);
          const barWidthPct = Math.round((b.count / maxCount) * 100);

          return (
            <div key={b.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-[#22221F] w-28">
                    {b.label}
                  </span>
                  <span className="text-[#66665D] text-[11px] hidden sm:inline">
                    {b.sub}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#66665D]">{b.count} intervals</span>
                  <span className="font-bold text-[#22221F] w-12 text-right">
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#F2F2F2] h-2.5 rounded-full overflow-hidden border border-[#D9D6CC]/40">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(1, barWidthPct)}%`,
                    backgroundColor: b.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
