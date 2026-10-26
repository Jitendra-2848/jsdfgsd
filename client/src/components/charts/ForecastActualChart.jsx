import React, { useState, useMemo, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function ForecastActualChart({ data = [], loading = false }) {
  const [showActual, setShowActual] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showDeviation, setShowDeviation] = useState(true);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [visibleRange, setVisibleRange] = useState([0, 100]); // percentage 0 to 100

  const containerRef = useRef(null);

  // Filter and window data based on range
  const visibleData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const start = Math.floor((visibleRange[0] / 100) * data.length);
    const end = Math.max(start + 10, Math.ceil((visibleRange[1] / 100) * data.length));
    return data.slice(start, end);
  }, [data, visibleRange]);

  // Compute min, max scales
  const { maxVal, minVal } = useMemo(() => {
    if (!visibleData.length) return { maxVal: 20000, minVal: 0 };
    let max = 0;
    for (const d of visibleData) {
      if (d.actualMW > max) max = d.actualMW;
      if (d.forecastMW > max) max = d.forecastMW;
    }
    // Round up to nearest 2,000 MW for nice axis marks
    const roundedMax = Math.ceil((max * 1.1) / 2000) * 2000 || 15000;
    return { maxVal: roundedMax, minVal: 0 };
  }, [visibleData]);

  // Dimensions
  const svgWidth = 1000;
  const svgHeight = 360;
  const padding = { top: 20, right: 30, bottom: 40, left: 65 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Scale functions
  const getX = (index) => {
    if (visibleData.length <= 1) return padding.left;
    return padding.left + (index / (visibleData.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val || 0));
    return padding.top + chartHeight - ((clamped - minVal) / (maxVal - minVal)) * chartHeight;
  };

  // Build SVG Paths
  const actualPath = useMemo(() => {
    if (!visibleData.length) return '';
    return visibleData.reduce((path, d, i) => {
      const x = getX(i);
      const y = getY(d.actualMW);
      return `${path} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [visibleData, maxVal]);

  const forecastPath = useMemo(() => {
    if (!visibleData.length) return '';
    return visibleData.reduce((path, d, i) => {
      const x = getX(i);
      const y = getY(d.forecastMW);
      return `${path} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [visibleData, maxVal]);

  // Handle Mouse Move for Hover Crosshair
  const handleMouseMove = (e) => {
    if (!visibleData.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const chartLeftPx = (padding.left / svgWidth) * rect.width;
    const chartWidthPx = (chartWidth / svgWidth) * rect.width;

    const relativeX = (clientX - chartLeftPx) / chartWidthPx;
    const clampedRatio = Math.max(0, Math.min(1, relativeX));
    const index = Math.round(clampedRatio * (visibleData.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredItem = hoverIndex !== null ? visibleData[hoverIndex] : null;

  // Y-axis grid ticks (e.g. 5 ticks)
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const val = minVal + (i / count) * (maxVal - minVal);
      ticks.push(Math.round(val));
    }
    return ticks;
  }, [minVal, maxVal]);

  // X-axis date labels
  const xLabels = useMemo(() => {
    if (!visibleData.length) return [];
    const labels = [];
    const step = Math.max(1, Math.floor(visibleData.length / 8));
    for (let i = 0; i < visibleData.length; i += step) {
      const d = visibleData[i];
      const dateStr = d.deliveryDate ? d.deliveryDate.slice(5) : '';
      const hourStr = d.hour !== undefined ? `${String(d.hour).padStart(2, '0')}:00` : '';
      labels.push({ index: i, text: `${dateStr} ${hourStr}` });
    }
    return labels;
  }, [visibleData]);

  return (
    <div className="card-panel p-5 mb-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#22221F] tracking-tight">
              Day-Ahead Forecast vs. Actual Generation
            </h2>
            <Badge variant="neutral">{visibleData.length} Intervals</Badge>
          </div>
          <p className="text-xs text-[#66665D] mt-0.5">
            Elexon WINDFOR (D-1 cutoff) overlaid on FUELHH actuals &middot; Values in Megawatts (MW)
          </p>
        </div>

        {/* Legend / Toggles */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setShowActual(!showActual)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              showActual
                ? 'bg-[#527D68]/15 border-[#527D68] text-[#527D68] font-semibold'
                : 'bg-transparent border-[#D9D6CC] text-[#66665D] opacity-60'
            }`}
          >
            <span className="w-3 h-0.5 bg-[#527D68] inline-block" />
            Actual Output
          </button>

          <button
            type="button"
            onClick={() => setShowForecast(!showForecast)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              showForecast
                ? 'bg-[#96732D]/15 border-[#96732D] text-[#96732D] font-semibold'
                : 'bg-transparent border-[#D9D6CC] text-[#66665D] opacity-60'
            }`}
          >
            <span className="w-3 h-0.5 border-b-2 border-dashed border-[#96732D] inline-block" />
            D-1 Forecast
          </button>

          <button
            type="button"
            onClick={() => setShowDeviation(!showDeviation)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              showDeviation
                ? 'bg-[#22221F]/10 border-[#22221F] text-[#22221F] font-semibold'
                : 'bg-transparent border-[#D9D6CC] text-[#66665D] opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-[#416F9C]/80 inline-block" />
            Deviation Spread
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full cursor-crosshair select-none bg-[#FFFFFF] rounded-md border border-[#D9D6CC]/60 p-1"
        style={{ height: '360px' }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="surplusGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#416F9C" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#416F9C" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="deficitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B84F49" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#B84F49" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Y-axis labels */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#D9D6CC"
                  strokeWidth="0.75"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#66665D"
                  className="tabular-nums font-mono"
                >
                  {val.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* X-axis ticks & labels */}
          {xLabels.map((lbl) => {
            const x = getX(lbl.index);
            return (
              <g key={lbl.index}>
                <line
                  x1={x}
                  y1={svgHeight - padding.bottom}
                  x2={x}
                  y2={svgHeight - padding.bottom + 4}
                  stroke="#66665D"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={svgHeight - padding.bottom + 16}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#66665D"
                  className="font-mono"
                >
                  {lbl.text}
                </text>
              </g>
            );
          })}

          {/* Baseline axis */}
          <line
            x1={padding.left}
            y1={svgHeight - padding.bottom}
            x2={svgWidth - padding.right}
            y2={svgHeight - padding.bottom}
            stroke="#D9D6CC"
            strokeWidth="1.2"
          />

          {/* Deviation Imbalance Bars / Shading */}
          {showDeviation &&
            visibleData.map((d, i) => {
              if (i % 2 !== 0 && visibleData.length > 300) return null; // downsample render if dense
              const x = getX(i);
              const yAct = getY(d.actualMW);
              const yFc = getY(d.forecastMW);
              const yTop = Math.min(yAct, yFc);
              const height = Math.abs(yAct - yFc);
              const isOver = d.errorMW > 0; // forecast > actual

              return (
                <rect
                  key={i}
                  x={x - 1.5}
                  y={yTop}
                  width="3"
                  height={Math.max(1, height)}
                  fill={isOver ? '#B84F49' : '#416F9C'}
                  opacity="0.35"
                />
              );
            })}

          {/* Actual Line */}
          {showActual && actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#527D68"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast Line */}
          {showForecast && forecastPath && (
            <path
              d={forecastPath}
              fill="none"
              stroke="#96732D"
              strokeWidth="2.2"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover Crosshair & Indicators */}
          {hoverIndex !== null && hoveredItem && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={svgHeight - padding.bottom}
                stroke="#22221F"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Actual point marker */}
              {showActual && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(hoveredItem.actualMW)}
                  r="4"
                  fill="#527D68"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              )}
              {/* Forecast point marker */}
              {showForecast && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(hoveredItem.forecastMW)}
                  r="4"
                  fill="#96732D"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoveredItem && hoverIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none bg-[#FFFFFF] border border-[#D9D6CC] rounded-lg shadow-lg p-3 text-xs w-64 transition-transform duration-75"
            style={{
              left: `${Math.min(
                Math.max(10, (getX(hoverIndex) / svgWidth) * 100),
                70
              )}%`,
              top: '15px',
            }}
          >
            <div className="flex items-center justify-between border-b border-[#D9D6CC]/60 pb-1.5 mb-2">
              <span className="font-semibold text-[#22221F]">
                {hoveredItem.deliveryDate} &middot; Hour {hoveredItem.hour !== undefined ? hoveredItem.hour : hoveredItem.settlementPeriod}
              </span>
              <span className="font-mono text-[10px] text-[#66665D]">
                SP: {hoveredItem.settlementPeriod || '--'}
              </span>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#527D68] font-sans font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#527D68]" />
                  Actual Generation:
                </span>
                <span className="font-bold text-[#22221F]">
                  {Math.round(hoveredItem.actualMW).toLocaleString()} MW
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#96732D] font-sans font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#96732D]" />
                  D-1 Forecast:
                </span>
                <span className="font-bold text-[#22221F]">
                  {Math.round(hoveredItem.forecastMW).toLocaleString()} MW
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#D9D6CC]/50 pt-1.5">
                <span className="font-sans text-[#66665D]">Forecast Deviation:</span>
                <span
                  className={`font-bold flex items-center gap-0.5 ${
                    hoveredItem.errorMW > 0 ? 'text-[#B84F49]' : 'text-[#416F9C]'
                  }`}
                >
                  {hoveredItem.errorMW > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 inline" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 inline" />
                  )}
                  {Math.round(Math.abs(hoveredItem.errorMW)).toLocaleString()} MW
                </span>
              </div>

              <div className="text-[10.5px] font-sans text-[#66665D] mt-1 bg-[#F2F2F2] p-1.5 rounded">
                {hoveredItem.errorMW > 0 ? (
                  <span className="text-[#B84F49]">
                    ⚠️ Over-forecast: Demand gap of {Math.round(hoveredItem.errorMW)} MW requires thermal balancing.
                  </span>
                ) : (
                  <span className="text-[#416F9C]">
                    ✅ Surplus: Actual exceeded forecast by {Math.round(Math.abs(hoveredItem.errorMW))} MW.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mini Range Slider for Easy Zooming / Navigation */}
      <div className="mt-3 flex items-center justify-between text-xs text-[#66665D]">
        <span>Range Navigation:</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleRange([0, 100])}
            className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
              visibleRange[0] === 0 && visibleRange[1] === 100
                ? 'bg-[#22221F] text-[#FFFFFF]'
                : 'hover:bg-[#F2F2F2]'
            }`}
          >
            All (100%)
          </button>
          <button
            type="button"
            onClick={() => setVisibleRange([0, 50])}
            className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
              visibleRange[0] === 0 && visibleRange[1] === 50
                ? 'bg-[#22221F] text-[#FFFFFF]'
                : 'hover:bg-[#F2F2F2]'
            }`}
          >
            First Half
          </button>
          <button
            type="button"
            onClick={() => setVisibleRange([50, 100])}
            className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
              visibleRange[0] === 50 && visibleRange[1] === 100
                ? 'bg-[#22221F] text-[#FFFFFF]'
                : 'hover:bg-[#F2F2F2]'
            }`}
          >
            Second Half
          </button>
        </div>
      </div>
    </div>
  );
}
