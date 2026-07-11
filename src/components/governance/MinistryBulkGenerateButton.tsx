import React, { useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { triggerMinistryBulkGenerate, BulkGenerateResult } from '../../api';

interface MinistryBulkGenerateButtonProps {
  ministryId: string;
  isDark: boolean;
}

export default function MinistryBulkGenerateButton({ ministryId, isDark }: MinistryBulkGenerateButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<BulkGenerateResult | null>(null);

  const handleClick = async () => {
    setState('loading');
    try {
      const res = await triggerMinistryBulkGenerate(ministryId);
      setResult(res);
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done' && result) {
    const total = Math.max(result.queued_intelligence, result.queued_governance);
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border ${
          isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}
      >
        <Check size={13} />
        <span>
          {total > 0
            ? `Queued ${total} ${total === 1 ? 'policy' : 'policies'} for analysis`
            : 'All policies already analyzed'}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`px-4 py-2 text-xs font-bold rounded-full transition-colors border shadow-md flex items-center gap-2 ${
        state === 'loading'
          ? 'opacity-60 cursor-not-allowed border-indigo-600 bg-indigo-600 text-white'
          : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shadow-indigo-600/10'
      }`}
      title="Generates both Policy Intelligence and Governance Intelligence for every policy in this ministry that doesn't have them yet"
    >
      {state === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
      <span>
        {state === 'loading' ? 'Queuing…' : state === 'error' ? 'Retry — Generate All' : 'Generate Intelligence for All Policies'}
      </span>
    </button>
  );
}
