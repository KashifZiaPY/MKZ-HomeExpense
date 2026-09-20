import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Expense, BrotherName, VendorStatus } from '../../types';
import { formatPKR, formatDate, exportExpensesToCSV } from '../../utils/formatters';
import { EditExpenseModal } from './EditExpenseModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Receipt,
  Plus,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Store,
  Users2,
  Sparkles,
  Lock,
  X,
  Shield,
  Info,
  FileText,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ExportPdfModal } from '../common/ExportPdfModal';

export const ExpenseHistory: React.FC = () => {
  const { expenses, categories, vendors, deleteExpense, setActiveTab, loading, requirePinAuth, showToast } = useApp();

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Viewing, Editing, Deleting and Export States
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // LIFO Rule: Determine the last recorded entry in the ledger (highest serial or last index)
  const lastEntry = useMemo(() => {
    if (!expenses || expenses.length === 0) return null;
    let maxSr = -1;
    let maxExp: Expense | null = null;
    for (const exp of expenses) {
      const s = Number((exp as any).serial) || 0;
      if (s > maxSr) {
        maxSr = s;
        maxExp = exp;
      }
    }
    return maxExp || expenses[0];
  }, [expenses]);

  const lastEntryId = lastEntry ? String(lastEntry.id) : null;
  const lastEntrySerial = (lastEntry as any)?.serial || '';

  // Read-only click on any entry (NO PIN required)
  const handleEntryClick = (exp: Expense) => {
    setViewingExpense(exp);
  };

  // Edit action (Requires PIN)
  const handleEditClick = (e: React.MouseEvent, exp: Expense) => {
    e.stopPropagation();
    requirePinAuth(() => {
      setViewingExpense(null);
      setEditingExpense(exp);
    }, `Authorize Edit: ${exp.category} (Rs. ${Number(exp.amount).toLocaleString()})`);
  };

  // Delete action (Strictly LIFO - Only the latest entry can be deleted, Requires PIN)
  const handleDeleteClick = (e: React.MouseEvent, exp: Expense) => {
    e.stopPropagation();
    if (String(exp.id) !== String(lastEntryId)) {
      showToast(
        'LIFO Deletion Rule',
        `To protect historical ledger audit integrity, only the latest entry (Serial #${lastEntrySerial || 'Latest'}) can be deleted.`,
        'error'
      );
      return;
    }
    requirePinAuth(() => {
      setViewingExpense(null);
      setDeletingId(exp.id);
    }, `Authorize LIFO Delete: Serial #${lastEntrySerial || exp.id} (${exp.category})`);
  };

  // Extract available distinct months for month filter dropdown
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.date) {
        try {
          const d = new Date(e.date);
          if (isValid(d)) {
            const key = format(d, 'yyyy-MM');
            set.add(key);
          }
        } catch {}
      }
    });
    return Array.from(set).sort().reverse();
  }, [expenses]);

  // Filter and sort logic
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchCategory = exp.category?.toLowerCase().includes(q);
          const matchDetails = exp.details?.toLowerCase().includes(q);
          const matchVendor = exp.vendor?.toLowerCase().includes(q);
          const matchPaidBy = exp.paidBy?.toLowerCase().includes(q);
          if (!matchCategory && !matchDetails && !matchVendor && !matchPaidBy) {
            return false;
          }
        }

        // Month filter
        if (selectedMonth !== 'all' && exp.date) {
          const expMonth = exp.date.substring(0, 7);
          if (expMonth !== selectedMonth) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
          return false;
        }

        // Payer filter
        if (selectedPayer !== 'all' && exp.paidBy !== selectedPayer) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'all' && exp.status !== selectedStatus) {
          return false;
        }

        // Vendor filter
        if (selectedVendor !== 'all' && exp.vendor !== selectedVendor) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'amount-desc') {
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        }
        if (sortBy === 'amount-asc') {
          return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        }
        return 0;
      });
  }, [
    expenses,
    searchTerm,
    selectedMonth,
    selectedCategory,
    selectedPayer,
    selectedStatus,
    selectedVendor,
    sortBy,
  ]);

  // Calculations for filtered set
  const filteredTotal = filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const filteredAsif = filteredExpenses
    .filter((e) => e.paidBy === 'Asif Zia')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const filteredKashif = filteredExpenses
    .filter((e) => e.paidBy === 'Kashif Zia')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const handleConfirmDelete = async () => {
    if (deletingId !== null) {
      const targetId = deletingId;
      setDeletingId(null);
      await deleteExpense(targetId);
    }
  };

  const handleExportCSV = () => {
    exportExpensesToCSV(filteredExpenses, `zia-expenses-${selectedMonth !== 'all' ? selectedMonth : 'all'}.csv`);
  };

  return (
    <div id="expense-history-container" className="max-w-7xl mx-auto space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Household Expense Records
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Search, filter, edit and manage shared expenditures
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            id="export-pdf-history-btn"
            onClick={() => setIsPdfModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Export PDF</span>
          </button>

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            disabled={filteredExpenses.length === 0}
            className="flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="history-add-expense-btn"
            onClick={() => setActiveTab('add-expense')}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Export PDF Modal */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        defaultMonth={selectedMonth !== 'all' ? selectedMonth : undefined}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="expense-search-input"
            type="text"
            placeholder="Search by item details, category, vendor, or payer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Month Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Month
            </label>
            <select
              id="filter-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {format(parseISO(`${m}-01`), 'MMMM yyyy')}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Category
            </label>
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 cursor-pointer truncate"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Paid By Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Paid By
            </label>
            <select
              id="filter-paidby-select"
              value={selectedPayer}
              onChange={(e) => setSelectedPayer(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">Both Brothers</option>
              <option value="Asif Zia">Asif Zia</option>
              <option value="Kashif Zia">Kashif Zia</option>
            </select>
          </div>

          {/* Vendor Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Vendor Status
            </label>
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid to Vendor</option>
              <option value="Unpaid">Unpaid (Khaata)</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Vendor
            </label>
            <select
              id="filter-vendor-select"
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 cursor-pointer truncate"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id || v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Sort
            </label>
            <select
              id="sort-expenses-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High ➔ Low</option>
              <option value="amount-asc">Amount: Low ➔ High</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Metrics */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Showing <strong>{filteredExpenses.length}</strong> of {expenses.length} records:
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
              Total {formatPKR(filteredTotal)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-rose-700 dark:text-rose-300">
              Asif Fronted: <strong>{formatPKR(filteredAsif)}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-sky-700 dark:text-sky-300">
              Kashif Fronted: <strong>{formatPKR(filteredKashif)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Expenses Table / Cards */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Expense Records Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedMonth !== 'all' || selectedCategory !== 'all' || selectedPayer !== 'all'
              ? 'No records match your active search filters. Try resetting filters.'
              : 'No expenses have been recorded yet.'}
          </p>
          <button
            id="clear-filters-btn"
            onClick={() => {
              setSearchTerm('');
              setSelectedMonth('all');
              setSelectedCategory('all');
              setSelectedPayer('all');
              setSelectedStatus('all');
              setSelectedVendor('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-700/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Category & Details</th>
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">Paid By</th>
                  <th className="py-3.5 px-4">Vendor Status</th>
                  <th className="py-3.5 px-4 text-right">Amount (Shared)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredExpenses.map((exp) => {
                  const isAsif = exp.paidBy === 'Asif Zia';
                  const isPaidVendor = exp.status === 'Paid';
                  const half = (Number(exp.amount) || 0) / 2;
                  const isLifoEligible = String(exp.id) === String(lastEntryId);

                  return (
                    <tr
                      key={exp.id}
                      onClick={() => handleEntryClick(exp)}
                      className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      title="Click to view full expense details (No PIN required)"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {exp.category}
                        </span>
                        {exp.details && (
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] block truncate max-w-xs mt-0.5">
                            {exp.details}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {exp.vendor ? (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Store className="w-3 h-3 text-slate-400" />
                            {exp.vendor}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isAsif
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-900'
                          }`}
                        >
                          {exp.paidBy}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isPaidVendor
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isPaidVendor ? 'Paid' : 'Unpaid (Due)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                          {formatPKR(exp.amount)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Rs. {half.toLocaleString()} each
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            id={`edit-exp-btn-${exp.id}`}
                            onClick={(e) => handleEditClick(e, exp)}
                            title="Edit Expense (Requires PIN)"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-exp-btn-${exp.id}`}
                            onClick={(e) => handleDeleteClick(e, exp)}
                            title={
                              isLifoEligible
                                ? 'Delete Latest Entry (LIFO Rule — Requires PIN)'
                                : `LIFO Protected: Only latest entry (#${lastEntrySerial}) can be deleted`
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isLifoEligible
                                ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                : 'text-slate-300 dark:text-slate-600 hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {isLifoEligible ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredExpenses.map((exp) => {
              const isAsif = exp.paidBy === 'Asif Zia';
              const isPaidVendor = exp.status === 'Paid';
              const half = (Number(exp.amount) || 0) / 2;
              const isLifoEligible = String(exp.id) === String(lastEntryId);

              return (
                <div
                  key={`mobile-${exp.id}`}
                  onClick={() => handleEntryClick(exp)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-[0.99]"
                  title="Tap to view full details (No PIN required)"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {exp.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {formatDate(exp.date)}
                        </span>
                      </div>
                      {exp.details && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {exp.details}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-slate-900 dark:text-white block">
                        {formatPKR(exp.amount)}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Rs. {half.toLocaleString()} / brother
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAsif
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        }`}
                      >
                        {exp.paidBy}
                      </span>

                      {exp.vendor && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Store className="w-3 h-3 text-slate-400" />
                          {exp.vendor}
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isPaidVendor
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {isPaidVendor ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        id={`mob-edit-exp-btn-${exp.id}`}
                        onClick={(e) => handleEditClick(e, exp)}
                        title="Edit Expense (Requires PIN)"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`mob-delete-exp-btn-${exp.id}`}
                        onClick={(e) => handleDeleteClick(e, exp)}
                        title={
                          isLifoEligible
                            ? 'Delete Latest Entry (LIFO Rule — Requires PIN)'
                            : `LIFO Protected: Only latest entry (#${lastEntrySerial}) can be deleted`
                        }
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          isLifoEligible
                            ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                            : 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/60'
                        }`}
                      >
                        {isLifoEligible ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Read-Only Expense Details View Modal (NO PIN REQUIRED) */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {viewingExpense.category}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                    Sr #{(viewingExpense as any).serial || '—'}
                  </span>
                  {String(viewingExpense.id) === String(lastEntryId) ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      LIFO Latest Entry
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Historical Entry
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Recorded Date: {formatDate(viewingExpense.date)}
                </p>
              </div>

              <button
                onClick={() => setViewingExpense(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Overview Block */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Total Amount
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatPKR(viewingExpense.amount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  50 / 50 Split
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  Rs. {((Number(viewingExpense.amount) || 0) / 2).toLocaleString()} each
                </span>
              </div>
            </div>

            {/* Details & Attributes */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-400 block mb-1">Paid / Fronted By</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      viewingExpense.paidBy === 'Asif Zia'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                    }`}
                  >
                    {viewingExpense.paidBy}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-400 block mb-1">Vendor Payment</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                      viewingExpense.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {viewingExpense.status === 'Paid' ? 'Paid to Vendor' : 'Unpaid (Due / Khaata)'}
                  </span>
                </div>
              </div>

              {viewingExpense.vendor && (
                <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Vendor / Shopkeeper</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-slate-400" />
                    {viewingExpense.vendor}
                  </span>
                </div>
              )}

              {viewingExpense.details && (
                <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Particulars / Details</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {viewingExpense.details}
                  </p>
                </div>
              )}

              {/* LIFO Rule Advisory */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700/60 flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                    LIFO Ledger Audit Policy
                  </span>
                  {String(viewingExpense.id) === String(lastEntryId) ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      This is the latest recorded ledger entry (Serial #{lastEntrySerial || 'Latest'}). It is eligible for modification or deletion with Security PIN authorization.
                    </span>
                  ) : (
                    <span>
                      To preserve accounting audit trails, historical entries cannot be deleted. Under the LIFO rule, only the latest entry (Serial #{lastEntrySerial || 'Latest'}) can be removed.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleEditClick(e, viewingExpense)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Entry
                </button>

                {String(viewingExpense.id) === String(lastEntryId) ? (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, viewingExpense)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete (LIFO)
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={`Historical entries are protected. Only Serial #${lastEntrySerial} can be deleted.`}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Delete Locked
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditExpenseModal
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        title="Confirm LIFO Expense Deletion"
        message={`Are you sure you want to delete this latest entry (Serial #${lastEntrySerial || deletingId})? Under the LIFO accounting rule, only the last entry can be removed.`}
        confirmLabel="Permanently Delete Entry"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
