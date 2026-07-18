import React from 'react';
import { ActiveTab, TextSize } from '../types';
import { Sun, Moon, X } from 'lucide-react';
import nfprcLogo from '../../assets/NFPRC_logo.png';

interface MastheadProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function Masthead({
  activeTab,
  setActiveTab,
  textSize,
  setTextSize,
  theme,
  toggleTheme,
  isAdmin,
  onLoginClick,
  onLogout,
}: MastheadProps) {
  const tabs: ActiveTab[] = ['Overview', 'Ministries', 'RegulatoryBodies', 'Miscellaneous', 'Drafts', 'Reports'];
  const TAB_LABELS: Record<ActiveTab, string> = {
    Overview: 'Overview',
    Ministries: 'Ministries',
    RegulatoryBodies: 'Regulatory Bodies',
    Miscellaneous: 'Miscellaneous',
    Drafts: 'Drafts',
    Reports: 'Reports',
    Login: 'Login',
    Upload: 'Upload',
  };
  const isDark = theme === 'dark';

  return (
    <header className={`no-print border-b px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full transition-all ${isDark ? 'border-zinc-800 bg-[#09090B]' : 'border-white/10 bg-[#0d3957] shadow-sm'
      }`}>
      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
        {/* NFPRC Foundation Logo — both themes now sit on a dark header bg,
            so the logo always needs its white backing pill for contrast. */}
        <img
          src={nfprcLogo}
          alt="NFPRC Foundation"
          className="h-9 w-auto flex-shrink-0 bg-white rounded-md px-1.5 py-1"
        />

        {/* Vertical Divider */}
        <div className={`hidden sm:block w-px h-8 ${isDark ? 'bg-zinc-800' : 'bg-white/15'}`}></div>

        {/* Brand Block */}
        <div>
          <h1 className={`text-xl font-bold font-display tracking-tight ${isDark ? 'text-zinc-100' : 'text-white'}`}>
            India Governance Watch
          </h1>
          <p className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-slate-300/90'}`}>Viksit Bharat's policy and administrative developments</p>
        </div>
      </div>

      <div className="flex items-center gap-4 self-end md:self-auto flex-wrap sm:flex-nowrap w-full sm:w-auto">
        {/* Navigation Tabs as Pills — horizontally scrollable on narrow
            screens (5 tabs incl. "Regulatory Bodies" don't fit a phone
            width) instead of overflowing the page or wrapping mid-pill. */}
        <nav className={`flex gap-1.5 p-1 rounded-full shadow-inner border transition-all overflow-x-auto max-w-full ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${isActive
                    ? isDark
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                  }`}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </nav>

        {/* Theme + Font Control cluster */}
        <div className="flex items-center gap-2">
          {/* Admin Login/Logout Button */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('Upload')}
                className={`px-3 py-1 text-[10px] font-bold border rounded-full transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'Upload'
                    ? isDark
                      ? 'bg-zinc-800 text-white border-zinc-700/60 shadow-md'
                      : 'bg-white text-indigo-700 border-indigo-200 shadow-sm font-black'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800/50'
                      : 'bg-zinc-50 border-zinc-200 text-emerald-700 hover:text-emerald-900 hover:bg-zinc-100 shadow-sm'
                  }`}
                title="Go to secure publishing portal"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Upload</span>
              </button>
              <button
                onClick={onLogout}
                className={`p-1.5 rounded-full border shadow-inner transition-all cursor-pointer flex items-center justify-center ${isDark
                    ? 'bg-zinc-900 border-zinc-800 text-rose-400 hover:bg-zinc-800/50'
                    : 'bg-zinc-100 border-zinc-200 text-rose-600 hover:bg-zinc-200/50 hover:text-rose-700'
                  }`}
                title="Log out of Admin Portal"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className={`p-1.5 rounded-full border shadow-inner transition-all cursor-pointer flex items-center justify-center ${activeTab === 'Login'
                  ? isDark
                    ? 'bg-zinc-800 border-zinc-700 text-white'
                    : 'bg-white border-zinc-300 text-zinc-900 shadow-sm'
                  : isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              title="Admin Portal Login"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
          )}

          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-full border shadow-inner transition-all cursor-pointer flex items-center justify-center ${isDark
                ? 'bg-zinc-900 border-zinc-800 text-amber-400 hover:text-amber-300 hover:bg-zinc-800/50'
                : 'bg-zinc-100 border-zinc-200 text-indigo-900 hover:text-indigo-700 hover:bg-zinc-200/50'
              }`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Font-size controls pill */}
          <div className={`flex items-center gap-1 border rounded-full p-1 shadow-inner transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
            }`}>
            <button
              onClick={() => setTextSize('sm')}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${textSize === 'sm'
                  ? isDark
                    ? 'bg-zinc-800 text-white shadow border border-zinc-700/50'
                    : 'bg-white text-zinc-900 shadow border border-zinc-200'
                  : isDark
                    ? 'text-zinc-400 hover:bg-zinc-800/30'
                    : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900'
                }`}
              title="Small font size"
            >
              A
            </button>
            <button
              onClick={() => setTextSize('md')}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${textSize === 'md'
                  ? isDark
                    ? 'bg-zinc-800 text-white shadow border border-zinc-700/50'
                    : 'bg-white text-zinc-900 shadow border border-zinc-200'
                  : isDark
                    ? 'text-zinc-400 hover:bg-zinc-800/30'
                    : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900'
                }`}
              title="Medium font size"
            >
              A
            </button>
            <button
              onClick={() => setTextSize('lg')}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${textSize === 'lg'
                  ? isDark
                    ? 'bg-zinc-800 text-white shadow border border-zinc-700/50'
                    : 'bg-white text-zinc-900 shadow border border-zinc-200'
                  : isDark
                    ? 'text-zinc-400 hover:bg-zinc-800/30'
                    : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900'
                }`}
              title="Large font size"
            >
              A
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
