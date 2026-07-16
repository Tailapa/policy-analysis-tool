import React, { useState } from 'react';
import { Item } from '../types';
import { Building2, MapPin, ExternalLink, ArrowLeft, AlertTriangle, Download, Loader2 } from 'lucide-react';
import nfprcLogo from '../../assets/NFPRC_logo.png';
import ItemEvolutionPanel from './governance/ItemEvolutionPanel';
import { downloadItemPdf } from '../api';

interface ItemDetailProps {
  item: Item;
  onBack: () => void;
  onFilterMinistry?: (ministryName: string) => void;
  onOpenItem?: (itemId: string) => void;
  theme: 'light' | 'dark';
  issueLabel?: string;
  isAdmin?: boolean;
}

export default function ItemDetail({ item, onBack, onFilterMinistry, onOpenItem, theme, issueLabel, isAdmin }: ItemDetailProps) {
  const isState = item.geography.startsWith('state:');
  const stateName = isState ? item.geography.replace('state:', '').trim() : '';

  const isDark = theme === 'dark';
  const linkedMinistries = item.linkedMinistries.length > 0 ? item.linkedMinistries : null;

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadItemPdf(item.id);
    } catch (err: any) {
      setDownloadError(err.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl max-w-4xl mx-auto my-6 animate-fade-in transition-all ${
      isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      {/* Navy Hero Band */}
      <div className={`p-8 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-[#0077b6] border-zinc-200 text-white'
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
        {/* Back Link + Download PDF */}
        <div className="no-print flex items-center justify-between gap-4 mb-6 flex-wrap">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 text-sm font-bold transition-colors group cursor-pointer ${
              isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-700 hover:text-indigo-900'
            }`}
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span>Back to directory</span>
          </button>

          <div className="flex items-center gap-2">
            {downloadError && <span className="text-xs font-bold text-rose-500">{downloadError}</span>}
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border shadow-sm transition-all cursor-pointer ${
                downloading
                  ? 'opacity-60 cursor-not-allowed'
                  : ''
              } ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                  : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Full Title */}
        <h1 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight mb-5 leading-tight ${
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        }`}>
          {item.title}
        </h1>

        {/* Description as Lead Paragraph */}
        <p className={`text-sm md:text-base leading-relaxed mb-8 border-l-4 pl-4 font-medium ${
          isDark ? 'text-zinc-400 border-indigo-500' : 'text-zinc-600 border-[#0077b6]'
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
                  ) : linkedMinistries ? (
                    linkedMinistries.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onFilterMinistry?.(m.name)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-sm cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300 hover:bg-zinc-800'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-zinc-100'
                        }`}
                      >
                        <Building2 size={13} className="text-indigo-500" />
                        <span>{m.name}</span>
                        {m.category === 'regulatory_body' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">Regulatory Body</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => onFilterMinistry?.(item.ministry)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-sm cursor-pointer transition-colors ${
                        isDark
                          ? 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300 hover:bg-zinc-800'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-zinc-100'
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

              {/* Row 4: Status + Impact + Draft */}
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
                        : item.status === 'Announced'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-zinc-100 text-zinc-500 border border-zinc-200 italic'
                  }`}>
                    {item.status ?? 'Not specified'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    item.impact === 'High'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : item.impact === 'Medium'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : item.impact === 'Low'
                          ? 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          : 'bg-zinc-100 text-zinc-500 border border-zinc-200 italic'
                  }`}>
                    {item.impact ? `${item.impact} Impact` : 'Impact not specified'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    isDark ? 'bg-zinc-800/60 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}>
                    {item.subtype}
                  </span>
                  {item.isDraft && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <AlertTriangle size={11} />
                      <span>Draft</span>
                    </span>
                  )}
                </td>
              </tr>

              {/* Row 5: Financial Outlay — only when the source PDF mentions one */}
              {item.financialOutlay && (
                <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <th className={`p-4 text-xs font-bold uppercase tracking-wider border-r ${
                    isDark ? 'bg-zinc-950/60 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                  }`}>
                    Financial Outlay
                  </th>
                  <td className={`p-4 text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {item.financialOutlay}
                  </td>
                </tr>
              )}

              {/* Row 6: Tags */}
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

        {item.isDraft && item.draftVerification && !item.draftVerification.stillDraft && (
          <div className={`mb-8 p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
            isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">AI cross-check suggests this may have since been finalized</p>
              <p className="mt-1 opacity-90">{item.draftVerification.reasoning}</p>
            </div>
          </div>
        )}

        {/* Policy Evolution — only from PDFs already uploaded to this dashboard */}
        <div className="mb-8">
          <ItemEvolutionPanel itemId={item.id} isAdmin={!!isAdmin} isDark={isDark} onOpenItem={onOpenItem} />
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
      </div>
    </div>
  );
}
