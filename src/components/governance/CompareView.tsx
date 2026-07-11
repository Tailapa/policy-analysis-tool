import React from 'react';
import { CompareEntry, CompareGovernanceResult } from '../../types';
import GenomeRadial from './GenomeRadial';
import RadarChart, { RadarAxis } from '../intelligence/RadarChart';
import LowiTypologyBars from '../intelligence/LowiTypologyBars';
import StreamsIndicator from './StreamsIndicator';
import WickednessRadar from './WickednessRadar';

interface CompareViewProps {
  result: CompareGovernanceResult;
  isDark: boolean;
}

function entryGenome(entry: CompareEntry): { vector: number[]; dimensions: string[] } | null {
  if (entry.governance) return { vector: entry.governance.genome.vector, dimensions: entry.governance.genome.dimensions };
  if (entry.fingerprint) return { vector: entry.fingerprint.avg_genome_vector, dimensions: entry.fingerprint.genome_dimensions };
  return null;
}

interface PanelProps {
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}

function Panel({ title, isDark, children }: PanelProps) {
  return (
    <div className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <h3 className={`text-sm font-bold tracking-tight mb-4 font-display ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{title}</h3>
      {children}
    </div>
  );
}

export default function CompareView({ result, isDark }: CompareViewProps) {
  const { entry_a, entry_b } = result;
  const genomeA = entryGenome(entry_a);
  const genomeB = entryGenome(entry_b);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[entry_a, entry_b].map((entry, i) => (
          <div
            key={i}
            className={`p-5 rounded-2xl border text-center shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {i === 0 ? 'Entry A' : 'Entry B'}
            </span>
            <p className={`text-base font-extrabold font-display mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{entry.label}</p>
          </div>
        ))}
      </div>

      {genomeA && genomeB && (
        <Panel title="Governance Genome — Overlaid" isDark={isDark}>
          <GenomeRadial
            vector={genomeA.vector}
            dimensions={genomeA.dimensions}
            isDark={isDark}
            compareVector={genomeB.vector}
            primaryLabel={entry_a.label}
            compareLabel={entry_b.label}
          />
        </Panel>
      )}

      {result.type === 'policy' && entry_a.governance && entry_b.governance && (
        <Panel title="Wickedness Index — Overlaid" isDark={isDark}>
          <RadarChart
            axes={wickednessAxes(entry_a.governance.wickedness.dimensions)}
            isDark={isDark}
            compareAxes={wickednessAxes(entry_b.governance.wickedness.dimensions)}
            primaryLabel={entry_a.label}
            compareLabel={entry_b.label}
          />
        </Panel>
      )}

      {result.type === 'policy' && (entry_a.governance || entry_b.governance) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[entry_a, entry_b].map((entry, i) => (
            <React.Fragment key={i}>
              <Panel title={`${entry.label} — Streams`} isDark={isDark}>
                {entry.governance ? (
                  <StreamsIndicator
                    problemScore={entry.governance.streams.problem_score}
                    policyScore={entry.governance.streams.policy_score}
                    politicsScore={entry.governance.streams.politics_score}
                    windowOpen={entry.governance.streams.window_open}
                    isDark={isDark}
                  />
                ) : (
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>No governance data yet.</p>
                )}
              </Panel>
            </React.Fragment>
          ))}
        </div>
      )}

      {result.type === 'policy' && (entry_a.intelligence || entry_b.intelligence) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[entry_a, entry_b].map((entry, i) => (
            <React.Fragment key={i}>
              <Panel title={`${entry.label} — Lowi Typology`} isDark={isDark}>
                {entry.intelligence ? (
                  <LowiTypologyBars
                    regulatory={entry.intelligence.lowi.regulatory_score}
                    distributive={entry.intelligence.lowi.distributive_score}
                    redistributive={entry.intelligence.lowi.redistributive_score}
                    dominantType={entry.intelligence.lowi.dominant_type}
                    isDark={isDark}
                  />
                ) : (
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>No intelligence data yet.</p>
                )}
              </Panel>
            </React.Fragment>
          ))}
        </div>
      )}

      {(entry_a.fingerprint || entry_b.fingerprint) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[entry_a, entry_b].map((entry, i) =>
            entry.fingerprint ? (
              <React.Fragment key={i}>
                <StatTile label={`${entry.label} — Avg Wickedness`} value={Math.round(entry.fingerprint.avg_wickedness)} isDark={isDark} />
                <StatTile label={`${entry.label} — Incremental %`} value={`${Math.round(entry.fingerprint.incremental_pct)}%`} isDark={isDark} />
                <StatTile label={`${entry.label} — Stakeholder Diversity`} value={entry.fingerprint.stakeholder_diversity} isDark={isDark} />
              </React.Fragment>
            ) : null
          )}
        </div>
      )}

      {!genomeA && !genomeB && (
        <div className={`p-10 text-center rounded-[1.75rem] border shadow-xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Neither entry has governance data yet — generate it first to see a comparison.
          </p>
        </div>
      )}
    </div>
  );
}

function wickednessAxes(dimensions: {
  implementation_complexity: number;
  political_conflict: number;
  federal_coordination: number;
  scientific_uncertainty: number;
  behaviour_change: number;
  time_horizon: number;
  cross_sector: number;
}): RadarAxis[] {
  return [
    { key: 'implementation_complexity', label: 'Implementation', value: dimensions.implementation_complexity },
    { key: 'political_conflict', label: 'Political Conflict', value: dimensions.political_conflict },
    { key: 'federal_coordination', label: 'Coordination', value: dimensions.federal_coordination },
    { key: 'scientific_uncertainty', label: 'Uncertainty', value: dimensions.scientific_uncertainty },
    { key: 'behaviour_change', label: 'Behaviour Change', value: dimensions.behaviour_change },
    { key: 'time_horizon', label: 'Time Horizon', value: dimensions.time_horizon },
    { key: 'cross_sector', label: 'Cross-Sector', value: dimensions.cross_sector },
  ];
}

function StatTile({ label, value, isDark }: { label: string; value: number | string; isDark: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <span className={`text-xl font-black block ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{value}</span>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</span>
    </div>
  );
}
