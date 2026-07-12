import React, { useState, useEffect } from 'react';
import { Item } from '../../types';
import { fetchAllItems, deleteItem } from '../../api';
import { Trash2, Loader2, FileText, AlertTriangle } from 'lucide-react';

interface ManageItemsProps {
  isDark: boolean;
  onItemsChanged: () => void;
}

export default function ManageItems({ isDark, onItemsChanged }: ManageItemsProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredItems = items.filter((it) =>
    !searchQuery.trim() ||
    it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    it.ministry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {items.length} tracked items
        </h3>
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
              className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border ${
                isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{item.title}</p>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5 truncate">
                  {item.ministry} &bull; {item.theme} &bull; {item.date}
                </p>
              </div>

              {confirmingId === item.id ? (
                <div className="flex items-center gap-2 shrink-0">
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
                  className="shrink-0 p-2 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                  title="Delete item"
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
