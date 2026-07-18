import { Issue } from './types';

// Sentinel value for "Browse Tracking Period" — selects an aggregate view
// summing every issue published so far, instead of one specific issue.
export const ALL_ISSUES_ID = 'all';

// An item's `issueId` points to the specific report issue it was published
// in (label already encodes month + year + issue number, e.g. "December
// 2025 | Issue I") — this is independent of whichever issue happens to be
// selected in the top nav, so it must always be looked up by id.
export function getItemIssueLabel(issueId: string, issues: Issue[]): string | undefined {
  return issues.find(issue => issue.id === issueId)?.label;
}

// Fallback styling for admin-created themes that aren't in a component's
// static color map (e.g. a theme added after the dashboard shipped) —
// reuses the neutral "Misc" gray so new themes render sensibly instead of
// crashing on an undefined pillarMeta lookup.
export function getDefaultPillarMeta(isDark: boolean): { color: string; text: string; bg: string } {
  return isDark
    ? { color: '#71717A', text: '#E4E4E7', bg: '#27272A' }
    : { color: '#888780', text: '#444441', bg: '#F1EFE8' };
}
