import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Expense, BrotherName, VendorStatus } from '../../types';
import { formatPKR } from '../../utils/formatters';
import { X, Save, Calendar, Tag, FileText, Store, CreditCard, Users2 } from 'lucide-react';

interface EditExpenseModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
}) => {
  const { categories, vendors, updateExpense, requirePinAuth, showToast } = useApp();

  const [date, setDate] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [paidBy, setPaidBy] = useState<BrotherName>('Asif Zia');
  const [vendor, setVendor] = useState<string>('');
  const [status, setStatus] = useState<VendorStatus>('Paid');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (expense) {
      setDate(expense.date ? String(expense.date).substring(0, 10) : '');
      setCategory(expense.category || categories[0] || 'Kiryana');
      setDetails(expense.details || '');
      setAmountStr(String(expense.amount || ''));
      setPaidBy((expense.paidBy as BrotherName) || 'Asif Zia');
      setVendor(expense.vendor || '');
      setStatus((expense.status as VendorStatus) || 'Paid');
    }
  }, [expense, categories]);

  if (!isOpen || !expense) return null;

  const numAmount = parseFloat(amountStr) || 0;
  const halfShare = numAmount > 0 ? numAmount / 2 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountStr || numAmount <= 0 || !date || !category || !details.trim() || !vendor.trim()) return;
    if (date < '2026-07-08') {
      showToast('Invalid Date', 'Voucher entry must not be earlier than 08-07-2026.', 'error');
      return;
    }

    requirePinAuth(async () => {
      setIsSubmitting(true);
      const success = await updateExpense({
        id: expense.id,
        date,
        category,
        details: details.trim(),
        amount: numAmount,
        paidBy,
        vendor: vendor.trim(),
        status,
      });
      setIsSubmitting(false);

      if (success) {
        onClose();
      }
    }, `Update Expense ID: ${expense.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="edit-expense-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Edit Household Expense
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Entry ID: {expense.id}
            </p>
          </div>
          <button
            id="close-edit-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Amount */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Amount (Rs.) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                Rs.
              </span>
              <input
                id="edit-amount-input"
                type="number"
                required
                min="1"
                step="any"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {numAmount > 0 && (
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1">
                Equal split: {formatPKR(halfShare)} each
              </p>
            )}
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Paid By <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="edit-paid-asif-btn"
                onClick={() => setPaidBy('Asif Zia')}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paidBy === 'Asif Zia'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Asif Zia</span>
              </button>
              <button
                type="button"
                id="edit-paid-kashif-btn"
                onClick={() => setPaidBy('Kashif Zia')}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paidBy === 'Kashif Zia'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Kashif Zia</span>
              </button>
            </div>
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-date-input"
                type="date"
                min="2026-07-08"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="edit-category-select"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Details <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-details-input"
              type="text"
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Vendor / Shopkeeper <span className="text-rose-500">*</span>
            </label>
            <select
              id="edit-vendor-select"
              required
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="" disabled>-- Select Vendor * --</option>
              {vendors.map((v) => (
                <option key={v.id || v.name} value={v.name}>
                  {v.name} {v.business ? `(${v.business})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Vendor Payment Status <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="edit-status-paid-btn"
                onClick={() => setStatus('Paid')}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'Paid'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Paid to Vendor</span>
              </button>
              <button
                type="button"
                id="edit-status-unpaid-btn"
                onClick={() => setStatus('Unpaid')}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'Unpaid'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Unpaid (Khaata)</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              id="cancel-edit-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-edit-btn"
              disabled={isSubmitting || !amountStr || numAmount <= 0 || !date || !category || !details.trim() || !vendor.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? 'Saving...' : 'Update Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
