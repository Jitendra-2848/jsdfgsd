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

      {/* Hover Tooltip: Definition · Formula · Time Basis */}
      {showTooltip && tooltip && (
        <div
          role="tooltip"
          className="absolute left-2 top-[calc(100%+4px)] z-[60] w-72 p-3 hairline-all bg-[var(--bg-surface)] rounded-[var(--radius-ctrl)] text-[11px] text-[var(--text-primary)] select-text pointer-events-none tooltip-fade"
        >
          <div className="font-semibold uppercase tracking-wider pb-1.5 hairline-b mb-2 text-[var(--text-primary)]">
            {tooltip.title}
          </div>
          <div className="space-y-1.5 text-[var(--text-secondary)] leading-snug">
            <div>
              <span className="font-medium text-[var(--text-primary)]">Definition: </span>
              {tooltip.definition}
            </div>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Formula: </span>
              <code className="font-mono text-[10px] text-[var(--text-primary)] bg-[var(--bg-page)] px-1 py-0.5 rounded">
                {tooltip.formula}
              </code>
            </div>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Basis: </span>
              {tooltip.timeBasis}
            </div>
            {tooltip.rawPrecision && (
              <div className="pt-1.5 hairline-t text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
                Exact: {tooltip.rawPrecision}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MetricStrip({ summary, data = [], loading = false }) {
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
      className="bg-[var(--bg-surface)] hairline-b grid grid-cols-2 lg:grid-cols-4 select-none"
    >
      <MetricItem
        label="MAE"
        value={animMae.toLocaleString()}
        unit="MW"
        loading={loading}
        borderClass="hairline-b lg:hairline-b-0 hairline-r"
        secondary="Mean absolute error"
        tooltip={{
          title: 'Mean Absolute Error (MAE)',
          definition: 'Average magnitude of forecast error without sign, across all delivery intervals.',
          formula: 'MAE = (1/N) · Σ |F_i − A_i|',
          timeBasis: 'All delivery intervals in selected filter window',
          rawPrecision: `${rawMae.toFixed(3)} MW · ${totalPoints} periods`,
        }}
      />

      <MetricItem
        label="Bias (MBE)"
        formattedDisplay={`${animMbe > 0 ? '+' : ''}${animMbe.toLocaleString()}`}
        unit="MW"
        loading={loading}
        borderClass="hairline-b lg:hairline-b-0 lg:hairline-r"
        secondary={biasDir}
        tooltip={{
          title: 'Mean Bias Error (MBE)',
          definition: 'Systematic directional forecast tendency. Positive = chronic over-forecasting.',
          formula: 'MBE = (1/N) · Σ (F_i − A_i)',
          timeBasis: 'All delivery intervals in selected filter window',
          rawPrecision: `${rawMbe > 0 ? '+' : ''}${rawMbe.toFixed(3)} MW`,
        }}
      />

      <MetricItem
        label="Coverage %"
        formattedDisplay={animCoverage.toFixed(1)}
        unit="%"
        loading={loading}
        borderClass="hairline-r"
        secondary="Within ±500 MW tolerance band"
        tooltip={{
          title: 'Band Coverage Ratio',
          definition: 'Proportion of periods where |Forecast − Actual| ≤ 500 MW.',
          formula: 'Coverage = (Count(|F_i − A_i| ≤ 500) / N) × 100',
          timeBasis: 'All delivery intervals in selected filter window',
          rawPrecision: `${rawCoverage.toFixed(3)}% · ${within500}/${totalPoints} periods`,
        }}
      />

      <MetricItem
        label="Avg Actual"
        value={animAvgActual.toLocaleString()}
        unit="MW"
        loading={loading}
        borderClass=""
        secondary={`${(rawAvgActual / 1000).toFixed(2)} GW mean generation`}
        tooltip={{
          title: 'Average Actual Generation Outturn',
          definition: 'Average metered wind generation fed into the GB national grid.',
          formula: 'Avg = (1/N) · Σ Actual_i',
          timeBasis: 'All delivery intervals in selected filter window',
          rawPrecision: `${rawAvgActual.toFixed(3)} MW`,
        }}
      />
    </section>
  );
}
