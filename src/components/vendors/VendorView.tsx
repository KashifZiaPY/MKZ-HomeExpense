import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPKR } from '../../utils/formatters';
import { Vendor } from '../../types';
import { Store, Plus, Search, Tag, Building2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export const VendorView: React.FC = () => {
  const { vendors, dashboard, addVendor, setActiveTab, showToast, requirePinAuth, isPinHubAuthorized } = useApp();

  const [search, setSearch] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [business, setBusiness] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const pendingByVendor = dashboard?.pendingVendor?.byVendor || dashboard?.pendingByVendor || {};

  const filteredVendors = vendors.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return v.name?.toLowerCase().includes(q) || v.business?.toLowerCase().includes(q);
  });

  const isFormValid = Boolean(name.trim() && business.trim());

  if (!isPinHubAuthorized) {
    return (
      <div id="vendors-pin-gate" className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Store className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Vendors & Dues Under PIN Management
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Viewing and managing shopkeeper accounts, vendors and pending dues requires Security PIN authorization.
          </p>
        </div>
        <button
          onClick={() => requirePinAuth(() => {}, 'Access Vendors & Dues Module')}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
        >
          Enter Security PIN
        </button>
      </div>
    );
  }

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Vendor name required', 'Please enter a vendor/shopkeeper name.', 'error');
      return;
    }
    if (!business.trim()) {
      showToast('Business tag required', 'Please enter the vendor category or business tag (e.g. Kiryana, Milk, Veg, Plumber).', 'error');
      return;
    }

    requirePinAuth(async () => {
      setIsSubmitting(true);
      const success = await addVendor({
        name: name.trim(),
        business: business.trim(),
      });
      setIsSubmitting(false);

      if (success) {
        setName('');
        setBusiness('');
      }
    }, `Add Vendor: ${name.trim()}`);
  };

  return (
    <div id="vendors-container" className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Household Vendors & Accounts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registered grocery stores, milk shops, service technicians and pending khaata dues
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Add Vendor Form (Left / Top) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Vendor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register shopkeeper or service
              </p>
            </div>
          </div>

          <form onSubmit={handleAddVendor} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Vendor / Shop Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="vendor-name-input"
                type="text"
                required
                placeholder="e.g. Al-Madina Kiryana, Ali Milk Shop"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Category / Business Tag <span className="text-rose-500">*</span>
              </label>
              <input
                id="vendor-business-input"
                type="text"
                required
                placeholder="e.g. Monthly Grocery, Fresh Dairy, Gas, Plumber *"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              id="submit-vendor-btn"
              disabled={isSubmitting || !isFormValid}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Registering Vendor...' : 'Save Vendor'}
            </button>
          </form>
        </div>

        {/* Vendors List (Right) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-slate-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Registered Vendors ({vendors.length})
              </h3>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vendor name or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {filteredVendors.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No vendors found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredVendors.map((v) => {
                const pendingInfo = pendingByVendor[v.name];
                const hasPending = pendingInfo && pendingInfo.amount > 0;

                return (
                  <div
                    key={v.id || v.name}
                    className={`p-4 rounded-2xl border transition-all ${
                      hasPending
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-slate-400 shrink-0" />
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {v.name}
                          </h4>
                        </div>
                        {v.business && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {v.business}
                          </p>
                        )}
                      </div>

                      {hasPending && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-amber-700 dark:text-amber-300 block">
                            {formatPKR(pendingInfo.amount)}
                          </span>
                          <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold uppercase">
                            Due from {pendingInfo.payer?.split(' ')[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {!hasPending && (
                      <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>All dues cleared</span>
                      </div>
                    )}
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
