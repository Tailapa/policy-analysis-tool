import React from 'react';
import { StreamsAvg } from '../../types';

interface StreamsAvgCardProps {
  streamsAvg: StreamsAvg;
  isDark: boolean;
}

const STREAMS: { key: keyof Pick<StreamsAvg, 'avg_problem' | 'avg_policy' | 'avg_politics'>; label: string; color: string }[] = [
  { key: 'avg_problem', label: 'Problem Stream', color: '#F43F5E' },
  { key: 'avg_policy', label: 'Policy Stream', color: '#6366F1' },
  { key: 'avg_politics', label: 'Politics Stream', color: '#F59E0B' },
];

export default function StreamsAvgCard({ streamsAvg, isDark }: StreamsAvgCardProps) {
  return (
    <div className="space-y-3 w-full">
      {STREAMS.map((s) => {
        const value = streamsAvg[s.key];
        const percent = Math.round((value / 5) * 100);
        return (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{s.label}</span>
              <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{value.toFixed(1)} / 5</span>
            </div>
            <div className={`h-2.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: s.color }}
              />
            </div>
          </div>
        );
      })}
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl border mt-2 ${
        isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`}>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Policies with an Open Window
        </span>
        <span className={`text-sm font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {Math.round(streamsAvg.window_open_pct)}%
        </span>
      </div>
    </div>
  );
}
