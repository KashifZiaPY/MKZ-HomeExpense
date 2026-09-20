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

          {dashboard?.openingDate && (
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 bg-slate-800/50 px-2 sm:px-2.5 py-1 rounded-md border border-slate-800">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Baseline: {formatDate(dashboard.openingDate)}</span>
            </div>
          )}
        </div>

        {/* Main Outstanding Number & Direction */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
            <motion.h2
              key={outstanding}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl sm:text-5xl font-black tracking-tight text-white"
            >
              {formatPKR(Math.abs(outstanding))}
            </motion.h2>

            <span
              className={`inline-flex items-center self-start sm:self-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${balanceInfo.badgeColor}`}
            >
              {balanceInfo.status === 'asif_owes' && 'Asif Zia owes Kashif Zia'}
              {balanceInfo.status === 'kashif_owes' && 'Kashif Zia owes Asif Zia'}
              {balanceInfo.status === 'settled' && 'Fully Settled (0.00)'}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-medium">
            {balanceInfo.subtitle}
          </p>
        </div>

        {/* Net Movement Since Opening / Sub-stats Bento */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Net Movement
            </span>
            <p className="text-sm sm:text-base font-bold text-white mt-0.5">
              {formatPKR(dashboard?.netSinceOpening ?? outstanding)}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Baseline Opening
            </span>
            <p className="text-sm sm:text-base font-bold text-slate-200 mt-0.5 truncate">
              {formatPKR(dashboard?.openingAmount ?? 0)}{' '}
              {dashboard?.openingFrom && (
                <span className="text-[11px] text-slate-400 font-normal">
                  ({dashboard.openingFrom} ➔ {dashboard.openingTo})
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
            <span className="truncate">{balanceInfo.status !== 'settled' ? 'Settle Up' : 'Settlement'}</span>
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
