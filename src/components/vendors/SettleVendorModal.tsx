import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BrotherName, Expense } from '../../types';
import { formatPKR, formatDate, getTodayDateString } from '../../utils/formatters';
import {
  Store,
  CheckCircle2,
  X,
  Calendar,
  Users2,
  FileText,
  AlertCircle,
  Receipt,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettleVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string;
  initialAmount?: number;
  initialPayer?: string;
}

export const SettleVendorModal: React.FC<SettleVendorModalProps> = ({
  isOpen,
  onClose,
  vendorName,
  initialAmount,
  initialPayer,
}) => {
  const { expenses, batchSettleVendorDues, requirePinAuth, showToast } = useApp();

  const [paidBy, setPaidBy] = useState<BrotherName>('Asif Zia');
  const [paymentDate, setPaymentDate] = useState<string>(() => getTodayDateString());
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [updateVoucherDate, setUpdateVoucherDate] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showVoucherList, setShowVoucherList] = useState<boolean>(true);

  // Find all unpaid items for this vendor
  const unpaidItems = useMemo(() => {
    if (!vendorName) return [];
    return expenses.filter(
      (e) =>
        e.status === 'Unpaid' &&
        e.vendor &&
        e.vendor.trim().toLowerCase() === vendorName.trim().toLowerCase()
    );
  }, [expenses, vendorName]);

  const totalAmount = useMemo(() => {
    if (unpaidItems.length > 0) {
      return unpaidItems.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    }
    return initialAmount || 0;
  }, [unpaidItems, initialAmount]);

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(getTodayDateString());
      const defaultPayer =
        initialPayer && initialPayer.toLowerCase().includes('kashif')
          ? 'Kashif Zia'
          : 'Asif Zia';
      setPaidBy(defaultPayer as BrotherName);
      setPaymentNote(`Lump-sum cleared by ${defaultPayer}`);
    }
  }, [isOpen, initialPayer]);

  if (!isOpen) return null;

  const halfShare = totalAmount / 2;
  const otherBrother: BrotherName = paidBy === 'Asif Zia' ? 'Kashif Zia' : 'Asif Zia';

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName) return;

    requirePinAuth(async () => {
      setIsSubmitting(true);
      try {
        const result = await batchSettleVendorDues({
          vendorName,
          paidBy,
          paymentDate,
          paymentNote: paymentNote.trim() || `Lump-sum cleared by ${paidBy}`,
          updateVoucherDate,
        });

        if (result.success) {
          try {
            confetti({
              particleCount: 60,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch {}
          onClose();
        }
      } catch (err: any) {
        showToast('Settlement Failed', err?.message || 'Failed to clear dues', 'error');
      } finally {
        setIsSubmitting(false);
      }
    }, `Authorize Clearing All Dues for ${vendorName} (${formatPKR(totalAmount)})`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="settle-vendor-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Settle Vendor Khaata
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lump-sum batch clearing for {vendorName}
              </p>
            </div>
          </div>
          <button
            id="close-settle-vendor-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleConfirmSettle} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Outstanding Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  Total Outstanding Balance
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatPKR(totalAmount)}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                  <Receipt className="w-3.5 h-3.5" />
                  {unpaidItems.length} Unpaid {unpaidItems.length === 1 ? 'Voucher' : 'Vouchers'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-2">
              Marking these vouchers as <strong>Paid</strong> will clear {vendorName}&apos;s pending khaata to <strong>Rs. 0</strong> without creating duplicate records.
            </p>
          </div>

          {/* Vouchers Breakdown Accordion */}
          {unpaidItems.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/40 dark:bg-slate-850/40">
              <button
                type="button"
                onClick={() => setShowVoucherList(!showVoucherList)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Itemized Vouchers ({unpaidItems.length})
                </span>
                {showVoucherList ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showVoucherList && (
                <div className="px-3.5 pb-3 max-h-40 overflow-y-auto space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {unpaidItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-1 px-2 rounded-lg bg-white dark:bg-slate-800/80 text-[11px]"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="text-slate-400 mr-2 font-mono">
                          {formatDate(item.date, 'dd-MMM')}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.details || item.category}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0">
                        {formatPKR(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Who Paid The Vendor? */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Who Paid / Cleared This Bill?</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="payer-asif-btn"
                onClick={() => {
                  setPaidBy('Asif Zia');
                  setPaymentNote('Lump-sum cleared by Asif Zia');
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  paidBy === 'Asif Zia'
                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-slate-900 dark:text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">Asif Zia</span>
                  {paidBy === 'Asif Zia' && (
                    <CheckCircle2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Asif paid cash / transfer
                </p>
              </button>

              <button
                type="button"
                id="payer-kashif-btn"
                onClick={() => {
                  setPaidBy('Kashif Zia');
                  setPaymentNote('Lump-sum cleared by Kashif Zia');
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  paidBy === 'Kashif Zia'
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-slate-900 dark:text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">Kashif Zia</span>
                  {paidBy === 'Kashif Zia' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Kashif paid cash / transfer
                </p>
              </button>
            </div>
          </div>

          {/* 50/50 Share Reconcile Explainer Box */}
          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-0.5">
                Brother Ledger Impact (50/50 Split):
              </span>
              <span>
                <strong>{paidBy}</strong> fronted 100% ({formatPKR(totalAmount)}). Therefore,{' '}
                <strong>{otherBrother}</strong> automatically owes his 50% share (
                <strong>{formatPKR(halfShare)}</strong>) to {paidBy}.
              </span>
            </div>
          </div>

          {/* Date Paid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Lump-Sum Payment Date</span>
            </label>
            <input
              id="settle-date-input"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <label className="mt-2 flex items-start gap-2 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={updateVoucherDate}
                onChange={(e) => setUpdateVoucherDate(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                Record payment date ({paymentDate}) as the voucher transaction date so this lump-sum payment is accurately attributed in this month&apos;s financial statement (original purchase date is preserved in notes).
              </span>
            </label>
          </div>

          {/* Note / Reference */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment Note / Reference</span>
            </label>
            <input
              id="settle-note-input"
              type="text"
              placeholder="e.g. Cleared full monthly bill in cash"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              id="cancel-settle-btn"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-settle-btn"
              disabled={isSubmitting || totalAmount <= 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Clearing Vouchers...'
                  : `Confirm & Settle Dues (${formatPKR(totalAmount)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
