import React from 'react';
import { useApp } from '../../context/AppContext';
import { BalanceHeroCard } from './BalanceHeroCard';
import { VendorDuesCard } from './VendorDuesCard';
import { RecentActivity } from './RecentActivity';
import { formatPKR } from '../../utils/formatters';
import {
  Receipt,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  Users,
  RefreshCw,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { dashboard, expenses, loading, refreshing, error, refreshAll, setActiveTab } = useApp();

  if (loading && !dashboard) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto p-4 sm:p-6">
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Calculate high-level summary metrics from expenses
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisMonthExpenses = expenses.filter((e) => {
    try {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    } catch {
      return false;
    }
  });

  const totalThisMonth = thisMonthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalAllTime = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const asifTotal = expenses
    .filter((e) => e.paidBy === 'Asif Zia')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const kashifTotal = expenses
    .filter((e) => e.paidBy === 'Kashif Zia')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return (
    <div id="dashboard-view" className="max-w-7xl mx-auto space-y-6">
      {/* Error / Alert notice if any */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
          <button
            id="error-retry-btn"
            onClick={() => refreshAll(false)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-200 dark:bg-rose-800 hover:bg-rose-300 text-xs font-bold text-rose-950 dark:text-white cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Sync
          </button>
        </div>
      )}

      {/* Hero Balance Card */}
      <BalanceHeroCard />

      {/* Snapshot Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              This Month Spend
            </span>
            <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatPKR(totalThisMonth)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {thisMonthExpenses.length} household bills
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Recorded
            </span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatPKR(totalAllTime)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {expenses.length} all-time records
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Asif Zia Fronted
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              Equal Split
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 mt-1">
            {formatPKR(asifTotal)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Share owed by Kashif: {formatPKR(asifTotal / 2)}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Kashif Zia Fronted
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              Equal Split
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-sky-700 dark:text-sky-300 mt-1">
            {formatPKR(kashifTotal)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Share owed by Asif: {formatPKR(kashifTotal / 2)}
          </p>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <VendorDuesCard />
        <RecentActivity />
      </div>
    </div>
  );
};
