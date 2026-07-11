import React, { useState, useRef, useEffect } from 'react';
import { Network, Loader2 } from 'lucide-react';
import { PolicyGovernance } from '../../types';
import { triggerGovernanceGeneration, fetchItemGovernance } from '../../api';

interface PendingGovernanceProps {
  itemId: string;
  isAdmin: boolean;
  isDark: boolean;
  onReady: (governance: PolicyGovernance) => void;
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 15; // ~1 minute

export default function PendingGovernance({ itemId, isAdmin, isDark, onReady }: PendingGovernanceProps) {
  const [generating, setGenerating] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const poll = async (count: number) => {
    try {
      const status = await fetchItemGovernance(itemId);
      if (status.status === 'ready' && status.governance) {
        setGenerating(false);
        onReady(status.governance);
        return;
      }
    } catch {
      // keep polling — transient fetch errors shouldn't stop the loop
    }
    if (count >= MAX_POLLS) {
      setGenerating(false);
      return;
    }
    setPollCount(count + 1);
    timerRef.current = setTimeout(() => poll(count + 1), POLL_INTERVAL_MS);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setPollCount(0);
    try {
      await triggerGovernanceGeneration(itemId);
      timerRef.current = setTimeout(() => poll(1), POLL_INTERVAL_MS);
    } catch {
      setGenerating(false);
    }
  };

  return (
    <div
      className={`p-10 text-center rounded-[1.75rem] border shadow-xl transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <Network size={36} className={`mx-auto mb-3 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
      <p className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
        {generating ? 'Analyzing governance dynamics…' : 'Governance Intelligence not yet generated'}
      </p>
      <p className={`text-xs mt-1.5 max-w-md mx-auto ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {generating
          ? 'Applying Kingdon Streams, Punctuated Equilibrium, Entrepreneurs, and Wickedness — this usually takes under a minute.'
          : 'This item hasn’t been run through the governance frameworks yet.'}
      </p>

      {isAdmin && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={`mt-5 px-5 py-2 text-xs font-bold rounded-full cursor-pointer transition-colors border shadow-md flex items-center gap-2 mx-auto ${
            generating
              ? 'opacity-60 cursor-not-allowed border-indigo-600 bg-indigo-600 text-white'
              : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/10'
          }`}
        >
          {generating && <Loader2 size={13} className="animate-spin" />}
          <span>{generating ? `Generating${'.'.repeat((pollCount % 3) + 1)}` : 'Generate Governance Intelligence Now'}</span>
        </button>
      )}
    </div>
  );
}
