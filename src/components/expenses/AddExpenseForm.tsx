import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPKR, getTodayDateString } from '../../utils/formatters';
import { BrotherName, VendorStatus } from '../../types';
import {
  Receipt,
  Calendar,
  Tag,
  FileText,
  CreditCard,
  Store,
  CheckCircle2,
  Users2,
  ArrowRight,
  Plus,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { motion } from 'motion/react';

export const AddExpenseForm: React.FC = () => {
  const {
    categories,
    vendors,
    addExpense,
    addVendor,
    setActiveTab,
    showToast,
    requirePinAuth,
    isPinHubAuthorized,
    lockPinHub,
  } = useApp();

  const [date, setDate] = useState<string>(() => {
    const today = getTodayDateString();
    return today < '2026-07-08' ? '2026-07-08' : today;
  });
  const [category, setCategory] = useState<string>(categories[0] || 'Kiryana');
  const [details, setDetails] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [paidBy, setPaidBy] = useState<BrotherName>('Asif Zia');
  const [vendor, setVendor] = useState<string>('');
  const [status, setStatus] = useState<VendorStatus>('Paid');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick inline vendor creation modal/toggle
  const [showQuickVendor, setShowQuickVendor] = useState<boolean>(false);
  const [newVendorName, setNewVendorName] = useState<string>('');
  const [newVendorBusiness, setNewVendorBusiness] = useState<string>('');

  const numAmount = parseFloat(amountStr) || 0;
  const halfShare = numAmount > 0 ? numAmount / 2 : 0;
  const otherBrother: BrotherName = paidBy === 'Asif Zia' ? 'Kashif Zia' : 'Asif Zia';

  const isFormValid = Boolean(
    amountStr &&
    numAmount > 0 &&
    paidBy &&
    date &&
    date >= '2026-07-08' &&
    category &&
    details.trim() &&
    vendor.trim() &&
    status
  );

  const handleCreateQuickVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) {
      showToast('Vendor name required', 'Please enter a name for the vendor.', 'error');
      return;
    }

    requirePinAuth(async () => {
      const success = await addVendor({
        name: newVendorName.trim(),
        business: newVendorBusiness.trim() || 'General',
      });
      if (success) {
        setVendor(newVendorName.trim());
        setNewVendorName('');
        setNewVendorBusiness('');
        setShowQuickVendor(false);
        showToast('Vendor added', `${newVendorName.trim()} has been saved and selected.`, 'success');
      }
    }, `Add Vendor: ${newVendorName.trim()}`);
  };

  const doSubmit = async () => {
    setIsSubmitting(true);
    const success = await addExpense({
      date,
      category: category || 'Kiryana',
      details: details.trim(),
      amount: numAmount,
      paidBy,
      vendor: vendor.trim(),
      status,
    });

    setIsSubmitting(false);

    if (success) {
      setDetails('');
      setAmountStr('');
      setVendor('');
      setActiveTab('expenses');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amountStr || numAmount <= 0) {
      showToast('Amount required', 'Please enter a valid expense amount in PKR.', 'error');
      return;
    }
    if (!date) {
      showToast('Date required', 'Please select an expense date.', 'error');
      return;
    }
    if (date < '2026-07-08') {
      showToast('Invalid Voucher Date', 'New voucher entry date must not be earlier than 08-07-2026.', 'error');
      return;
    }
    if (!category) {
      showToast('Category required', 'Please select an expense category.', 'error');
      return;
    }
    if (!details.trim()) {
      showToast('Details required', 'Please enter item details / description.', 'error');
      return;
    }
    if (!vendor.trim()) {
      showToast('Vendor required', 'Please select or add a vendor / shopkeeper.', 'error');
      return;
    }

    // Security PIN Check - if not authorized in current session, ask for PIN
    if (!isPinHubAuthorized) {
      requirePinAuth(async () => {
        await doSubmit();
      }, `Save Rs. ${numAmount.toLocaleString()} Expense`);
      return;
    }

    await doSubmit();
  };

  return (
    <div id="add-expense-container" className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Log Household Expense
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Equal shared split between Asif Zia & Kashif Zia
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          {/* Amount and Split Preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Expense Amount (Pakistani Rupees) <span className="text-rose-500">*</span>
            </label>
            <div className="relative rounded-2xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-400 dark:text-slate-500 font-bold text-lg">Rs.</span>
              </div>
              <input
                id="expense-amount-input"
                type="number"
                min="1"
                step="any"
                required
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-14 pr-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
              />
            </div>

            {/* Live-Calculated Shared Split Preview Card */}
            {numAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3.5 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
                    <Users2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Live Shared Household Split
                  </span>
                  <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                    Total: {formatPKR(numAmount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-indigo-200/70 dark:border-indigo-800/60 shadow-xs">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Asif Zia's 50% Share:
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatPKR(halfShare)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-indigo-200/70 dark:border-indigo-800/60 shadow-xs">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Kashif Zia's 50% Share:
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatPKR(halfShare)}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-indigo-900 dark:text-indigo-300 font-medium mt-2">
                  ⚡ <strong>{paidBy}</strong> fronted full {formatPKR(numAmount)}. Therefore, <strong>{otherBrother}</strong> will owe {formatPKR(halfShare)}.
                </p>
              </motion.div>
            )}
          </div>

          {/* Paid By Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Who Paid / Fronted this Expense? <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="paid-by-asif-btn"
                onClick={() => setPaidBy('Asif Zia')}
                className={`py-3.5 px-4 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  paidBy === 'Asif Zia'
                    ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${paidBy === 'Asif Zia' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span>Asif Zia</span>
              </button>

              <button
                type="button"
                id="paid-by-kashif-btn"
                onClick={() => setPaidBy('Kashif Zia')}
                className={`py-3.5 px-4 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  paidBy === 'Kashif Zia'
                    ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${paidBy === 'Kashif Zia' ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span>Kashif Zia</span>
              </button>
            </div>
          </div>

          {/* Date and Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="expense-date-input"
                type="date"
                min="2026-07-08"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                New voucher entry must not be earlier than 08-07-2026
              </p>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="expense-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-400 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Details / Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Item Details / Description <span className="text-rose-500">*</span>
            </label>
            <input
              id="expense-details-input"
              type="text"
              required
              placeholder="e.g. Atta 20kg, 5L Oil, Milk 10L, Electricity bill, AC repair..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-400"
            />
          </div>

          {/* Vendor Dropdown & Quick Add */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                Vendor / Shopkeeper <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                id="quick-add-vendor-toggle"
                onClick={() => setShowQuickVendor(!showQuickVendor)}
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                {showQuickVendor ? 'Close' : 'Add New Vendor'}
              </button>
            </div>

            {showQuickVendor && (
              <div className="mb-3 p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Register New Shopkeeper / Vendor:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Vendor Name (e.g. Iqbal Kiryana) *"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Business / Tag (e.g. Kiryana, Milk, Veg) *"
                    value={newVendorBusiness}
                    onChange={(e) => setNewVendorBusiness(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  id="save-quick-vendor-btn"
                  onClick={handleCreateQuickVendor}
                  disabled={!newVendorName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Save & Select Vendor
                </button>
              </div>
            )}

            <select
              id="expense-vendor-select"
              required
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="" disabled>-- Select Vendor / Shopkeeper * --</option>
              {vendors.map((v) => (
                <option key={v.id || v.name} value={v.name}>
                  {v.name} {v.business ? `(${v.business})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Payment Status Toggle (Paid vs Unpaid) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Vendor Payment Status <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Has the shopkeeper received payment?
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="status-paid-btn"
                onClick={() => setStatus('Paid')}
                className={`py-3 px-4 rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'Paid'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${status === 'Paid' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span>Paid to Vendor</span>
              </button>

              <button
                type="button"
                id="status-unpaid-btn"
                onClick={() => setStatus('Unpaid')}
                className={`py-3 px-4 rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'Unpaid'
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${status === 'Unpaid' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                <span>Unpaid (Khaata / Due)</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              * Note: "status" tracks whether the shopkeeper was paid — separate from who fronted money between the brothers.
            </p>
          </div>
        </div>

        {/* Security PIN Authorization Status */}
        <div
          id="expense-pin-hub-section"
          className={`p-4 rounded-2xl border transition-all ${
            isPinHubAuthorized
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isPinHubAuthorized ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isPinHubAuthorized
                    ? 'Session Authenticated with Google Sheet'
                    : 'Security PIN Authentication'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isPinHubAuthorized
                    ? 'Write operations will be authenticated using your verified PIN.'
                    : 'Protected by Sheet Settings (cell B6). Verified live on submit.'}
                </p>
              </div>
            </div>

            {isPinHubAuthorized ? (
              <button
                type="button"
                id="lock-pin-session-btn"
                onClick={lockPinHub}
                className="text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                Lock Session
              </button>
            ) : (
              <button
                type="button"
                id="verify-pin-early-btn"
                onClick={() => requirePinAuth(() => {}, 'Authorize Add Expense')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
              >
                Authenticate Now
              </button>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="cancel-expense-btn"
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            id="submit-expense-btn"
            disabled={isSubmitting || !isFormValid}
            className={`flex-1 py-3.5 px-6 rounded-2xl text-white font-bold text-sm sm:text-base shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
              isPinHubAuthorized
                ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-indigo-600/20'
                : 'bg-indigo-700 hover:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-indigo-700/20'
            }`}
          >
            {isSubmitting ? (
              <span>Recording Expense...</span>
            ) : isPinHubAuthorized ? (
              <>
                <PlusCircle className="w-5 h-5" />
                <span>Record & Split Expense</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Verify PIN & Save Expense</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
