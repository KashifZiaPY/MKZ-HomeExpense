import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatPKR, formatDate } from '../../utils/formatters';
import { ReceiptText, ArrowLeftRight, ArrowRight, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

export const RecentActivity: React.FC = () => {
  const { expenses, settlements, setActiveTab } = useApp();

  // Combine latest items
  const recentExpenses = expenses.slice(0, 4).map((e) => ({
    ...e,
    itemType: 'expense' as const,
  }));

  const recentSettlements = settlements.slice(0, 2).map((s) => ({
    ...s,
    itemType: 'settlement' as const,
  }));

  const combined = [...recentExpenses, ...recentSettlements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div
      id="recent-activity-card"
      className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest expenses & reimbursement transactions
            </p>
          </div>
        </div>

        <button
          id="view-all-history-btn"
          onClick={() => setActiveTab('expenses')}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          View Full Log <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {combined.length === 0 ? (
        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
          No transactions recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {combined.map((item) => {
            if (item.itemType === 'settlement') {
              const s = item as any;
              return (
                <div
                  key={`act-set-${s.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          Settlement Reimbursement
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {formatDate(s.date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {s.paidFrom} ➔ {s.paidTo} {s.notes ? `(${s.notes})` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                      {formatPKR(s.amount)}
                    </span>
                  </div>
                </div>
              );
            }

            const exp = item as any;
            const isAsif = exp.paidBy === 'Asif Zia';
            return (
              <div
                key={`act-exp-${exp.id}`}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isAsif
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    <ReceiptText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {exp.category}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDate(exp.date)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {exp.details || exp.vendor || 'Household expense'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {formatPKR(exp.amount)}
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        isAsif
                          ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60'
                          : 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60'
                      }`}
                    >
                      {exp.paidBy.split(' ')[0]} paid
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
