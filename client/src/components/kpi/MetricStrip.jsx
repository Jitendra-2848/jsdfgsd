import React, { useState } from 'react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { Info } from 'lucide-react';

function MetricItem({ label, value, unit = '', formattedDisplay, secondary, tooltip, loading, borderClass }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <div className={`px-4 sm:px-6 py-4 flex flex-col gap-2 ${borderClass}`}>
        <div className="h-2.5 w-14 skeleton-shimmer" />
        <div className="h-7 w-24 skeleton-shimmer" />
        <div className="h-2.5 w-20 skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div
      className={`px-4 sm:px-6 py-4 flex flex-col justify-between relative group cursor-default ${borderClass}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      aria-label={`${label}: ${formattedDisplay ?? value} ${unit}`}
    >
      {/* 11px UPPERCASE label */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </span>
        <Info className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
      </div>

      {/* 26px semibold tabular-nums value */}
      <div className="my-1">
        <span className="text-[24px] sm:text-[26px] font-semibold text-[var(--text-primary)] tabular-nums leading-none tracking-tight">
          {formattedDisplay !== undefined ? formattedDisplay : value}
        </span>
        {unit && (
          <span className="text-[12px] sm:text-[13px] font-normal text-[var(--text-secondary)] ml-1 font-mono">
            {unit}
          </span>
        )}
      </div>

      {/* 12px muted secondary — plain text, no badge */}
      <div className="text-[11px] sm:text-[12px] text-[var(--text-secondary)] tabular-nums min-h-[16px] truncate">
        {secondary || '\u00A0'}
      </div>

      {/* Hover Tooltip: Clean content without label prefixes */}
      {showTooltip && tooltip && (
        <div
          role="tooltip"
          className="absolute left-2 top-[calc(100%+4px)] z-[60] w-72 p-3 hairline-all bg-[var(--bg-surface)] rounded-[var(--radius-ctrl)] text-[11px] text-[var(--text-primary)] select-text pointer-events-none tooltip-fade"
        >
          {typeof tooltip === 'string' ? (
            <div className="text-[var(--text-secondary)] leading-snug">{tooltip}</div>
          ) : (
            <div className="space-y-1.5 text-[var(--text-secondary)] leading-snug">
              {tooltip.definition && (
                <div className="text-[var(--text-primary)]">
                  {tooltip.definition}
                </div>
              )}
              {tooltip.formula && (
                <div>
                  <code className="font-mono text-[10px] text-[var(--text-primary)] bg-[var(--bg-page)] px-1 py-0.5 rounded">
                    {tooltip.formula}
                  </code>
                </div>
              )}
              {tooltip.timeBasis && (
                <div className="text-[10px] text-[var(--text-muted)]">
                  {tooltip.timeBasis}
                </div>
              )}
              {tooltip.rawPrecision && (
                <div className="pt-1 hairline-t text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
                  {tooltip.rawPrecision}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MetricStrip({ summary, data = [], loading = false }) {
  const hasData = Boolean(summary || data.length > 0);
  const showSkeleton = loading && !hasData;

  const rawMae = summary?.mae ?? 0;
  const rawMbe = summary?.mbe ?? 0;
  const rawAvgActual = summary?.avgActualMW ?? 0;
  const totalPoints = data.length || summary?.totalPoints || 0;
  const within500 = data.filter((d) => Math.abs(d.errorMW ?? 0) <= 500).length;
  const rawCoverage = totalPoints > 0 ? (within500 / totalPoints) * 100 : 0;

  const animMae = useAnimatedNumber(Math.round(rawMae), 300, false);
  const animMbe = useAnimatedNumber(Math.round(rawMbe), 300, false);
  const animCoverage = useAnimatedNumber(rawCoverage, 300, true);
  const animAvgActual = useAnimatedNumber(Math.round(rawAvgActual), 300, false);

  const biasDir = rawMbe > 50 ? 'over-forecast' : rawMbe < -50 ? 'under-forecast' : 'neutral bias';

  return (
    <section
      aria-label="Key Performance Metrics"
      className={`bg-[var(--bg-surface)] hairline-b grid grid-cols-2 lg:grid-cols-4 select-none transition-opacity duration-150 ${
        loading && hasData ? 'opacity-90' : 'opacity-100'
      }`}
    >
      <MetricItem
        label="MAE"
        value={animMae.toLocaleString()}
        unit="MW"
        loading={showSkeleton}
        borderClass="hairline-b lg:hairline-b-0 hairline-r"
        secondary="Mean absolute error"
        tooltip={{
          definition: 'Average magnitude of forecast error without sign, across all delivery intervals.',
          timeBasis: 'All delivery intervals in selected filter window',
          rawPrecision: `${rawMae.toFixed(3)} MW · ${totalPoints} periods`,
        }}
      />

      <MetricItem
        label="Bias (MBE)"
        formattedDisplay={`${animMbe > 0 ? '+' : ''}${animMbe.toLocaleString()}`}
        unit="MW"
        loading={showSkeleton}
        borderClass="hairline-b lg:hairline-b-0 lg:hairline-r"
        secondary={biasDir}
        tooltip={{
          definition: 'Systematic directional forecast tendency. Positive = chronic over-forecasting.',
          timeBasis: 'All delivery intervals in selected filter window',
          rawPrecision: `${rawMbe > 0 ? '+' : ''}${rawMbe.toFixed(3)} MW`,
        }}
      />

      <MetricItem
        label="Coverage %"
        formattedDisplay={animCoverage.toFixed(1)}
        unit="%"
        loading={showSkeleton}
        borderClass="hairline-r"
        secondary="Within ±500 MW tolerance band"
        tooltip={{
          definition: 'Proportion of periods where |Forecast − Actual| ≤ 500 MW.',
          timeBasis: 'All delivery intervals in selected filter window',
          rawPrecision: `${rawCoverage.toFixed(3)}% · ${within500}/${totalPoints} periods`,
        }}
      />

      <MetricItem
        label="Avg Actual"
        value={animAvgActual.toLocaleString()}
        unit="MW"
        loading={showSkeleton}
        borderClass=""
        secondary={`${(rawAvgActual / 1000).toFixed(2)} GW mean generation`}
        tooltip={{
          definition: 'Average metered wind generation fed into the GB national grid.',
          timeBasis: 'All delivery intervals in selected filter window',
          rawPrecision: `${rawAvgActual.toFixed(3)} MW`,
        }}
      />
    </section>
  );
}
