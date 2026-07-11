import React from 'react';
import { EvolutionStage, EvolutionSource } from '../../types';

interface EvolutionChainLike {
  theme_label: string;
  stages: EvolutionStage[];
  synthesis: string;
  sources: EvolutionSource[];
}

interface EvolutionTimelineProps {
  chain: EvolutionChainLike;
  isDark: boolean;
}

export default function EvolutionTimeline({ chain, isDark }: EvolutionTimelineProps) {
  return (
    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <h4 className={`text-sm font-bold font-display mb-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{chain.theme_label}</h4>

      <div className="flex items-start overflow-x-auto pb-2">
        {chain.stages.map((stage, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center text-center shrink-0" style={{ width: '120px' }}>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  stage.source === 'dashboard'
                    ? isDark
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-indigo-600 border-indigo-600'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-600 border-dashed'
                      : 'bg-white border-zinc-300 border-dashed'
                }`}
              />
              <span className={`text-[10px] font-bold mt-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{stage.year}</span>
              <span className={`text-[10px] font-semibold mt-0.5 leading-tight ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {stage.label}
              </span>
              <span className={`text-[9px] leading-snug mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{stage.description}</span>
            </div>
            {i < chain.stages.length - 1 && (
              <div className={`h-0.5 mt-3 shrink-0 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} style={{ width: '20px' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <p className={`text-xs leading-relaxed mt-4 pt-4 border-t ${isDark ? 'text-zinc-400 border-zinc-800' : 'text-zinc-600 border-zinc-200'}`}>
        {chain.synthesis}
      </p>
      {chain.sources.length > 0 && (
        <p className={`text-[10px] font-semibold mt-2 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Grounded in {chain.sources.length} web {chain.sources.length === 1 ? 'source' : 'sources'} · solid dot = tracked in this dashboard, dashed = historical research
        </p>
      )}
    </div>
  );
}
