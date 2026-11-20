import React, { useState } from 'react';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export interface ChartSliceItem {
  id?: string;
  label: string;
  value: number;
  color: string;
  hint?: string;
}

export interface ChartBarItem {
  id?: string;
  label: string;
  value: number;
  secondaryValue?: number;
  color?: string;
  secondaryColor?: string;
  hint?: string;
}

export interface ChartSeriesPoint {
  label: string;
  primary: number;
  secondary?: number;
}

export const SAAS_CHART_COLORS = [
  '#EA580C', // Brand Orange
  '#0D9488', // Teal
  '#2563EB', // Royal Blue
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#E11D48', // Rose
  '#059669', // Emerald
  '#64748B', // Slate
];

export function formatChartValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number'
): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (format === 'currency') {
    if (Math.abs(safe) >= 1_000_000) return `৳${(safe / 1_000_000).toFixed(1)}M`;
    if (Math.abs(safe) >= 100_000) return `৳${Math.round(safe).toLocaleString()}`;
    return `৳${Math.round(safe).toLocaleString()}`;
  }
  if (format === 'percent') {
    return `${safe.toFixed(1).replace(/\.0$/, '')}%`;
  }
  return Math.round(safe).toLocaleString();
}

/* ============================================================================
 * 1. Interactive Pie / Donut Chart
 * ========================================================================== */
interface SaasDonutChartProps {
  title: string;
  subtitle?: string;
  data: ChartSliceItem[];
  valueFormat?: 'number' | 'currency' | 'percent';
  centerLabel?: string;
  emptyText?: string;
  onSelectSlice?: (item: ChartSliceItem) => void;
  size?: number;
  className?: string;
}

export const SaasDonutChart: React.FC<SaasDonutChartProps> = ({
  title,
  subtitle,
  data,
  valueFormat = 'number',
  centerLabel = 'Total',
  emptyText = 'No records available yet',
  onSelectSlice,
  size = 168,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cleanData = data.filter((d) => d.value > 0);
  const total = cleanData.reduce((s, d) => s + d.value, 0);

  const strokeWidth = 22;
  const radius = (size - strokeWidth * 2) / 2 + 4;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const slices = cleanData.map((item, idx) => {
    const pct = total > 0 ? item.value / total : 0;
    const dashLen = Math.max(0, pct * circumference);
    const offset = cumulativeOffset;
    cumulativeOffset += dashLen;
    return {
      ...item,
      idx,
      pct: Math.round(pct * 1000) / 10,
      dashArray: `${Math.max(dashLen - 1.5, 0)} ${circumference}`,
      dashOffset: -offset,
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
            <PieChartIcon className="w-4 h-4 text-[#EA580C] shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          {subtitle && (
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {total > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
            {formatChartValue(total, valueFormat)}
          </span>
        )}
      </div>

      {total <= 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Interactive SVG Donut */}
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-100 dark:text-slate-800"
              />
              {slices.map((s) => {
                const isHovered = hoveredIdx === s.idx;
                return (
                  <circle
                    key={`${s.label}-${s.idx}`}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={s.dashArray}
                    strokeDashoffset={s.dashOffset}
                    strokeLinecap="butt"
                    onMouseEnter={() => setHoveredIdx(s.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => onSelectSlice?.(s)}
                    className={`transition-all duration-200 ${onSelectSlice ? 'cursor-pointer' : ''}`}
                    style={{
                      opacity: hoveredIdx !== null && !isHovered ? 0.5 : 1,
                    }}
                  />
                );
              })}
            </svg>

            {/* Center Interactive Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[96px]">
                {activeItem ? activeItem.label : centerLabel}
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5">
                {activeItem
                  ? formatChartValue(activeItem.value, valueFormat)
                  : formatChartValue(total, valueFormat)}
              </span>
              {activeItem && (
                <span className="text-[10px] font-semibold text-[#EA580C] tabular-nums">
                  {activeItem.pct}%
                </span>
              )}
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="w-full flex-1 space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {slices.map((s) => {
              const isHovered = hoveredIdx === s.idx;
              return (
                <button
                  key={`${s.label}-${s.idx}`}
                  type="button"
                  onMouseEnter={() => setHoveredIdx(s.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectSlice?.(s)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-left text-xs transition-colors ${
                    isHovered
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  } ${onSelectSlice ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatChartValue(s.value, valueFormat)}
                    </span>
                    <span className="text-[10.5px] text-slate-400 w-10 text-right">
                      {s.pct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. Interactive Vertical / Horizontal Bar Chart
 * ========================================================================== */
interface SaasBarChartProps {
  title: string;
  subtitle?: string;
  data: ChartBarItem[];
  valueFormat?: 'number' | 'currency' | 'percent';
  secondaryFormat?: 'number' | 'currency' | 'percent';
  primaryLabel?: string;
  secondaryLabel?: string;
  orientation?: 'vertical' | 'horizontal';
  barColor?: string;
  secondaryColor?: string;
  emptyText?: string;
  onSelectBar?: (item: ChartBarItem) => void;
  className?: string;
}

export const SaasBarChart: React.FC<SaasBarChartProps> = ({
  title,
  subtitle,
  data,
  valueFormat = 'number',
  secondaryFormat,
  primaryLabel = 'Value',
  secondaryLabel = 'Secondary',
  orientation = 'vertical',
  barColor = '#EA580C',
  secondaryColor = '#0D9488',
  emptyText = 'No chart data available yet',
  onSelectBar,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const items = data.slice(0, 10);
  const hasSecondary = items.some((d) => typeof d.secondaryValue === 'number');
  const maxVal = Math.max(
    1,
    ...items.map((d) => Math.max(d.value || 0, d.secondaryValue || 0))
  );
  const totalVal = items.reduce((s, d) => s + (d.value || 0), 0);
  const activeBar = hoveredIdx !== null ? items[hoveredIdx] : null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
            <BarChart3 className="w-4 h-4 text-[#EA580C] shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          {subtitle && (
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px]">
          {hasSecondary && (
            <div className="hidden sm:flex items-center gap-2 text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: barColor }} />
                {primaryLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: secondaryColor }} />
                {secondaryLabel}
              </span>
            </div>
          )}
          {activeBar ? (
            <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/50 text-[#EA580C] font-semibold tabular-nums">
              {activeBar.label}: {formatChartValue(activeBar.value, valueFormat)}
            </span>
          ) : (
            totalVal > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                {formatChartValue(totalVal, valueFormat)}
              </span>
            )
          )}
        </div>
      </div>

      {items.length === 0 || (maxVal <= 1 && totalVal === 0 && !hasSecondary) ? (
        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
          {emptyText}
        </div>
      ) : orientation === 'horizontal' ? (
        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const pct = Math.max(2, Math.round((item.value / maxVal) * 100));
            const color = item.color || barColor;
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={`${item.label}-${idx}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectBar?.(item)}
                className={`space-y-1 p-1 rounded-lg transition-colors ${
                  isHovered ? 'bg-slate-50 dark:bg-slate-800/60' : ''
                } ${onSelectBar ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {item.label}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
                    {formatChartValue(item.value, valueFormat)}
                    {item.hint ? (
                      <span className="text-[10.5px] text-slate-400 ml-1">({item.hint})</span>
                    ) : null}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.value > 0 ? pct : 0}%`,
                      backgroundColor: color,
                      opacity: hoveredIdx !== null && !isHovered ? 0.65 : 1,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative pt-2">
          {/* Subtle horizontal gridlines */}
          <div className="h-44 flex items-end gap-2 sm:gap-3 border-b border-slate-200 dark:border-slate-700 pb-1 px-1 relative">
            <div className="absolute inset-x-0 top-0 bottom-1 pointer-events-none flex flex-col justify-between">
              {[0, 1, 2, 3].map((line) => (
                <div
                  key={line}
                  className="border-t border-dashed border-slate-100 dark:border-slate-800 w-full"
                />
              ))}
            </div>

            {items.map((item, idx) => {
              const hPct = item.value > 0 ? Math.max(5, Math.round((item.value / maxVal) * 100)) : 0;
              const sPct =
                typeof item.secondaryValue === 'number' && item.secondaryValue > 0
                  ? Math.max(5, Math.round((item.secondaryValue / maxVal) * 100))
                  : 0;
              const isHovered = hoveredIdx === idx;
              const c1 = item.color || barColor;
              const c2 = item.secondaryColor || secondaryColor;

              return (
                <div
                  key={`${item.label}-${idx}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectBar?.(item)}
                  className={`relative z-10 flex-1 h-full flex flex-col justify-end items-center group ${
                    onSelectBar ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Floating Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg z-20 pointer-events-none tabular-nums">
                      {formatChartValue(item.value, valueFormat)}
                      {typeof item.secondaryValue === 'number'
                        ? ` / ${formatChartValue(item.secondaryValue, secondaryFormat || valueFormat)}`
                        : ''}
                    </div>
                  )}

                  <div className="w-full h-full flex items-end justify-center gap-1">
                    <div
                      className="w-full max-w-[26px] rounded-t-md transition-all duration-300"
                      style={{
                        height: `${hPct}%`,
                        backgroundColor: c1,
                        opacity: hoveredIdx !== null && !isHovered ? 0.65 : 1,
                      }}
                    />
                    {hasSecondary && (
                      <div
                        className="w-full max-w-[22px] rounded-t-md transition-all duration-300"
                        style={{
                          height: `${sPct}%`,
                          backgroundColor: c2,
                          opacity: hoveredIdx !== null && !isHovered ? 0.65 : 1,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis Labels */}
          <div className="flex items-start gap-2 sm:gap-3 pt-1.5 px-1">
            {items.map((item, idx) => (
              <div
                key={`${item.label}-lbl-${idx}`}
                className="flex-1 text-center text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate"
                title={item.label}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 3. Interactive Multi-Series SVG Line & Area Trend Chart
 * ========================================================================== */
interface SaasLineAreaChartProps {
  title: string;
  subtitle?: string;
  data: ChartSeriesPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryFormat?: 'number' | 'currency';
  secondaryFormat?: 'number' | 'currency';
  primaryColor?: string;
  secondaryColor?: string;
  emptyText?: string;
  className?: string;
}

export const SaasLineAreaChart: React.FC<SaasLineAreaChartProps> = ({
  title,
  subtitle,
  data,
  primaryLabel = 'Primary',
  secondaryLabel = 'Secondary',
  primaryFormat = 'currency',
  secondaryFormat = 'number',
  primaryColor = '#EA580C',
  secondaryColor = '#2563EB',
  emptyText = 'No trend records available yet',
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const gradId = React.useId().replace(/:/g, '');

  const hasData = data.length > 0;
  const hasSecondary = data.some((d) => typeof d.secondary === 'number');

  const W = 560;
  const H = 185;
  const padX = 20;
  const padTop = 18;
  const padBottom = 26;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const maxPrimary = Math.max(1, ...data.map((d) => d.primary || 0));
  const maxSecondary = Math.max(1, ...data.map((d) => d.secondary || 0));
  const useSharedScale = primaryFormat === secondaryFormat;
  const sharedMax = Math.max(maxPrimary, maxSecondary);

  const points = data.map((d, idx) => {
    const x =
      data.length <= 1
        ? padX + innerW / 2
        : padX + (idx / (data.length - 1)) * innerW;
    const y1 =
      padTop +
      innerH -
      ((d.primary || 0) / (useSharedScale ? sharedMax : maxPrimary)) * innerH;
    const y2 =
      typeof d.secondary === 'number'
        ? padTop +
          innerH -
          (d.secondary / (useSharedScale ? sharedMax : maxSecondary)) * innerH
        : null;
    return { ...d, x, y1, y2, idx };
  });

  const primaryLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y1}`).join(' ');
  const primaryArea =
    points.length > 0
      ? `${primaryLine} L ${points[points.length - 1].x} ${padTop + innerH} L ${points[0].x} ${
          padTop + innerH
        } Z`
      : '';
  const secondaryLine = hasSecondary
    ? points
        .filter((p) => p.y2 !== null)
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y2}`)
        .join(' ')
    : '';

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
            <TrendingUp className="w-4 h-4 text-[#EA580C] shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          {subtitle && (
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] shrink-0">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            {primaryLabel}
          </span>
          {hasSecondary && (
            <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
              {secondaryLabel}
            </span>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="relative">
          {activePoint && (
            <div className="mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium flex flex-wrap items-center justify-between gap-3 tabular-nums">
              <span className="font-semibold text-slate-200">{activePoint.label}</span>
              <div className="flex items-center gap-3">
                <span style={{ color: '#FDBA74' }}>
                  {primaryLabel}: <strong>{formatChartValue(activePoint.primary, primaryFormat)}</strong>
                </span>
                {typeof activePoint.secondary === 'number' && (
                  <span style={{ color: '#93C5FD' }}>
                    {secondaryLabel}:{' '}
                    <strong>{formatChartValue(activePoint.secondary, secondaryFormat)}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44 overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.22" />
                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0, 0.33, 0.66, 1].map((frac, idx) => {
              const y = padTop + innerH * frac;
              return (
                <line
                  key={idx}
                  x1={padX}
                  x2={W - padX}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-200 dark:text-slate-800"
                />
              );
            })}

            {/* Area & Lines */}
            {primaryArea && <path d={primaryArea} fill={`url(#${gradId})`} />}
            {primaryLine && (
              <path
                d={primaryLine}
                fill="none"
                stroke={primaryColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {secondaryLine && (
              <path
                d={secondaryLine}
                fill="none"
                stroke={secondaryColor}
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hover crosshair */}
            {activePoint && (
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={padTop}
                y2={padTop + innerH}
                stroke="currentColor"
                strokeDasharray="2 2"
                className="text-slate-300 dark:text-slate-600"
              />
            )}

            {/* Interactive Dots + Invisible wide hit zones */}
            {points.map((p) => {
              const isActive = hoveredIdx === p.idx;
              const hitW = points.length > 1 ? innerW / points.length : innerW;
              return (
                <g key={`${p.label}-${p.idx}`}>
                  <circle
                    cx={p.x}
                    cy={p.y1}
                    r={isActive ? 5 : 3}
                    fill={primaryColor}
                    stroke="#fff"
                    strokeWidth={isActive ? 2 : 1}
                  />
                  {p.y2 !== null && (
                    <circle
                      cx={p.x}
                      cy={p.y2}
                      r={isActive ? 4.5 : 2.5}
                      fill={secondaryColor}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  )}
                  <text
                    x={p.x}
                    y={H - 6}
                    textAnchor="middle"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-medium"
                  >
                    {p.label}
                  </text>
                  <rect
                    x={p.x - hitW / 2}
                    y={0}
                    width={hitW}
                    height={H}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredIdx(p.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 4. Optional Collapsible Analytics Wrapper Section for Data-Heavy Pages
 * ========================================================================== */
interface CollapsibleAnalyticsPanelProps {
  title?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const CollapsibleAnalyticsPanel: React.FC<CollapsibleAnalyticsPanelProps> = ({
  title = 'Visual Analytics & Insights',
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#EA580C]" />
          <span>{title}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && children}
    </div>
  );
};
