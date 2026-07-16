import React, { useState, useEffect } from 'react';
import { Item, Ministry, MinistryCategory } from '../../types';
import { fetchAllItems, deleteItem, adminListMinistries, updateItemMinistries } from '../../api';
import { Trash2, Loader2, FileText, AlertTriangle, Link2, Check, X } from 'lucide-react';

interface ManageItemsProps {
  isDark: boolean;
  onItemsChanged: () => void;
  /** When set, only items with at least one linked ministry/regulatory
   * body of this category are shown — powers the "Manage Misc Items" tab,
   * scoped to Union Cabinet / PM's Office / NITI Aayog / flagged-unmapped
   * items, without duplicating this whole component. */
  scopeCategory?: MinistryCategory;
}

export default function ManageItems({ isDark, onItemsChanged, scopeCategory }: ManageItemsProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const [ministries, setMinistries] = useState<Ministry[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSelectedIds, setEditSelectedIds] = useState<Set<string>>(new Set());
  const [editPrimaryId, setEditPrimaryId] = useState<string | null>(null);
  const [savingLinks, setSavingLinks] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    fetchAllItems()
      .then((fetched) => {
        // /api/items paginates on a non-unique sort key (item_date), so under
        // concurrent requests the same item can land on two pages — dedupe defensively.
        const seen = new Set<string>();
        setItems(fetched.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true))));
      })
      .catch((err) => setError(err.message || 'Failed to load items'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (itemId: string) => {
    setDeletingId(itemId);
    setError(null);
    try {
      await deleteItem(itemId);
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      setConfirmingId(null);
      onItemsChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditLinks = (item: Item) => {
    setLinksError(null);
    setEditingId(item.id);
    setEditSelectedIds(new Set(item.linkedMinistries.map((m) => m.id)));
    setEditPrimaryId(item.linkedMinistries[0]?.id ?? null);
    if (ministries === null) {
      adminListMinistries()
        .then(setMinistries)
        .catch((err) => setLinksError(err.message || 'Failed to load ministries/regulatory bodies'));
    }
  };

  const toggleSelected = (ministryId: string) => {
    setEditSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ministryId)) {
        next.delete(ministryId);
        if (editPrimaryId === ministryId) setEditPrimaryId(next.values().next().value ?? null);
      } else {
        next.add(ministryId);
        if (!editPrimaryId) setEditPrimaryId(ministryId);
      }
      return next;
    });
  };

  const saveLinks = async (itemId: string) => {
    if (!editPrimaryId) {
      setLinksError('Select at least one ministry or regulatory body, and mark one as primary.');
      return;
    }
    setSavingLinks(true);
    setLinksError(null);
    try {
      const additionalIds = [...editSelectedIds].filter((id): id is string => id !== editPrimaryId);
      const updated = await updateItemMinistries(itemId, {
        ministry_id: editPrimaryId,
        additional_ministry_ids: additionalIds,
      });
      setItems((prev) => prev.map((it) => (it.id === itemId ? updated : it)));
      setEditingId(null);
      onItemsChanged();
    } catch (err: any) {
      setLinksError(err.message || 'Failed to update links');
    } finally {
      setSavingLinks(false);
    }
  };

  const scopedItems = scopeCategory
    ? items.filter((it) => it.linkedMinistries.some((m) => m.category === scopeCategory))
    : items;

  const flaggedCount = scopedItems.filter((it) => it.needsMinistryReview).length;

  const filteredItems = scopedItems
    .filter((it) =>
      (!searchQuery.trim() ||
        it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.ministry.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!flaggedOnly || it.needsMinistryReview)
    )
    .sort((a, b) => Number(b.needsMinistryReview) - Number(a.needsMinistryReview));

  const renderMinistryGroup = (label: string, category: MinistryCategory) => {
    const group = (ministries || []).filter((m) => (m.category || 'ministry') === category);
    if (group.length === 0) return null;
    return (
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</p>
        <div className="space-y-1">
          {group.map((m) => {
            const isSelected = editSelectedIds.has(m.id);
            const isPrimary = editPrimaryId === m.id;
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer min-w-0">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(m.id)} />
                  <span className={`truncate font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{m.name}</span>
                </label>
                {isSelected && (
                  <button
                    onClick={() => setEditPrimaryId(m.id)}
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      isPrimary
                        ? 'bg-indigo-600 text-white'
                        : isDark
                          ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                          : 'bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {isPrimary ? 'Primary' : 'Set primary'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {scopedItems.length} tracked items
          </h3>
          {flaggedCount > 0 && (
            <button
              onClick={() => setFlaggedOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors border ${
                flaggedOnly
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : isDark
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
              title="Items with no ministry explicitly named in their own text — needs a human to map them"
            >
              <AlertTriangle size={11} />
              {flaggedCount} need{flaggedCount === 1 ? 's' : ''} ministry review
              {flaggedOnly && <X size={11} />}
            </button>
          )}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className={`px-3.5 py-1.5 border rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
            isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
              : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
          }`}
        />
      </div>

      {error && (
        <div className={`p-3 rounded-xl border text-xs font-bold ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-zinc-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={`p-10 text-center rounded-2xl border ${isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <FileText size={32} className="mx-auto text-zinc-400 mb-2" />
          <p className="text-xs font-semibold text-zinc-500">No items found.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border ${
                item.needsMinistryReview
                  ? isDark ? 'bg-amber-500/5 border-amber-500/30' : 'bg-amber-50/60 border-amber-200'
                  : isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {item.needsMinistryReview && (
                      <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                        isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <AlertTriangle size={9} /> Needs review
                      </span>
                    )}
                    <p className={`text-xs font-bold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{item.title}</p>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-semibold mt-0.5 truncate">
                    {item.linkedMinistries.map((m) => m.name).join(' + ') || item.ministry} &bull; {item.theme} &bull; {item.date}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => (editingId === item.id ? setEditingId(null) : startEditLinks(item))}
                    className={`p-2 rounded-full cursor-pointer transition-colors ${
                      isDark ? 'text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                    title="Edit ministry/regulatory body links"
                  >
                    <Link2 size={14} />
                  </button>

                  {confirmingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        <AlertTriangle size={11} /> Delete permanently?
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors"
                      >
                        {deletingId === item.id ? <Loader2 size={11} className="animate-spin" /> : 'Confirm'}
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
                      onClick={() => setConfirmingId(item.id)}
                      className="p-2 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="Delete item"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {editingId === item.id && (
                <div className={`mx-4 mb-4 p-4 rounded-xl border space-y-3 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  {linksError && (
                    <div className={`p-2 rounded-lg border text-[11px] font-bold ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                      {linksError}
                    </div>
                  )}
                  {ministries === null ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Loader2 size={13} className="animate-spin" /> Loading ministries…
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {renderMinistryGroup('Ministries', 'ministry')}
                      {renderMinistryGroup('Regulatory Bodies', 'regulatory_body')}
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                        isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      <X size={11} /> Cancel
                    </button>
                    <button
                      onClick={() => saveLinks(item.id)}
                      disabled={savingLinks}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {savingLinks ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Save Links
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
