import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';

const FONT_MONO = "'JetBrains Mono', 'SF Mono', Consolas, 'Liberation Mono', monospace";

function buildLinePath(data, getX, getY, accessor) {
  return data.reduce((acc, d, i) => {
    const x = getX(i);
    const y = getY(accessor(d));
    return `${acc} ${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }, '');
}

export function TerminalChart({
  data = [],
  loading = false,
  startDate = '2026-01-01',
  endDate = '2026-01-31',
  onDateRangeChange,
  resetKey = 0,
}) {
  const containerRef = useRef(null);
  const mainSvgRef = useRef(null);
  const [dims, setDims] = useState({ width: 800, mainH: 380, deltaH: 88 });
  const [hoverIndex, setHoverIndex] = useState(null);
  const [range, setRange] = useState([0, 1]);
  const [brushStart, setBrushStart] = useState(null);
  const [brushCurrent, setBrushCurrent] = useState(null);

  // Reset internal zoom range whenever the date window is changed or resetKey is triggered
  useEffect(() => {
    setRange([0, 1]);
    setHoverIndex(null);
    setBrushStart(null);
    setBrushCurrent(null);
  }, [startDate, endDate, resetKey]);

  // Measure container for fully responsive SVG
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width <= 0) return;
      // Main chart: use 50vh clamped between 260px and 520px
      const mainH = Math.min(520, Math.max(260, window.innerHeight * 0.50));
      setDims({ width: Math.max(320, width), mainH, deltaH: 88 });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { width, mainH = 380, deltaH = 88 } = dims;

  // Horizontal padding — tighter on small screens, comfortable on desktop
  const PL = width < 480 ? 44 : 60;
  const PR = 18;
  const PT = 16;
  const PB = 26;
  const plotW = Math.max(10, width - PL - PR);
  const mainPlotH = Math.max(10, mainH - PT - PB);
  const deltaPlotH = Math.max(10, deltaH - 22);

  // Slice data to visible range
  const visibleData = useMemo(() => {
    if (!data.length) return [];
    if (data.length <= 4) return data;
    const rawS = Math.floor(range[0] * data.length);
    const rawE = Math.ceil(range[1] * data.length);
    const s = Math.max(0, Math.min(data.length - 4, rawS));
    const e = Math.min(data.length, Math.max(s + 4, rawE));
    return data.slice(s, e);
  }, [data, range]);

  // Scales
  const { maxVal, minVal } = useMemo(() => {
    if (!visibleData.length) return { maxVal: 14000, minVal: 0 };
    let max = 0;
    for (const d of visibleData) {
      if (d.actualMW > max) max = d.actualMW;
      if (d.forecastMW > max) max = d.forecastMW;
    }
    return { maxVal: Math.ceil((max * 1.08) / 2000) * 2000 || 14000, minVal: 0 };
  }, [visibleData]);

  const maxDelta = useMemo(() => {
    if (!visibleData.length) return 3000;
    let m = 500;
    for (const d of visibleData) {
      const a = Math.abs(d.errorMW || 0);
      if (a > m) m = a;
    }
    return Math.ceil((m * 1.15) / 500) * 500;
  }, [visibleData]);

  const getX = useCallback(
    (i) => (visibleData.length <= 1 ? PL : PL + (i / (visibleData.length - 1)) * plotW),
    [visibleData.length, PL, plotW]
  );

  const getMainY = useCallback(
    (v) => PT + mainPlotH - ((Math.max(minVal, Math.min(maxVal, v || 0)) - minVal) / (maxVal - minVal)) * mainPlotH,
    [minVal, maxVal, mainPlotH, PT]
  );

  const getDeltaY = useCallback(
    (err) => {
      const zeroY = 10 + deltaPlotH / 2;
      return zeroY - (Math.max(-maxDelta, Math.min(maxDelta, err || 0)) / maxDelta) * (deltaPlotH / 2);
    },
    [maxDelta, deltaPlotH]
  );

  // SVG paths
  const actualPath = useMemo(
    () => buildLinePath(visibleData, getX, getMainY, (d) => d.actualMW),
    [visibleData, getX, getMainY]
  );
  const forecastPath = useMemo(
    () => buildLinePath(visibleData, getX, getMainY, (d) => d.forecastMW),
    [visibleData, getX, getMainY]
  );

  // Precision coordinate calculation: converts screen pointer pixel to SVG viewBox coordinate
  const getEventSvgX = useCallback(
    (e) => {
      const svg = mainSvgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (!rect || rect.width <= 0) return null;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      // Convert screen clientX to exact SVG viewBox unit:
      return ((clientX - rect.left) / rect.width) * width;
    },
    [width]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!visibleData.length) return;
      const svgX = getEventSvgX(e);
      if (svgX === null) return;

      // When dragging to zoom (brush), update brush span smoothly
      if (brushStart !== null) {
        const clampedRatio = Math.max(0, Math.min(1, (svgX - PL) / plotW));
        setBrushCurrent(clampedRatio);
        const idx = Math.max(0, Math.min(visibleData.length - 1, Math.round(clampedRatio * (visibleData.length - 1))));
        setHoverIndex(idx);
        return;
      }

      // If mouse is outside plot data area (left Y-axis margin or right margin), clear crosshair
      if (svgX < PL - 4 || svgX > width - PR + 4) {
        setHoverIndex(null);
        return;
      }

      const clampedSvgX = Math.max(PL, Math.min(width - PR, svgX));
      const ratio = (clampedSvgX - PL) / plotW;
      const idx = Math.max(0, Math.min(visibleData.length - 1, Math.round(ratio * (visibleData.length - 1))));
      setHoverIndex(idx);
    },
    [visibleData.length, getEventSvgX, PL, PR, width, plotW, brushStart]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if ((e.button !== undefined && e.button !== 0) || !data.length) return;
      const svgX = getEventSvgX(e);
      if (svgX === null) return;
      if (svgX < PL - 4 || svgX > width - PR + 4) return;
      const ratio = Math.max(0, Math.min(1, (svgX - PL) / plotW));
      setBrushStart(ratio);
      setBrushCurrent(ratio);
    },
    [data.length, getEventSvgX, PL, PR, width, plotW]
  );

  const handlePointerUp = useCallback(() => {
    if (brushStart !== null && brushCurrent !== null) {
      const diff = Math.abs(brushCurrent - brushStart);
      if (diff > 0.02) {
        const minRatio = Math.min(brushStart, brushCurrent);
        const maxRatio = Math.max(brushStart, brushCurrent);

        const startIdx = Math.max(0, Math.min(visibleData.length - 1, Math.round(minRatio * (visibleData.length - 1))));
        const endIdx = Math.max(0, Math.min(visibleData.length - 1, Math.round(maxRatio * (visibleData.length - 1))));

        if (startIdx < endIdx && visibleData[startIdx] && visibleData[endIdx]) {
          const newStart = visibleData[startIdx].deliveryDate;
          const newEnd = visibleData[endIdx].deliveryDate;

          // If the dragged window selects a different date range, trigger global filter update:
          if (newStart && newEnd && onDateRangeChange && (newStart !== startDate || newEnd !== endDate)) {
            onDateRangeChange(newStart, newEnd);
            setRange([0, 1]);
          } else {
            // Sub-day fine zoom inside a single date
            const span = range[1] - range[0];
            setRange([
              Math.max(0, range[0] + minRatio * span),
              Math.min(1, range[0] + maxRatio * span),
            ]);
          }
        }
      }
    }
    setBrushStart(null);
    setBrushCurrent(null);
  }, [brushStart, brushCurrent, visibleData, onDateRangeChange, startDate, endDate, range]);

  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
    setBrushStart(null);
    setBrushCurrent(null);
  }, []);

  const resetZoom = () => {
    setRange([0, 1]);
    setHoverIndex(null);
    setBrushStart(null);
    setBrushCurrent(null);
    if (onDateRangeChange && (startDate !== '2026-01-01' || endDate !== '2026-01-31')) {
      onDateRangeChange('2026-01-01', '2026-01-31');
    }
  };

  const isFiltered = (startDate && startDate !== '2026-01-01') || (endDate && endDate !== '2026-01-31');
  const isZoomed = isFiltered || range[0] > 0.001 || range[1] < 0.999;
  const hovered = hoverIndex !== null ? visibleData[hoverIndex] : null;

  // Y-axis ticks (6 ticks)
  const yTicks = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => Math.round(minVal + (i / 5) * (maxVal - minVal)));
  }, [minVal, maxVal]);

  // X-axis labels — adaptive density by width
  const xTicks = useMemo(() => {
    if (!visibleData.length) return [];
    const maxTicks = Math.max(3, Math.floor(plotW / 85));
    const step = Math.max(1, Math.floor(visibleData.length / maxTicks));
    const result = [];
    for (let i = 0; i < visibleData.length; i += step) {
      result.push({ index: i, item: visibleData[i] });
    }
    return result;
  }, [visibleData, plotW]);

  if (loading && !data.length) {
    return (
      <div className="bg-[var(--bg-surface)] hairline-b p-6 flex flex-col gap-3 select-none">
        <div className="flex items-center justify-between gap-4">
          <div className="h-4 w-52 skeleton-shimmer" />
          <div className="h-4 w-36 skeleton-shimmer" />
        </div>
        <div className="w-full skeleton-shimmer" style={{ height: '50vh', minHeight: 260, maxHeight: 520 }} />
        <div className="w-full h-[88px] skeleton-shimmer" />
      </div>
    );
  }

  // Calculate dynamic desktop tooltip X offset: aligns with crosshair, flips when approaching right border
  const crosshairSvgX = hoverIndex !== null ? getX(hoverIndex) : 0;
  const desktopTooltipWidth = 184;
  const shouldFlipDesktop = hoverIndex !== null && crosshairSvgX > PL + plotW * 0.58;
  const rawDesktopLeft = shouldFlipDesktop
    ? crosshairSvgX - desktopTooltipWidth - 10
    : crosshairSvgX + 12;
  const desktopTooltipLeft = Math.max(PL + 4, Math.min(width - desktopTooltipWidth - 8, rawDesktopLeft));

  return (
    <div
      ref={containerRef}
      data-chart-container
      className={`bg-[var(--bg-surface)] hairline-b flex flex-col w-full relative select-none transition-opacity duration-150 ${
        loading ? 'opacity-85' : 'opacity-100'
      }`}
    >
      {/* Chart Header: Title + Inline Legend + Zoom Info */}
      <div className="px-3 sm:px-6 py-2 sm:py-2.5 hairline-b flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px]">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-5 min-w-0">
          <span className="font-semibold text-[11px] sm:text-[13px] text-[var(--text-primary)] uppercase tracking-wide truncate max-w-[210px] sm:max-w-none">
            Day-Ahead Wind: Forecast vs Outturn
          </span>
          {/* Inline Legend */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 sm:w-5 h-[2px] bg-[var(--chart-actual)]" aria-hidden="true" />
              <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-primary)]">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 sm:w-5 border-t-2 border-dashed border-[var(--chart-forecast)]"
                aria-hidden="true"
              />
              <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-primary)]">Forecast</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isZoomed ? (
            <>
              <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums hidden sm:inline">
                {visibleData.length}/{data.length} periods
              </span>
              <button
                type="button"
                id="chart-reset-zoom"
                onClick={resetZoom}
                aria-label="Reset chart zoom"
                className="px-2 py-0.5 text-[10px] font-medium hairline-all rounded-[var(--radius-ctrl)] text-[var(--text-primary)] bg-[var(--bg-page)] hover:border-[var(--color-accent)] cursor-pointer"
              >
                Reset
              </button>
            </>
          ) : (
            <span className="font-mono text-[10px] text-[var(--text-muted)] hidden sm:inline">
              Drag to zoom · {data.length} periods
            </span>
          )}
        </div>
      </div>

      {/* Interactive Chart Canvas: mouse tracking strictly scoped to chart plot area */}
      <div
        className="relative w-full cursor-crosshair select-none"
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onDoubleClick={resetZoom}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* Main SVG Chart */}
        <div className="relative w-full" style={{ height: mainH || 380 }}>
          <svg
            ref={mainSvgRef}
            viewBox={`0 0 ${width} ${mainH}`}
            preserveAspectRatio="none"
            className="w-full h-full block"
            aria-label="Day-ahead forecast vs actual wind generation chart"
            role="img"
          >
            {/* Y Grid + Pristine JetBrains Mono Labels */}
            {yTicks.map((v) => {
              const y = getMainY(v);
              return (
                <g key={v}>
                  <line x1={PL} y1={y} x2={width - PR} y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
                  <text
                    x={PL - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize={width < 480 ? '9' : '10'}
                    fontWeight="500"
                    fill="var(--text-secondary)"
                    fontFamily={FONT_MONO}
                  >
                    {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  </text>
                </g>
              );
            })}

            {/* MW unit label */}
            <text
              x={PL - 8}
              y={PT - 5}
              textAnchor="end"
              fontSize="9"
              fontWeight="600"
              fill="var(--text-muted)"
              fontFamily={FONT_MONO}
            >
              MW
            </text>

            {/* Forecast Path (dashed) */}
            <path
              d={forecastPath}
              fill="none"
              stroke="var(--chart-forecast)"
              strokeWidth="1.6"
              strokeDasharray="5 3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="chart-reveal"
            />

            {/* Actual Path (solid) */}
            <path
              d={actualPath}
              fill="none"
              stroke="var(--chart-actual)"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="chart-reveal"
            />

            {/* Brush selection overlay */}
            {brushStart !== null && brushCurrent !== null && (
              <rect
                x={PL + Math.min(brushStart, brushCurrent) * plotW}
                y={PT}
                width={Math.abs(brushCurrent - brushStart) * plotW}
                height={mainPlotH}
                fill="var(--color-accent)"
                opacity="0.12"
                stroke="var(--color-accent)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}

            {/* Crosshair + interactive dots */}
            {hovered && hoverIndex !== null && (
              <g>
                {/* Vertical synchronized guide line */}
                <line
                  x1={crosshairSvgX}
                  y1={PT}
                  x2={crosshairSvgX}
                  y2={mainH - PB}
                  stroke="var(--chart-crosshair)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />

                {/* Actual value point */}
                <circle
                  cx={crosshairSvgX}
                  cy={getMainY(hovered.actualMW)}
                  r="4"
                  fill="var(--chart-actual)"
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                />

                {/* Forecast value point */}
                <circle
                  cx={crosshairSvgX}
                  cy={getMainY(hovered.forecastMW)}
                  r="4"
                  fill="var(--chart-forecast)"
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                />

                {/* Timestamp badge at the bottom of the crosshair */}
                <g transform={`translate(${crosshairSvgX}, ${mainH - PB + 13})`}>
                  <rect
                    x="-28"
                    y="-9"
                    width="56"
                    height="14"
                    rx="3"
                    fill="var(--bg-surface)"
                    stroke="var(--border-color)"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="1.5"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="600"
                    fill="var(--text-primary)"
                    fontFamily={FONT_MONO}
                  >
                    {hovered.timestamp ? hovered.timestamp.slice(11, 16) : `SP${hovered.settlementPeriod}`}
                  </text>
                </g>
              </g>
            )}

            {/* X-axis date/time ticks */}
            {xTicks.map(({ index, item }) => (
              <text
                key={index}
                x={getX(index)}
                y={mainH - 8}
                textAnchor="middle"
                fontSize={width < 480 ? '8.5' : '9.5'}
                fontWeight="500"
                fill="var(--text-secondary)"
                fontFamily={FONT_MONO}
              >
                {item.timestamp
                  ? item.timestamp.slice(5, 13).replace('T', ' ')
                  : item.deliveryDate?.slice(5) || ''}
              </text>
            ))}
          </svg>

          {/* Mobile / Small Screens (<640px): Ultra-short single-row HUD, strictly contained within left-2 right-2 */}
          {hovered && hoverIndex !== null && (
            <div className="sm:hidden absolute top-1 left-2 right-2 z-30 pointer-events-none hairline-all bg-[var(--bg-surface)]/95 backdrop-blur-sm px-2 py-1 rounded-[var(--radius-ctrl)] text-[9px] tabular-nums font-mono shadow-sm">
              <div className="flex items-center justify-between gap-1 leading-none">
                <span className="text-[var(--text-secondary)] font-medium truncate">
                  {hovered.timestamp ? hovered.timestamp.slice(5, 16).replace('T', ' ') : hovered.deliveryDate}
                  {hovered.settlementPeriod ? ` SP${hovered.settlementPeriod}` : ''}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 text-[9px]">
                  <span>Actual : <strong className="text-[var(--chart-actual)] font-semibold">{Math.round(hovered.actualMW)}</strong></span>
                  <span>Forecast : <strong className="text-[var(--chart-forecast)] font-semibold">{Math.round(hovered.forecastMW)}</strong></span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {hovered.errorMW > 0 ? '+' : ''}{Math.round(hovered.errorMW)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Desktop & Laptop Screens (>=640px): Dedicated Floating Card */}
          {hovered && hoverIndex !== null && (
            <div
              style={{
                left: `${desktopTooltipLeft}px`,
                top: '10px',
              }}
              className="hidden sm:block absolute z-30 pointer-events-none hairline-all bg-[var(--bg-surface)] px-3 py-2 rounded-[var(--radius-ctrl)] text-[11px] tabular-nums font-mono shadow-sm w-[184px] transition-all duration-75 ease-out"
            >
              <div className="text-[var(--text-secondary)] pb-1 hairline-b mb-1.5 text-[10px] flex items-center justify-between gap-2">
                <span>
                  {hovered.timestamp
                    ? hovered.timestamp.replace('T', ' ').slice(0, 16) + ' UTC'
                    : hovered.deliveryDate}
                </span>
                {hovered.settlementPeriod && (
                  <span className="text-[var(--text-muted)] font-medium">SP{hovered.settlementPeriod}</span>
                )}
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <span className="text-[var(--text-secondary)] font-medium">Actual</span>
                <span className="font-semibold text-[var(--chart-actual)] text-right tabular-nums">
                  {Math.round(hovered.actualMW).toLocaleString()} MW
                </span>
                <span className="text-[var(--text-secondary)] font-medium">Forecast</span>
                <span className="font-semibold text-[var(--chart-forecast)] text-right tabular-nums">
                  {Math.round(hovered.forecastMW).toLocaleString()} MW
                </span>
                <span className="text-[var(--text-secondary)] font-medium">Error (Δ)</span>
                <span className="font-semibold text-[var(--text-primary)] text-right tabular-nums">
                  {hovered.errorMW > 0 ? '+' : ''}{Math.round(hovered.errorMW).toLocaleString()} MW
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Delta Sub-chart (~88px): synchronized error inspection */}
        <div className="relative w-full hairline-t bg-[var(--bg-page)]/40" style={{ height: deltaH }}>
          <div className="absolute left-4 sm:left-6 top-1 text-[9px] font-mono uppercase tracking-wider text-[var(--text-secondary)] pointer-events-none z-10">
            Error (F − A) MW
          </div>

          <svg
            viewBox={`0 0 ${width} ${deltaH}`}
            preserveAspectRatio="none"
            className="w-full h-full block"
            aria-label="Forecast error delta sub-chart"
            role="img"
          >
            {/* Zero line */}
            <line
              x1={PL}
              y1={10 + deltaPlotH / 2}
              x2={width - PR}
              y2={10 + deltaPlotH / 2}
              stroke="var(--text-secondary)"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
            {/* Bounds */}
            <line x1={PL} y1={10} x2={width - PR} y2={10} stroke="var(--chart-grid)" strokeWidth="0.7" />
            <line x1={PL} y1={10 + deltaPlotH} x2={width - PR} y2={10 + deltaPlotH} stroke="var(--chart-grid)" strokeWidth="0.7" />

            {/* Y scale labels */}
            <text
              x={PL - 6}
              y={13}
              textAnchor="end"
              fontSize="8.5"
              fontWeight="500"
              fill="var(--text-muted)"
              fontFamily={FONT_MONO}
            >
              +{(maxDelta / 1000).toFixed(0)}k
            </text>
            <text
              x={PL - 6}
              y={11 + deltaPlotH / 2}
              textAnchor="end"
              fontSize="8.5"
              fontWeight="600"
              fill="var(--text-secondary)"
              fontFamily={FONT_MONO}
            >
              0
            </text>
            <text
              x={PL - 6}
              y={9 + deltaPlotH}
              textAnchor="end"
              fontSize="8.5"
              fontWeight="500"
              fill="var(--text-muted)"
              fontFamily={FONT_MONO}
            >
              -{(maxDelta / 1000).toFixed(0)}k
            </text>

            {/* Error bars */}
            {visibleData.map((d, i) => {
              const x = getX(i);
              const zeroY = 10 + deltaPlotH / 2;
              const y = getDeltaY(d.errorMW);
              const topY = Math.min(y, zeroY);
              const bH = Math.max(1, Math.abs(y - zeroY));
              const bW = Math.max(1, plotW / (visibleData.length * 1.5));
              const isHoveredBar = hoverIndex === i;
              return (
                <rect
                  key={i}
                  x={x - bW / 2}
                  y={topY}
                  width={bW}
                  height={bH}
                  fill={d.errorMW >= 0 ? 'var(--color-accent)' : 'var(--text-secondary)'}
                  opacity={isHoveredBar ? 1 : 0.65}
                  stroke={isHoveredBar ? 'var(--text-primary)' : 'none'}
                  strokeWidth={isHoveredBar ? 0.8 : 0}
                />
              );
            })}

            {/* Synced crosshair on delta sub-chart */}
            {hoverIndex !== null && visibleData[hoverIndex] && (
              <line
                x1={crosshairSvgX}
                y1={4}
                x2={crosshairSvgX}
                y2={deltaH - 4}
                stroke="var(--chart-crosshair)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
