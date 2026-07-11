import React, { useEffect, useState } from 'react';
import { GitCommitHorizontal, Loader2, Sparkles } from 'lucide-react';
import { PolicyEvolutionChain } from '../../types';
import { fetchPolicyEvolution, triggerEvolutionGeneration } from '../../api';
import EvolutionTimeline from '../governance/EvolutionTimeline';

interface PolicyEvolutionCardProps {
  isDark: boolean;
  isAdmin: boolean;
}

export default function PolicyEvolutionCard({ isDark, isAdmin }: PolicyEvolutionCardProps) {
  const [chains, setChains] = useState<PolicyEvolutionChain[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    fetchPolicyEvolution()
      .then(setChains)
      .catch(() => setChains([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await triggerEvolutionGeneration();
      // Clustering + Serper research + LLM synthesis take a while — poll once after a delay.
      setTimeout(() => {
        load();
        setGenerating(false);
      }, 20000);
    } catch {
      setGenerating(false);
    }
  };

  return (
    <div className={`p-6 rounded-[1.75rem] border shadow-xl lg:col-span-2 transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className={`text-sm font-bold font-display tracking-tight flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            <GitCommitHorizontal size={14} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            <span>Policy Evolution</span>
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            How today's tracked policies trace back to earlier schemes, laws, and verdicts — the semantic thread behind a theme.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-colors border shadow-md flex items-center gap-2 shrink-0 ${
              generating
                ? 'opacity-60 cursor-not-allowed border-indigo-600 bg-indigo-600 text-white'
                : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shadow-indigo-600/10'
            }`}
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{generating ? 'Generating…' : 'Regenerate Policy Evolution'}</span>
          </button>
        )}
      </div>

      {loading ? (
        <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Loading…</p>
      ) : !chains || chains.length === 0 ? (
        <div className="text-center py-6">
          <p className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            No Policy Evolution timelines generated yet.
          </p>
          {isAdmin ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`mt-4 px-5 py-2 text-xs font-bold rounded-full transition-colors border shadow-md inline-flex items-center gap-2 ${
                generating
                  ? 'opacity-60 cursor-not-allowed border-indigo-600 bg-indigo-600 text-white'
                  : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shadow-indigo-600/10'
              }`}
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{generating ? 'Generating…' : 'Generate Policy Evolution'}</span>
            </button>
          ) : (
            <p className={`text-[11px] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Check back once an admin has generated it.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {chains.map((chain) => (
            <React.Fragment key={chain.id}>
              <EvolutionTimeline chain={chain} isDark={isDark} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
