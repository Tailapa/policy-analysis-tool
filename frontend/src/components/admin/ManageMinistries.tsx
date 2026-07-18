import React, { useState, useEffect } from 'react';
import { Ministry, MinistryCategory } from '../../types';
import { adminListMinistries, createMinistry, updateMinistry, deleteMinistry, mergeMinistry } from '../../api';
import { Trash2, Loader2, Building2, AlertTriangle, Plus, Merge } from 'lucide-react';

interface ManageMinistriesProps {
  isDark: boolean;
  onMinistriesChanged: () => void;
}

export default function ManageMinistries({ isDark, onMinistriesChanged }: ManageMinistriesProps) {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');

  const [newName, setNewName] = useState('');
  const [newMinister, setNewMinister] = useState('');
  const [newCategory, setNewCategory] = useState<MinistryCategory>('ministry');
  const [isCreating, setIsCreating] = useState(false);

  const load = () => {
    setIsLoading(true);
    adminListMinistries()
      .then(setMinistries)
      .catch((err) => setError(err.message || 'Failed to load ministries'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCategoryChange = async (ministry: Ministry, nextCategory: MinistryCategory) => {
    if (nextCategory === (ministry.category || 'ministry')) return;
    setBusyId(ministry.id);
    setError(null);
    try {
      const updated = await updateMinistry(ministry.id, { category: nextCategory });
      setMinistries((prev) => prev.map((m) => (m.id === ministry.id ? updated : m)));
      onMinistriesChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to reclassify');
    } finally {
      setBusyId(null);
    }
  };

  const handleMerge = async (sourceId: string) => {
    if (!mergeTargetId) return;
    setBusyId(sourceId);
    setError(null);
    try {
      await mergeMinistry(sourceId, mergeTargetId);
      setMergingId(null);
      setMergeTargetId('');
      load();
      onMinistriesChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to merge');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (ministryId: string) => {
    setBusyId(ministryId);
    setError(null);
    try {
      await deleteMinistry(ministryId);
      setMinistries((prev) => prev.filter((m) => m.id !== ministryId));
      setConfirmingId(null);
      onMinistriesChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to delete ministry');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createMinistry({
        name: newName.trim(),
        minister_name: newMinister.trim() || undefined,
        category: newCategory,
      });
      setMinistries((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewMinister('');
      setNewCategory('ministry');
      onMinistriesChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to create entry');
    } finally {
      setIsCreating(false);
    }
  };

  const renderGroup = (label: string, category: MinistryCategory) => {
    const group = ministries.filter((m) => (m.category || 'ministry') === category);
    return (
      <div>
        <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {label} ({group.length})
        </h4>
        {group.length === 0 ? (
          <p className="text-xs text-zinc-500 font-medium py-2">None yet.</p>
        ) : (
          <div className="space-y-2">
            {group.map((ministry) => (
              <div
                key={ministry.id}
                className={`rounded-xl border ${
                  isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <Building2 size={16} className="text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{ministry.name}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold mt-0.5 truncate">
                        {ministry.minister || 'No minister set'} &bull; {ministry.itemCount} items
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={ministry.category || 'ministry'}
                      onChange={(e) => handleCategoryChange(ministry, e.target.value as MinistryCategory)}
                      disabled={busyId === ministry.id}
                      title="Recategorize"
                      className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer focus:outline-none ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <option value="ministry">Ministry</option>
                      <option value="regulatory_body">Regulatory Body</option>
                      <option value="misc">Miscellaneous</option>
                    </select>
                    {busyId === ministry.id && <Loader2 size={13} className="animate-spin text-zinc-400" />}

                    {confirmingId === ministry.id ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                          <AlertTriangle size={11} /> Delete?
                        </span>
                        <button
                          onClick={() => handleDelete(ministry.id)}
                          disabled={busyId === ministry.id}
                          className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors"
                        >
                          Confirm
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
                      <>
                        <button
                          onClick={() => {
                            setMergingId(mergingId === ministry.id ? null : ministry.id);
                            setMergeTargetId('');
                          }}
                          className={`p-2 rounded-full cursor-pointer transition-colors ${
                            isDark ? 'text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title="Merge into another entity"
                        >
                          <Merge size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmingId(ministry.id)}
                          className="p-2 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {mergingId === ministry.id && (
                  <div className={`mx-4 mb-3 p-3 rounded-lg border flex flex-wrap items-center gap-2 ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}>
                    <span className={`text-[10px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Merge "{ministry.name}" into
                    </span>
                    <select
                      value={mergeTargetId}
                      onChange={(e) => setMergeTargetId(e.target.value)}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex-1 min-w-[160px] focus:outline-none ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                      }`}
                    >
                      <option value="">Select target entity…</option>
                      {ministries
                        .filter((m) => m.id !== ministry.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleMerge(ministry.id)}
                      disabled={!mergeTargetId || busyId === ministry.id}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {busyId === ministry.id ? <Loader2 size={11} className="animate-spin" /> : 'Merge'}
                    </button>
                    <button
                      onClick={() => setMergingId(null)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className={`p-3 rounded-xl border text-xs font-bold ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
          {error}
        </div>
      )}

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-2 items-stretch sm:items-end ${
          isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50/50 border-zinc-200'
        }`}
      >
        <div className="flex-1 min-w-0">
          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Securities and Exchange Board of India"
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Minister / Chair (optional)</label>
          <input
            type="text"
            value={newMinister}
            onChange={(e) => setNewMinister(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          />
        </div>
        <div>
          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Category</label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as MinistryCategory)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <option value="ministry">Ministry</option>
            <option value="regulatory_body">Regulatory Body</option>
            <option value="misc">Miscellaneous</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isCreating || !newName.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 justify-center disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          <span>Add</span>
        </button>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-zinc-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {renderGroup('Ministries', 'ministry')}
          {renderGroup('Regulatory Bodies', 'regulatory_body')}
          {renderGroup('Miscellaneous', 'misc')}
        </div>
      )}
    </div>
  );
}
