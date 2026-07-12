import React, { useState, useMemo } from 'react';
import { Item, Ministry, CompareType, CompareGovernanceResult } from '../types';
import { fetchGovernanceCompare } from '../api';
import { GitCompare, Loader2 } from 'lucide-react';
import CompareView from './governance/CompareView';

interface CompareProps {
  theme: 'light' | 'dark';
  items: Item[];
  ministries: Ministry[];
  pillars: string[];
}

export default function Compare({ theme, items, ministries, pillars }: CompareProps) {
  const isDark = theme === 'dark';
  const [type, setType] = useState<CompareType>('policy');
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [result, setResult] = useState<CompareGovernanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    if (type === 'policy') return items.map((it) => ({ id: it.id, label: it.title }));
    if (type === 'ministry') return ministries.map((m) => ({ id: m.id, label: m.name }));
    return pillars.map((p) => ({ id: p, label: p }));
  }, [type, items, ministries, pillars]);

  const handleTypeChange = (next: CompareType) => {
    setType(next);
    setIdA('');
    setIdB('');
    setResult(null);
    setError(null);
  };

  const handleCompare = async () => {
    if (!idA || !idB || idA === idB) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGovernanceCompare(type, idA, idB);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-8 rounded-[1.75rem] border shadow-xl transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <span className={`text-xs font-bold tracking-widest block mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
          <GitCompare size={12} className="inline mr-1.5 -mt-0.5" />
          COMPARATIVE INTELLIGENCE
        </span>
        <h2 className={`text-2xl font-extrabold font-display tracking-tight mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          Compare Two Policies, Ministries, or Sectors
        </h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Side-by-side governance readings — genome signatures, wickedness, streams, and typology.
        </p>

        <div className={`inline-flex gap-1.5 p-1 rounded-full shadow-inner border mb-5 transition-all ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          {(['policy', 'ministry', 'sector'] as CompareType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                type === t
                  ? isDark
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50'
                    : 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                  : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { value: idA, setValue: setIdA, label: 'Entry A' },
            { value: idB, setValue: setIdB, label: 'Entry B' },
          ].map((slot) => (
            <div key={slot.label}>
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {slot.label}
              </label>
              <select
                value={slot.value}
                onChange={(e) => slot.setValue(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                }`}
              >
                <option value="">Select {type}…</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button
          onClick={handleCompare}
          disabled={!idA || !idB || idA === idB || loading}
          className={`mt-5 px-5 py-2 text-xs font-bold rounded-full transition-colors border shadow-md flex items-center gap-2 ${
            !idA || !idB || idA === idB || loading
              ? 'opacity-50 cursor-not-allowed border-indigo-600 bg-indigo-600 text-white'
              : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shadow-indigo-600/10'
          }`}
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          <span>{loading ? 'Comparing…' : 'Compare'}</span>
        </button>
        {error && <p className="text-xs font-semibold text-rose-500 mt-3">{error}</p>}
      </div>

      {result && <CompareView result={result} isDark={isDark} />}
    </div>
  );
}
