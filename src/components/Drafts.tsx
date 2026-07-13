import React, { useState, useMemo } from 'react';
import { Item, Issue } from '../types';
import { ALL_ISSUES_ID, getDefaultPillarMeta } from '../constants';
import {
  AlertTriangle,
  Search,
  ChevronDown,
  X,
  ExternalLink,
  MapPin,
  Building2,
  Calendar,
} from 'lucide-react';

interface DraftsProps {
  onSelectItem: (item: Item) => void;
  theme: 'light' | 'dark';
  items?: Item[];
  currentIssueId: string;
  setCurrentIssueId: (id: string) => void;
  issues: Issue[];
}

export default function Drafts({ onSelectItem, theme, items, currentIssueId, setCurrentIssueId, issues }: DraftsProps) {
  const isDark = theme === 'dark';
  const activeItems = items || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [issueDropdownOpen, setIssueDropdownOpen] = useState(false);

  const isAggregate = currentIssueId === ALL_ISSUES_ID;
  const activeIssueData = issues.find(issue => issue.id === currentIssueId);
  const issueBadgeLabel = isAggregate ? 'All Issues' : activeIssueData?.label;

  const defaultPillarMeta = getDefaultPillarMeta(isDark);

  const draftItems = useMemo(() => {
    const drafts = activeItems.filter(item => item.isDraft);
    if (!searchQuery.trim()) return drafts;
    const query = searchQuery.toLowerCase();
    return drafts.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.ministry.toLowerCase().includes(query)
    );
  }, [activeItems, searchQuery]);

  return (
    <div className="space-y-6">
      <div className={`p-8 rounded-[1.75rem] border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between w-full md:w-auto">
          <div>
            <h2 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight flex items-center gap-2 ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}>
              <AlertTriangle size={26} className="text-amber-500" />
              <span>Draft Policies</span>
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'}`}>
              Policies still in draft/consultation form for <strong>{issueBadgeLabel}</strong>, per their source PDF
            </p>
          </div>

          {/* Dynamic Issue Selection Filter */}
          <div className="relative shrink-0">
            <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1.5">
              Browse Tracking Period
            </label>
            <button
              onClick={() => setIssueDropdownOpen(!issueDropdownOpen)}
              className={`px-4 py-2.5 rounded-full border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-indigo-400 hover:text-indigo-300'
                  : 'bg-white border-zinc-200 hover:bg-zinc-50 text-indigo-600 hover:text-indigo-700'
              }`}
            >
              <Calendar size={13} />
              <span>{issueBadgeLabel}</span>
              <ChevronDown size={12} className="text-zinc-400" />
            </button>

            {issueDropdownOpen && (
              <div className={`absolute left-0 mt-2 border rounded-2xl shadow-2xl w-64 z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => {
                    setCurrentIssueId(ALL_ISSUES_ID);
                    setIssueDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 border-b transition-colors ${
                    isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'
                  } ${isAggregate ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  <span className="font-bold">All Issues</span>
                  <span className="text-[10px] text-zinc-400">Aggregate across all {issues.length} published issues</span>
                </button>
                {issues.map((issue) => {
                  const isSelected = issue.id === currentIssueId;
                  return (
                    <button
                      key={issue.id}
                      onClick={() => {
                        setCurrentIssueId(issue.id);
                        setIssueDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors ${
                        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                      } ${isSelected ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                    >
                      <span className="font-bold">{issue.label}</span>
                      <span className="text-[10px] text-zinc-400">{issue.dateRange} ({issue.itemsCount} updates)</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search draft policies..."
            className={`w-full px-4 py-2.5 pl-10 border rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:bg-zinc-950'
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white'
            }`}
          />
          <Search size={15} className="absolute left-3.5 top-3.5 text-zinc-400 pointer-events-none" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-600 cursor-pointer">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {draftItems.length === 0 ? (
        <div className={`p-12 text-center rounded-[1.75rem] border shadow-xl transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <AlertTriangle size={40} className="mx-auto text-zinc-400 mb-3" />
          <p className={`text-base font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>No draft policies for this period</p>
          <p className={`text-xs mt-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Items only appear here when their source PDF describes them as a draft, consultation paper, or similar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {draftItems.map((item) => {
            const meta = defaultPillarMeta;
            const isState = item.geography.startsWith('state:');
            const stateName = isState ? item.geography.replace('state:', '').trim() : '';

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`p-6 rounded-[1.75rem] border shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer transition-all flex flex-col justify-between h-full group ${
                  isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h4 className={`font-bold text-sm leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 ${
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}>
                      {item.title}
                    </h4>
                    <ExternalLink size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                  </div>
                  <p className={`text-xs leading-relaxed line-clamp-3 mb-4 ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    {item.description}
                  </p>
                </div>

                <div className={`flex flex-wrap gap-1.5 mt-auto pt-3 border-t ${isDark ? 'border-zinc-800/65' : 'border-zinc-100'}`}>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-100 text-amber-900 border-amber-300">
                    <AlertTriangle size={10} />
                    <span>Draft</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm" style={{ backgroundColor: meta.bg, color: meta.text }}>
                    {item.theme}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-550 border-zinc-200'
                  }`}>
                    {item.date}
                  </span>
                  {isState ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isDark
                        ? 'bg-purple-900/40 border-purple-800/40 text-purple-200'
                        : 'bg-purple-100/60 border-purple-200/80 text-purple-700'
                    }`}>
                      <MapPin size={10} className={isDark ? 'text-purple-200' : 'text-purple-600'} />
                      <span>{stateName}</span>
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isDark
                        ? 'bg-indigo-900/40 border-indigo-800/40 text-indigo-200'
                        : 'bg-indigo-100/60 border-indigo-200/80 text-indigo-700'
                    }`}>
                      <Building2 size={10} className={isDark ? 'text-indigo-200' : 'text-indigo-600'} />
                      <span className="truncate max-w-[85px]">{item.ministry}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
