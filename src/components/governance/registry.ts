import React from 'react';
import { Waves, GitBranch, Users2, Skull, Dna } from 'lucide-react';
import { PolicyGovernance } from '../../types';
import FrameworkPanel from '../intelligence/FrameworkPanel';
import StreamsIndicator from './StreamsIndicator';
import PunctuatedEquilibriumStages from './PunctuatedEquilibriumStages';
import EntrepreneurTree from './EntrepreneurTree';
import WickednessRadar from './WickednessRadar';
import GenomeRadial from './GenomeRadial';
import AnalyticalBrief from '../AnalyticalBrief';

export interface GovernancePanelEntry {
  key: string;
  render: (governance: PolicyGovernance, isDark: boolean) => React.ReactNode;
}

// Adding a new governance module: append one entry here with its own
// visualization component — this array drives the Governance Intelligence
// tab, mirroring src/components/intelligence/registry.ts's pattern exactly.
export const GOVERNANCE_PANELS: GovernancePanelEntry[] = [
  {
    key: 'streams',
    render: (gov, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'streams',
          title: "Kingdon's Multiple Streams",
          definition:
            'Whether this policy emerged from a problem, an already-available solution, or a political opportunity — and whether a window opened to couple all three.',
          confidence: gov.streams.confidence,
          reasoning: gov.streams.reasoning,
          isDark,
          icon: React.createElement(Waves, { size: 15, className: 'text-rose-500' }),
        },
        React.createElement(StreamsIndicator, {
          problemScore: gov.streams.problem_score,
          policyScore: gov.streams.policy_score,
          politicsScore: gov.streams.politics_score,
          windowOpen: gov.streams.window_open,
          isDark,
        })
      ),
  },
  {
    key: 'punctuated_equilibrium',
    render: (gov, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'punctuated_equilibrium',
          title: 'Punctuated Equilibrium',
          definition:
            'Whether this policy is a routine adjustment within a stable policy monopoly, or evidence of that monopoly eroding toward a major, non-incremental change.',
          confidence: gov.punctuated_equilibrium.confidence,
          reasoning: gov.punctuated_equilibrium.reasoning,
          isDark,
          icon: React.createElement(GitBranch, { size: 15, className: 'text-amber-500' }),
        },
        React.createElement(PunctuatedEquilibriumStages, {
          currentStage: gov.punctuated_equilibrium.stage,
          isDark,
        })
      ),
  },
  {
    key: 'entrepreneurs',
    render: (gov, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'entrepreneurs',
          title: 'Policy Entrepreneurs',
          definition:
            'The specific actors who invested time, reputation, and political capital pushing this policy forward, ranked by how much they shaped it.',
          confidence: gov.entrepreneurs.confidence,
          reasoning: gov.entrepreneurs.reasoning,
          isDark,
          icon: React.createElement(Users2, { size: 15, className: 'text-indigo-500' }),
        },
        React.createElement(EntrepreneurTree, {
          entrepreneurs: gov.entrepreneurs.entrepreneurs,
          isDark,
        })
      ),
  },
  {
    key: 'wickedness',
    render: (gov, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'wickedness',
          title: 'Wickedness Index',
          definition:
            "How structurally complex this policy problem is across seven dimensions — from implementation difficulty to cross-jurisdictional coordination and scientific uncertainty.",
          confidence: gov.wickedness.confidence,
          reasoning: gov.wickedness.reasoning,
          isDark,
          icon: React.createElement(Skull, { size: 15, className: 'text-purple-500' }),
        },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(WickednessRadar, {
            dimensions: gov.wickedness.dimensions,
            overallScore: gov.wickedness.overall_score,
            isDark,
          }),
          React.createElement(AnalyticalBrief, {
            heading: 'Analytical Brief',
            text: gov.wickedness.brief,
            isDark,
          })
        )
      ),
  },
  {
    key: 'genome',
    render: (gov, isDark) =>
      React.createElement(
        FrameworkPanel,
        {
          key: 'genome',
          title: 'Governance Genome',
          definition:
            "A ten-dimension signature combining this policy's readings across every other framework — computed directly from those scores, not separately generated.",
          confidence: gov.genome.confidence,
          reasoning: gov.genome.reasoning,
          isDark,
          icon: React.createElement(Dna, { size: 15, className: 'text-emerald-500' }),
        },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(GenomeRadial, {
            vector: gov.genome.vector,
            dimensions: gov.genome.dimensions,
            isDark,
          }),
          React.createElement(AnalyticalBrief, {
            heading: 'Analytical Brief',
            text: gov.genome.brief,
            isDark,
          })
        )
      ),
  },
];
