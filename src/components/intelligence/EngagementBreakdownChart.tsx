import React, { useEffect, useState } from 'react';
import { EngagementBreakdown, EngagementBreakdownRow } from '../../types';
import { fetchEngagementBreakdown } from '../../api';

interface EngagementBreakdownChartProps {
  isDark: boolean;
  issueId?: string;
}

const DIMENSIONS: { key: keyof EngagementBreakdownRow; label: string; color: string }[] = [
  { key: 'avg_educate', label: 'Educate', color: '#6366F1' },
  { key: 'avg_persuade', label: 'Persuade', color: '#8B5CF6' },
  { key: 'avg_coerce', label: 'Coerce', color: '#F43F5E' },
  { key: 'avg_strengthen', label: 'Strengthen', color: '#10B981' },
  { key: 'avg_incentivize', label: 'Incentivize', color: '#F59E0B' },
];

export default function EngagementBreakdownChart({ isDark, issueId }: EngagementBreakdownChartProps) {
  const [groupBy, setGroupBy] = useState<'ministry' | 'pillar'>('pillar');
  const [data, setData] = useState<EngagementBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchEngagementBreakdown(groupBy, issueId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [groupBy, issueId]);

  return (
    <div className={`p-6 rounded-[1.75rem] border shadow-xl lg:col-span-2 transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <div>
          <h3 className={`text-sm font-bold font-display tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Who Leans on Which Engagement Tool
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Average reliance on each engagement dimension, broken down by {groupBy === 'ministry' ? 'ministry' : 'theme'}.
          </p>
        </div>
        <div className={`inline-flex gap-1 p-1 rounded-full shadow-inner border shrink-0 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          {(['pillar', 'ministry'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                groupBy === g
                  ? isDark
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50'
                    : 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                  : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {g === 'pillar' ? 'By Theme' : 'By Ministry'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 my-4">
        {DIMENSIONS.map((d) => (
          <span key={d.key} className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
            {d.label}
          </span>
        ))}
      </div>

      {loading ? (
        <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Loading…</p>
      ) : !data || data.rows.length === 0 ? (
        <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>No data for this scope yet.</p>
      ) : (
        <div className="space-y-3">
          {data.rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{row.label}</span>
                <span className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {row.sample_size} {row.sample_size === 1 ? 'policy' : 'policies'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {DIMENSIONS.map((d) => {
                  const value = row[d.key] as number;
                  return (
                    <div key={d.key} className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} title={`${d.label}: ${Math.round(value * 100)}%`}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(value * 100)}%`, backgroundColor: d.color }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
