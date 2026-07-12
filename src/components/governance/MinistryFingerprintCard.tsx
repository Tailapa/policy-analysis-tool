import React, { useEffect, useState } from 'react';
import { Fingerprint as FingerprintIcon } from 'lucide-react';
import { Fingerprint } from '../../types';
import { fetchMinistryFingerprint } from '../../api';
import RadarChart, { RadarAxis } from '../intelligence/RadarChart';

interface MinistryFingerprintCardProps {
  ministryId: string;
  isDark: boolean;
}

export default function MinistryFingerprintCard({ ministryId, isDark }: MinistryFingerprintCardProps) {
  const [fingerprint, setFingerprint] = useState<Fingerprint | null | undefined>(undefined);

  useEffect(() => {
    setFingerprint(undefined);
    fetchMinistryFingerprint(ministryId)
      .then(setFingerprint)
      .catch(() => setFingerprint(null));
  }, [ministryId]);

  if (fingerprint === undefined) {
    return null;
  }
  if (fingerprint === null || fingerprint.sample_size === 0) {
    return null;
  }

  const axes: RadarAxis[] = [
    { key: 'regulatory', label: 'Regulatory', value: fingerprint.typology_mix.avg_regulatory },
    { key: 'distributive', label: 'Distributive', value: fingerprint.typology_mix.avg_distributive },
    { key: 'redistributive', label: 'Redistributive', value: fingerprint.typology_mix.avg_redistributive },
    { key: 'coerce', label: 'Coerce', value: fingerprint.instrument_mix.avg_coerce },
    { key: 'incentivize', label: 'Incentivize', value: fingerprint.instrument_mix.avg_incentivize },
    { key: 'strengthen', label: 'Strengthen', value: fingerprint.instrument_mix.avg_strengthen },
  ];

  return (
    <div
      className={`p-6 rounded-[1.75rem] border shadow-xl transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <h3
        className={`text-sm font-bold tracking-tight mb-4 flex items-center gap-2 font-display ${
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        }`}
      >
        <FingerprintIcon size={15} className="text-indigo-500" />
        <span>Governance Fingerprint</span>
        <span className="text-xs font-semibold text-zinc-400">({fingerprint.sample_size} policies analyzed)</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <RadarChart axes={axes} isDark={isDark} />

        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <span className={`text-lg font-black block ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {Math.round(fingerprint.incremental_pct)}%
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Incremental
            </span>
          </div>
          <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <span className={`text-lg font-black block ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {fingerprint.stakeholder_diversity}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Distinct Stakeholders
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
