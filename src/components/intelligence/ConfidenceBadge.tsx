import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { ConfidenceLevel } from '../../types';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  reasoning: string;
  isDark: boolean;
}

const CONFIDENCE_META: Record<ConfidenceLevel, { label: string; light: string; dark: string }> = {
  high: { label: 'High confidence', light: 'bg-emerald-50 text-emerald-800 border-emerald-200', dark: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  medium: { label: 'Medium confidence', light: 'bg-amber-50 text-amber-800 border-amber-200', dark: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  low: { label: 'Low confidence', light: 'bg-zinc-100 text-zinc-600 border-zinc-200', dark: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
};

export default function ConfidenceBadge({ confidence, reasoning, isDark }: ConfidenceBadgeProps) {
  const [open, setOpen] = useState(false);
  const meta = CONFIDENCE_META[confidence];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-colors ${
          isDark ? meta.dark : meta.light
        }`}
      >
        <Info size={11} />
        <span>{meta.label}</span>
      </button>
      {open && (
        <div
          className={`absolute z-40 right-0 mt-2 w-72 p-3.5 rounded-2xl border shadow-2xl text-xs leading-relaxed transition-all ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'
          }`}
        >
          <p className="font-medium">{reasoning}</p>
          <p className={`mt-2.5 pt-2.5 border-t text-[10px] font-semibold ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-100 text-zinc-400'}`}>
            AI-generated interpretation — not a definitive classification.
          </p>
        </div>
      )}
    </div>
  );
}
