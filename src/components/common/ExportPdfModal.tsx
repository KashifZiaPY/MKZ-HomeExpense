import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateHouseholdPdfReport, PdfExportOptions } from '../../utils/pdfExport';
import { FileText, Download, X, Calendar, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string; // Optional YYYY-MM
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  defaultMonth,
}) => {
  const { expenses, settlements, dashboard, showToast } = useApp();

  const getDefaultRange = () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (defaultMonth && /^\d{4}-\d{2}$/.test(defaultMonth)) {
      const parts = defaultMonth.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    }

    const monthStr = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    return {
      from: `${year}-${monthStr}-01`,
      to: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
    };
  };

  const initialRange = getDefaultRange();
  const [fromDate, setFromDate] = useState<string>(initialRange.from);
  const [toDate, setToDate] = useState<string>(initialRange.to);

  // Checkbox section options (all checked by default)
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);
  const [includeExpenses, setIncludeExpenses] = useState<boolean>(true);
  const [includeSettlements, setIncludeSettlements] = useState<boolean>(true);
  const [includePendingVendors, setIncludePendingVendors] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  // Preset Date range handlers
  const handlePreset = (preset: 'this-month' | 'last-month' | 'all-time') => {
    const now = new Date();
    if (preset === 'this-month') {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStr = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      setFromDate(`${year}-${monthStr}-01`);
      setToDate(`${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last-month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prev.getFullYear();
      const month = prev.getMonth() + 1;
      const monthStr = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      setFromDate(`${year}-${monthStr}-01`);
      setToDate(`${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'all-time') {
      setFromDate('2026-01-01');
      setToDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const handleGeneratePdf = () => {
    if (!fromDate || !toDate) {
      showToast('Invalid Date Range', 'Please select both From and To dates', 'error');
      return;
    }

    if (fromDate > toDate) {
      showToast('Invalid Date Range', 'From date cannot be after To date', 'error');
      return;
    }

    if (!includeSummary && !includeExpenses && !includeSettlements && !includePendingVendors) {
      showToast('No Sections Selected', 'Please select at least one section to include', 'error');
      return;
    }

    try {
      setIsGenerating(true);
      const options: PdfExportOptions = {
        fromDate,
        toDate,
        includeSummary,
        includeExpenses,
        includeSettlements,
        includePendingVendors,
      };

      generateHouseholdPdfReport(options, expenses, settlements, dashboard);
      showToast('PDF Exported', `Downloaded report for ${fromDate} to ${toDate}`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      showToast('Export Failed', err?.message || 'Could not generate PDF report', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="export-pdf-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-5 sm:p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Export Household PDF Report
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate clean, shareable statement for WhatsApp & offline record
              </p>
            </div>
          </div>
          <button
            id="close-pdf-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Range Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Select Date Range</span>
            </label>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handlePreset('this-month')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset('last-month')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              >
                Last Month
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">From Date</span>
              <input
                id="pdf-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">To Date</span>
              <input
                id="pdf-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section Checkboxes */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Report Sections to Include
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              id="include-summary-label"
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                includeSummary
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white">Summary Overview</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Total spend, brother fronted & live balance</p>
              </div>
            </label>

            <label
              id="include-expenses-label"
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                includeExpenses
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <input
                type="checkbox"
                checked={includeExpenses}
                onChange={(e) => setIncludeExpenses(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white">Expense Details</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Itemized chronological table (Paid & Unpaid)</p>
              </div>
            </label>

            <label
              id="include-settlements-label"
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                includeSettlements
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <input
                type="checkbox"
                checked={includeSettlements}
                onChange={(e) => setIncludeSettlements(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white">Settlements</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Brother-to-brother direct reimbursement log</p>
              </div>
            </label>

            <label
              id="include-pending-vendors-label"
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                includePendingVendors
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <input
                type="checkbox"
                checked={includePendingVendors}
                onChange={(e) => setIncludePendingVendors(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white">Pending Vendor Dues</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Live outstanding vendor bills snapshot</p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            id="cancel-pdf-modal-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="generate-pdf-submit-btn"
            type="button"
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating...' : 'Generate PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
