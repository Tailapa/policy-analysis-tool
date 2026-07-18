import React, { useState } from 'react';
import { Issue } from '../types';
import { TrackingPeriodFilterState } from '../hooks/useTrackingPeriodFilter';
import { Calendar, ChevronDown, Check } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface TrackingPeriodFilterProps {
  issues: Issue[];
  theme: 'light' | 'dark';
  filter: TrackingPeriodFilterState;
  label?: string;
}

const pillLabel = (names: string[], allLabel: string) =>
  names.length === 0 ? allLabel : names.length === 1 ? names[0] : `${names.length} selected`;

export default function TrackingPeriodFilter({ issues, theme, filter, label = 'Browse Tracking Period' }: TrackingPeriodFilterProps) {
  const isDark = theme === 'dark';
  const {
    selectedYears,
    selectedMonths,
    selectedIssueIds,
    isAllIssues,
    toggleYear,
    toggleMonth,
    toggleIssueId,
    resetTrackingPeriod,
  } = filter;

  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [issuePickerDropdownOpen, setIssuePickerDropdownOpen] = useState(false);

  const yearOptions = Array.from(new Set(issues.map(i => new Date(i.periodStart).getFullYear()))).sort((a, b) => b - a);

  const closeAll = () => {
    setYearDropdownOpen(false);
    setMonthDropdownOpen(false);
    setIssuePickerDropdownOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={resetTrackingPeriod}
          className={`px-4 py-2.5 rounded-full border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md ${
            isAllIssues
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : isDark
                ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300'
                : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'
          }`}
        >
          <Calendar size={13} />
          <span>All Issues</span>
        </button>

        {/* Year multi-select */}
        <div className="relative">
          <button
            onClick={() => { const next = !yearDropdownOpen; closeAll(); setYearDropdownOpen(next); }}
            className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
            } ${selectedYears.length > 0 ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <span>{pillLabel(selectedYears.map(String), 'Year: All')}</span>
            <ChevronDown size={11} className="text-zinc-400" />
          </button>
          {yearDropdownOpen && (
            <div className={`absolute top-10 left-0 border rounded-2xl shadow-2xl w-40 max-h-64 overflow-y-auto z-30 py-1.5 text-xs transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
            }`}>
              <button
                onClick={() => { selectedYears.forEach(y => toggleYear(y)); }}
                className={`w-full text-left px-3 py-2 font-bold border-b text-indigo-500 ${isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'}`}
              >
                Clear Year Filter
              </button>
              {yearOptions.map((year) => {
                const checked = selectedYears.includes(year);
                return (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${checked ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : isDark ? 'border-zinc-600' : 'border-zinc-300'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    <span>{year}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Month multi-select */}
        <div className="relative">
          <button
            onClick={() => { const next = !monthDropdownOpen; closeAll(); setMonthDropdownOpen(next); }}
            className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
            } ${selectedMonths.length > 0 ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <span>{pillLabel(selectedMonths.map(m => MONTH_NAMES[m]), 'Month: All')}</span>
            <ChevronDown size={11} className="text-zinc-400" />
          </button>
          {monthDropdownOpen && (
            <div className={`absolute top-10 left-0 border rounded-2xl shadow-2xl w-36 max-h-64 overflow-y-auto z-30 py-1.5 text-xs transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
            }`}>
              <button
                onClick={() => { selectedMonths.forEach(m => toggleMonth(m)); }}
                className={`w-full text-left px-3 py-2 font-bold border-b text-indigo-500 ${isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'}`}
              >
                Clear Month Filter
              </button>
              {MONTH_NAMES.map((name, idx) => {
                const checked = selectedMonths.includes(idx);
                return (
                  <button
                    key={name}
                    onClick={() => toggleMonth(idx)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${checked ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : isDark ? 'border-zinc-600' : 'border-zinc-300'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Issue multi-select */}
        <div className="relative">
          <button
            onClick={() => { const next = !issuePickerDropdownOpen; closeAll(); setIssuePickerDropdownOpen(next); }}
            className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
            } ${selectedIssueIds.length > 0 ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <span>{pillLabel(selectedIssueIds.map(id => issues.find(i => i.id === id)?.label || ''), 'Issue: All')}</span>
            <ChevronDown size={11} className="text-zinc-400" />
          </button>
          {issuePickerDropdownOpen && (
            <div className={`absolute top-10 left-0 border rounded-2xl shadow-2xl w-64 max-h-72 overflow-y-auto z-30 py-1.5 text-xs transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
            }`}>
              <button
                onClick={() => { selectedIssueIds.forEach(id => toggleIssueId(id)); }}
                className={`w-full text-left px-4 py-2.5 font-bold border-b text-indigo-500 ${isDark ? 'hover:bg-zinc-800 border-zinc-800' : 'hover:bg-zinc-50 border-zinc-100'}`}
              >
                Clear Issue Filter
              </button>
              {issues.map((issue) => {
                const checked = selectedIssueIds.includes(issue.id);
                return (
                  <button
                    key={issue.id}
                    onClick={() => toggleIssueId(issue.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-2 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${checked ? 'bg-indigo-500/10' : ''}`}
                  >
                    <span className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : isDark ? 'border-zinc-600' : 'border-zinc-300'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className={`font-bold ${checked ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{issue.label}</span>
                      <span className="text-[10px] text-zinc-400">{issue.dateRange} ({issue.itemsCount} updates)</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
