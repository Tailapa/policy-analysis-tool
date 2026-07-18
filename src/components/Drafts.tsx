import React, { useState, useMemo, useEffect } from 'react';
import { Item, Issue } from '../types';
import { getDefaultPillarMeta, getItemIssueLabel } from '../constants';
import { downloadItemsReportPdf } from '../api';
import Pagination from './Pagination';
import TrackingPeriodFilter from './TrackingPeriodFilter';
import { useTrackingPeriodFilter } from '../hooks/useTrackingPeriodFilter';
import {
  AlertTriangle,
  Search,
  X,
  ExternalLink,
  Building2,
  Calendar,
  Download,
  Loader2,
} from 'lucide-react';

interface DraftsProps {
  onSelectItem: (item: Item) => void;
  theme: 'light' | 'dark';
  items?: Item[];
  issues: Issue[];
  isLoading?: boolean;
}

export default function Drafts({ onSelectItem, theme, items, issues }: DraftsProps) {
  const isDark = theme === 'dark';
  const allItems = items || [];
  const trackingPeriod = useTrackingPeriodFilter(issues);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const issueBadgeLabel = trackingPeriod.isAllIssues
    ? 'All Issues'
    : `${trackingPeriod.matchingIssuesCount} Issue${trackingPeriod.matchingIssuesCount === 1 ? '' : 's'} Selected`;

  const defaultPillarMeta = getDefaultPillarMeta(isDark);

  const draftItems = useMemo(() => {
    const periodItems = trackingPeriod.filterItemsByPeriod(allItems);
    const drafts = periodItems.filter(item => item.isDraft);
    if (!searchQuery.trim()) return drafts;
    const query = searchQuery.toLowerCase();
    return drafts.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.ministry.toLowerCase().includes(query)
    );
  }, [allItems, searchQuery, trackingPeriod.matchingIssueIds]);

  const DRAFTS_PAGE_SIZE = 6;
  const [draftsPage, setDraftsPage] = useState(1);

  useEffect(() => {
    setDraftsPage(1);
  }, [searchQuery, allItems, trackingPeriod.matchingIssueIds]);

  const draftsTotalPages = Math.max(1, Math.ceil(draftItems.length / DRAFTS_PAGE_SIZE));
  const paginatedDraftItems = useMemo(() => {
    const start = (draftsPage - 1) * DRAFTS_PAGE_SIZE;
    return draftItems.slice(start, start + DRAFTS_PAGE_SIZE);
  }, [draftItems, draftsPage]);

  const handleDownloadPdf = async () => {
    if (draftItems.length === 0) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadItemsReportPdf(
        draftItems.map(i => i.id),
        'Draft Policies',
        `${issueBadgeLabel} — per source PDF`
      );
    } catch (err: any) {
      setDownloadError(err.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-8 rounded-[1.75rem] border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-[#caf0f8] border-[#ade8f4] shadow-cyan-900/10'
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between w-full md:w-auto">
          <div>
            <h2 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'
              }`}>
              <AlertTriangle size={26} className="text-amber-500" />
              <span>Draft Policies</span>
            </h2>

          </div>

          <TrackingPeriodFilter issues={issues} theme={theme} filter={trackingPeriod} />
        </div>

        {/* Download + Search */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          {downloadError && <span className="text-xs font-bold text-rose-500">{downloadError}</span>}
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || draftItems.length === 0}
            title={draftItems.length === 0 ? 'No draft policies to export' : undefined}
            className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 border shadow-sm transition-all cursor-pointer ${downloading || draftItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              } ${isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
              }`}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Download PDF</span>
          </button>
          <div className="relative w-full md:w-80 shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search draft policies..."
              className={`w-full px-4 py-2.5 pl-10 border rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${isDark
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
      </div>

      {draftItems.length === 0 ? (
        <div className={`p-12 text-center rounded-[1.75rem] border shadow-xl transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
          <AlertTriangle size={40} className="mx-auto text-zinc-400 mb-3" />
          <p className={`text-base font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>No draft policies for this period</p>
          <p className={`text-xs mt-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Items only appear here when their source PDF describes them as a draft, consultation paper, or similar.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedDraftItems.map((item) => {
              const meta = defaultPillarMeta;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`p-6 rounded-[1.75rem] border shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer transition-all flex flex-col justify-between h-full group ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h4 className={`font-bold text-sm leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'
                        }`}>
                        {item.title}
                      </h4>
                      <ExternalLink size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-3 mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-550 border-zinc-200'
                      }`}>
                      {item.date}
                    </span>
                    {getItemIssueLabel(item.issueId, issues) && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isDark ? 'bg-sky-950/40 text-sky-300 border-sky-800/50' : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}>
                        <Calendar size={9} />
                        <span>{getItemIssueLabel(item.issueId, issues)}</span>
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDark
                        ? 'bg-indigo-900/40 border-indigo-800/40 text-indigo-200'
                        : 'bg-indigo-100/60 border-indigo-200/80 text-indigo-700'
                      }`}>
                      <Building2 size={10} className={isDark ? 'text-indigo-200' : 'text-indigo-600'} />
                      <span className="truncate max-w-[85px]">{item.ministry}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={draftsPage}
            totalPages={draftsTotalPages}
            onPageChange={setDraftsPage}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}
