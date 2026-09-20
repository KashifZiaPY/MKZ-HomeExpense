import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatPKR, formatDate, getBalanceStatus } from '../../utils/formatters';
import {
  ArrowRight,
  ArrowLeftRight,
  Plus,
  Calendar,
  Sparkles,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

export const BalanceHeroCard: React.FC = () => {
  const { dashboard, setActiveTab, setSettlementPreFillAmount, isPinHubAuthorized, requirePinAuth } = useApp();

  const outstanding = dashboard?.currentOutstanding ?? 0;
  const balanceInfo = getBalanceStatus(outstanding);

  const handleAddExpenseClick = () => {
    if (!isPinHubAuthorized) {
      requirePinAuth(() => {
        setActiveTab('add-expense');
      }, 'Log Household Expense (PIN B6)');
      return;
    }
    setActiveTab('add-expense');
  };

  const handleSettleUp = () => {
    if (balanceInfo.amount > 0) {
      setSettlementPreFillAmount(balanceInfo.amount);
    }
    if (!isPinHubAuthorized) {
      requirePinAuth(() => {
        setActiveTab('settlements');
      }, 'Access Settlements (Security PIN)');
      return;
    }
    setActiveTab('settlements');
  };

  return (
    <div
      id="balance-hero-card"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-white border border-indigo-500/30 dark:border-slate-800 shadow-xl shadow-indigo-950/10"
    >
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-indigo-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-indigo-900/30 blur-3xl pointer-events-none" />

      <div className="p-6 sm:p-8 relative z-10">
        {/* Top Tag & Opening Balance info */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-900/80 text-indigo-200 border border-indigo-400/40 dark:bg-slate-800/80 dark:text-indigo-300 dark:border-slate-700/80 tracking-wide uppercase">
              Current Outstanding Balance
            </span>
            <span className="text-xs text-indigo-200/80 dark:text-slate-400">Shared Household Split</span>
          </div>

          {dashboard?.openingDate && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-200/90 dark:text-slate-400 bg-indigo-900/50 dark:bg-slate-900/40 px-3 py-1 rounded-lg border border-indigo-400/20 dark:border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-indigo-200 dark:text-slate-400" />
              <span>Baseline: {formatDate(dashboard.openingDate)}</span>
            </div>
          )}
        </div>

        {/* Main Outstanding Number & Direction */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <motion.h2
              key={outstanding}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight ${
                balanceInfo.status === 'asif_owes'
                  ? 'text-rose-400'
                  : balanceInfo.status === 'kashif_owes'
                  ? 'text-sky-400'
                  : 'text-emerald-400'
              }`}
            >
              {formatPKR(Math.abs(outstanding))}
            </motion.h2>

            <span
              className={`inline-flex items-center self-start sm:self-center px-3 py-1 rounded-xl text-xs sm:text-sm font-bold border ${balanceInfo.badgeColor}`}
            >
              {balanceInfo.status === 'asif_owes' && 'Asif Zia owes Kashif Zia'}
              {balanceInfo.status === 'kashif_owes' && 'Kashif Zia owes Asif Zia'}
              {balanceInfo.status === 'settled' && 'Fully Settled (0.00)'}
            </span>
          </div>

          <p className="text-sm text-slate-300 mt-2 font-medium">
            {balanceInfo.subtitle}
          </p>
        </div>

        {/* Net Movement Since Opening / Sub-stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs mb-6">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Net Movement Since Opening
            </span>
            <p className="text-base font-bold text-white mt-0.5">
              {formatPKR(dashboard?.netSinceOpening ?? outstanding)}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Opening Baseline Balance
            </span>
            <p className="text-base font-bold text-slate-300 mt-0.5">
              {formatPKR(dashboard?.openingAmount ?? 0)}{' '}
              {dashboard?.openingFrom && (
                <span className="text-xs text-slate-400 font-normal">
                  ({dashboard.openingFrom} ➔ {dashboard.openingTo})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="hero-add-expense-btn"
            onClick={handleAddExpenseClick}
            className="flex-1 min-w-[150px] sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-900 font-bold text-sm shadow-lg shadow-indigo-950/20 active:scale-95 transition-all cursor-pointer dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add New Expense
          </button>

          <button
            id="hero-settle-up-btn"
            onClick={handleSettleUp}
            className="flex-1 min-w-[150px] sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-900/70 hover:bg-indigo-900 text-white font-semibold text-sm border border-indigo-400/40 active:scale-95 transition-all cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-200 dark:text-indigo-400" />
            {balanceInfo.status !== 'settled' ? 'Settle Up Balance' : 'Log Settlement'}
          </button>

          <button
            id="hero-view-expenses-btn"
            onClick={() => setActiveTab('expenses')}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-indigo-200 hover:text-white hover:bg-indigo-800/40 dark:text-slate-300 dark:hover:bg-slate-800/40 text-xs font-semibold transition-colors cursor-pointer"
          >
            View Expense History
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
