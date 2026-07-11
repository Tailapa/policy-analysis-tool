import React from 'react';
import { LifecycleStageCount } from '../../types';

const SHORT_LABELS: Record<string, string> = {
  'Problem Identification & Agenda Setting': 'Agenda Setting',
  'Policy Formulation': 'Formulation',
  'Legitimation & Adoption': 'Legitimation',
  'Implementation': 'Implementation',
  'Evaluation': 'Evaluation',
  'Maintenance, Succession & Termination': 'Maintenance',
};

const STAGE_COLORS = ['#6366F1', '#8B5CF6', '#185FA5', '#10B981', '#F59E0B', '#71717A'];

interface LifecycleDistributionBarProps {
  distribution: LifecycleStageCount[];
  isDark: boolean;
}

export default function LifecycleDistributionBar({ distribution, isDark }: LifecycleDistributionBarProps) {
  const total = distribution.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      {distribution.map((d, i) => {
        const percent = Math.round((d.count / total) * 100);
        const color = STAGE_COLORS[i % STAGE_COLORS.length];
        return (
          <div
            key={d.stage}
            style={{ flexGrow: d.count || 0.4, borderColor: isDark ? `${color}33` : `${color}30` }}
            className={`min-w-[90px] border rounded-2xl p-3.5 text-center flex flex-col justify-center transition-all ${
              isDark ? 'bg-zinc-950/40' : 'bg-zinc-50/60'
            }`}
          >
            <span className={`text-[10px] font-semibold leading-tight ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {SHORT_LABELS[d.stage] || d.stage}
            </span>
            <span className="text-xl font-black mt-0.5" style={{ color }}>
              {d.count}
            </span>
            <span className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}
