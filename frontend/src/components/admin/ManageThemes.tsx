import React, { useState, useEffect } from 'react';
import { PillarRecord, adminListPillars, createPillar, deletePillar, fetchPillarStats } from '../../api';
import { Trash2, Loader2, Tag, AlertTriangle, Plus } from 'lucide-react';

interface ManageThemesProps {
  isDark: boolean;
  onPillarsChanged: () => void;
}

export default function ManageThemes({ isDark, onPillarsChanged }: ManageThemesProps) {
  const [pillars, setPillars] = useState<PillarRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const load = () => {
    setIsLoading(true);
    Promise.all([adminListPillars(), fetchPillarStats()])
      .then(([pillarList, stats]) => {
        setPillars(pillarList);
        setCounts(Object.fromEntries(stats.map((s) => [s.pillar, s.count])));
      })
      .catch((err) => setError(err.message || 'Failed to load themes'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (pillarId: string) => {
    setDeletingId(pillarId);
    setError(null);
    try {
      await deletePillar(pillarId);
      setPillars((prev) => prev.filter((p) => p.id !== pillarId));
      setConfirmingId(null);
      onPillarsChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to delete theme');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createPillar(newName.trim());
      setPillars((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      onPillarsChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to create theme');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className={`p-3 rounded-xl border text-xs font-bold ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-2 items-stretch sm:items-end ${
          isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50/50 border-zinc-200'
        }`}
      >
        <div className="flex-1 min-w-0">
          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>New Theme Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Digital Governance"
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={isCreating || !newName.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 justify-center disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          <span>Add Theme</span>
        </button>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-zinc-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : pillars.length === 0 ? (
        <div className={`p-10 text-center rounded-2xl border ${isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <Tag size={32} className="mx-auto text-zinc-400 mb-2" />
          <p className="text-xs font-semibold text-zinc-500">No themes yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border ${
                isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Tag size={16} className="text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{pillar.name}</p>
                  <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{counts[pillar.name] ?? 0} items</p>
                </div>
              </div>

              {confirmingId === pillar.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    <AlertTriangle size={11} /> Delete theme?
                  </span>
                  <button
                    onClick={() => handleDelete(pillar.id)}
                    disabled={deletingId === pillar.id}
                    className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors"
                  >
                    {deletingId === pillar.id ? <Loader2 size={11} className="animate-spin" /> : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(pillar.id)}
                  className="shrink-0 p-2 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                  title="Delete theme"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
