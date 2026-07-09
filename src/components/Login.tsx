import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, User, ArrowLeft, Info } from 'lucide-react';
import { login } from '../api';

interface LoginProps {
  onLoginSuccess: () => void;
  onBackToDashboard: () => void;
  theme: 'light' | 'dark';
}

export default function Login({ onLoginSuccess, onBackToDashboard, theme }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = theme === 'dark';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
      onLoginSuccess();
    } catch {
      setError('Invalid admin credentials. Please use admin/admin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Back button */}
      <button
        onClick={onBackToDashboard}
        className={`mb-8 self-start flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border transition-all cursor-pointer ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm'
        }`}
      >
        <ArrowLeft size={13} />
        <span>Return to Dashboard</span>
      </button>

      {/* Main card container */}
      <div className={`w-full max-w-md rounded-3xl border p-8 md:p-10 shadow-2xl transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        {/* Header icon and branding */}
        <div className="text-center mb-8">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${
            isDark ? 'bg-indigo-950/40 border-indigo-900/60 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
          }`}>
            <Lock size={20} />
          </div>
          <h2 className={`text-xl font-extrabold font-display tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Admin Portal Access
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Access secure administrative tools to publish reports
          </p>
        </div>

        {/* Credentials guide info box */}
        <div className={`mb-6 p-3.5 rounded-2xl border text-[11px] font-medium flex gap-2.5 items-start ${
          isDark ? 'bg-zinc-950/65 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
        }`}>
          <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Prototype credentials:</span>
            <p className="mt-0.5">Username: <code className="font-mono bg-zinc-200/50 dark:bg-zinc-800/80 px-1 py-0.5 rounded">admin</code> &bull; Password: <code className="font-mono bg-zinc-200/50 dark:bg-zinc-800/80 px-1 py-0.5 rounded">admin</code></p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900 focus:border-zinc-700'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-zinc-300'
                }`}
              />
              <User size={14} className="absolute left-3.5 top-3.5 text-zinc-400" />
            </div>
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900 focus:border-zinc-700'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-zinc-300'
                }`}
              />
              <KeyRound size={14} className="absolute left-3.5 top-3.5 text-zinc-400" />
            </div>
          </div>

          {error && (
            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}>
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-full text-xs font-bold text-white transition-all shadow-md mt-6 cursor-pointer flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-zinc-700 cursor-not-allowed opacity-50'
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <span>Unlock Admin Features</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
