import React from 'react';
import { Scale, Users2, Radar as RadarIcon, Milestone, Network, MoveHorizontal } from 'lucide-react';
import { ConfidenceLevel, PolicyIntelligence } from '../../types';
import FrameworkPanel from './FrameworkPanel';
import LowiTypologyBars from './LowiTypologyBars';
import QuadrantScatter, { QuadrantPoint } from './QuadrantScatter';
import RadarChart, { RadarAxis } from './RadarChart';
import LifecycleTimeline from './LifecycleTimeline';
import ImplementationChainDiagram from './ImplementationChainDiagram';
import LindblomScale from './LindblomScale';

export interface FrameworkPanelEntry {
  key: string;
  render: (intelligence: PolicyIntelligence, isDark: boolean) => React.ReactNode;
}

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };

function worstConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  if (levels.length === 0) return 'medium';
  return levels.reduce((worst, c) => (CONFIDENCE_RANK[c] < CONFIDENCE_RANK[worst] ? c : worst));
}

// Adding a 7th framework: append one entry here with its own visualization
// component (or reuse an existing one) — this array drives the whole
// Policy Intelligence tab, so no other layout change is needed.
export const FRAMEWORK_PANELS: FrameworkPanelEntry[] = [
  {
    key: 'lowi',
    render: (intel, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'lowi',
          title: "Lowi's Policy Typology",
          definition:
            "Classifies the policy's control mechanism: regulatory (rules/coercion on conduct), distributive (targeted benefits, diffuse costs), or redistributive (reallocates wealth or rights across broad groups).",
          confidence: intel.lowi.confidence,
          reasoning: intel.lowi.reasoning,
          isDark,
          icon: React.createElement(Scale, { size: 15, className: 'text-rose-500' }),
        },
        React.createElement(LowiTypologyBars, {
          regulatory: intel.lowi.regulatory_score,
          distributive: intel.lowi.distributive_score,
          redistributive: intel.lowi.redistributive_score,
          dominantType: intel.lowi.dominant_type,
          isDark,
        })
      ),
  },
  {
    key: 'sctp',
    render: (intel, isDark) => {
      const points: QuadrantPoint[] = intel.sctp.groups.map((g, i) => ({
        id: `${g.group_name}-${i}`,
        label: g.group_name,
        rationale: g.rationale,
        x: g.power_score,
        y: g.construction_score,
        quadrant: g.quadrant,
      }));
      const confidence = worstConfidence(intel.sctp.groups.map((g) => g.confidence));
      return React.createElement(
        FrameworkPanel,
        {
          key: 'sctp',
          title: 'Social Construction of Target Populations',
          definition:
            "Maps every stakeholder group this policy targets by political power and social construction — who's treated as Advantaged, Contender, Dependent, or Deviant, and what that implies about the tools used on them. Hover a point for why that specific group was placed there.",
          confidence,
          reasoning: intel.sctp.overall_reasoning,
          isDark,
          icon: React.createElement(Users2, { size: 15, className: 'text-indigo-500' }),
        },
        React.createElement(QuadrantScatter, { points, isDark })
      );
    },
  },
  {
    key: 'engagement',
    render: (intel, isDark) => {
      const axes: RadarAxis[] = [
        { key: 'educate', label: 'Educate', value: intel.engagement.educate_score },
        { key: 'persuade', label: 'Persuade', value: intel.engagement.persuade_score },
        { key: 'coerce', label: 'Coerce', value: intel.engagement.coerce_score },
        { key: 'strengthen', label: 'Strengthen', value: intel.engagement.strengthen_score },
        { key: 'incentivize', label: 'Incentivize', value: intel.engagement.incentivize_score },
      ];
      return React.createElement(
        FrameworkPanel,
        {
          key: 'engagement',
          title: 'Dimensions of Civic Engagement',
          definition:
            'How this policy engages people: through education, persuasion, coercion, capacity-strengthening, or incentives. Most policies lean on several dimensions at once.',
          confidence: intel.engagement.confidence,
          reasoning: intel.engagement.reasoning,
          isDark,
          icon: React.createElement(RadarIcon, { size: 15, className: 'text-emerald-500' }),
        },
        React.createElement(RadarChart, { axes, isDark })
      );
    },
  },
  {
    key: 'lifecycle',
    render: (intel, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'lifecycle',
          title: 'Policy Life Cycle Stage',
          definition:
            'Where this policy currently sits in the six-stage policy process, from problem identification through to maintenance, succession, or termination.',
          confidence: intel.lifecycle.confidence,
          reasoning: intel.lifecycle.reasoning,
          isDark,
          icon: React.createElement(Milestone, { size: 15, className: 'text-amber-500' }),
        },
        React.createElement(LifecycleTimeline, { currentStage: intel.lifecycle.current_stage, isDark })
      ),
  },
  {
    key: 'implementation',
    render: (intel, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'implementation',
          title: 'Implementation: Street-Level Bureaucrats & Blind Spots',
          definition:
            "The front-line roles who will actually deliver this policy, and gaps in the policy's design that risk being overlooked at the point of implementation.",
          confidence: intel.implementation.confidence,
          reasoning: intel.implementation.reasoning,
          isDark,
          icon: React.createElement(Network, { size: 15, className: 'text-purple-500' }),
        },
        React.createElement(ImplementationChainDiagram, {
          streetLevelBureaucrats: intel.implementation.street_level_bureaucrats,
          blindSpots: intel.implementation.blind_spots,
          isDark,
        })
      ),
  },
  {
    key: 'lindblom',
    render: (intel, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'lindblom',
          title: 'Rational-Comprehensive vs. Disjointed Incrementalism',
          definition:
            "Where this policy falls between a from-first-principles redesign (rational-comprehensive) and a marginal adjustment to the existing status quo (Lindblom's \"muddling through\").",
          confidence: intel.lindblom.confidence,
          reasoning: intel.lindblom.reasoning,
          isDark,
          icon: React.createElement(MoveHorizontal, { size: 15, className: 'text-[#185FA5] dark:text-indigo-400' }),
        },
        React.createElement(LindblomScale, { score: intel.lindblom.score, isDark })
      ),
  },
];
