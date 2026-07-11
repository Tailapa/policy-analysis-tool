import React from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { BlindSpot } from '../../types';
import { SEVERITY_META } from './colors';

interface ImplementationChainDiagramProps {
  streetLevelBureaucrats: string[];
  blindSpots: BlindSpot[];
  isDark: boolean;
}

export default function ImplementationChainDiagram({
  streetLevelBureaucrats,
  blindSpots,
  isDark,
}: ImplementationChainDiagramProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Street-level bureaucrats spine */}
      <div>
        <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <Users size={12} />
          <span>Street-Level Implementers</span>
        </h4>
        <div className={`border-l-2 pl-4 space-y-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          {streetLevelBureaucrats.map((role, i) => (
            <div key={i} className="relative">
              <span
                className={`absolute -left-[1.375rem] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                  isDark ? 'bg-indigo-500 border-zinc-950' : 'bg-indigo-500 border-white'
                }`}
              />
              <span
                className={`inline-block px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                  isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-150 text-indigo-800'
                }`}
              >
                {role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Blind spots spine */}
      <div>
        <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <AlertTriangle size={12} />
          <span>Policy Blind Spots</span>
        </h4>
        <div className={`border-l-2 pl-4 space-y-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          {blindSpots.map((spot, i) => {
            const meta = SEVERITY_META[spot.severity];
            return (
              <div key={i} className="relative">
                <span
                  className="absolute -left-[1.375rem] top-1.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{ backgroundColor: meta.hex, borderColor: isDark ? '#09090B' : '#FFFFFF' }}
                />
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${isDark ? meta.dark : meta.light}`}>
                      {meta.label} severity
                    </span>
                    <span className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {spot.affected_group}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{spot.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
