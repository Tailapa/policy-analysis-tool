// Sentinel value for "Browse Tracking Period" — selects an aggregate view
// summing every issue published so far, instead of one specific issue.
export const ALL_ISSUES_ID = 'all';

// Fallback styling for admin-created themes that aren't in a component's
// static color map (e.g. a theme added after the dashboard shipped) —
// reuses the neutral "Misc" gray so new themes render sensibly instead of
// crashing on an undefined pillarMeta lookup.
export function getDefaultPillarMeta(isDark: boolean): { color: string; text: string; bg: string } {
  return isDark
    ? { color: '#71717A', text: '#E4E4E7', bg: '#27272A' }
    : { color: '#888780', text: '#444441', bg: '#F1EFE8' };
}
