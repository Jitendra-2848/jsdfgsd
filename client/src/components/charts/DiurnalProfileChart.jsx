import React from 'react';
import { Badge } from '../ui/Badge';

export function DiurnalProfileChart({ profile = [], loading = false }) {
  if (loading || !profile || profile.length === 0) {
    return (
      <div className="card-panel p-4 h-64 flex items-center justify-center text-xs text-[#66665D]">
        Loading Diurnal Profile...
      </div>
    );
  }

  // Max MAE for scaling
  const maxMae = Math.max(...profile.map((p) => p.mae || 0), 1000);
  const roundedMaxMae = Math.ceil((maxMae * 1.15) / 200) * 200;

  return (
    <div className="card-panel p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#22221F] tracking-tight">
              Diurnal Error Profile
            </h3>
            <Badge variant="neutral">24h Pattern</Badge>
          </div>
          <p className="text-xs text-[#66665D] mt-0.5">
            Systematic hourly bias during morning and evening ramp periods
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#96732D]" />
            <span className="text-[#66665D]">MAE (MW)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#B84F49]" />
            <span className="text-[#66665D]">Bias (+ Over / - Under)</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="h-48 flex items-end gap-1.5 pt-4 pb-2 border-b border-[#D9D6CC]">
        {profile.map((p) => {
          const heightPct = Math.min(100, (p.mae / roundedMaxMae) * 100);
          const isMorningRamp = p.hour >= 6 && p.hour <= 9;
          const isEveningPeak = p.hour >= 17 && p.hour <= 20;

          return (
            <div
              key={p.hour}
              className="flex-1 flex flex-col items-center h-full justify-end group relative"
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-[#FFFFFF] border border-[#D9D6CC] rounded shadow-md p-2 text-[10px] w-36 whitespace-nowrap">
                  <div className="font-bold text-[#22221F] border-b border-[#D9D6CC]/50 pb-1 mb-1">
                    {String(p.hour).padStart(2, '0')}:00 UTC
                    {isMorningRamp && ' (Morning Ramp)'}
                    {isEveningPeak && ' (Evening Peak)'}
                  </div>
                  <div>MAE: <strong>{Math.round(p.mae)} MW</strong></div>
                  <div>RMSE: <strong>{Math.round(p.rmse)} MW</strong></div>
                  <div>
                    Bias: <strong className={p.mbe > 0 ? 'text-[#B84F49]' : 'text-[#416F9C]'}>
                      {p.mbe > 0 ? '+' : ''}{Math.round(p.mbe)} MW
                    </strong>
                  </div>
                  <div className="text-[#66665D] mt-0.5">
                    Avg Act: {Math.round(p.avgActualMW)} MW
                  </div>
                </div>
                <div className="w-2 h-2 bg-[#FFFFFF] border-r border-b border-[#D9D6CC] transform rotate-45 -mt-1" />
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all cursor-pointer ${
                  isEveningPeak
                    ? 'bg-[#B84F49]/80 group-hover:bg-[#B84F49]'
                    : isMorningRamp
                    ? 'bg-[#96732D]/80 group-hover:bg-[#96732D]'
                    : 'bg-[#96732D]/40 group-hover:bg-[#96732D]/70'
                }`}
                style={{ height: `${Math.max(4, heightPct)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Hour Labels */}
      <div className="flex gap-1.5 pt-1 text-[9.5px] text-[#66665D] font-mono justify-between">
        {profile.map((p) => (
          <span
            key={p.hour}
            className={`flex-1 text-center ${
              p.hour % 3 === 0 ? 'opacity-100 font-semibold' : 'opacity-40'
            }`}
          >
            {p.hour % 3 === 0 ? `${p.hour}h` : ''}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-[#66665D] bg-[#F2F2F2] px-3 py-1.5 rounded border border-[#D9D6CC]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#B84F49]" />
          Highlighted Peak: 17:00–20:00 UTC (UK evening demand peak)
        </span>
        <span>
          Max Hour MAE: <strong>{Math.round(maxMae)} MW</strong>
        </span>
      </div>
    </div>
  );
}
