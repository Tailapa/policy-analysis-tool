import { SCTPQuadrant, Severity } from '../../types';

interface ColorSet {
  hex: string; // for SVG fills/strokes
  light: string; // tailwind classes for light theme chips
  dark: string; // tailwind classes for dark theme chips
  label: string;
}

// One fixed hue per SCTP quadrant, reused everywhere (per-item scatter,
// aggregate scatter, legends) so the mapping is learnable across the app.
export const QUADRANT_META: Record<SCTPQuadrant, ColorSet> = {
  advantaged: {
    hex: '#10B981',
    light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dark: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    label: 'Advantaged',
  },
  contender: {
    hex: '#F59E0B',
    light: 'bg-amber-50 text-amber-800 border-amber-200',
    dark: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    label: 'Contender',
  },
  dependent: {
    hex: '#6366F1',
    light: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dark: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    label: 'Dependent',
  },
  deviant: {
    hex: '#F43F5E',
    light: 'bg-rose-50 text-rose-800 border-rose-200',
    dark: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    label: 'Deviant',
  },
};

export const SEVERITY_META: Record<Severity, ColorSet> = {
  high: {
    hex: '#F43F5E',
    light: 'bg-rose-50 text-rose-800 border-rose-200',
    dark: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    label: 'High',
  },
  medium: {
    hex: '#F59E0B',
    light: 'bg-amber-50 text-amber-800 border-amber-200',
    dark: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    label: 'Medium',
  },
  low: {
    hex: '#71717A',
    light: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dark: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    label: 'Low',
  },
};

export const ACCENT_HEX = { light: '#185FA5', dark: '#6366F1' };
