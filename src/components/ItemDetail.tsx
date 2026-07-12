import React, { useState, useEffect } from 'react';
import { Item, PolicyIntelligence, PolicyGovernance } from '../types';
import { Building2, MapPin, ExternalLink, ArrowLeft, Sparkles, Network } from 'lucide-react';
import nfprcLogo from '../../assets/NFPRC_logo.png';
import { fetchItemIntelligence, fetchItemGovernance, triggerIntelligenceGeneration, triggerGovernanceGeneration } from '../api';
import PendingIntelligence from './intelligence/PendingIntelligence';
import SourcesConsulted from './intelligence/SourcesConsulted';
import { FRAMEWORK_PANELS } from './intelligence/registry';
import PendingGovernance from './governance/PendingGovernance';
import { GOVERNANCE_PANELS } from './governance/registry';
import GovernanceSynthesis from './governance/GovernanceSynthesis';
import ItemEvolutionPanel from './governance/ItemEvolutionPanel';
import DownloadPdfButton from './DownloadPdfButton';
import UpdateRecordButton from './UpdateRecordButton';

interface ItemDetailProps {
  item: Item;
  onBack: () => void;
  onFilterMinistry?: (ministryName: string) => void;
  theme: 'light' | 'dark';
  issueLabel?: string;
  isAdmin?: boolean;
}

type DetailTab = 'Summary' | 'Intelligence' | 'Governance';

export default function ItemDetail({ item, onBack, onFilterMinistry, theme, issueLabel, isAdmin }: ItemDetailProps) {
  const isState = item.geography.startsWith('state:');
  const stateName = isState ? item.geography.replace('state:', '').trim() : '';

  const isDark = theme === 'dark';

  const [detailTab, setDetailTab] = useState<DetailTab>('Summary');
  const [intelligence, setIntelligence] = useState<PolicyIntelligence | null | undefined>(undefined);
  const [governance, setGovernance] = useState<PolicyGovernance | null | undefined>(undefined);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const [governanceError, setGovernanceError] = useState<string | null>(null);
  const [intelligenceRetryKey, setIntelligenceRetryKey] = useState(0);
  const [governanceRetryKey, setGovernanceRetryKey] = useState(0);

  useEffect(() => {
    // undefined = not fetched yet, null = fetched and pending, object = ready
    setIntelligence(undefined);
    setGovernance(undefined);
    setIntelligenceError(null);
    setGovernanceError(null);
  }, [item.id]);

  useEffect(() => {
    if (detailTab !== 'Intelligence' || intelligence !== undefined) return;
    setIntelligenceError(null);
    fetchItemIntelligence(item.id)
      .then((status) => setIntelligence(status.intelligence))
      .catch((err) => setIntelligenceError(err.message || 'Failed to load policy intelligence'));
  }, [detailTab, item.id, intelligence, intelligenceRetryKey]);

  useEffect(() => {
    if (detailTab !== 'Governance' || governance !== undefined) return;
    setGovernanceError(null);
    fetchItemGovernance(item.id)
      .then((status) => setGovernance(status.governance))
      .catch((err) => setGovernanceError(err.message || 'Failed to load governance intelligence'));
  }, [detailTab, item.id, governance, governanceRetryKey]);

  return (
    <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl max-w-4xl mx-auto my-6 animate-fade-in transition-all ${
      isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      {/* Navy Hero Band */}
      <div className={`p-8 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-[#185FA5] border-zinc-200 text-white'
      }`}>
        <div>
          <span className={`text-xs font-bold tracking-widest block mb-1 ${
            isDark ? 'text-amber-400' : 'text-amber-300'
          }`}>
            INDIA GOVERNANCE WATCH
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold font-display tracking-tight">{item.title}</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-100/80'}`}>{item.ministry}</p>
        </div>

        {/* Small Card with NFPRC logo */}
        <div className={`rounded-2xl p-3 flex items-center border shadow-sm select-none ${
          isDark ? 'bg-zinc-950/85 border-zinc-800' : 'bg-white/10 border-white/20'
        }`}>
          <img src={nfprcLogo} alt="NFPRC Foundation" className="h-6 w-auto rounded" />
        </div>
      </div>

      <div className={`p-8 md:p-10 ${isDark ? 'bg-zinc-900/40' : 'bg-zinc-50/30'}`}>
        {/* Back Link */}
        <button
          onClick={onBack}
          className={`no-print flex items-center gap-2 text-sm font-bold mb-6 transition-colors group cursor-pointer ${
            isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-700 hover:text-indigo-900'
          }`}
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to directory</span>
        </button>

        {/* Summary | Policy Intelligence tab strip */}
        <div className={`no-print inline-flex gap-1.5 p-1 rounded-full shadow-inner border mb-6 transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          {(['Summary', 'Intelligence', 'Governance'] as DetailTab[]).map((tab) => {
            const isActive = detailTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? isDark
                      ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50'
                      : 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                {tab === 'Intelligence' && <Sparkles size={12} />}
                {tab === 'Governance' && <Network size={12} />}
                <span>
                  {tab === 'Intelligence' ? 'Policy Intelligence' : tab === 'Governance' ? 'Governance Intelligence' : tab}
                </span>
              </button>
            );
          })}
        </div>

        {detailTab === 'Summary' && (
        <>
        {/* Full Title */}
        <h1 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight mb-5 leading-tight ${
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        }`}>
          {item.title}
        </h1>

        {/* Description as Lead Paragraph */}
        <p className={`text-sm md:text-base leading-relaxed mb-8 border-l-4 pl-4 font-medium ${
          isDark ? 'text-zinc-400 border-indigo-500' : 'text-zinc-600 border-[#185FA5]'
        }`}>
          {item.description}
        </p>

        {/* Bordered Two-Column Table */}
        <div className={`border rounded-[1.75rem] overflow-hidden mb-8 shadow-sm transition-all ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <table className="w-full text-left border-collapse">
            <tbody>
              {/* Row 1: Ministry / State */}
              <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <th className={`w-1/3 p-4 text-xs font-bold uppercase tracking-wider border-r ${
                  isDark ? 'bg-zinc-950/60 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                }`}>
                  Jurisdiction
                </th>
                <td className="p-4 flex items-center flex-wrap gap-2">
                  {isState ? (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-sm ${
                      isDark 
                        ? 'bg-purple-950/40 border-purple-850/50 text-purple-300' 
                        : 'bg-purple-50 border-purple-150 text-purple-800'
                    }`}>
                      <MapPin size={13} className="text-purple-500" />
                      <span>{stateName} (State)</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onFilterMinistry?.(item.ministry)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-sm cursor-pointer transition-colors ${
                        isDark 
                          ? 'bg-indigo-950/40 border-indigo-850/50 text-indigo-300 hover:bg-zinc-800' 
                          : 'bg-indigo-50 border-indigo-150 text-indigo-800 hover:bg-zinc-100'
                      }`}
                    >
                      <Building2 size={13} className="text-indigo-500" />
                      <span>{item.ministry}</span>
                    </button>
                  )}
                </td>
              </tr>

              {/* Row 2: Issue */}
              <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <th className={`p-4 text-xs font-bold uppercase tracking-wider border-r ${
                  isDark ? 'bg-zinc-950/60 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                }`}>
                  Report Issue
                </th>
                <td className="p-4 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                  <span className="hover:underline cursor-pointer">{issueLabel || '—'}</span>
                </td>
              </tr>

              {/* Row 3: Theme */}
              <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <th className={`p-4 text-xs font-bold uppercase tracking-wider border-r ${
                  isDark ? 'bg-zinc-950/60 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                }`}>
                  Theme / Pillar
                </th>
                <td className={`p-4 text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {item.theme}
                </td>
              </tr>

              {/* Row 4: Status + Impact */}
              <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <th className={`p-4 text-xs font-bold uppercase tracking-wider border-r ${
                  isDark ? 'bg-zinc-950/60 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                }`}>
                  Status &amp; Impact
                </th>
                <td className="p-4 flex items-center gap-3 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    item.status === 'Completed' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : item.status === 'Initiated' 
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' 
                        : 'bg-purple-50 text-purple-800 border border-purple-200'
                  }`}>
                    {item.status}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    item.impact === 'High' 
                      ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                      : item.impact === 'Medium' 
                        ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                        : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {item.impact} Impact
                  </span>
                </td>
              </tr>

              {/* Row 5: Tags */}
              <tr>
                <th className={`p-4 text-xs font-bold uppercase tracking-wider border-r ${
                  isDark ? 'bg-zinc-950/60 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                }`}>
                  Tags
                </th>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2.5 py-1 border rounded-lg text-xs font-bold shadow-sm ${
                          isDark 
                            ? 'bg-zinc-800/60 border-zinc-700 text-zinc-300' 
                            : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sources Section */}
        <div className={`border-t pt-8 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <h3 className={`text-base font-bold tracking-tight mb-4 flex items-center gap-2 font-display ${
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          }`}>
            <span>Sources Cited</span>
            <span className="text-xs font-semibold text-zinc-400">({item.sources.length} citations)</span>
          </h3>
          <ul className="space-y-3">
            {item.sources.map((source, index) => (
              <li
                key={index}
                className={`flex items-start gap-3 p-4 border rounded-2xl text-xs transition-all ${
                  isDark 
                    ? 'bg-zinc-950/50 border-zinc-800' 
                    : 'bg-zinc-50 border-zinc-200 shadow-sm'
                }`}
              >
                <span className={`w-6 h-6 rounded-full border font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                  isDark 
                    ? 'bg-indigo-950/40 border-indigo-800 text-indigo-300' 
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <span className={`font-bold block ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{source.label}</span>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs mt-1 font-bold break-all"
                  >
                    <span>{source.url}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
        </>
        )}

        {detailTab === 'Intelligence' && (
          <div className="space-y-5">
            {intelligenceError ? (
              <div className={`p-10 text-center rounded-[1.75rem] border shadow-xl ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}>
                <p className={`text-sm font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Couldn't load Policy Intelligence</p>
                <p className={`text-xs mt-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{intelligenceError}</p>
                <button
                  onClick={() => { setIntelligence(undefined); setIntelligenceRetryKey((k) => k + 1); }}
                  className="mt-4 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : intelligence === undefined ? (
              <div className={`p-10 text-center rounded-[1.75rem] border shadow-xl ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Loading analysis…</p>
              </div>
            ) : intelligence === null ? (
              <PendingIntelligence
                itemId={item.id}
                isAdmin={!!isAdmin}
                isDark={isDark}
                onReady={(intel) => setIntelligence(intel)}
              />
            ) : (
              <>
                <ItemEvolutionPanel itemId={item.id} isAdmin={!!isAdmin} isDark={isDark} />
                {FRAMEWORK_PANELS.map((panel) => panel.render(intelligence, isDark))}
                {intelligence.sources.length > 0 && (
                  <SourcesConsulted sources={intelligence.sources} isDark={isDark} />
                )}
                <DownloadPdfButton isDark={isDark} label="Download Policy Intelligence as PDF" />
                {isAdmin && (
                  <div className="no-print flex justify-center">
                    <UpdateRecordButton<PolicyIntelligence>
                      isDark={isDark}
                      previousGeneratedAt={intelligence.generated_at}
                      label="Update Policy Intelligence"
                      onTrigger={() => triggerIntelligenceGeneration(item.id, true)}
                      onPoll={async () => {
                        const status = await fetchItemIntelligence(item.id);
                        return { data: status.intelligence, generatedAt: status.intelligence?.generated_at ?? null };
                      }}
                      onComplete={(data) => setIntelligence(data)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {detailTab === 'Governance' && (
          <div className="space-y-5">
            {governanceError ? (
              <div className={`p-10 text-center rounded-[1.75rem] border shadow-xl ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}>
                <p className={`text-sm font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Couldn't load Governance Intelligence</p>
                <p className={`text-xs mt-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{governanceError}</p>
                <button
                  onClick={() => { setGovernance(undefined); setGovernanceRetryKey((k) => k + 1); }}
                  className="mt-4 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : governance === undefined ? (
              <div className={`p-10 text-center rounded-[1.75rem] border shadow-xl ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Loading analysis…</p>
              </div>
            ) : governance === null ? (
              <PendingGovernance
                itemId={item.id}
                isAdmin={!!isAdmin}
                isDark={isDark}
                onReady={(gov) => setGovernance(gov)}
              />
            ) : (
              <>
                {GOVERNANCE_PANELS.map((panel) => panel.render(governance, isDark))}
                <GovernanceSynthesis
                  researchBrief={governance.research_brief}
                  synthesisConclusion={governance.synthesis_conclusion}
                  isDark={isDark}
                />
                {governance.sources.length > 0 && (
                  <SourcesConsulted sources={governance.sources} isDark={isDark} />
                )}
                <DownloadPdfButton isDark={isDark} label="Download Governance Intelligence as PDF" />
                {isAdmin && (
                  <div className="no-print flex justify-center">
                    <UpdateRecordButton<PolicyGovernance>
                      isDark={isDark}
                      previousGeneratedAt={governance.generated_at}
                      label="Update Governance Intelligence"
                      onTrigger={() => triggerGovernanceGeneration(item.id, true)}
                      onPoll={async () => {
                        const status = await fetchItemGovernance(item.id);
                        return { data: status.governance, generatedAt: status.governance?.generated_at ?? null };
                      }}
                      onComplete={(data) => setGovernance(data)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
