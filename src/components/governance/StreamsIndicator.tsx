import React from 'react';
import { Waves, Lightbulb, Landmark, DoorOpen, DoorClosed } from 'lucide-react';

interface StreamRow {
  key: string;
  label: string;
  icon: React.ReactNode;
  score: number; // 0-5
  color: string;
}

interface StreamsIndicatorProps {
  problemScore: number;
  policyScore: number;
  politicsScore: number;
  windowOpen: boolean;
  isDark: boolean;
}

const COLORS = { problem: '#F43F5E', policy: '#6366F1', politics: '#F59E0B' };

export default function StreamsIndicator({
  problemScore,
  policyScore,
  politicsScore,
  windowOpen,
  isDark,
}: StreamsIndicatorProps) {
  const rows: StreamRow[] = [
    { key: 'problem', label: 'Problem Stream', icon: <Waves size={13} />, score: problemScore, color: COLORS.problem },
    { key: 'policy', label: 'Policy Stream', icon: <Lightbulb size={13} />, score: policyScore, color: COLORS.policy },
    { key: 'politics', label: 'Politics Stream', icon: <Landmark size={13} />, score: politicsScore, color: COLORS.politics },
  ];

  return (
    <div className="w-full">
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
              >
                <span style={{ color: row.color }}>{row.icon}</span>
                {row.label}
              </span>
              <span className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {row.score.toFixed(1)} / 5
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="h-2.5 flex-1 rounded-full transition-all"
                  style={{
                    backgroundColor: i < Math.round(row.score) ? row.color : isDark ? '#27272A' : '#E4E4E7',
                    opacity: i < Math.round(row.score) ? 1 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
          windowOpen
            ? isDark
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : isDark
              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
        }`}
      >
        {windowOpen ? <DoorOpen size={12} /> : <DoorClosed size={12} />}
        <span>{windowOpen ? 'Policy Window Open' : 'No Identified Window'}</span>
      </div>
    </div>
  );
}
