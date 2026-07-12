import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, TextSize, Item, Issue, Ministry } from './types';
import Masthead from './components/Masthead';
import Overview from './components/Overview';
import Ministries from './components/Ministries';
import IntelligenceOverview from './components/IntelligenceOverview';
import Compare from './components/Compare';
import ItemDetail from './components/ItemDetail';
import Login from './components/Login';
import Upload from './components/Upload';
import { fetchIssues, fetchItemsForIssue, fetchAllItems, fetchMinistries, fetchPillars, getToken, clearToken } from './api';
import { ALL_ISSUES_ID } from './constants';
import { Sparkles, Calendar, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Overview');
  const [textSize, setTextSize] = useState<TextSize>('md');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [pillars, setPillars] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Admin authentication state, derived from the JWT stored by api.ts on login
  const [isAdmin, setIsAdmin] = useState<boolean>(() => getToken() !== null);

  // Theme state: light is primary/default
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  // Shared state for filtering across overview/ministries tabs
  const [selectedMinistry, setSelectedMinistry] = useState<string | undefined>(undefined);

  const [currentIssueId, setCurrentIssueId] = useState<string>('');
  const latestIssueId = issues[0]?.id;
  const activeIssueData = issues.find(issue => issue.id === currentIssueId);

  // Load the issues list + ministries directory once on mount, default to the latest issue
  useEffect(() => {
    fetchIssues()
      .then(fetched => {
        setIssues(fetched);
        if (fetched.length > 0) {
          setCurrentIssueId(fetched[0].id);
        } else {
          setIsLoading(false);
        }
      })
      .catch(err => {
        setLoadError(err.message || 'Failed to load issues from the backend');
        setIsLoading(false);
      });

    fetchMinistries()
      .then(setMinistries)
      .catch(err => setLoadError(err.message || 'Failed to load ministries from the backend'));

    fetchPillars()
      .then(setPillars)
      .catch(err => setLoadError(err.message || 'Failed to load themes from the backend'));
  }, []);

  // Fetch items for whichever issue is currently selected (or every issue,
  // for the aggregate "All Issues" view)
  useEffect(() => {
    if (!currentIssueId) return;
    setIsLoading(true);
    const fetchPromise = currentIssueId === ALL_ISSUES_ID ? fetchAllItems() : fetchItemsForIssue(currentIssueId);
    fetchPromise
      .then(fetched => {
        setItems(fetched);
        setLoadError(null);
      })
      .catch(err => setLoadError(err.message || 'Failed to load items from the backend'))
      .finally(() => setIsLoading(false));
  }, [currentIssueId]);

  // issueId is known for a file-based upload (backend returns it); manual
  // single-item entry doesn't target a specific issue, so falls back to
  // whatever is latest after refetching.
  const refreshAfterPublish = useCallback(async (issueId?: string) => {
    try {
      const freshIssues = await fetchIssues();
      setIssues(freshIssues);
      const targetId = issueId || freshIssues[0]?.id;
      if (!targetId) return;

      const [freshItems, freshMinistries, freshPillars] = await Promise.all([
        fetchItemsForIssue(targetId),
        fetchMinistries(),
        fetchPillars(),
      ]);
      setCurrentIssueId(targetId);
      setItems(freshItems);
      setMinistries(freshMinistries);
      setPillars(freshPillars);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to refresh after publishing');
    }
  }, []);

  // Layout sizing config
  const fontSizeClass = {
    sm: 'text-[14px]',
    md: 'text-[15px]',
    lg: 'text-[17px]'
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    window.scrollTo(0, 0);
  };

  const handleFilterMinistryFromDetail = (ministryName: string) => {
    setSelectedMinistry(ministryName);
    setSelectedItem(null);
    setActiveTab('Overview');
    window.scrollTo(0, 0);
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setActiveTab('Upload');
  };

  const handleLogout = () => {
    clearToken();
    setIsAdmin(false);
    setActiveTab('Overview');
  };

  const handleLoginClick = () => {
    setActiveTab('Login');
    setSelectedItem(null);
  };

  const handleUploadSuccess = (issueId?: string) => {
    refreshAfterPublish(issueId);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen font-sans pb-12 transition-all ${
        isDark ? 'bg-[#09090B] text-zinc-100' : 'bg-[#F4F5F7] text-zinc-800'
      } ${fontSizeClass[textSize]}`}
      style={{
        lineHeight: '1.6'
      }}
    >
      {/* Aggregate "All Issues" view banner */}
      {currentIssueId === ALL_ISSUES_ID && (
        <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between gap-4 border-b ${
          isDark
            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            : 'bg-indigo-50 text-indigo-900 border-indigo-200'
        }`}>
          <div className="flex items-center gap-2">
            <Info size={14} />
            <span>AGGREGATE VIEW: Showing combined totals across all {issues.length} published issues.</span>
          </div>
          {latestIssueId && (
            <button
              onClick={() => setCurrentIssueId(latestIssueId)}
              className={`flex items-center gap-1 font-semibold underline cursor-pointer transition-colors ${
                isDark ? 'text-zinc-100 hover:text-indigo-400' : 'text-indigo-900 hover:text-indigo-750'
              }`}
            >
              <span>Return to Current Issue</span>
              <X size={14} className="inline" />
            </button>
          )}
        </div>
      )}

      {/* Historic issue read-only warning banner */}
      {currentIssueId && latestIssueId && currentIssueId !== latestIssueId && currentIssueId !== ALL_ISSUES_ID && (
        <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between gap-4 border-b ${
          isDark
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-amber-50 text-amber-900 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <Info size={14} />
            <span>
              ARCHIVE PREVIEW: Viewing data for <strong>{activeIssueData?.label}</strong> ({activeIssueData?.dateRange}).
            </span>
          </div>
          <button
            onClick={() => setCurrentIssueId(latestIssueId)}
            className={`flex items-center gap-1 font-semibold underline cursor-pointer transition-colors ${
              isDark ? 'text-zinc-100 hover:text-amber-400' : 'text-amber-900 hover:text-amber-750'
            }`}
          >
            <span>Return to Current Issue</span>
            <X size={14} className="inline" />
          </button>
        </div>
      )}

      {/* Backend connectivity error banner */}
      {loadError && (
        <div className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 border-b ${
          isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <Info size={14} />
          <span>Couldn't reach the backend API: {loadError}</span>
        </div>
      )}

      {/* Main Masthead Header */}
      <Masthead
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedItem(null); // Clear active item drilldown when changing tabs
          window.scrollTo(0, 0);
        }}
        textSize={textSize}
        setTextSize={setTextSize}
        theme={theme}
        toggleTheme={toggleTheme}
        isAdmin={isAdmin}
        onLoginClick={handleLoginClick}
        onLogout={handleLogout}
      />

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {selectedItem ? (
          // Drilldown state: Detailed Policy Brief View
          <ItemDetail
            item={selectedItem}
            onBack={() => { setSelectedItem(null); window.scrollTo(0, 0); }}
            onFilterMinistry={handleFilterMinistryFromDetail}
            theme={theme}
            issueLabel={activeIssueData?.label}
            isAdmin={isAdmin}
          />
        ) : (
          // Tabs layout
          <>
            {activeTab === 'Overview' && (
              <Overview
                onSelectItem={handleSelectItem}
                selectedMinistry={selectedMinistry}
                setSelectedMinistry={setSelectedMinistry}
                theme={theme}
                items={items}
                currentIssueId={currentIssueId}
                setCurrentIssueId={setCurrentIssueId}
                issues={issues}
                ministries={ministries}
                pillars={pillars}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'Ministries' && (
              <Ministries
                onSelectItem={handleSelectItem}
                selectedMinistry={selectedMinistry}
                setSelectedMinistry={setSelectedMinistry}
                theme={theme}
                items={items}
                currentIssueId={currentIssueId}
                setCurrentIssueId={setCurrentIssueId}
                issues={issues}
                ministries={ministries}
                pillars={pillars}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'Intelligence' && (
              <IntelligenceOverview
                theme={theme}
                items={items}
                currentIssueId={currentIssueId}
                issues={issues}
                pillars={pillars}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'Compare' && (
              <Compare theme={theme} items={items} ministries={ministries} pillars={pillars} />
            )}

            {activeTab === 'Login' && (
              <Login
                onLoginSuccess={handleLoginSuccess}
                onBackToDashboard={() => setActiveTab('Overview')}
                theme={theme}
              />
            )}

            {activeTab === 'Upload' && (
              <Upload
                onUploadSuccess={handleUploadSuccess}
                onBackToDashboard={() => setActiveTab('Overview')}
                theme={theme}
                ministries={ministries}
                pillars={pillars}
                onMinistriesChanged={refreshAfterPublish}
                onPillarsChanged={() => fetchPillars().then(setPillars).catch(() => {})}
              />
            )}
          </>
        )}
      </main>

      {/* Footer Block */}
      <footer className={`no-print mt-16 border-t pt-8 text-center text-xs max-w-7xl mx-auto px-4 ${
        isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500'
      }`}>
        <p>&copy; 2026 NFPRC Foundation. All rights reserved.</p>
        <p className={`mt-1.5 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Designed as a high-fidelity interactive prototype for administrative, research, and review reference.
        </p>
      </footer>
    </div>
  );
}
