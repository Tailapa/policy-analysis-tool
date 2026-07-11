import React, { useState } from 'react';
import { SCTPQuadrant } from '../../types';
import { QUADRANT_META } from './colors';

export interface QuadrantPoint {
  id: string;
  label: string;
  subtitle?: string;
  rationale?: string;
  x: number; // political power, 0..1
  y: number; // social construction, 0..1 (0 = undeserving, 1 = deserving)
  quadrant: SCTPQuadrant;
}

interface QuadrantScatterProps {
  points: QuadrantPoint[];
  isDark: boolean;
}

const PAD = 46;
const SIZE = 300; // plot area (excluding padding)
const W = SIZE + PAD * 2;
const H = SIZE + PAD * 2;
const LABEL_MAX_CHARS = 16;

function truncateLabel(label: string): string {
  return label.length > LABEL_MAX_CHARS ? `${label.slice(0, LABEL_MAX_CHARS - 1)}…` : label;
}

export default function QuadrantScatter({ points, isDark }: QuadrantScatterProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hovered = points.find((p) => p.id === hoverId);

  const toX = (v: number) => PAD + v * SIZE;
  const toY = (v: number) => PAD + (1 - v) * SIZE;

  const axisColor = isDark ? '#3F3F46' : '#E4E4E7';
  const quadrantLabelColor = isDark ? '#71717A' : '#A1A1AA';

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
        {/* Quadrant background tints */}
        <rect x={PAD} y={PAD} width={SIZE / 2} height={SIZE / 2} fill={QUADRANT_META.advantaged.hex} opacity={isDark ? 0.06 : 0.05} />
        <rect x={PAD + SIZE / 2} y={PAD} width={SIZE / 2} height={SIZE / 2} fill={QUADRANT_META.contender.hex} opacity={isDark ? 0.06 : 0.05} />
        <rect x={PAD} y={PAD + SIZE / 2} width={SIZE / 2} height={SIZE / 2} fill={QUADRANT_META.dependent.hex} opacity={isDark ? 0.06 : 0.05} />
        <rect x={PAD + SIZE / 2} y={PAD + SIZE / 2} width={SIZE / 2} height={SIZE / 2} fill={QUADRANT_META.deviant.hex} opacity={isDark ? 0.06 : 0.05} />

        {/* Border + center cross */}
        <rect x={PAD} y={PAD} width={SIZE} height={SIZE} fill="none" stroke={axisColor} strokeWidth={1} />
        <line x1={PAD + SIZE / 2} y1={PAD} x2={PAD + SIZE / 2} y2={PAD + SIZE} stroke={axisColor} strokeWidth={1} strokeDasharray="3 3" />
        <line x1={PAD} y1={PAD + SIZE / 2} x2={PAD + SIZE} y2={PAD + SIZE / 2} stroke={axisColor} strokeWidth={1} strokeDasharray="3 3" />

        {/* Quadrant corner labels */}
        <text x={PAD + 8} y={PAD + 16} fontSize={10} fontWeight={700} fill={QUADRANT_META.advantaged.hex}>ADVANTAGED</text>
        <text x={PAD + SIZE - 8} y={PAD + 16} fontSize={10} fontWeight={700} fill={QUADRANT_META.contender.hex} textAnchor="end">CONTENDER</text>
        <text x={PAD + 8} y={PAD + SIZE - 8} fontSize={10} fontWeight={700} fill={QUADRANT_META.dependent.hex}>DEPENDENT</text>
        <text x={PAD + SIZE - 8} y={PAD + SIZE - 8} fontSize={10} fontWeight={700} fill={QUADRANT_META.deviant.hex} textAnchor="end">DEVIANT</text>

        {/* Axis labels */}
        <text x={PAD + SIZE / 2} y={H - 14} fontSize={11} fontWeight={600} fill={quadrantLabelColor} textAnchor="middle">
          Political Power →
        </text>
        <text x={14} y={PAD + SIZE / 2} fontSize={11} fontWeight={600} fill={quadrantLabelColor} textAnchor="middle" transform={`rotate(-90, 14, ${PAD + SIZE / 2})`}>
          Social Construction →
        </text>

        {/* Points */}
        {points.map((p) => {
          const cx = toX(p.x);
          const cy = toY(p.y);
          const color = QUADRANT_META[p.quadrant].hex;
          const isHovered = hoverId === p.id;
          // Point each label away from the vertical midline (toward its own
          // quadrant's open space) rather than always rightward — otherwise
          // a dot just left of center runs its label into the neighboring
          // quadrant's dots. Still flips back near the right viewBox edge
          // so labels never run off-canvas.
          const nearRightEdge = cx > PAD + SIZE * 0.85;
          const labelOnLeft = cx < PAD + SIZE / 2 ? true : nearRightEdge;
          const labelX = cx + (labelOnLeft ? -5.4 : 5.4);
          return (
            <g key={p.id} onMouseEnter={() => setHoverId(p.id)} onMouseLeave={() => setHoverId(null)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={isHovered ? 4.8 : 3.6} fill={color} stroke={isDark ? '#09090B' : '#FFFFFF'} strokeWidth={1.2} opacity={isHovered ? 1 : 0.85} />
              <text
                x={labelX}
                y={cy}
                dy={1.8}
                fontSize={4.8}
                fontWeight={400}
                fill={color}
                stroke={isDark ? '#09090B' : '#FFFFFF'}
                strokeWidth={1.5}
                paintOrder="stroke"
                textAnchor={labelOnLeft ? 'end' : 'start'}
                pointerEvents="none"
              >
                {truncateLabel(p.label)}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className={`absolute z-30 px-3 py-2 rounded-xl border shadow-2xl text-xs pointer-events-none transition-all ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-700'
          }`}
          style={{
            left: `${(toX(hovered.x) / W) * 100}%`,
            top: `${(toY(hovered.y) / H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 12px))',
            width: '210px',
          }}
        >
          <span className="font-bold block">{hovered.label}</span>
          {hovered.subtitle && <span className="text-zinc-400 block mt-0.5">{hovered.subtitle}</span>}
          <span className="font-semibold block mt-1" style={{ color: QUADRANT_META[hovered.quadrant].hex }}>
            {QUADRANT_META[hovered.quadrant].label}
          </span>
          {hovered.rationale && (
            <span className={`block mt-1.5 pt-1.5 border-t line-clamp-3 font-normal ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-500'}`}>
              {hovered.rationale}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
