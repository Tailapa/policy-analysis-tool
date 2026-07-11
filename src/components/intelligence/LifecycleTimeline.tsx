import React from 'react';
import { Check } from 'lucide-react';
import { LifecycleStage } from '../../types';

const STAGES: LifecycleStage[] = [
  'Problem Identification & Agenda Setting',
  'Policy Formulation',
  'Legitimation & Adoption',
  'Implementation',
  'Evaluation',
  'Maintenance, Succession & Termination',
];

const SHORT_LABELS: Record<LifecycleStage, string> = {
  'Problem Identification & Agenda Setting': 'Agenda Setting',
  'Policy Formulation': 'Formulation',
  'Legitimation & Adoption': 'Legitimation',
  'Implementation': 'Implementation',
  'Evaluation': 'Evaluation',
  'Maintenance, Succession & Termination': 'Maintenance / Succession',
};

interface LifecycleTimelineProps {
  currentStage: LifecycleStage;
  isDark: boolean;
}

export default function LifecycleTimeline({ currentStage, isDark }: LifecycleTimelineProps) {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="flex items-start w-full">
      {STAGES.map((stage, i) => {
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center text-center" style={{ width: `${100 / STAGES.length}%` }}>
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/30'
                    : isPast
                      ? isDark
                        ? 'bg-zinc-800 border-zinc-600'
                        : 'bg-zinc-200 border-zinc-300'
                      : isDark
                        ? 'bg-zinc-950 border-zinc-800'
                        : 'bg-white border-zinc-200'
                }`}
              >
                {isPast && <Check size={13} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />}
                {isCurrent && <span className="w-2 h-2 rounded-full bg-white block animate-pulse" />}
              </div>
              <span
                className={`text-[10px] font-bold mt-2 leading-tight px-1 ${
                  isCurrent
                    ? isDark ? 'text-indigo-400' : 'text-indigo-700'
                    : isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                {SHORT_LABELS[stage]}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={`h-0.5 flex-1 mt-3.5 rounded-full ${
                  i < currentIndex
                    ? isDark ? 'bg-zinc-600' : 'bg-zinc-300'
                    : isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
