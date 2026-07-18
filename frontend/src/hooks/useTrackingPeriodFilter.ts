import { useMemo, useState } from 'react';
import { Item, Issue } from '../types';

// Year / Month / specific Issue are independent multi-select filters (OR
// within each, AND across); an issue matches when it satisfies every
// non-empty one. Empty everywhere = All Issues (no restriction).
export function useTrackingPeriodFilter(issues: Issue[]) {
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);

  const isAllIssues = selectedYears.length === 0 && selectedMonths.length === 0 && selectedIssueIds.length === 0;

  const matchingIssueIds = useMemo(() => {
    if (isAllIssues) return null; // null = no restriction
    const ids = new Set<string>();
    issues.forEach(issue => {
      const d = new Date(issue.periodStart);
      if (selectedYears.length > 0 && !selectedYears.includes(d.getFullYear())) return;
      if (selectedMonths.length > 0 && !selectedMonths.includes(d.getMonth())) return;
      if (selectedIssueIds.length > 0 && !selectedIssueIds.includes(issue.id)) return;
      ids.add(issue.id);
    });
    return ids;
  }, [issues, selectedYears, selectedMonths, selectedIssueIds, isAllIssues]);

  const filterItemsByPeriod = (allItems: Item[]): Item[] => {
    if (matchingIssueIds === null) return allItems;
    return allItems.filter(item => matchingIssueIds.has(item.issueId));
  };

  const toggleYear = (year: number) => {
    setSelectedYears(prev => (prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]));
  };
  const toggleMonth = (month: number) => {
    setSelectedMonths(prev => (prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]));
  };
  const toggleIssueId = (id: string) => {
    setSelectedIssueIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };
  const resetTrackingPeriod = () => {
    setSelectedYears([]);
    setSelectedMonths([]);
    setSelectedIssueIds([]);
  };

  const matchingIssuesCount = matchingIssueIds === null ? issues.length : matchingIssueIds.size;

  return {
    selectedYears,
    selectedMonths,
    selectedIssueIds,
    isAllIssues,
    matchingIssueIds,
    matchingIssuesCount,
    filterItemsByPeriod,
    toggleYear,
    toggleMonth,
    toggleIssueId,
    resetTrackingPeriod,
  };
}

export type TrackingPeriodFilterState = ReturnType<typeof useTrackingPeriodFilter>;
