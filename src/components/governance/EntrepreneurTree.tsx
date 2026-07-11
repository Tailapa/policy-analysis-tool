import React from 'react';
import { User } from 'lucide-react';
import { PolicyEntrepreneur } from '../../types';
import { ACCENT_HEX } from '../intelligence/colors';

interface EntrepreneurTreeProps {
  entrepreneurs: PolicyEntrepreneur[];
  isDark: boolean;
}

export default function EntrepreneurTree({ entrepreneurs, isDark }: EntrepreneurTreeProps) {
  const accent = isDark ? ACCENT_HEX.dark : ACCENT_HEX.light;
  const ranked = [...entrepreneurs].sort((a, b) => b.influence - a.influence);

  return (
    <div className={`border-l-2 pl-4 space-y-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
      {ranked.map((entrepreneur, i) => (
        <div key={i} className="relative">
          <span
            className="absolute -left-[1.375rem] top-1.5 w-2.5 h-2.5 rounded-full border-2"
            style={{ backgroundColor: accent, borderColor: isDark ? '#09090B' : '#FFFFFF' }}
          />
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`font-bold text-xs flex items-center gap-1.5 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                <User size={12} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                {entrepreneur.actor}
              </span>
              <span className={`text-[10px] font-bold shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {Math.round(entrepreneur.influence * 100)}% influence
              </span>
            </div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden mb-2 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.round(entrepreneur.influence * 100)}%`, backgroundColor: accent }}
              />
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {entrepreneur.contribution}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
