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
      className="sticky top-0 z-30 bg-indigo-600 dark:bg-slate-900 text-white border-b border-indigo-700/60 dark:border-slate-800 shadow-md backdrop-blur-md transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between">
        {/* Brand & Household Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Logo Monogram: MKZ (Replacing 50/50) */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 flex items-center justify-center shadow-md font-black text-xs sm:text-sm tracking-wider shrink-0 transition-colors border border-indigo-100 dark:border-slate-700">
            MKZ
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white leading-none">
                MKZ-Household
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-700/80 text-indigo-100 border border-indigo-500/50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <Users2 className="w-3 h-3 text-indigo-200 dark:text-amber-400" />
                Asif & Kashif
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-indigo-100 dark:text-slate-400 mt-1 leading-none font-medium">
              Household Expense & Settlement Ledger
            </p>
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sync Status Badge (Auto-syncing to live Google Sheet) */}
          <button
            id="header-sync-status-badge"
            onClick={handleSyncClick}
            disabled={refreshing}
            title="Auto-syncing to live Google Sheet (Click to refresh now)"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-700/70 border border-indigo-500/40 hover:bg-indigo-700 text-[10px] sm:text-[11px] text-indigo-100 dark:bg-slate-800/70 dark:border-slate-700/60 dark:hover:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {isDemo ? (
              <span className="flex items-center gap-1 text-amber-200 dark:text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-300 dark:bg-amber-400 animate-pulse"></span>
                <span className="hidden sm:inline">Demo Mode</span>
              </span>
            ) : error ? (
              <span className="flex items-center gap-1 text-rose-200 dark:text-rose-400 font-medium">
                <AlertCircle className="w-3 h-3 text-rose-200 dark:text-rose-400" />
                <span className="hidden xs:inline">Sync Issue</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-200 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-200 dark:text-emerald-400 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-none">
                  {lastSynced ? format(lastSynced, 'dd-MMM-yyyy hh:mm a') : 'Synced'}
                </span>
              </span>
            )}
          </button>

          {/* Refresh Icon Button */}
          <button
            id="header-refresh-btn"
            onClick={handleSyncClick}
            disabled={refreshing}
            title="Refresh Data from Google Sheet"
            className="p-2 rounded-xl text-indigo-100 hover:text-white hover:bg-indigo-500/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors cursor-pointer border border-transparent disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-white' : ''}`} />
          </button>

          {/* Light/Dark Toggle */}
          <button
            id="header-theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-indigo-100 hover:text-white hover:bg-indigo-500/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors cursor-pointer border border-transparent"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
