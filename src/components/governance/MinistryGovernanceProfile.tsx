import React, { useEffect, useState } from 'react';
import { Scale, Users, Waves, GitBranch, Milestone } from 'lucide-react';
import { LowiAggregate, EngagementAggregate, LifecycleAggregate, MinistryGenomeIndex, LowiType } from '../../types';
import { fetchLowiAggregate, fetchEngagementAggregate, fetchLifecycleAggregate, fetchMinistryGenomeIndex } from '../../api';
import LowiTypologyBars from '../intelligence/LowiTypologyBars';
import LifecycleDistributionBar from '../intelligence/LifecycleDistributionBar';
import EngagementAvgBars from './EngagementAvgBars';
import StreamsAvgCard from './StreamsAvgCard';

interface MinistryGovernanceProfileProps {
  ministryId: string;
  isDark: boolean;
}

function dominantLowiType(lowi: LowiAggregate): LowiType {
  const entries: [LowiType, number][] = [
    ['regulatory', lowi.avg_regulatory],
    ['distributive', lowi.avg_distributive],
    ['redistributive', lowi.avg_redistributive],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function Card({ isDark, icon, title, sampleSize, wide, children }: {
  isDark: boolean;
  icon: React.ReactNode;
  title: string;
  sampleSize?: number;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${wide ? 'lg:col-span-2' : ''} ${
      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      <h3 className={`text-sm font-bold tracking-tight mb-4 flex items-center gap-2 font-display ${
        isDark ? 'text-zinc-100' : 'text-zinc-900'
      }`}>
        {icon}
        <span>{title}</span>
        {sampleSize !== undefined && (
          <span className="text-xs font-semibold text-zinc-400">({sampleSize} {sampleSize === 1 ? 'policy' : 'policies'})</span>
        )}
      </h3>
      {children}
    </div>
  );
}

export default function MinistryGovernanceProfile({ ministryId, isDark }: MinistryGovernanceProfileProps) {
  const [lowi, setLowi] = useState<LowiAggregate | null | undefined>(undefined);
  const [engagement, setEngagement] = useState<EngagementAggregate | null | undefined>(undefined);
  const [lifecycle, setLifecycle] = useState<LifecycleAggregate | null | undefined>(undefined);
  const [genomeIndex, setGenomeIndex] = useState<MinistryGenomeIndex | null | undefined>(undefined);

  useEffect(() => {
    setLowi(undefined);
    setEngagement(undefined);
    setLifecycle(undefined);
    setGenomeIndex(undefined);

    const filters = { ministry_id: ministryId };
    fetchLowiAggregate(filters).then(setLowi).catch(() => setLowi(null));
    fetchEngagementAggregate(filters).then(setEngagement).catch(() => setEngagement(null));
    fetchLifecycleAggregate(filters).then(setLifecycle).catch(() => setLifecycle(null));
    fetchMinistryGenomeIndex(ministryId).then(setGenomeIndex).catch(() => setGenomeIndex(null));
  }, [ministryId]);

  const stillLoading = lowi === undefined || engagement === undefined || lifecycle === undefined || genomeIndex === undefined;
  if (stillLoading) return null;

  const sampleSize = genomeIndex?.sample_size ?? 0;
  if (!lowi && !engagement && !lifecycle && !genomeIndex) return null;
  if (sampleSize === 0 && (!lowi || lowi.sample_size === 0)) return null;

  return (
    <div className="space-y-5">
      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        Ministry Governance Profile — Framework Averages
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {lowi && lowi.sample_size > 0 && (
          <Card isDark={isDark} icon={<Scale size={15} className="text-rose-500" />} title="Lowi's Typology (Average)" sampleSize={lowi.sample_size}>
            <LowiTypologyBars
              regulatory={lowi.avg_regulatory}
              distributive={lowi.avg_distributive}
              redistributive={lowi.avg_redistributive}
              dominantType={dominantLowiType(lowi)}
              isDark={isDark}
            />
          </Card>
        )}

        {engagement && engagement.sample_size > 0 && (
          <Card isDark={isDark} icon={<Users size={15} className="text-indigo-500" />} title="Civic Engagement Dimensions (Average)" sampleSize={engagement.sample_size}>
            <EngagementAvgBars
              avgEducate={engagement.avg_educate}
              avgPersuade={engagement.avg_persuade}
              avgCoerce={engagement.avg_coerce}
              avgStrengthen={engagement.avg_strengthen}
              avgIncentivize={engagement.avg_incentivize}
              isDark={isDark}
            />
          </Card>
        )}

        {genomeIndex && genomeIndex.sample_size > 0 && (
          <Card isDark={isDark} icon={<Waves size={15} className="text-rose-500" />} title="Kingdon's Multiple Streams (Average)" sampleSize={genomeIndex.sample_size}>
            <StreamsAvgCard streamsAvg={genomeIndex.streams_avg} isDark={isDark} />
          </Card>
        )}

        {genomeIndex && genomeIndex.sample_size > 0 && (
          <Card isDark={isDark} icon={<GitBranch size={15} className="text-amber-500" />} title="Punctuated Equilibrium (Distribution)" sampleSize={genomeIndex.sample_size}>
            <LifecycleDistributionBar distribution={genomeIndex.pe_distribution} isDark={isDark} />
          </Card>
        )}

        {lifecycle && lifecycle.sample_size > 0 && (
          <Card isDark={isDark} icon={<Milestone size={15} className="text-emerald-500" />} title="Policy Lifecycle Stage (Distribution)" sampleSize={lifecycle.sample_size} wide>
            <LifecycleDistributionBar distribution={lifecycle.distribution} isDark={isDark} />
          </Card>
        )}
      </div>
    </div>
  );
}
