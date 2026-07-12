import React, { useState, useMemo } from 'react';
import { Item, Pillar, Status, Impact, Issue, Ministry } from '../types';
import { ALL_ISSUES_ID, getDefaultPillarMeta } from '../constants';
import {
  Building2,
  MapPin,
  ExternalLink,
  ChevronDown,
  Search,
  Flame,
  Calendar,
  SlidersHorizontal,
  X,
  FileText
} from 'lucide-react';

interface OverviewProps {
  onSelectItem: (item: Item) => void;
  selectedMinistry?: string;
  setSelectedMinistry: (ministry: string | undefined) => void;
  theme: 'light' | 'dark';
  items?: Item[];
  currentIssueId: string;
  setCurrentIssueId: (id: string) => void;
  issues: Issue[];
  ministries: Ministry[];
  pillars: string[];
  isLoading?: boolean;
}

export default function Overview({
  onSelectItem,
  selectedMinistry,
  setSelectedMinistry,
  theme,
  items,
  currentIssueId,
  setCurrentIssueId,
  issues,
  ministries,
  pillars,
  isLoading
}: OverviewProps) {
  const isDark = theme === 'dark';
  const activeItems = items || [];
  // Filters state
  const [selectedTheme, setSelectedTheme] = useState<Pillar | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<Status | undefined>(undefined);
  const [selectedImpact, setSelectedImpact] = useState<Impact | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Date Filter states
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'last-3-months' | 'last-6-months' | 'last-1-year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Dropdown open states
  const [ministryDropdownOpen, setMinistryDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [impactDropdownOpen, setImpactDropdownOpen] = useState(false);
  const [issueDropdownOpen, setIssueDropdownOpen] = useState(false);

  // Dynamic stats calculated from active items
  const stats = useMemo(() => {
    const total = activeItems.length || 1;
    const initiated = activeItems.filter(i => i.status === 'Initiated').length;
    const completed = activeItems.filter(i => i.status === 'Completed').length;
    const announced = activeItems.filter(i => i.status === 'Announced').length;
    const highImpact = activeItems.filter(i => i.impact === 'High').length;
    const ministriesCount = new Set(activeItems.map(i => i.ministry)).size;

    return {
      total,
      initiated: Math.round((initiated / total) * 100),
      completed: Math.round((completed / total) * 100),
      announced: Math.round((announced / total) * 100),
      highImpact,
      ministriesCount
    };
  }, [activeItems]);

  // Ministries appearing in this issue's items, with issue-scoped counts
  // (the ministries prop's itemCount is global across all issues, so we
  // derive local counts here rather than using it directly for this filter).
  const ministryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    activeItems.forEach(i => counts.set(i.ministry, (counts.get(i.ministry) || 0) + 1));
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeItems]);

  // Most active ministry this issue + its metadata, driving the "Featured
  // Ministry" spotlight card
  const featuredMinistry = useMemo(() => {
    if (ministryOptions.length === 0) return null;
    const top = ministryOptions[0];
    const meta = ministries.find(m => m.name === top.name);
    const blurb = activeItems.find(i => i.ministry === top.name)?.description || '';
    return { name: top.name, count: top.count, minister: meta?.minister, blurb };
  }, [ministryOptions, ministries, activeItems]);

  // Pillar coverage percentages, driving the segmented bar + legend
  const pillarBreakdown = useMemo(() => {
    const total = activeItems.length || 1;
    return pillars.map(theme => {
      const count = activeItems.filter(i => i.theme === theme).length;
      return { theme, count, percent: (count / total) * 100 };
    });
  }, [activeItems, pillars]);

  const defaultPillarMeta = getDefaultPillarMeta(isDark);

  // Pillar Metadata for styling (Light Theme vs Dark Theme) — static colors
  // for the original 6 themes; admin-created themes fall back to
  // defaultPillarMeta via the `pillarMeta[x] ?? defaultPillarMeta` pattern.
  const pillarMeta: Record<string, { color: string; text: string; bg: string }> = {
    'Economic Growth': { 
      color: isDark ? '#6366F1' : '#185FA5', 
      text: isDark ? '#C7D2FE' : '#0C447C', 
      bg: isDark ? '#1E1B4B' : '#E6F1FB' 
    },
    'Infrastructure': { 
      color: isDark ? '#10B981' : '#1D9E75', 
      text: isDark ? '#A7F3D0' : '#085041', 
      bg: isDark ? '#064E3B' : '#E1F5EE' 
    },
    'Human Development': { 
      color: isDark ? '#8B5CF6' : '#7F77DD', 
      text: isDark ? '#DDD6FE' : '#3C3489', 
      bg: isDark ? '#4C1D95' : '#EEEDFE' 
    },
    'National Security': { 
      color: isDark ? '#F43F5E' : '#D85A30', 
      text: isDark ? '#FECDD3' : '#712B13', 
      bg: isDark ? '#881337' : '#FAECE7' 
    },
    'Rural & Agri': { 
      color: isDark ? '#F59E0B' : '#EF9F27', 
      text: isDark ? '#FDE68A' : '#633806', 
      bg: isDark ? '#78350F' : '#FAEEDA' 
    },
    'Misc': { 
      color: isDark ? '#71717A' : '#888780', 
      text: isDark ? '#E4E4E7' : '#444441', 
      bg: isDark ? '#27272A' : '#F1EFE8' 
    }
  };

  // Helper to parse item date (e.g. "16 Jun", "1 May") into Date object
  const parseItemDate = (itemDateStr: string): Date => {
    const parts = itemDateStr.trim().split(/\s+/);
    const day = parseInt(parts[0], 10) || 1;
    const monthStr = parts[1] || 'Jun';
    const monthMap: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const month = monthMap[monthStr] !== undefined ? monthMap[monthStr] : 5;
    return new Date(2026, month, day);
  };

  // Filtered Items List
  const filteredItems = useMemo(() => {
    const referenceDate = new Date(2026, 6, 9); // July 9, 2026 from metadata

    return activeItems.filter(item => {
      // Ministry filter
      if (selectedMinistry && item.ministry !== selectedMinistry) return false;
      // Theme filter
      if (selectedTheme && item.theme !== selectedTheme) return false;
      // Status filter
      if (selectedStatus && item.status !== selectedStatus) return false;
      // Impact filter
      if (selectedImpact && item.impact !== selectedImpact) return false;
      
      // Date filter
      if (selectedDateFilter !== 'all') {
        const itemDate = parseItemDate(item.date);
        if (selectedDateFilter === 'last-3-months') {
          const limitDate = new Date(referenceDate);
          limitDate.setMonth(limitDate.getMonth() - 3);
          if (itemDate < limitDate) return false;
        } else if (selectedDateFilter === 'last-6-months') {
          const limitDate = new Date(referenceDate);
          limitDate.setMonth(limitDate.getMonth() - 6);
          if (itemDate < limitDate) return false;
        } else if (selectedDateFilter === 'last-1-year') {
          const limitDate = new Date(referenceDate);
          limitDate.setFullYear(limitDate.getFullYear() - 1);
          if (itemDate < limitDate) return false;
        } else if (selectedDateFilter === 'custom') {
          if (customStartDate) {
            const startLimit = new Date(customStartDate);
            startLimit.setHours(0, 0, 0, 0);
            if (itemDate < startLimit) return false;
          }
          if (customEndDate) {
            const endLimit = new Date(customEndDate);
            endLimit.setHours(23, 59, 59, 999);
            if (itemDate > endLimit) return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }
      return true;
    });
  }, [selectedMinistry, selectedTheme, selectedStatus, selectedImpact, searchQuery, selectedDateFilter, customStartDate, customEndDate, activeItems]);

  // Pagination calculations (6 items per page)
  const itemsPerPage = 6;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleClearFilters = () => {
    setSelectedMinistry(undefined);
    setSelectedTheme(undefined);
    setSelectedStatus(undefined);
    setSelectedImpact(undefined);
    setSelectedDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Dynamic timeline dates and highlights based on selected issue
  const isFirstHalf = currentIssueId.endsWith('-i');
  const monthName = currentIssueId.includes('june') ? 'Jun' : 'May';
  const timelineDates = isFirstHalf ? [1, 4, 7, 10, 13, 15] : [16, 19, 22, 25, 28, 30];

  const timelineHighlights = useMemo(() => {
    const highlights: Record<number, { title: string; theme: Pillar; id: string }> = {};
    timelineDates.forEach(date => {
      const found = activeItems.find(item => item.date === `${date} ${monthName}`);
      if (found) {
        highlights[date] = { title: found.title, theme: found.theme, id: found.id };
      } else {
        // Fallback: find any item starting with the same day
        const approx = activeItems.find(item => item.date.startsWith(`${date}`));
        if (approx) {
          highlights[date] = { title: approx.title, theme: approx.theme, id: approx.id };
        }
      }
    });
    return highlights;
  }, [activeItems, timelineDates, monthName]);

  const isAggregate = currentIssueId === ALL_ISSUES_ID;
  const activeIssueData = issues.find(issue => issue.id === currentIssueId);
  const issueBadgeLabel = isAggregate ? 'All Issues' : activeIssueData?.label;
  const issueHeading = isAggregate ? `All ${issues.length} Issues` : activeIssueData?.dateRange;

  return (
    <div className="space-y-6">
      {/* Issue Header Row */}
      <div className={`p-8 rounded-[1.75rem] border shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 w-full lg:w-auto">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                isDark 
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}>
                {issueBadgeLabel}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                isDark
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}>
                Viksit Bharat Watch
              </span>
            </div>
            <h2 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight mt-3 ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}>
              {issueHeading}
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500 font-medium'}`}>
              {stats.total} policy actions and administrative developments tracked
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
                  ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-indigo-400 hover:text-indigo-300' 
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
        
        {/* Three Stats */}
        <div className={`flex items-center gap-6 divide-x ${isDark ? 'divide-zinc-800' : 'divide-zinc-200'}`}>
          <div className="text-center pl-0">
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Ministries</span>
            <span className={`text-3xl font-extrabold font-display ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{stats.ministriesCount}</span>
          </div>
          <div className="text-center pl-6">
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">High Impact</span>
            <span className={`text-3xl font-extrabold font-display ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{stats.highImpact}</span>
          </div>
          <div className="text-center pl-6">
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Actions</span>
            <span className={`text-3xl font-extrabold font-display ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{stats.total}</span>
          </div>
        </div>
      </div>

      {/* Status Breakdown Row */}
      <div className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Status Distribution
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {/* Initiated */}
          <div 
            style={{ flexGrow: stats.initiated || 1 }}
            className={`min-w-[100px] border rounded-2xl p-4 text-center flex flex-col justify-center transition-all ${
              isDark 
                ? 'bg-indigo-500/5 border-indigo-500/15' 
                : 'bg-indigo-50/50 border-indigo-200/60'
            }`}
          >
            <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Initiated</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.initiated}%</span>
          </div>
          {/* Completed */}
          <div 
            style={{ flexGrow: stats.completed || 1 }}
            className={`min-w-[80px] border rounded-2xl p-4 text-center flex flex-col justify-center transition-all ${
              isDark 
                ? 'bg-emerald-500/5 border-emerald-500/15' 
                : 'bg-emerald-50/50 border-emerald-200/60'
            }`}
          >
            <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Completed</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.completed}%</span>
          </div>
          {/* Announced */}
          <div 
            style={{ flexGrow: stats.announced || 1 }}
            className={`min-w-[80px] border rounded-2xl p-4 text-center flex flex-col justify-center transition-all ${
              isDark 
                ? 'bg-purple-500/5 border-purple-500/15' 
                : 'bg-purple-50/50 border-purple-200/60'
            }`}
          >
            <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Announced</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.announced}%</span>
          </div>
        </div>
      </div>

      {/* Row of Two Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card A: Featured Ministry */}
        <div className={`p-6 rounded-[1.75rem] border shadow-xl flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] ${
          isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-3">Featured Ministry</span>
            {featuredMinistry ? (
              <>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <Building2 size={22} className="text-amber-500" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm leading-snug ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{featuredMinistry.name}</h4>
                    {featuredMinistry.minister && (
                      <p className="text-xs text-zinc-400 mt-0.5 font-medium">{featuredMinistry.minister}</p>
                    )}
                  </div>
                </div>
                <p className={`text-xs mt-4 leading-relaxed line-clamp-3 ${isDark ? 'text-zinc-300' : 'text-zinc-600 font-medium'}`}>
                  {featuredMinistry.blurb}
                </p>
              </>
            ) : (
              <p className="text-xs text-zinc-400">No items in this issue yet.</p>
            )}
          </div>
          {featuredMinistry && (
            <div className={`mt-6 pt-4 border-t flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                isDark
                  ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                  : 'text-indigo-800 bg-indigo-50 border-indigo-200/80 shadow-sm'
              }`}>
                {featuredMinistry.count} update{featuredMinistry.count === 1 ? '' : 's'} this issue
              </span>
              <button
                onClick={() => setSelectedMinistry(featuredMinistry.name)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
              >
                Filter Ministry
              </button>
            </div>
          )}
        </div>

        {/* Card C: Pillar Coverage segmented bar */}
        <div className={`p-6 rounded-[1.75rem] border shadow-xl flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] ${
          isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
        }`}>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Pillar Coverage
            </span>

            {/* Segmented Bar */}
            <div className={`h-4 w-full rounded-full flex overflow-hidden mb-5 border ${isDark ? 'border-zinc-800' : 'border-zinc-200 shadow-inner'}`}>
              {pillarBreakdown.map(({ theme, percent }) => (
                <div
                  key={theme}
                  style={{ width: `${percent}%`, backgroundColor: (pillarMeta[theme] ?? defaultPillarMeta).color }}
                  title={`${theme} (${Math.round(percent)}%)`}
                ></div>
              ))}
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-bold">
              {pillarBreakdown.map(({ theme, percent }) => {
                const meta = pillarMeta[theme] ?? defaultPillarMeta;
                return (
                  <button
                    key={theme}
                    onClick={() => setSelectedTheme(theme)}
                    className={`flex items-center gap-1.5 text-left p-1 rounded-lg cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-100/50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full block shrink-0" style={{ backgroundColor: meta.color }}></span>
                    <span className={`truncate ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{theme.split(' ')[0]} ({Math.round(percent)}%)</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-5 rounded-2xl border shadow-xl flex flex-wrap gap-3 items-center justify-between transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
      }`}>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Ministry Filter Pill */}
          <div className="relative">
            <button
              onClick={() => {
                setMinistryDropdownOpen(!ministryDropdownOpen);
                setThemeDropdownOpen(false);
                setDateDropdownOpen(false);
                setStatusDropdownOpen(false);
                setImpactDropdownOpen(false);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 border cursor-pointer transition-all shadow-sm ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100' 
                  : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
              } ${selectedMinistry ? 'ring-2 ring-amber-500' : ''}`}
            >
              <Building2 size={13} className="text-amber-500" />
              <span>{selectedMinistry || 'Ministry: All'}</span>
              <ChevronDown size={12} className="text-zinc-400" />
            </button>
            {ministryDropdownOpen && (
              <div className={`absolute top-11 left-0 border rounded-2xl shadow-2xl w-64 max-h-60 overflow-y-auto z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => {
                    setSelectedMinistry(undefined);
                    setMinistryDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 font-bold border-b text-amber-500 ${
                    isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'
                  }`}
                >
                  Clear Ministry Filter
                </button>
                {ministryOptions.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => {
                      setSelectedMinistry(m.name);
                      setMinistryDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                    } ${selectedMinistry === m.name ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="text-[10px] text-zinc-400">({m.count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Filter Pill */}
          <div className="relative">
            <button
              onClick={() => {
                setThemeDropdownOpen(!themeDropdownOpen);
                setMinistryDropdownOpen(false);
                setDateDropdownOpen(false);
                setStatusDropdownOpen(false);
                setImpactDropdownOpen(false);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 border cursor-pointer transition-all shadow-sm ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-zinc-100' 
                  : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
              } ${selectedTheme ? 'ring-2 ring-emerald-500' : ''}`}
            >
              <SlidersHorizontal size={13} className="text-emerald-500" />
              <span>{selectedTheme || 'Theme: All'}</span>
              <ChevronDown size={12} className="text-zinc-400" />
            </button>
            {themeDropdownOpen && (
              <div className={`absolute top-11 left-0 border rounded-2xl shadow-2xl w-56 z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => {
                    setSelectedTheme(undefined);
                    setThemeDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 font-bold border-b text-emerald-500 ${
                    isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'
                  }`}
                >
                  Clear Theme Filter
                </button>
                {pillars.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => {
                      setSelectedTheme(theme);
                      setThemeDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                    } ${selectedTheme === theme ? 'bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400' : ''}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full block shrink-0"
                      style={{ backgroundColor: (pillarMeta[theme] ?? defaultPillarMeta).color }}
                    ></span>
                    <span>{theme}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Filter Pill */}
          <div className="relative">
            <button
              onClick={() => {
                setDateDropdownOpen(!dateDropdownOpen);
                setMinistryDropdownOpen(false);
                setThemeDropdownOpen(false);
                setStatusDropdownOpen(false);
                setImpactDropdownOpen(false);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 border cursor-pointer transition-all shadow-sm ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-zinc-100' 
                  : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
              } ${selectedDateFilter !== 'all' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Calendar size={13} className="text-indigo-500" />
              <span>
                {selectedDateFilter === 'all' && 'Date: All'}
                {selectedDateFilter === 'last-3-months' && 'Last 3 Months'}
                {selectedDateFilter === 'last-6-months' && 'Last 6 Months'}
                {selectedDateFilter === 'last-1-year' && 'Last 1 Year'}
                {selectedDateFilter === 'custom' && 'Custom Range'}
              </span>
              <ChevronDown size={12} className="text-zinc-400" />
            </button>
            {dateDropdownOpen && (
              <div className={`absolute top-11 left-0 border rounded-2xl shadow-2xl w-60 z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => {
                    setSelectedDateFilter('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                    setDateDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 font-bold border-b text-indigo-500 ${
                    isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'
                  }`}
                >
                  Clear Date Filter
                </button>
                <button
                  onClick={() => {
                    setSelectedDateFilter('last-3-months');
                    setDateDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                  } ${selectedDateFilter === 'last-3-months' ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  Last 3 Months
                </button>
                <button
                  onClick={() => {
                    setSelectedDateFilter('last-6-months');
                    setDateDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                  } ${selectedDateFilter === 'last-6-months' ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  Last 6 Months
                </button>
                <button
                  onClick={() => {
                    setSelectedDateFilter('last-1-year');
                    setDateDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                  } ${selectedDateFilter === 'last-1-year' ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  Last 1 Year
                </button>
                <button
                  onClick={() => {
                    setSelectedDateFilter('custom');
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 border-t ${
                    isDark ? 'hover:bg-zinc-800 border-zinc-800/60' : 'hover:bg-zinc-50 border-zinc-100'
                  } ${selectedDateFilter === 'custom' ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  Custom Range
                </button>
                
                {selectedDateFilter === 'custom' && (
                  <div className={`px-3 py-2.5 space-y-2 border-t ${
                    isDark ? 'border-zinc-800' : 'border-zinc-100'
                  }`}>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-medium block">Start Date</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDark 
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-indigo-500' 
                            : 'bg-white border-zinc-200 text-zinc-700 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-medium block">End Date</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDark 
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-indigo-500' 
                            : 'bg-white border-zinc-200 text-zinc-700 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Chip */}
          <div className="relative">
            <button
              onClick={() => {
                setStatusDropdownOpen(!statusDropdownOpen);
                setMinistryDropdownOpen(false);
                setThemeDropdownOpen(false);
                setDateDropdownOpen(false);
                setImpactDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                selectedStatus 
                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' 
                  : isDark 
                    ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500' 
                    : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 shadow-sm'
              }`}
            >
              <span>{selectedStatus || 'Status'}</span>
              <ChevronDown size={10} className="inline ml-1 opacity-70" />
            </button>
            {statusDropdownOpen && (
              <div className={`absolute top-9 left-0 border rounded-2xl shadow-2xl w-36 z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => {
                    setSelectedStatus(undefined);
                    setStatusDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 font-bold border-b ${
                    isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'
                  }`}
                >
                  All Statuses
                </button>
                {(['Initiated', 'Completed', 'Announced'] as Status[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedStatus(st);
                      setStatusDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                    } ${selectedStatus === st ? 'bg-zinc-150 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400 font-bold' : ''}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Impact Chip */}
          <div className="relative">
            <button
              onClick={() => {
                setImpactDropdownOpen(!impactDropdownOpen);
                setMinistryDropdownOpen(false);
                setThemeDropdownOpen(false);
                setDateDropdownOpen(false);
                setStatusDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                selectedImpact 
                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' 
                  : isDark 
                    ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500' 
                    : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 shadow-sm'
              }`}
            >
              <span>{selectedImpact ? `${selectedImpact} Impact` : 'Impact'}</span>
              <ChevronDown size={10} className="inline ml-1 opacity-70" />
            </button>
            {impactDropdownOpen && (
              <div className={`absolute top-9 left-0 border rounded-2xl shadow-2xl w-36 z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => {
                    setSelectedImpact(undefined);
                    setImpactDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 font-bold border-b ${
                    isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'
                  }`}
                >
                  All Impacts
                </button>
                {(['High', 'Medium', 'Low'] as Impact[]).map((imp) => (
                  <button
                    key={imp}
                    onClick={() => {
                      setSelectedImpact(imp);
                      setImpactDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                    } ${selectedImpact === imp ? 'bg-zinc-150 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400 font-bold' : ''}`}
                  >
                    {imp} Impact
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {(selectedMinistry || selectedTheme || selectedStatus || selectedImpact || selectedDateFilter !== 'all' || customStartDate || customEndDate || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <X size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Search Input Box */}
        <div className="relative w-full sm:w-auto mt-2 sm:mt-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search items..."
            className={`w-full sm:w-56 px-3.5 py-1.5 pl-8 border rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
              isDark 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:bg-zinc-950' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white'
            }`}
          />
          <Search size={13} className="absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Recent Items Section Header */}
      <div className={`flex items-center justify-between border-b pb-3 mt-6 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <h3 className={`text-base font-bold font-display tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          Recent Items ({filteredItems.length} matched)
        </h3>
        <span className="text-xs text-zinc-400 font-semibold">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Items Grid */}
      {paginatedItems.length === 0 ? (
        <div className={`p-12 text-center rounded-[1.75rem] border shadow-xl transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <FileText size={48} className="mx-auto text-zinc-400 mb-3" />
          <p className={`text-base font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>No matching items found</p>
          <p className="text-xs text-zinc-500 mt-1">Try adjusting your filters or search query.</p>
          <button
            onClick={handleClearFilters}
            className="mt-4 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-500 transition-colors cursor-pointer border border-indigo-600 shadow-md shadow-indigo-600/10"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedItems.map((item) => {
              const meta = pillarMeta[item.theme] ?? defaultPillarMeta;
              const isState = item.geography.startsWith('state:');
              const stateName = isState ? item.geography.replace('state:', '').trim() : '';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`p-6 rounded-[1.75rem] border shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer transition-all flex flex-col justify-between h-full group ${
                    isDark ? 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
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

                  <div className={`flex flex-wrap gap-1.5 mt-auto pt-3 border-t ${isDark ? 'border-zinc-800/60' : 'border-zinc-100'}`}>
                    {/* Theme Chip */}
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm"
                      style={{ backgroundColor: meta.bg, color: meta.text }}
                    >
                      {item.theme}
                    </span>

                    {/* Date Chip */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}>
                      {item.date}
                    </span>

                    {/* Geography / Ministry / State Chip */}
                    {isState ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isDark 
                          ? 'bg-purple-900/40 border-purple-800/40 text-purple-200' 
                          : 'bg-purple-100/60 border-purple-200/80 text-purple-700'
                      }`}>
                        <MapPin size={10} className={isDark ? 'text-purple-200' : 'text-purple-600'} />
                        <span>{stateName}</span>
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isDark 
                          ? 'bg-indigo-900/40 border-indigo-800/40 text-indigo-200' 
                          : 'bg-indigo-100/60 border-indigo-200/80 text-indigo-700'
                      }`}>
                        <Building2 size={10} className={isDark ? 'text-indigo-200' : 'text-indigo-600'} />
                        <span className="truncate max-w-[80px]">{item.ministry}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Dynamic Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  currentPage === 1
                    ? 'border-zinc-800/40 text-zinc-400 cursor-not-allowed'
                    : isDark 
                      ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800 cursor-pointer' 
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 cursor-pointer shadow-sm'
                }`}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all ${
                    currentPage === i + 1
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : isDark
                        ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800 cursor-pointer'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 cursor-pointer shadow-sm'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  currentPage === totalPages
                    ? 'border-zinc-800/40 text-zinc-400 cursor-not-allowed'
                    : isDark 
                      ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800 cursor-pointer' 
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 cursor-pointer shadow-sm'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
