import React from 'react';

interface EngagementAvgBarsProps {
  avgEducate: number;
  avgPersuade: number;
  avgCoerce: number;
  avgStrengthen: number;
  avgIncentivize: number;
  isDark: boolean;
}

const DIMENSIONS: { key: keyof Omit<EngagementAvgBarsProps, 'isDark'>; label: string; color: string }[] = [
  { key: 'avgEducate', label: 'Educate', color: '#6366F1' },
  { key: 'avgPersuade', label: 'Persuade', color: '#8B5CF6' },
  { key: 'avgCoerce', label: 'Coerce', color: '#F43F5E' },
  { key: 'avgStrengthen', label: 'Strengthen', color: '#10B981' },
  { key: 'avgIncentivize', label: 'Incentivize', color: '#F59E0B' },
];

export default function EngagementAvgBars(props: EngagementAvgBarsProps) {
  const { isDark } = props;
  return (
    <div className="flex items-end justify-between gap-2 w-full">
      {DIMENSIONS.map((dim) => {
        const value = props[dim.key];
        const percent = Math.round(value * 100);
        return (
          <div key={dim.key} className="flex flex-col items-center flex-1 min-w-0">
            <span className={`text-xs font-bold mb-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{percent}%</span>
            <div
              className={`w-full max-w-[32px] h-36 rounded-t-lg overflow-hidden flex flex-col justify-end ${
                isDark ? 'bg-zinc-800' : 'bg-zinc-100'
              }`}
            >
              <div
                className="w-full rounded-t-lg transition-all"
                style={{ height: `${percent}%`, backgroundColor: dim.color }}
              />
            </div>
            <span className={`text-[10px] font-semibold mt-2 text-center leading-tight ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {dim.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
