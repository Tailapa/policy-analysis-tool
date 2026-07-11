import React from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { SourceCitation } from '../../types';

interface SourcesConsultedProps {
  sources: SourceCitation[];
  isDark: boolean;
}

export default function SourcesConsulted({ sources, isDark }: SourcesConsultedProps) {
  return (
    <div
      className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <h3
        className={`text-sm font-bold tracking-tight mb-1 flex items-center gap-2 font-display ${
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        }`}
      >
        <Search size={14} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
        <span>Sources Consulted During Analysis</span>
        <span className="text-xs font-semibold text-zinc-400">({sources.length} citations)</span>
      </h3>
      <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Web searches the AI ran to ground this analysis in current, specific facts.
      </p>
      <ul className="space-y-3">
        {sources.map((source, index) => (
          <li
            key={index}
            className={`flex items-start gap-3 p-4 border rounded-2xl text-xs transition-all ${
              isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200 shadow-sm'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full border font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                isDark
                  ? 'bg-indigo-950/40 border-indigo-800 text-indigo-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800'
              }`}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <span className={`font-bold block ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{source.title}</span>
              <p className={`mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{source.snippet}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline mt-1.5 font-bold break-all"
              >
                <span>{source.url}</span>
                <ExternalLink size={12} />
              </a>
              <span
                className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                }`}
              >
                via: &ldquo;{source.query}&rdquo;
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
