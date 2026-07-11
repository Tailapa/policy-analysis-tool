import React from 'react';
import { ConfidenceLevel } from '../../types';
import ConfidenceBadge from './ConfidenceBadge';

interface FrameworkPanelProps {
  title: string;
  definition: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  isDark: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function FrameworkPanel({
  title,
  definition,
  confidence,
  reasoning,
  isDark,
  icon,
  children,
}: FrameworkPanelProps) {
  return (
    <div
      className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-1">
        <h3
          className={`text-sm font-bold font-display tracking-tight flex items-center gap-2 ${
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          }`}
        >
          {icon}
          <span>{title}</span>
        </h3>
        <ConfidenceBadge confidence={confidence} reasoning={reasoning} isDark={isDark} />
      </div>
      <p className={`text-xs leading-relaxed mb-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{definition}</p>
      {children}
      <p
        className={`text-xs leading-relaxed mt-5 pt-4 border-t ${
          isDark ? 'text-zinc-400 border-zinc-800' : 'text-zinc-600 border-zinc-100'
        }`}
      >
        {reasoning}
      </p>
    </div>
  );
}
