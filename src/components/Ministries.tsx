import React, { useState, useMemo } from 'react';
import { Ministry, MinistryCategory, Item, Pillar, Status, Impact, Issue } from '../types';
import { ALL_ISSUES_ID, getDefaultPillarMeta } from '../constants';
import MinistryFingerprintCard from './governance/MinistryFingerprintCard';
import MinistryGovernanceProfile from './governance/MinistryGovernanceProfile';
import MinistryBulkGenerateButton from './governance/MinistryBulkGenerateButton';
import {
  Building2,
  Coins,
  Briefcase,
  Shield,
  Train,
  Cpu,
  Flame,
  Lock,
  Compass,
  Home,
  Globe,
  HeartPulse,
  Zap,
  Sprout,
  Plane,
  Anchor,
  Milestone,
  Leaf,
  GraduationCap,
  Factory,
  Mountain,
  Radio,
  Users,
  Landmark,
  Palette,
  Fish,
  Droplet,
  Scale,
  Hammer,
  Pickaxe,
  UserCog,
  Scissors,
  Baby,
  Trophy,
  Rocket,
  Atom,
  Search,
  ArrowLeft,
  ChevronDown,
  SlidersHorizontal,
  X,
  ExternalLink,
  MapPin,
  Calendar
} from 'lucide-react';

interface MinistriesProps {
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
  isAdmin?: boolean;
}

export default function Ministries({
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
  isAdmin
}: MinistriesProps) {
  const isDark = theme === 'dark';
  const activeItems = items || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MinistryCategory | undefined>(undefined);

  // Scoped filters inside ministry detail
  const [selectedTheme, setSelectedTheme] = useState<Pillar | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<Status | undefined>(undefined);
  const [selectedImpact, setSelectedImpact] = useState<Impact | undefined>(undefined);
  const [innerQuery, setInnerQuery] = useState('');

  // Dropdown states
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [impactDropdownOpen, setImpactDropdownOpen] = useState(false);
  const [issueDropdownOpen, setIssueDropdownOpen] = useState(false);

  const isAggregate = currentIssueId === ALL_ISSUES_ID;
  const activeIssueData = issues.find(issue => issue.id === currentIssueId);
  const issueBadgeLabel = isAggregate ? 'All Issues' : activeIssueData?.label;

  const defaultPillarMeta = getDefaultPillarMeta(isDark);

  // Pillar Meta for category-specific tags matching the light/dark themes —
  // static colors for the original 6 themes; admin-created themes fall back
  // to defaultPillarMeta via `pillarMeta[x] ?? defaultPillarMeta`.
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

  // Map icon strings to Lucide components
  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Building2, Coins, Briefcase, Shield, Train, Cpu, Flame, Lock, Compass, Home, Globe,
    HeartPulse, Zap, Sprout, Plane, Anchor, Milestone, Leaf, GraduationCap,
    Factory, Mountain, Radio, Users, Landmark, Palette, Fish, Droplet, Scale,
    Hammer, Pickaxe, UserCog, Scissors, Baby, Trophy, Rocket, Atom
  };

  // 1. Filtered list of ministries for directory page
  const filteredMinistries = useMemo(() => {
    // Dynamically count items per ministry based on the active issue's items
    const ministriesWithCounts = ministries.map(m => {
      const count = activeItems.filter(item => item.ministry === m.name).length;
      return {
        ...m,
        itemCount: count
      };
    });

    // Sort descending by item count
    const sorted = ministriesWithCounts.sort((a, b) => b.itemCount - a.itemCount);
    const categoryFiltered = selectedCategory
      ? sorted.filter(m => (m.category || 'ministry') === selectedCategory)
      : sorted;
    if (!searchQuery.trim()) return categoryFiltered;

    return categoryFiltered.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.minister && m.minister.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, activeItems, ministries, selectedCategory]);

  // 2. Filtered list of items inside selected ministry
  const scopedItems = useMemo(() => {
    if (!selectedMinistry) return [];
    return activeItems.filter(item => {
      if (item.ministry !== selectedMinistry) return false;
      if (selectedTheme && item.theme !== selectedTheme) return false;
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (selectedImpact && item.impact !== selectedImpact) return false;
      if (innerQuery.trim() !== '') {
        const query = innerQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }
      return true;
    });
  }, [selectedMinistry, selectedTheme, selectedStatus, selectedImpact, innerQuery]);

  const activeMinistryData = useMemo(() => {
    return ministries.find(m => m.name === selectedMinistry);
  }, [selectedMinistry, ministries]);

  const handleResetInnerFilters = () => {
    setSelectedTheme(undefined);
    setSelectedStatus(undefined);
    setSelectedImpact(undefined);
    setInnerQuery('');
  };

  return (
    <div className="space-y-6">
      {!selectedMinistry ? (
        // ================= DIRECTORY STATE =================
        <div className="space-y-6">
          <div className={`p-8 rounded-[1.75rem] border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between w-full md:w-auto">
              <div>
                <h2 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}>
                  Ministries Directory
                </h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'}`}>
                  Explore tracked updates for <strong>{issueBadgeLabel}</strong> organizable by Ministry
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
            
            {/* Search Directory */}
            <div className="relative w-full md:w-80 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ministries or ministers..."
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

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2">
            {([
              { value: undefined, label: 'All' },
              { value: 'ministry' as MinistryCategory, label: 'Ministries' },
              { value: 'regulatory_body' as MinistryCategory, label: 'Regulatory Bodies' },
            ]).map((opt) => {
              const isActive = selectedCategory === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => setSelectedCategory(opt.value)}
                  className={`px-4 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 shadow-sm'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Ministries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMinistries.map((ministry) => {
              const IconComp = iconMap[ministry.icon] || Building2;
              return (
                <div
                  key={ministry.name}
                  onClick={() => setSelectedMinistry(ministry.name)}
                  className={`p-6 rounded-[1.75rem] border shadow-lg hover:shadow-xl hover:scale-[1.01] cursor-pointer transition-all flex items-start gap-4 h-full group ${
                    isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${
                    isDark 
                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700 group-hover:bg-zinc-700 group-hover:text-white' 
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 group-hover:bg-zinc-100 group-hover:text-zinc-900'
                  }`}>
                    <IconComp size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-bold text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate ${
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}>
                      {ministry.name}
                    </h3>
                    {ministry.minister && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500 font-medium'}`}>
                        Minister: <span className="font-bold">{ministry.minister}</span>
                      </p>
                    )}
                    <div className="mt-5 flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isDark 
                          ? 'text-indigo-300 bg-indigo-950/40 border-indigo-900/50' 
                          : 'text-indigo-800 bg-indigo-50 border-indigo-200/80 shadow-sm'
                      }`}>
                        {ministry.itemCount} tracked items
                      </span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                        View &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // ================= DETAIL STATE (DRILLDOWN) =================
        <div className="space-y-6">
          {/* Header Block with Back Button */}
          <div className={`p-8 rounded-[1.75rem] border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            <div className="flex items-start gap-4">
              <button
                onClick={() => {
                  setSelectedMinistry(undefined);
                  handleResetInnerFilters();
                }}
                className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0 mt-1 ${
                  isDark 
                    ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' 
                    : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700 shadow-sm'
                }`}
                title="Back to Directory"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}>
                  {selectedMinistry}
                </h2>
                {activeMinistryData?.minister && (
                  <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'}`}>
                    Minister in Charge: <span className={`font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{activeMinistryData.minister}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              <span className={`text-xs font-bold px-4 py-2 rounded-full border ${
                isDark
                  ? 'text-indigo-300 bg-indigo-950/40 border-indigo-900/40'
                  : 'text-indigo-800 bg-indigo-50 border-indigo-200 shadow-sm'
              }`}>
                {activeItems.filter(item => item.ministry === selectedMinistry).length} active updates
              </span>
              {isAdmin && activeMinistryData?.id && (
                <MinistryBulkGenerateButton ministryId={activeMinistryData.id} isDark={isDark} />
              )}
            </div>
          </div>

          {activeMinistryData?.id && (
            <MinistryFingerprintCard ministryId={activeMinistryData.id} isDark={isDark} />
          )}

          {activeMinistryData?.id && (
            <MinistryGovernanceProfile ministryId={activeMinistryData.id} isDark={isDark} />
          )}

          {/* Inline Filter Bar */}
          <div className={`p-5 rounded-2xl border shadow-xl flex flex-wrap gap-3 items-center justify-between transition-all ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
          }`}>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Theme filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setThemeDropdownOpen(!themeDropdownOpen);
                    setStatusDropdownOpen(false);
                    setImpactDropdownOpen(false);
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 border cursor-pointer transition-all shadow-sm ${
                    isDark 
                      ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-zinc-100' 
                      : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <SlidersHorizontal size={12} className="text-emerald-500" />
                  <span>{selectedTheme || 'Theme: All'}</span>
                  <ChevronDown size={11} className="text-zinc-400" />
                </button>
                {themeDropdownOpen && (
                  <div className={`absolute top-11 left-0 border rounded-2xl shadow-2xl w-56 z-30 py-1.5 text-xs transition-all ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
                  }`}>
                    <button
                      onClick={() => {
                        setSelectedTheme(undefined);
                        setThemeDropdownOpen(false);
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
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-1.5 ${
                          isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full block"
                          style={{ backgroundColor: (pillarMeta[theme] ?? defaultPillarMeta).color }}
                        ></span>
                        <span>{theme}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setStatusDropdownOpen(!statusDropdownOpen);
                    setThemeDropdownOpen(false);
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
                  <ChevronDown size={10} className="inline ml-1" />
                </button>
                {statusDropdownOpen && (
                  <div className={`absolute top-9 left-0 border rounded-2xl shadow-2xl w-36 z-30 py-1.5 text-xs transition-all ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
                  }`}>
                    <button
                      onClick={() => {
                        setSelectedStatus(undefined);
                        setStatusDropdownOpen(false);
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
                        }}
                        className={`w-full text-left px-3 py-2 ${
                          isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Impact filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setImpactDropdownOpen(!impactDropdownOpen);
                    setThemeDropdownOpen(false);
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
                  <ChevronDown size={10} className="inline ml-1" />
                </button>
                {impactDropdownOpen && (
                  <div className={`absolute top-9 left-0 border rounded-2xl shadow-2xl w-36 z-30 py-1.5 text-xs transition-all ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
                  }`}>
                    <button
                      onClick={() => {
                        setSelectedImpact(undefined);
                        setImpactDropdownOpen(false);
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
                        }}
                        className={`w-full text-left px-3 py-2 ${
                          isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                        }`}
                      >
                        {imp} Impact
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset inside filters */}
              {(selectedTheme || selectedStatus || selectedImpact || innerQuery) && (
                <button
                  onClick={handleResetInnerFilters}
                  className="px-2 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <X size={12} />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            {/* Inner query search */}
            <div className="relative w-full sm:w-52">
              <input
                type="text"
                value={innerQuery}
                onChange={(e) => setInnerQuery(e.target.value)}
                placeholder="Search in ministry..."
                className={`w-full px-3.5 py-1.5 pl-8 border rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                  isDark 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:bg-zinc-950' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white'
                }`}
              />
              <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-400 pointer-events-none" />
              {innerQuery && (
                <button onClick={() => setInnerQuery('')} className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List of items scoped to this ministry */}
          {scopedItems.length === 0 ? (
            <div className={`p-12 text-center rounded-[1.75rem] border shadow-xl transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}>
              <Building2 size={40} className="mx-auto text-zinc-400 mb-3" />
              <p className={`text-base font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>No updates match your filtered settings</p>
              <button
                onClick={handleResetInnerFilters}
                className="mt-4 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-500 transition-colors border border-indigo-600 shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Clear Scoped Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {scopedItems.map((item) => {
                const meta = pillarMeta[item.theme] ?? defaultPillarMeta;
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
      )}
    </div>
  );
}
