import React from 'react';
import { ACCENT_HEX } from './colors';

export interface RadarAxis {
  key: string;
  label: string;
  value: number; // 0..1
}

interface RadarChartProps {
  axes: RadarAxis[];
  isDark: boolean;
  compareAxes?: RadarAxis[];
  primaryLabel?: string;
  compareLabel?: string;
  labelFontSize?: number;
}

const CX = 180;
const CY = 132;
const R = 78;
const LABEL_OFFSET = 112; // fixed px distance from center, independent of R
const VIEW_W = 355;
const VIEW_H = 250;
const RINGS = [0.25, 0.5, 0.75, 1];

function point(index: number, count: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / count);
  return [CX + Math.cos(angle) * R * value, CY + Math.sin(angle) * R * value];
}

function labelPoint(index: number, count: number): [number, number] {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / count);
  return [CX + Math.cos(angle) * LABEL_OFFSET, CY + Math.sin(angle) * LABEL_OFFSET];
}

function polygonPath(values: number[]): string {
  return values.map((v, i) => point(i, values.length, v).join(',')).join(' ');
}

export default function RadarChart({
  axes,
  isDark,
  compareAxes,
  primaryLabel,
  compareLabel,
  labelFontSize = 10,
}: RadarChartProps) {
  const n = axes.length;
  const gridColor = isDark ? '#27272A' : '#E4E4E7';
  const labelColor = isDark ? '#A1A1AA' : '#71717A';
  const accent = isDark ? ACCENT_HEX.dark : ACCENT_HEX.light;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto select-none">
        {/* Grid rings */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygonPath(axes.map(() => ring))}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
        ))}
        {/* Axis spokes */}
        {axes.map((_, i) => {
          const [x, y] = point(i, n, 1);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke={gridColor} strokeWidth={1} />;
        })}

        {/* Compare (aggregate average) polygon, drawn first so primary sits on top */}
        {compareAxes && (
          <polygon
            points={polygonPath(compareAxes.map((a) => a.value))}
            fill={isDark ? '#71717A' : '#A1A1AA'}
            fillOpacity={0.12}
            stroke={isDark ? '#71717A' : '#A1A1AA'}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Primary polygon */}
        <polygon
          points={polygonPath(axes.map((a) => a.value))}
          fill={accent}
          fillOpacity={0.18}
          stroke={accent}
          strokeWidth={2}
        />
        {axes.map((a, i) => {
          const [x, y] = point(i, n, a.value);
          return <circle key={a.key} cx={x} cy={y} r={3.5} fill={accent} stroke={isDark ? '#09090B' : '#FFFFFF'} strokeWidth={1.5} />;
        })}

        {/* Axis labels */}
        {axes.map((a, i) => {
          const [x, y] = labelPoint(i, n);
          const anchor = Math.abs(x - CX) < 4 ? 'middle' : x > CX ? 'start' : 'end';
          return (
            <text key={a.key} x={x} y={y} fontSize={labelFontSize} fontWeight={700} fill={labelColor} textAnchor={anchor} dominantBaseline="middle">
              {a.label}
            </text>
          );
        })}
      </svg>

      {compareAxes && (
        <div className="flex items-center justify-center gap-4 mt-1 text-[10px] font-bold">
          <span className="flex items-center gap-1.5" style={{ color: accent }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: accent }} />
            {primaryLabel || 'This policy'}
          </span>
          <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <span className={`w-2.5 h-2.5 rounded-full inline-block border-2 ${isDark ? 'border-zinc-500' : 'border-zinc-400'}`} />
            {compareLabel || 'Dataset average'}
          </span>
        </div>
      )}
    </div>
  );
}
