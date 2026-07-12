import React, { useState, useEffect, useMemo } from 'react';
import { Item, Pillar, Issue, EngagementAggregate, LifecycleAggregate, LowiAggregate } from '../types';
import { ALL_ISSUES_ID } from '../constants';
import { fetchEngagementAggregate, fetchLifecycleAggregate, fetchLowiAggregate } from '../api';
import { Sparkles, ChevronDown, X } from 'lucide-react';
import RadarChart, { RadarAxis } from './intelligence/RadarChart';
import LifecycleDistributionBar from './intelligence/LifecycleDistributionBar';
import LowiTypologyBars from './intelligence/LowiTypologyBars';
import EngagementBreakdownChart from './intelligence/EngagementBreakdownChart';
import PolicyMomentumCard from './intelligence/PolicyMomentumCard';
import PolicyEvolutionCard from './intelligence/PolicyEvolutionCard';

interface IntelligenceOverviewProps {
  theme: 'light' | 'dark';
  items: Item[];
  currentIssueId: string;
  issues: Issue[];
  pillars: string[];
  isAdmin?: boolean;
}

export default function IntelligenceOverview({ theme, items, currentIssueId, issues, pillars, isAdmin }: IntelligenceOverviewProps) {
  const isDark = theme === 'dark';
  const [selectedPillar, setSelectedPillar] = useState<Pillar | undefined>(undefined);
  const [pillarDropdownOpen, setPillarDropdownOpen] = useState(false);

  const [engagement, setEngagement] = useState<EngagementAggregate | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleAggregate | null>(null);
  const [lowi, setLowi] = useState<LowiAggregate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const f: { issue_id?: string; pillar?: string } = {};
    if (currentIssueId && currentIssueId !== ALL_ISSUES_ID) f.issue_id = currentIssueId;
    if (selectedPillar) f.pillar = selectedPillar;
    return f;
  }, [currentIssueId, selectedPillar]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchEngagementAggregate(filters),
      fetchLifecycleAggregate(filters),
      fetchLowiAggregate(filters),
    ])
      .then(([e, l, lo]) => {
        setEngagement(e);
        setLifecycle(l);
        setLowi(lo);
        setError(null);
      })
      .catch((err) => setError(err.message || 'Failed to load aggregate intelligence'))
      .finally(() => setIsLoading(false));
  }, [filters]);

  const activeIssueData = issues.find((issue) => issue.id === currentIssueId);
  const scopeLabel = currentIssueId === ALL_ISSUES_ID ? `All ${issues.length} Issues` : activeIssueData?.label || 'Current Issue';

  const engagementAxes: RadarAxis[] = engagement
    ? [
        { key: 'educate', label: 'Educate', value: engagement.avg_educate },
        { key: 'persuade', label: 'Persuade', value: engagement.avg_persuade },
        { key: 'coerce', label: 'Coerce', value: engagement.avg_coerce },
        { key: 'strengthen', label: 'Strengthen', value: engagement.avg_strengthen },
        { key: 'incentivize', label: 'Incentivize', value: engagement.avg_incentivize },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-8 rounded-[1.75rem] border shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
              isDark ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
            }`}>
              <Sparkles size={11} />
              <span>Policy Intelligence</span>
            </span>
          </div>
          <h2 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight mt-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Cross-Policy Analytical Patterns
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500 font-medium'}`}>
            Scope: {scopeLabel} · {engagement?.sample_size ?? 0} of {items.length} policies analyzed
          </p>
        </div>

        {/* Pillar filter */}
        <div className="relative shrink-0">
          <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1.5">
            Filter by Pillar
          </label>
          <button
            onClick={() => setPillarDropdownOpen(!pillarDropdownOpen)}
            className={`px-4 py-2.5 rounded-full border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md ${
              isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-indigo-400 hover:text-indigo-300' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-indigo-600 hover:text-indigo-700'
            }`}
          >
            <span>{selectedPillar || 'All Pillars'}</span>
            <ChevronDown size={12} className="text-zinc-400" />
          </button>
          {pillarDropdownOpen && (
            <div className={`absolute right-0 mt-2 border rounded-2xl shadow-2xl w-56 z-30 py-1.5 text-xs transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
            }`}>
              <button
                onClick={() => { setSelectedPillar(undefined); setPillarDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2.5 font-bold border-b flex items-center gap-1.5 ${
                  isDark ? 'hover:bg-zinc-800 border-zinc-800 text-indigo-400' : 'hover:bg-zinc-50 border-zinc-100 text-indigo-600'
                }`}
              >
                <X size={12} />
                <span>All Pillars</span>
              </button>
              {pillars.map((p) => (
                <button
                  key={p}
                  onClick={() => { setSelectedPillar(p); setPillarDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${
                    selectedPillar === p ? 'bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-2xl border text-xs font-bold ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          Couldn't load aggregate intelligence: {error}
        </div>
      )}

      {isLoading ? (
        <div className={`p-12 text-center rounded-[1.75rem] border shadow-xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Loading cross-policy patterns…</p>
        </div>
      ) : !engagement || engagement.sample_size === 0 ? (
        <div className={`p-12 text-center rounded-[1.75rem] border shadow-xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <Sparkles size={40} className={`mx-auto mb-3 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
          <p className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>No analyzed policies in this scope yet</p>
          <p className={`text-xs mt-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Generate Policy Intelligence for individual items, or run a backfill from the admin panel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Engagement radar */}
          <div className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <h3 className={`text-sm font-bold font-display tracking-tight mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Engagement Profile
            </h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Average reliance on each engagement dimension across {engagement?.sample_size ?? 0} analyzed policies.
            </p>
            <RadarChart axes={engagementAxes} isDark={isDark} />
          </div>

          {/* Lowi aggregate */}
          <div className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <h3 className={`text-sm font-bold font-display tracking-tight mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Systemic Policy Character
            </h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Average Lowi typology weighting across {lowi?.sample_size ?? 0} analyzed policies.
            </p>
            {lowi && (
              <LowiTypologyBars
                regulatory={lowi.avg_regulatory}
                distributive={lowi.avg_distributive}
                redistributive={lowi.avg_redistributive}
                dominantType={
                  lowi.avg_regulatory >= lowi.avg_distributive && lowi.avg_regulatory >= lowi.avg_redistributive
                    ? 'regulatory'
                    : lowi.avg_distributive >= lowi.avg_redistributive
                      ? 'distributive'
                      : 'redistributive'
                }
                isDark={isDark}
              />
            )}
          </div>

          {/* Lifecycle distribution */}
          <div className={`p-6 rounded-[1.75rem] border shadow-xl lg:col-span-2 transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <h3 className={`text-sm font-bold font-display tracking-tight mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Policy Life Cycle Distribution
            </h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Where analyzed policies currently sit in the six-stage policy process.
            </p>
            {lifecycle && <LifecycleDistributionBar distribution={lifecycle.distribution} isDark={isDark} />}
          </div>

          <EngagementBreakdownChart isDark={isDark} issueId={filters.issue_id} />
          <PolicyMomentumCard isDark={isDark} />
          <PolicyEvolutionCard isDark={isDark} isAdmin={!!isAdmin} />
        </div>
      )}
    </div>
  );
}
