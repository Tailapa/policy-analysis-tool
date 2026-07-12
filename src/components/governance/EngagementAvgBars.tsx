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
    <div className="space-y-3 w-full">
      {DIMENSIONS.map((dim) => {
        const value = props[dim.key];
        return (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{dim.label}</span>
              <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{Math.round(value * 100)}%</span>
            </div>
            <div className={`h-2.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.round(value * 100)}%`, backgroundColor: dim.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
