import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Momentum, MomentumEntry } from '../../types';
import { fetchMomentum } from '../../api';

interface PolicyMomentumCardProps {
  isDark: boolean;
}

function Sparkline({ entry, isDark, color }: { entry: MomentumEntry; isDark: boolean; color: string }) {
  const values = entry.series.map((p) => p.count);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EntryRow({ entry, isDark, accelerating }: { entry: MomentumEntry; isDark: boolean; accelerating: boolean }) {
  const color = accelerating ? '#10B981' : '#F43F5E';
  return (
    <div className={`flex items-center justify-between gap-3 p-2.5 rounded-xl ${isDark ? 'bg-zinc-950/50' : 'bg-zinc-50'}`}>
      <div className="min-w-0 flex-1">
        <span className={`text-xs font-bold truncate block ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{entry.label}</span>
        <span className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {entry.latest_count} this issue
          {entry.delta_pct !== null && ` · ${entry.delta_pct >= 0 ? '+' : ''}${Math.round(entry.delta_pct)}%`}
        </span>
      </div>
      <Sparkline entry={entry} isDark={isDark} color={color} />
      {accelerating ? <TrendingUp size={14} style={{ color }} /> : <TrendingDown size={14} style={{ color }} />}
    </div>
  );
}

function MomentumSection({ title, entries, isDark }: { title: string; entries: MomentumEntry[]; isDark: boolean }) {
  const sorted = [...entries].sort((a, b) => b.trend_slope - a.trend_slope);
  const accelerating = sorted.filter((e) => e.trend_slope > 0).slice(0, 3);
  const declining = sorted
    .filter((e) => e.trend_slope < 0)
    .slice(-3)
    .reverse();

  return (
    <div>
      <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{title}</h4>
      <div className="space-y-3">
        <div>
          <span className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Accelerating</span>
          <div className="space-y-1.5 mt-1.5">
            {accelerating.length === 0 ? (
              <p className={`text-[11px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>None trending up.</p>
            ) : (
              accelerating.map((e) => (
                <React.Fragment key={e.label}>
                  <EntryRow entry={e} isDark={isDark} accelerating />
                </React.Fragment>
              ))
            )}
          </div>
        </div>
        <div>
          <span className={`text-[10px] font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Declining</span>
          <div className="space-y-1.5 mt-1.5">
            {declining.length === 0 ? (
              <p className={`text-[11px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>None trending down.</p>
            ) : (
              declining.map((e) => (
                <React.Fragment key={e.label}>
                  <EntryRow entry={e} isDark={isDark} accelerating={false} />
                </React.Fragment>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PolicyMomentumCard({ isDark }: PolicyMomentumCardProps) {
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMomentum()
      .then(setMomentum)
      .catch(() => setMomentum(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <h3 className={`text-sm font-bold font-display tracking-tight mb-1 flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        <Activity size={14} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
        <span>Policy Momentum</span>
      </h3>
      <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {momentum ? `${momentum.previous_issue_label} → ${momentum.latest_issue_label}, trend across the last few issues.` : 'Which themes and ministries are accelerating or declining.'}
      </p>

      {loading ? (
        <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Loading…</p>
      ) : !momentum || (momentum.themes.length === 0 && momentum.ministries.length === 0) ? (
        <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Not enough issue history yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MomentumSection title="Themes" entries={momentum.themes} isDark={isDark} />
          <MomentumSection title="Ministries" entries={momentum.ministries} isDark={isDark} />
        </div>
      )}
    </div>
  );
}
