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

  const finalBalance = dashboard?.finalBalance;
  const openingBalance = dashboard?.openingBalance;
  const expenses = dashboard?.expenses;

  const amount = finalBalance?.amount ?? 0;
  const debtor = finalBalance?.debtor ?? '';
  const creditor = finalBalance?.creditor ?? '';

  const isSettled = amount === 0 || !debtor || debtor === creditor;
  const isAsifDebtor = debtor.toLowerCase().includes('asif');

  const badgeColor = isSettled
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    : isAsifDebtor
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';

  const subtitle = isSettled
    ? 'Neither brother owes any household money'
    : isAsifDebtor
    ? 'Asif needs to reimburse Kashif 50% share'
    : 'Kashif needs to reimburse Asif 50% share';

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
    if (amount > 0) {
      setSettlementPreFillAmount(amount);
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
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800/80 shadow-xl shadow-slate-950/20"
    >
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-slate-800/40 blur-3xl pointer-events-none" />

      <div className="p-4 sm:p-7 relative z-10 space-y-4 sm:space-y-6">
        {/* Top Tag & Opening Balance info */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold bg-slate-800/90 text-indigo-300 border border-slate-700/80 tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              Outstanding Balance
            </span>
          </div>

          {(openingBalance?.date || dashboard?.openingDate) && (
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 bg-slate-800/50 px-2 sm:px-2.5 py-1 rounded-md border border-slate-800">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Baseline: {formatDate(openingBalance?.date || dashboard?.openingDate)}</span>
            </div>
          )}
        </div>

        {/* Main Outstanding Number & Direction */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
            <motion.h2
              key={amount}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl sm:text-5xl font-black tracking-tight text-white"
            >
              {formatPKR(amount)}
            </motion.h2>

            <span
              className={`inline-flex items-center self-start sm:self-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${badgeColor}`}
            >
              {isSettled ? 'Fully Settled (0.00)' : `${debtor} owes ${creditor}`}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-medium">
            {subtitle}
          </p>
        </div>

        {/* Net Movement Since Opening / Sub-stats Bento */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Net Movement
            </span>
            <p className="text-sm sm:text-base font-bold text-white mt-0.5">
              {formatPKR(expenses?.netFromExpenses ?? 0)}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Baseline Opening
            </span>
            <p className="text-sm sm:text-base font-bold text-slate-200 mt-0.5 truncate">
              {formatPKR(openingBalance?.amount ?? 0)}{' '}
              {openingBalance?.debtor && (
                <span className="text-[11px] text-slate-400 font-normal">
                  ({openingBalance.debtor} ➔ {openingBalance.creditor})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Ultra Corporate Action Buttons */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center pt-1">
          <button
            id="hero-add-expense-btn"
            onClick={handleAddExpenseClick}
            className="col-span-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer border border-white"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>

          <button
            id="hero-settle-up-btn"
            onClick={handleSettleUp}
            className="col-span-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-300" />
            <span className="truncate">{!isSettled ? 'Settle Up' : 'Settlement'}</span>
          </button>

          <button
            id="hero-view-expenses-btn"
            onClick={() => setActiveTab('expenses')}
            className="col-span-2 sm:col-span-1 w-full sm:w-auto flex items-center justify-center gap-1.5 py-2 sm:py-3 px-3 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer sm:ml-auto"
          >
            <span>View Expense History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
