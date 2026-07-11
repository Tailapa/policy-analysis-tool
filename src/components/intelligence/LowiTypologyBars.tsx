import React from 'react';
import { LowiType } from '../../types';

interface LowiBar {
  type: LowiType;
  label: string;
  score: number;
}

interface LowiTypologyBarsProps {
  regulatory: number;
  distributive: number;
  redistributive: number;
  dominantType: LowiType;
  isDark: boolean;
}

const COLORS: Record<LowiType, string> = {
  regulatory: '#F43F5E',
  distributive: '#6366F1',
  redistributive: '#10B981',
};

export default function LowiTypologyBars({
  regulatory,
  distributive,
  redistributive,
  dominantType,
  isDark,
}: LowiTypologyBarsProps) {
  const bars: LowiBar[] = [
    { type: 'regulatory', label: 'Regulatory', score: regulatory },
    { type: 'distributive', label: 'Distributive', score: distributive },
    { type: 'redistributive', label: 'Redistributive', score: redistributive },
  ];

  return (
    <div className="space-y-3 w-full">
      {bars.map((bar) => {
        const isDominant = bar.type === dominantType;
        return (
          <div key={bar.type}>
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  isDominant ? '' : isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
                style={isDominant ? { color: COLORS[bar.type] } : undefined}
              >
                {bar.label}
                {isDominant && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border"
                    style={{ borderColor: COLORS[bar.type], color: COLORS[bar.type] }}
                  >
                    DOMINANT
                  </span>
                )}
              </span>
              <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {Math.round(bar.score * 100)}%
              </span>
            </div>
            <div className={`h-2.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.round(bar.score * 100)}%`, backgroundColor: COLORS[bar.type], opacity: isDominant ? 1 : 0.55 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
