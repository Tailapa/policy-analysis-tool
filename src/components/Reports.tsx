import React, { useState, useMemo, useEffect } from 'react';
import { Issue } from '../types';
import { downloadIssuePdf, downloadIssuesZip } from '../api';
import Pagination from './Pagination';
import {
  FileText,
  Search,
  ChevronDown,
  X,
  Download,
  Loader2,
  Calendar,
  Archive,
  ListChecks,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ReportsProps {
  theme: 'light' | 'dark';
  issues: Issue[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type DateFilter = 'all' | 'last-month' | 'last-6-months' | 'last-1-year' | 'custom';

export default function Reports({ theme, issues }: ReportsProps) {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);

  const REPORTS_PAGE_SIZE = 12;
  const [reportsPage, setReportsPage] = useState(1);

  const closeAllDropdowns = () => {
    setMonthDropdownOpen(false);
    setYearDropdownOpen(false);
    setDateDropdownOpen(false);
  };

  const yearOptions = useMemo(() => {
    const years = new Set(issues.map(i => new Date(i.periodStart).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const now = new Date();
    return issues.filter(issue => {
      if (searchQuery.trim() && !issue.label.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;

      const periodStart = new Date(issue.periodStart);
      if (selectedMonth !== undefined && periodStart.getMonth() !== selectedMonth) return false;
      if (selectedYear !== undefined && periodStart.getFullYear() !== selectedYear) return false;

      if (dateFilter === 'last-month') {
        const limit = new Date(now);
        limit.setMonth(limit.getMonth() - 1);
        if (periodStart < limit) return false;
      } else if (dateFilter === 'last-6-months') {
        const limit = new Date(now);
        limit.setMonth(limit.getMonth() - 6);
        if (periodStart < limit) return false;
      } else if (dateFilter === 'last-1-year') {
        const limit = new Date(now);
        limit.setFullYear(limit.getFullYear() - 1);
        if (periodStart < limit) return false;
      } else if (dateFilter === 'custom') {
        if (customStartDate && periodStart < new Date(customStartDate)) return false;
        if (customEndDate && periodStart > new Date(customEndDate)) return false;
      }

      return true;
    });
  }, [issues, searchQuery, selectedMonth, selectedYear, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    setReportsPage(1);
  }, [searchQuery, selectedMonth, selectedYear, dateFilter, customStartDate, customEndDate]);

  const reportsTotalPages = Math.max(1, Math.ceil(filteredIssues.length / REPORTS_PAGE_SIZE));
  const paginatedIssues = useMemo(() => {
    const start = (reportsPage - 1) * REPORTS_PAGE_SIZE;
    return filteredIssues.slice(start, start + REPORTS_PAGE_SIZE);
  }, [filteredIssues, reportsPage]);

  const hasActiveFilters =
    !!searchQuery || selectedMonth !== undefined || selectedYear !== undefined || dateFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedMonth(undefined);
    setSelectedYear(undefined);
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleDownloadOne = async (issueId: string) => {
    setDownloadingId(issueId);
    setError(null);
    try {
      await downloadIssuePdf(issueId);
    } catch (err: any) {
      setError(err.message || 'Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBulkDownload = async () => {
    const downloadable = filteredIssues.filter(i => i.hasPdf);
    if (downloadable.length === 0) return;
    setBulkDownloading(true);
    setError(null);
    try {
      await downloadIssuesZip(downloadable.map(i => i.id));
    } catch (err: any) {
      setError(err.message || 'Failed to download ZIP');
    } finally {
      setBulkDownloading(false);
    }
  };

  const downloadableCount = filteredIssues.filter(i => i.hasPdf).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-8 rounded-[1.75rem] border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <h2 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight flex items-center gap-2 ${
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          }`}>
            <FileText size={26} className="text-indigo-500" />
            <span>Reports</span>
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'}`}>
            Browse and download the original uploaded PDF for every published issue
          </p>
        </div>

        <button
          onClick={handleBulkDownload}
          disabled={bulkDownloading || downloadableCount === 0}
          title={downloadableCount === 0 ? 'No downloadable PDFs match the current filters' : undefined}
          className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 border shadow-md transition-all shrink-0 ${
            bulkDownloading || downloadableCount === 0
              ? 'opacity-50 cursor-not-allowed border-indigo-600 bg-indigo-600 text-white'
              : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shadow-indigo-600/10'
          }`}
        >
          {bulkDownloading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
          <span>Download {downloadableCount > 0 ? `${downloadableCount} ` : ''}as ZIP</span>
        </button>
      </div>

      {error && (
        <div className={`p-3 rounded-xl border text-xs font-bold ${
          isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className={`p-5 rounded-2xl border shadow-xl flex flex-wrap gap-3 items-center justify-between transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
      }`}>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Month Filter */}
          <div className="relative">
            <button
              onClick={() => { const next = !monthDropdownOpen; closeAllDropdowns(); setMonthDropdownOpen(next); }}
              className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 border cursor-pointer transition-all shadow-sm ${
                isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
              } ${selectedMonth !== undefined ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Calendar size={13} className="text-indigo-500" />
              <span>{selectedMonth !== undefined ? MONTH_NAMES[selectedMonth] : 'Month: All'}</span>
              <ChevronDown size={12} className="text-zinc-400" />
            </button>
            {monthDropdownOpen && (
              <div className={`absolute top-11 left-0 border rounded-2xl shadow-2xl w-40 max-h-64 overflow-y-auto z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => { setSelectedMonth(undefined); setMonthDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 font-bold border-b text-indigo-500 ${isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'}`}
                >
                  All Months
                </button>
                {MONTH_NAMES.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => { setSelectedMonth(idx); setMonthDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${selectedMonth === idx ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Year Filter */}
          <div className="relative">
            <button
              onClick={() => { const next = !yearDropdownOpen; closeAllDropdowns(); setYearDropdownOpen(next); }}
              className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 border cursor-pointer transition-all shadow-sm ${
                isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
              } ${selectedYear !== undefined ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <span>{selectedYear !== undefined ? selectedYear : 'Year: All'}</span>
              <ChevronDown size={12} className="text-zinc-400" />
            </button>
            {yearDropdownOpen && (
              <div className={`absolute top-11 left-0 border rounded-2xl shadow-2xl w-32 max-h-64 overflow-y-auto z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => { setSelectedYear(undefined); setYearDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 font-bold border-b text-indigo-500 ${isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'}`}
                >
                  All Years
                </button>
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setYearDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${selectedYear === year ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Preset Filter */}
          <div className="relative">
            <button
              onClick={() => { const next = !dateDropdownOpen; closeAllDropdowns(); setDateDropdownOpen(next); }}
              className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 border cursor-pointer transition-all shadow-sm ${
                isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
              } ${dateFilter !== 'all' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Calendar size={13} className="text-indigo-500" />
              <span>
                {dateFilter === 'all' && 'Range: All'}
                {dateFilter === 'last-month' && 'Last Month'}
                {dateFilter === 'last-6-months' && 'Last 6 Months'}
                {dateFilter === 'last-1-year' && 'Last 1 Year'}
                {dateFilter === 'custom' && 'Custom Range'}
              </span>
              <ChevronDown size={12} className="text-zinc-400" />
            </button>
            {dateDropdownOpen && (
              <div className={`absolute top-11 left-0 border rounded-2xl shadow-2xl w-60 z-30 py-1.5 text-xs transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={() => { setDateFilter('all'); setCustomStartDate(''); setCustomEndDate(''); setDateDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 font-bold border-b text-indigo-500 ${isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'}`}
                >
                  Clear Range Filter
                </button>
                <button
                  onClick={() => { setDateFilter('last-month'); setDateDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${dateFilter === 'last-month' ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  Last Month
                </button>
                <button
                  onClick={() => { setDateFilter('last-6-months'); setDateDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${dateFilter === 'last-6-months' ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  Last 6 Months
                </button>
                <button
                  onClick={() => { setDateFilter('last-1-year'); setDateDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${dateFilter === 'last-1-year' ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  Last 1 Year
                </button>
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`w-full text-left px-3 py-2 border-t ${isDark ? 'hover:bg-zinc-800 border-zinc-800/60' : 'hover:bg-zinc-50 border-zinc-100'} ${dateFilter === 'custom' ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  Custom Range
                </button>
                {dateFilter === 'custom' && (
                  <div className={`px-3 py-2.5 space-y-2 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-medium block">Start Date</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-indigo-500' : 'bg-white border-zinc-200 text-zinc-700 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-medium block">End Date</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-indigo-500' : 'bg-white border-zinc-200 text-zinc-700 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <X size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-auto mt-2 sm:mt-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues..."
            className={`w-full sm:w-56 px-3.5 py-1.5 pl-8 border rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:bg-zinc-950' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white'
            }`}
          />
          <Search size={13} className="absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Issues Grid */}
      {filteredIssues.length === 0 ? (
        <div className={`p-12 text-center rounded-[1.75rem] border shadow-xl transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <FileText size={40} className="mx-auto text-zinc-400 mb-3" />
          <p className={`text-base font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>No issues match your filters</p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-500 transition-colors cursor-pointer border border-indigo-600 shadow-md shadow-indigo-600/10"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`rounded-[1.75rem] border shadow-xl transition-all ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            {/* Header row — desktop table only; mobile uses stacked cards below */}
            <div className={`hidden md:grid grid-cols-[1fr_140px_130px_150px] gap-4 px-7 py-4 rounded-t-[1.75rem] border-b text-[10px] font-extrabold uppercase tracking-wider ${
              isDark ? 'bg-zinc-950/60 text-zinc-500 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
            }`}>
              <span>Issue</span>
              <span>Date</span>
              <span>Tracked Items</span>
              <span className="text-right">Download</span>
            </div>

            {paginatedIssues.map((issue, idx) => (
              <div
                key={issue.id}
                className="relative"
                onMouseEnter={() => setHoveredIssueId(issue.id)}
                onMouseLeave={() => setHoveredIssueId(null)}
              >
                {/* Desktop table row */}
                <div
                  className={`hidden md:grid grid-cols-[1fr_140px_130px_150px] gap-4 px-7 py-4 items-center transition-colors ${
                    idx !== paginatedIssues.length - 1 ? `border-b ${isDark ? 'border-zinc-800/70' : 'border-zinc-100'}` : ''
                  } ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-50'}`}
                >
                  <span className={`text-sm font-bold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {issue.label}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{issue.dateRange}</span>
                  <span className={`text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {issue.itemsCount} items
                  </span>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDownloadOne(issue.id)}
                      disabled={!issue.hasPdf || downloadingId === issue.id}
                      title={!issue.hasPdf ? 'Original PDF not available for this issue' : undefined}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        !issue.hasPdf
                          ? 'opacity-40 cursor-not-allowed border-zinc-300 text-zinc-400'
                          : isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-sm'
                      }`}
                    >
                      {downloadingId === issue.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      <span>{issue.hasPdf ? 'Download' : 'Unavailable'}</span>
                    </button>
                  </div>
                </div>

                {/* Mobile stacked card */}
                <div
                  className={`md:hidden flex flex-col gap-3 px-5 py-4 ${
                    idx !== paginatedIssues.length - 1 ? `border-b ${isDark ? 'border-zinc-800/70' : 'border-zinc-100'}` : ''
                  }`}
                >
                  <span className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {issue.label}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}>
                      {issue.dateRange}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}>
                      {issue.itemsCount} items
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadOne(issue.id)}
                    disabled={!issue.hasPdf || downloadingId === issue.id}
                    title={!issue.hasPdf ? 'Original PDF not available for this issue' : undefined}
                    className={`w-full px-3.5 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      !issue.hasPdf
                        ? 'opacity-40 cursor-not-allowed border-zinc-300 text-zinc-400'
                        : isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-sm'
                    }`}
                  >
                    {downloadingId === issue.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    <span>{issue.hasPdf ? 'Download' : 'Unavailable'}</span>
                  </button>
                </div>

                {/* Floating hover preview card */}
                {hoveredIssueId === issue.id && (
                  <div
                    className={`hidden lg:block absolute z-40 left-1/2 -translate-x-1/2 top-full mt-1 w-72 p-5 rounded-2xl border shadow-2xl pointer-events-none transition-all ${
                      isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <h5 className={`font-bold text-sm leading-snug ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {issue.label}
                      </h5>
                    </div>
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        <Calendar size={12} className="text-indigo-500 shrink-0" />
                        <span>{issue.dateRange}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        <ListChecks size={12} className="text-indigo-500 shrink-0" />
                        <span>{issue.itemsCount} tracked items</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs font-semibold ${
                        issue.hasPdf ? 'text-emerald-500' : (isDark ? 'text-zinc-500' : 'text-zinc-400')
                      }`}>
                        {issue.hasPdf ? <CheckCircle2 size={12} className="shrink-0" /> : <XCircle size={12} className="shrink-0" />}
                        <span>{issue.hasPdf ? 'Source PDF available' : 'Source PDF not available'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination
            currentPage={reportsPage}
            totalPages={reportsTotalPages}
            onPageChange={setReportsPage}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}
