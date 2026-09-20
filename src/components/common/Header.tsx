import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  RefreshCw,
  Sun,
  Moon,
  Users2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

export const Header: React.FC = () => {
  const {
    refreshAll,
    refreshing,
    lastSynced,
    theme,
    toggleTheme,
    isDemo,
    error,
  } = useApp();

  const handleSyncClick = () => {
    refreshAll(false);
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-indigo-600 dark:bg-slate-900 text-white border-b border-indigo-700/70 dark:border-slate-800 shadow-md backdrop-blur-md transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Household Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Logo Monogram: MKZ */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 flex items-center justify-center shadow-xs font-black text-xs sm:text-sm tracking-wider shrink-0 transition-colors border border-indigo-100 dark:border-slate-700">
            MKZ
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-base font-bold tracking-tight text-white leading-tight truncate">
                MKZ-Household
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-700/80 text-indigo-100 border border-indigo-500/50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <Users2 className="w-3 h-3 text-indigo-200 dark:text-amber-400" />
                Asif & Kashif
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-indigo-100/90 dark:text-slate-400 leading-tight font-medium truncate">
              Expense & Settlement Ledger
            </p>
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sync Status Badge (Auto-syncing to live Google Sheet) */}
          <button
            id="header-sync-status-badge"
            onClick={handleSyncClick}
            disabled={refreshing}
            title={lastSynced ? `Auto-synced: ${format(lastSynced, 'dd-MMM-yyyy hh:mm a')} (Click to refresh)` : 'Click to refresh'}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-indigo-700/80 border border-indigo-500/40 hover:bg-indigo-700 text-[10px] sm:text-[11px] text-indigo-100 dark:bg-slate-800/80 dark:border-slate-700/70 dark:hover:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            {isDemo ? (
              <span className="flex items-center gap-1 text-amber-200 dark:text-amber-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 dark:bg-amber-400 animate-pulse"></span>
                <span>Demo</span>
              </span>
            ) : error ? (
              <span className="flex items-center gap-1 text-rose-200 dark:text-rose-400 font-medium">
                <AlertCircle className="w-3 h-3 text-rose-200 dark:text-rose-400" />
                <span>Issue</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-200 dark:text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                </span>
                {/* On mobile show compact time or Synced; on sm: and above show full date & time */}
                <span className="inline sm:hidden font-mono text-[10px]">
                  {lastSynced ? format(lastSynced, 'hh:mm a') : 'Synced'}
                </span>
                <span className="hidden sm:inline">
                  {lastSynced ? format(lastSynced, 'dd-MMM-yyyy hh:mm a') : 'Synced'}
                </span>
              </span>
            )}
          </button>

          {/* Refresh Icon Button - Corporate Tactile Button */}
          <button
            id="header-refresh-btn"
            onClick={handleSyncClick}
            disabled={refreshing}
            title="Refresh Data from Google Sheet"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-indigo-700/70 hover:bg-indigo-700 border border-indigo-500/30 text-indigo-100 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin text-white' : ''}`} />
          </button>

          {/* Light/Dark Toggle - Corporate Tactile Button */}
          <button
            id="header-theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-indigo-700/70 hover:bg-indigo-700 border border-indigo-500/30 text-indigo-100 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
