import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatPKR } from '../../utils/formatters';
import { Store, UserCheck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const VendorDuesCard: React.FC = () => {
  const { dashboard, setActiveTab, isPinHubAuthorized, requirePinAuth } = useApp();

  const handleViewAllVendors = () => {
    if (!isPinHubAuthorized) {
      requirePinAuth(() => {
        setActiveTab('vendors');
      }, 'Access Vendors & Dues (Security PIN)');
      return;
    }
    setActiveTab('vendors');
  };

  const pendingVendor = dashboard?.pendingVendor;
  const pendingByVendor = pendingVendor?.byVendor || dashboard?.pendingByVendor || {};
  const vendorEntries = Object.entries(pendingByVendor);

  const pendingAsif = pendingVendor?.asif ?? dashboard?.pendingVendorAsif ?? 0;
  const pendingKashif = pendingVendor?.kashif ?? dashboard?.pendingVendorKashif ?? 0;
  const totalPending = pendingAsif + pendingKashif;

  return (
    <div
      id="vendor-dues-card"
      className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 shrink-0">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Pending Vendor Dues
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Unpaid shopkeeper accounts (Kiryana, Milk, etc.)
            </p>
          </div>
        </div>

        <button
          id="view-all-vendors-btn"
          onClick={handleViewAllVendors}
          className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-2 sm:px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 border border-amber-200/60 dark:border-amber-900/60"
        >
          <span>View All</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Summary Chips: Total, Asif's pending, Kashif's pending */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mb-4 sm:mb-5">
        <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block truncate">
            Total Dues
          </span>
          <p className="text-xs sm:text-base font-black text-slate-900 dark:text-white mt-0.5 truncate">
            {formatPKR(totalPending)}
          </p>
        </div>

        <div className="p-2 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-center">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block truncate">
            Asif's Dues
          </span>
          <p className="text-xs sm:text-base font-black text-rose-700 dark:text-rose-300 mt-0.5 truncate">
            {formatPKR(pendingAsif)}
          </p>
        </div>

        <div className="p-2 sm:p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40 text-center">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 block truncate">
            Kashif's Dues
          </span>
          <p className="text-xs sm:text-base font-black text-sky-700 dark:text-sky-300 mt-0.5 truncate">
            {formatPKR(pendingKashif)}
          </p>
        </div>
      </div>

      {/* Grouped Vendor Dues List */}
      {vendorEntries.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No Pending Shopkeeper Dues
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            All vendor bills and monthly accounts are fully cleared!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {vendorEntries.map(([vendorName, item]) => {
            const isAsif = item.payer === 'Asif Zia';
            return (
              <div
                key={vendorName}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="min-w-0 flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {vendorName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight shrink-0 ${
                        isAsif
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                      }`}
                    >
                      {item.payer}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Unsettled account with shopkeeper
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {formatPKR(item.amount)}
                  </span>
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
                    Unpaid
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
