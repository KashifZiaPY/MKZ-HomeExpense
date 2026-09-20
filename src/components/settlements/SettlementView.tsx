import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPKR, formatDate, getTodayDateString, getBalanceStatus } from '../../utils/formatters';
import { BrotherName } from '../../types';
import {
  ArrowLeftRight,
  Send,
  Calendar,
  CreditCard,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const SettlementView: React.FC = () => {
  const {
    dashboard,
    settlements,
    addSettlement,
    settlementPreFillAmount,
    setSettlementPreFillAmount,
    setActiveTab,
    showToast,
    requirePinAuth,
    isPinHubAuthorized,
  } = useApp();

  const outstanding = dashboard?.currentOutstanding ?? 0;
  const balanceInfo = getBalanceStatus(outstanding);

  // Form State
  const [date, setDate] = useState<string>(() => {
    const today = getTodayDateString();
    return today < '2026-07-08' ? '2026-07-08' : today;
  });
  const [paidFrom, setPaidFrom] = useState<BrotherName>(
    balanceInfo.debtor ? (balanceInfo.debtor as BrotherName) : 'Asif Zia'
  );
  const [amountStr, setAmountStr] = useState<string>(() => {
    if (settlementPreFillAmount && settlementPreFillAmount > 0) {
      return String(settlementPreFillAmount);
    }
    if (balanceInfo.amount > 0) {
      return String(balanceInfo.amount);
    }
    return '';
  });
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const paidTo: BrotherName = paidFrom === 'Asif Zia' ? 'Kashif Zia' : 'Asif Zia';
  const numAmount = parseFloat(amountStr) || 0;

  const isFormValid = Boolean(amountStr && numAmount > 0 && date && paidFrom && notes.trim());

  // React to pre-fill from hero button if set
  useEffect(() => {
    if (settlementPreFillAmount !== null && settlementPreFillAmount > 0) {
      setAmountStr(String(settlementPreFillAmount));
      if (balanceInfo.debtor) {
        setPaidFrom(balanceInfo.debtor as BrotherName);
      }
      setSettlementPreFillAmount(null);
    }
  }, [settlementPreFillAmount, balanceInfo.debtor, setSettlementPreFillAmount]);

  if (!isPinHubAuthorized) {
    return (
      <div id="settlements-pin-gate" className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <ArrowLeftRight className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Settlements Under PIN Management
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Viewing and recording brother reimbursements requires Security PIN authorization.
          </p>
        </div>
        <button
          onClick={() => requirePinAuth(() => {}, 'Access Settlements Module')}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
        >
          Enter Security PIN
        </button>
      </div>
    );
  }

  const handleFillOutstanding = () => {
    if (balanceInfo.amount > 0) {
      setAmountStr(String(balanceInfo.amount));
      if (balanceInfo.debtor) {
        setPaidFrom(balanceInfo.debtor as BrotherName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountStr || numAmount <= 0) {
      showToast('Amount required', 'Please enter a valid reimbursement amount in PKR.', 'error');
      return;
    }
    if (!date) {
      showToast('Date required', 'Please select the date of transfer.', 'error');
      return;
    }
    if (!notes.trim()) {
      showToast('Transfer method / notes required', 'Please specify the transfer method (e.g. Raast, Bank Transfer, Cash).', 'error');
      return;
    }

    requirePinAuth(async () => {
      setIsSubmitting(true);
      const success = await addSettlement({
        date,
        paidFrom,
        paidTo,
        amount: numAmount,
        notes: notes.trim(),
      });
      setIsSubmitting(false);

      if (success) {
        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}

        setAmountStr('');
        setNotes('');
      }
    }, `Record Rs. ${numAmount.toLocaleString()} Settlement`);
  };

  // Calculate total settled all-time
  const totalSettledAllTime = settlements.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return (
    <div id="settlements-container" className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Brother Reimbursements & Settlements
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Log direct payments between Asif Zia & Kashif Zia to balance household accounts
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 self-start sm:self-auto">
          Total Reimbursed: <strong className="text-emerald-600 dark:text-emerald-400">{formatPKR(totalSettledAllTime)}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settlement Entry Form (Left / Top) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Log Reimbursement
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immediately updates outstanding balance
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Helper Banner if balance exists */}
            {balanceInfo.amount > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Outstanding: {formatPKR(balanceInfo.amount)}
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 truncate">
                    {balanceInfo.title}
                  </p>
                </div>
                <button
                  type="button"
                  id="autofill-outstanding-btn"
                  onClick={handleFillOutstanding}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  Auto-Fill Balance
                </button>
              </div>
            )}

            {/* Payer selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Payer (Who is sending money?) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  id="payer-asif-btn"
                  onClick={() => setPaidFrom('Asif Zia')}
                  className={`py-3 px-3 rounded-2xl border-2 font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
                    paidFrom === 'Asif Zia'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-sm">Asif Zia</span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    Sending to Kashif
                  </span>
                </button>

                <button
                  type="button"
                  id="payer-kashif-btn"
                  onClick={() => setPaidFrom('Kashif Zia')}
                  className={`py-3 px-3 rounded-2xl border-2 font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
                    paidFrom === 'Kashif Zia'
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-sm">Kashif Zia</span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    Sending to Asif
                  </span>
                </button>
              </div>
            </div>

            {/* Transfer Visual Direction */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className={paidFrom === 'Asif Zia' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-sky-600 dark:text-sky-400 font-bold'}>
                {paidFrom}
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-500" />
              <span className={paidTo === 'Asif Zia' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-sky-600 dark:text-sky-400 font-bold'}>
                {paidTo}
              </span>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Reimbursement Amount (Rs.) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                  Rs.
                </span>
                <input
                  id="settlement-amount-input"
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-extrabold text-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date of Transfer <span className="text-rose-500">*</span>
              </label>
              <input
                id="settlement-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Notes / Reference */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Transfer Method / Note <span className="text-rose-500">*</span>
              </label>
              <input
                id="settlement-notes-input"
                type="text"
                required
                placeholder="e.g. Meezan Bank Raast transfer, HBL online, Cash payment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              id="submit-settlement-btn"
              disabled={isSubmitting || !isFormValid}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Logging Settlement...' : 'Record Reimbursement'}
            </button>
          </form>
        </div>

        {/* Settlement History List (Right / Bottom) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Settlement History
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {settlements.length} past reimbursements
            </span>
          </div>

          {settlements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              No reimbursements logged yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {settlements.map((item) => {
                const isFromAsif = item.paidFrom === 'Asif Zia';

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {/* Payer to Receiver */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md ${
                              isFromAsif
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                            }`}
                          >
                            {item.paidFrom}
                          </span>
                          <span className="text-slate-400">➔</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md ${
                              !isFromAsif
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                            }`}
                          >
                            {item.paidTo}
                          </span>
                        </div>

                        {item.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                            {item.notes}
                          </p>
                        )}

                        <span className="text-[10px] text-slate-400 block mt-1">
                          {formatDate(item.date)}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 block">
                          {formatPKR(item.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Settled
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
