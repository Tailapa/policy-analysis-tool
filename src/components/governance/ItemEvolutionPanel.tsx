import React, { useState, useRef, useEffect } from 'react';
import { GitCommitHorizontal, Loader2, Sparkles } from 'lucide-react';
import { ItemEvolution } from '../../types';
import { fetchItemEvolution, triggerItemEvolutionGeneration } from '../../api';
import EvolutionTimeline from './EvolutionTimeline';

interface ItemEvolutionPanelProps {
  itemId: string;
  isAdmin: boolean;
  isDark: boolean;
  onOpenItem?: (itemId: string) => void;
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 30; // ~2 minutes

/** Auto-generated at ingestion (once the item's embedding is ready) from
 * other PDF-ingested items in earlier issues — no web grounding. Renders
 * nothing at all when there's no related history in prior editions, per
 * the "only from the PDFs I've uploaded" requirement. Admins get a
 * Regenerate control once a chain exists, for re-running it after data
 * changes; there's no manual "generate" affordance since this isn't meant
 * to be triggered from scratch here. */
export default function ItemEvolutionPanel({ itemId, isAdmin, isDark, onOpenItem }: ItemEvolutionPanelProps) {
  const [evolution, setEvolution] = useState<ItemEvolution | null | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEvolution(undefined);
  }, [itemId]);

  useEffect(() => {
    if (evolution !== undefined) return;
    fetchItemEvolution(itemId)
      .then((status) => setEvolution(status.evolution))
      .catch(() => setEvolution(null));
  }, [itemId, evolution]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const poll = async (count: number) => {
    try {
      const status = await fetchItemEvolution(itemId);
      if (status.status === 'ready' && status.evolution) {
        setGenerating(false);
        setEvolution(status.evolution);
        return;
      }
    } catch {
      // keep polling
    }
    if (count >= MAX_POLLS) {
      setGenerating(false);
      return;
    }
    timerRef.current = setTimeout(() => poll(count + 1), POLL_INTERVAL_MS);
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      await triggerItemEvolutionGeneration(itemId, true);
      timerRef.current = setTimeout(() => poll(1), POLL_INTERVAL_MS);
    } catch {
      setGenerating(false);
    }
  };

  if (!evolution) return null;

  return (
    <div className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className={`text-sm font-bold font-display tracking-tight flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            <GitCommitHorizontal size={15} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            <span>Policy Evolution</span>
          </h3>
          <p className={`text-xs leading-relaxed mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            This policy's genealogy across earlier editions — built only from policies already tracked in this dashboard's uploaded PDFs.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-colors border shadow-md flex items-center gap-2 shrink-0 ${
              generating
                ? 'opacity-60 cursor-not-allowed border-indigo-600 bg-indigo-600 text-white'
                : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shadow-indigo-600/10'
            }`}
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{generating ? 'Generating…' : 'Regenerate'}</span>
          </button>
        )}
      </div>

      <EvolutionTimeline chain={evolution} isDark={isDark} onOpenItem={onOpenItem} />
    </div>
  );
}
