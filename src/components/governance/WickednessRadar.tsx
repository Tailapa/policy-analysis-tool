import React from 'react';
import { WickednessDimensions } from '../../types';
import RadarChart, { RadarAxis } from '../intelligence/RadarChart';

interface WickednessRadarProps {
  dimensions: WickednessDimensions;
  overallScore: number; // 0-100
  isDark: boolean;
}

const AXIS_LABELS: Record<keyof WickednessDimensions, string> = {
  implementation_complexity: 'Implementation',
  political_conflict: 'Political Conflict',
  federal_coordination: 'Coordination',
  scientific_uncertainty: 'Uncertainty',
  behaviour_change: 'Behaviour Change',
  time_horizon: 'Time Horizon',
  cross_sector: 'Cross-Sector',
};

export default function WickednessRadar({ dimensions, overallScore, isDark }: WickednessRadarProps) {
  const axes: RadarAxis[] = (Object.keys(AXIS_LABELS) as (keyof WickednessDimensions)[]).map((key) => ({
    key,
    label: AXIS_LABELS[key],
    value: dimensions[key],
  }));

  const severityColor =
    overallScore >= 66 ? '#F43F5E' : overallScore >= 33 ? '#F59E0B' : '#10B981';

  return (
    <div className="w-full">
      <div className="text-center mb-2">
        <span className="text-3xl font-black font-display" style={{ color: severityColor }}>
          {Math.round(overallScore)}
        </span>
        <span className={`text-sm font-bold ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>/ 100</span>
        <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Overall Wickedness
        </p>
      </div>
      <RadarChart axes={axes} isDark={isDark} />
    </div>
  );
}
