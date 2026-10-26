import React from 'react';
import { Badge } from '../ui/Badge';

export function CutoffComparisonChart({ comparisons = [], selectedCutoff = 11, onSelectCutoff }) {
  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="card-panel p-4 h-64 flex items-center justify-center text-xs text-[#66665D]">
        Loading Cutoff Horizon Comparisons...
      </div>
    );
  }

  // Find baseline (07:30 or first item) to calculate improvement delta
  const earlyBase = comparisons.find((c) => c.cutoffHour === 7 || (c.cutoffTime && c.cutoffTime.includes('07:30'))) || comparisons[0];
  const maxMae = Math.max(...comparisons.map((c) => c.mae || 0), 1000);

  return (
    <div className="card-panel p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#22221F] tracking-tight">
              Cutoff Horizon Sensitivity (Forecast Evolution)
            </h3>
            <Badge variant="forecast">Decision Milestones</Badge>
          </div>
          <p className="text-xs text-[#66665D] mt-0.5">
            How forecast accuracy improves as the weather model incorporates later atmospheric soundings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {comparisons.map((item, index) => {
          // Robust extraction with fallbacks to avoid undefined labels
          const displayTime = item.cutoffTime || (item.cutoffHour !== undefined ? `${String(item.cutoffHour).padStart(2, '0')}:00 UTC` : 'Cutoff');
          const displayHour = item.cutoffHour !== undefined ? item.cutoffHour : parseInt(displayTime, 10);
          const displayTitle = item.milestone || item.label || `${displayTime} Milestone`;
          const isGateClosure = displayHour === 11 || (displayTime && displayTime.includes('11:00'));

          const isSelected = selectedCutoff === displayHour;
          const improvement = earlyBase && earlyBase.mae > 0 ? ((earlyBase.mae - item.mae) / earlyBase.mae) * 100 : 0;

          return (
            <div
              key={`cutoff-${displayTitle}-${index}`}
              onClick={() => onSelectCutoff && !isNaN(displayHour) && onSelectCutoff(displayHour)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-[#96732D] bg-[#96732D]/5 shadow-sm ring-1 ring-[#96732D]'
                  : 'border-[#D9D6CC] bg-[#FFFFFF] hover:border-[#96732D]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#22221F]">
                    {displayTime}
                  </span>
                  {isGateClosure && (
                    <span className="text-[10px] font-semibold text-[#527D68] bg-[#527D68]/15 px-1.5 py-0.5 rounded">
                      Gate
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#66665D] mb-2 truncate font-medium" title={displayTitle}>
                  {displayTitle}
                </div>
              </div>

              <div className="my-2 space-y-1 font-mono">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] text-[#66665D] font-sans">MAE:</span>
                  <span className="text-sm font-bold text-[#22221F]">
                    {Math.round(item.mae).toLocaleString()} MW
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] text-[#66665D] font-sans">RMSE:</span>
                  <span className="text-xs text-[#66665D]">
                    {Math.round(item.rmse).toLocaleString()} MW
                  </span>
                </div>
              </div>

              {/* Improvement Badge */}
              <div className="border-t border-[#D9D6CC]/50 pt-2 flex items-center justify-between text-[10px]">
                <span className="text-[#66665D]">vs Baseline:</span>
                <span
                  className={`font-semibold ${
                    improvement > 0 ? 'text-[#527D68]' : 'text-[#66665D]'
                  }`}
                >
                  {improvement > 0 ? `-${improvement.toFixed(1)}% err` : 'Baseline'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
