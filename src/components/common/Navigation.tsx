import React from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../../types';
import {
  LayoutDashboard,
  PlusCircle,
  ReceiptText,
  ArrowLeftRight,
  Store,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge?: number | string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'add-expense', label: 'Add Expense', shortLabel: 'Add', icon: PlusCircle },
  { id: 'expenses', label: 'Expense History', shortLabel: 'History', icon: ReceiptText },
  { id: 'settlements', label: 'Settlements', shortLabel: 'Settle', icon: ArrowLeftRight },
  { id: 'vendors', label: 'Vendors & Dues', shortLabel: 'Vendors', icon: Store },
  { id: 'reports', label: 'Reports & Analytics', shortLabel: 'Reports', icon: BarChart3 },
];

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, isPinHubAuthorized, requirePinAuth } = useApp();

  const handleTabClick = (tabId: TabType) => {
    if (tabId === 'add-expense' && !isPinHubAuthorized) {
      requirePinAuth(() => {
        setActiveTab('add-expense');
      }, 'Add Expense (Security PIN)');
      return;
    }
    if (tabId === 'settlements' && !isPinHubAuthorized) {
      requirePinAuth(() => {
        setActiveTab('settlements');
      }, 'Access Settlements (Security PIN)');
      return;
    }
    if (tabId === 'vendors' && !isPinHubAuthorized) {
      requirePinAuth(() => {
        setActiveTab('vendors');
      }, 'Access Vendors & Dues (Security PIN)');
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <>
      {/* Desktop & Tablet Top Tab Bar (Below Header) */}
      <nav
        id="desktop-nav"
        className="hidden md:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-20 shadow-xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 lg:space-x-2 py-2.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isAdd = item.id === 'add-expense';

              return (
                <button
                  key={item.id}
                  id={`desktop-nav-tab-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? isAdd
                        ? 'bg-indigo-700 text-white dark:bg-indigo-600 dark:text-white shadow-sm'
                        : 'bg-indigo-600 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                      : isAdd
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-100 hover:bg-indigo-50/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? '' : isAdd ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-2xl safe-area-pb"
      >
        <div className="grid grid-cols-6 gap-1 items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAdd = item.id === 'add-expense';

            return (
              <button
                key={item.id}
                id={`mobile-nav-btn-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? isAdd
                      ? 'text-indigo-700 dark:text-indigo-400 font-bold'
                      : 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isAdd
                      ? isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : isActive
                      ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                      : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
