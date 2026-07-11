import React from 'react';
import { Search, Sparkles } from 'lucide-react';

interface GovernanceSynthesisProps {
  researchBrief: string;
  synthesisConclusion: string;
  isDark: boolean;
}

export default function GovernanceSynthesis({ researchBrief, synthesisConclusion, isDark }: GovernanceSynthesisProps) {
  if (!researchBrief && !synthesisConclusion) return null;

  return (
    <div
      className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      {researchBrief && (
        <div>
          <h3
            className={`text-sm font-bold tracking-tight mb-3 flex items-center gap-2 font-display ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            <Search size={14} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            <span>Research Findings</span>
          </h3>
          <p className={`text-xs leading-relaxed whitespace-pre-line ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {researchBrief}
          </p>
        </div>
      )}

      {synthesisConclusion && (
        <div className={researchBrief ? `mt-6 pt-6 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}` : ''}>
          <h3
            className={`text-sm font-bold tracking-tight mb-3 flex items-center gap-2 font-display ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            <Sparkles size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            <span>Conclusion</span>
          </h3>
          <p className={`text-xs leading-relaxed whitespace-pre-line ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {synthesisConclusion}
          </p>
        </div>
      )}
    </div>
  );
}
