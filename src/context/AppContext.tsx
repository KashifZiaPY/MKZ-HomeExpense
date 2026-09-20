import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DashboardData,
  Expense,
  Settlement,
  Vendor,
  TabType,
  ToastMessage,
  BrotherName,
} from '../types';
import {
  Api,
  getStoredApiUrl,
  setStoredApiUrl,
  isDemoModeExplicit,
  setDemoModeExplicit,
} from '../services/api';

interface AppContextType {
  // Auth & PIN gate
  isUnlocked: boolean;
  unlockApp: (pin: string) => Promise<boolean>;
  lockApp: () => void;

  // PIN Hub security (Settings cell B6)
  isPinHubAuthorized: boolean;
  authorizePinHub: (pin: string) => Promise<boolean>;
  lockPinHub: () => void;
  requirePinAuth: (onSuccess: () => void, actionTitle?: string) => void;
  isPinHubModalOpen: boolean;
  closePinHubModal: () => void;
  pinHubActionTitle: string;
  updatePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  isPinManagementOpen: boolean;
  setIsPinManagementOpen: (open: boolean) => void;

  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Data
  dashboard: DashboardData | null;
  expenses: Expense[];
  settlements: Settlement[];
  vendors: Vendor[];
  categories: string[];

  // Status
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastSynced: Date | null;
  isDemo: boolean;
  apiUrl: string;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Actions
  refreshAll: (silent?: boolean) => Promise<void>;
  addExpense: (payload: Omit<Expense, 'id'>) => Promise<boolean>;
  updateExpense: (payload: Expense) => Promise<boolean>;
  deleteExpense: (id: string | number) => Promise<boolean>;
  addSettlement: (payload: Omit<Settlement, 'id'>) => Promise<boolean>;
  addVendor: (payload: Omit<Vendor, 'id'>) => Promise<boolean>;
  updateApiUrl: (url: string) => void;
  toggleDemoMode: (enable: boolean) => void;

  // Pre-fill helper for forms
  settlementPreFillAmount: number | null;
  setSettlementPreFillAmount: (amount: number | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'zia_expenses_session_unlocked';
const PIN_HUB_STORAGE_KEY = 'mkz_expenses_pin_hub_authorized';
const SESSION_PIN_KEY = 'mkz_expenses_session_pin';
const THEME_STORAGE_KEY = 'zia_expenses_theme';

function reconcileDashboard(
  serverDash: any,
  expenses: Expense[],
  settlements: Settlement[]
): DashboardData {
  // 1. Extract opening baseline parameters
  let openingAmount = 33119;
  let openingDate = '2026-07-07';
  let openingFrom = 'Asif Zia';
  let openingTo = 'Kashif Zia';

  if (serverDash) {
    if (serverDash.openingBalance && typeof serverDash.openingBalance === 'object') {
      const bAmt = Number(serverDash.openingBalance.amount);
      if (!isNaN(bAmt) && bAmt > 0) openingAmount = bAmt;
      if (serverDash.openingBalance.debtor) openingFrom = String(serverDash.openingBalance.debtor).trim();
      if (serverDash.openingBalance.creditor) openingTo = String(serverDash.openingBalance.creditor).trim();
    } else if (typeof serverDash.openingAmount === 'number' && serverDash.openingAmount > 0) {
      openingAmount = serverDash.openingAmount;
    }
    if (serverDash.openingDate) openingDate = String(serverDash.openingDate);
    if (serverDash.openingFrom) openingFrom = String(serverDash.openingFrom).trim();
    if (serverDash.openingTo) openingTo = String(serverDash.openingTo).trim();
  }

  // 2. Extract server final balance if present
  let serverProvidedOutstanding: number | null = null;
  if (serverDash) {
    if (typeof serverDash.currentOutstanding === 'number') {
      serverProvidedOutstanding = serverDash.currentOutstanding;
    } else if (serverDash.finalBalance && typeof serverDash.finalBalance === 'object') {
      const signed = serverDash.finalBalance.signedAsifPerspective ?? serverDash.finalBalance.amount;
      if (typeof signed === 'number' && !isNaN(signed)) {
        serverProvidedOutstanding = signed;
      }
    }
  }

  // 3. Compute live expense split and pending liabilities from loaded expenses
  let kashifPaid = 0;
  let asifPaid = 0;
  let pendingVendorAsif = 0;
  let pendingVendorKashif = 0;
  const pendingByVendor: Record<string, { amount: number; payer: 'Asif Zia' | 'Kashif Zia' }> = {};

  const openDateObj = new Date(openingDate);
  const validOpenDate = !isNaN(openDateObj.getTime()) ? openDateObj : new Date('2026-07-07');

  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    if (amt <= 0) continue;
    const isUnpaid = String(exp.status || '').toLowerCase() === 'unpaid';
    const isKashif = String(exp.paidBy || '').toLowerCase().includes('kashif');
    const isAsif = String(exp.paidBy || '').toLowerCase().includes('asif');

    if (isUnpaid) {
      if (isAsif) pendingVendorAsif += amt;
      if (isKashif) pendingVendorKashif += amt;
      const vKey = exp.vendor || '(Vendor not entered)';
      if (!pendingByVendor[vKey]) {
        pendingByVendor[vKey] = { amount: 0, payer: isKashif ? 'Kashif Zia' : 'Asif Zia' };
      }
      pendingByVendor[vKey].amount += amt;
    } else {
      const expDate = new Date(exp.date);
      if (isNaN(expDate.getTime()) || expDate >= validOpenDate) {
        if (isKashif) kashifPaid += amt;
        if (isAsif) asifPaid += amt;
      }
    }
  }

  // 4. Compute settlement ledger transfers
  let asifToKashif = 0;
  let kashifToAsif = 0;
  for (const s of settlements) {
    const amt = Number(s.amount) || 0;
    const from = String(s.paidFrom || '').toLowerCase();
    const to = String(s.paidTo || '').toLowerCase();
    if (from.includes('asif') && to.includes('kashif')) asifToKashif += amt;
    if (from.includes('kashif') && to.includes('asif')) kashifToAsif += amt;
  }

  // 5. Calculate net balance movement and current outstanding
  const netFromExpenses = (kashifPaid - asifPaid) / 2;
  const netSinceOpening = netFromExpenses - asifToKashif + kashifToAsif;
  const openingSigned = (openingFrom.toLowerCase().includes('asif')) ? openingAmount : -openingAmount;
  const liveComputedOutstanding = Math.round(openingSigned + netSinceOpening);

  // If expenses are loaded, our live computed balance includes both post-opening expenses and settlements
  let finalOutstanding = liveComputedOutstanding;
  if (expenses.length === 0 && serverProvidedOutstanding !== null) {
    finalOutstanding = serverProvidedOutstanding;
  }

  return {
    openingDate,
    openingAmount,
    openingFrom,
    openingTo,
    netSinceOpening: Math.round(netSinceOpening),
    currentOutstanding: finalOutstanding,
    pendingVendorAsif: pendingVendorAsif || (serverDash?.pendingVendorAsif ?? 0),
    pendingVendorKashif: pendingVendorKashif || (serverDash?.pendingVendorKashif ?? 0),
    pendingByVendor: Object.keys(pendingByVendor).length > 0 ? pendingByVendor : (serverDash?.pendingByVendor ?? {}),
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session verified PIN (kept in memory & sessionStorage, never printed to UI)
  const [sessionPin, setSessionPin] = useState<string>(() => {
    return sessionStorage.getItem(SESSION_PIN_KEY) || '';
  });

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });

  // PIN Hub security state for Add/Edit/Delete
  const [isPinHubAuthorized, setIsPinHubAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem(PIN_HUB_STORAGE_KEY) === 'true';
  });
  const [isPinHubModalOpen, setIsPinHubModalOpen] = useState<boolean>(false);
  const [pinHubActionTitle, setPinHubActionTitle] = useState<string>('Authorize Action');
  const [pendingPinCallback, setPendingPinCallback] = useState<(() => void) | null>(null);
  const [isPinManagementOpen, setIsPinManagementOpen] = useState<boolean>(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const DEFAULT_CATEGORIES = [
    'Kiryana',
    'Vegetable',
    'Cylinder',
    'Milk',
    'Fesco',
    'Internet',
    'Maintenance',
  ];

  const DEFAULT_VENDORS: Vendor[] = [
    { id: '1', name: 'Hafiz Sirhandi', business: 'Hafiz Kiryana Store' },
    { id: '2', name: 'Malik Kiryana', business: 'Malik Kiryana GhallaMandi' },
    { id: '3', name: 'Zahoor Ahmad', business: 'Milk Supplier' },
    { id: '4', name: 'Usman Nangi', business: 'Milk Supplier' },
    { id: '5', name: 'Cash', business: 'Misc.' },
  ];

  // App Data State
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>(DEFAULT_VENDORS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // Status & Connectivity
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [apiUrl, setApiUrlState] = useState<string>(getStoredApiUrl());
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    const url = getStoredApiUrl();
    if (!url) return true;
    return isDemoModeExplicit();
  });

  const [settlementPreFillAmount, setSettlementPreFillAmount] = useState<number | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const sessionPinRef = React.useRef<string>(sessionStorage.getItem(SESSION_PIN_KEY) || '');

  // Auth functions - Live verification against Google Sheet backend
  const unlockApp = async (pin: string): Promise<boolean> => {
    const cleanInput = pin.trim();
    if (!cleanInput) return false;

    try {
      const res = await Api.verifyPin(cleanInput);
      if (res.data?.valid) {
        sessionPinRef.current = cleanInput;
        setSessionPin(cleanInput);
        sessionStorage.setItem(SESSION_PIN_KEY, cleanInput);
        setIsUnlocked(true);
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
        showToast('Access Granted', 'Household expense portal unlocked', 'success');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const lockApp = () => {
    setIsPinHubAuthorized(false);
    sessionStorage.removeItem(PIN_HUB_STORAGE_KEY);
    sessionPinRef.current = '';
    setSessionPin('');
    sessionStorage.removeItem(SESSION_PIN_KEY);
    showToast('Editing Locked', 'PIN will be required to add, edit, or delete records', 'info');
  };

  const authorizePinHub = async (pin: string): Promise<boolean> => {
    const cleanInput = pin.trim();
    if (!cleanInput) return false;

    try {
      const res = await Api.verifyPin(cleanInput);
      if (res.data?.valid) {
        sessionPinRef.current = cleanInput;
        setSessionPin(cleanInput);
        sessionStorage.setItem(SESSION_PIN_KEY, cleanInput);
        setIsPinHubAuthorized(true);
        sessionStorage.setItem(PIN_HUB_STORAGE_KEY, 'true');
        showToast('PIN Verified', 'Action authorized', 'success');
        
        const cb = pendingPinCallback;
        setPendingPinCallback(null);
        setIsPinHubModalOpen(false);

        if (cb) {
          setTimeout(() => {
            cb();
          }, 50);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updatePin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await Api.updatePin(currentPin.trim(), newPin.trim());
      if (res.data?.success) {
        sessionPinRef.current = newPin.trim();
        setSessionPin(newPin.trim());
        sessionStorage.setItem(SESSION_PIN_KEY, newPin.trim());
        showToast('PIN Updated', 'Security PIN saved to Google Sheet Settings cell B6', 'success');
        return { success: true, message: res.message || 'Security PIN updated successfully in Google Sheet' };
      }
      return { success: false, error: res.error || 'Failed to update PIN in Google Sheet' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error updating PIN' };
    }
  };

  const lockPinHub = () => {
    setIsPinHubAuthorized(false);
    sessionStorage.removeItem(PIN_HUB_STORAGE_KEY);
    showToast('PIN Hub Locked', 'Modifications now require PIN', 'info');
  };

  const closePinHubModal = () => {
    setIsPinHubModalOpen(false);
    setPendingPinCallback(null);
  };

  // Immediate PIN required on clicking any entry, edit, delete or backend modification
  const requirePinAuth = (onSuccess: () => void, actionTitle: string = 'Security PIN Required') => {
    setPinHubActionTitle(actionTitle);
    setPendingPinCallback(() => onSuccess);
    setIsPinHubModalOpen(true);
  };

  // Core Data Fetching
  const refreshAll = useCallback(async (silent = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [dashRes, expRes, setRes, venRes, catRes] = await Promise.all([
        Api.getDashboard(),
        Api.getExpenses(),
        Api.getSettlements(),
        Api.getVendors(),
        Api.getCategories(),
      ]);

      let hasError = false;
      let errorMsg = '';

      const rawExpenses = expRes.data || [];
      const loadedExpenses = rawExpenses.filter((e) => {
        const isHeader = String(e.date || '').toLowerCase() === 'date' || String(e.category || '').toLowerCase().includes('category');
        const isEmpty = (Number(e.amount) || 0) === 0 && !e.details && !e.date;
        return !isHeader && !isEmpty;
      });
      const loadedSettlements = setRes.data || [];

      // Reconcile and calculate authoritative dashboard figures
      const computedDash = reconcileDashboard(dashRes.data, loadedExpenses, loadedSettlements);
      setDashboard(computedDash);

      if (expRes.data) {
        setExpenses(loadedExpenses);
      } else if (expRes.error && !errorMsg) {
        hasError = true;
        errorMsg = expRes.error;
      }

      if (setRes.data) {
        setSettlements(setRes.data);
      }

      if (venRes.data && Array.isArray(venRes.data) && venRes.data.length > 0) {
        setVendors(venRes.data);
      } else {
        setVendors(DEFAULT_VENDORS);
      }

      if (catRes.data && Array.isArray(catRes.data) && catRes.data.length > 0) {
        setCategories(catRes.data);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }

      // If we got real data, do not display error banner
      if (dashRes.data && expRes.data) {
        setError(null);
      } else if (hasError && apiUrl && !isDemo) {
        setError(errorMsg);
      } else {
        setError(null);
      }

      setLastSynced(new Date());
    } catch (err: any) {
      console.error('Failed to refresh data:', err);
      setError(err?.message || 'Failed to sync with Zia household database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiUrl, categories.length]);

  // Initial load and Auto-Sync to live Google Sheet
  useEffect(() => {
    // Initial fetch
    refreshAll(false);

    // Periodic auto-sync to live sheet every 25 seconds
    const intervalId = setInterval(() => {
      refreshAll(true);
    }, 25000);

    // Auto-sync whenever user returns to the tab/window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAll(true);
      }
    };
    const handleFocus = () => {
      refreshAll(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshAll]);

  // Mutation Handlers - passing live session PIN for backend verification
  const getEffectivePin = () => sessionPinRef.current || sessionPin || sessionStorage.getItem(SESSION_PIN_KEY) || '';

  const addExpense = async (payload: Omit<Expense, 'id'>): Promise<boolean> => {
    showToast('Saving expense...', undefined, 'info');
    const res = await Api.addExpense(payload, getEffectivePin());
    if (res.error) {
      if (res.error.toLowerCase().includes('pin') || res.error.toLowerCase().includes('unauthorized')) {
        setIsPinHubAuthorized(false);
        sessionStorage.removeItem(PIN_HUB_STORAGE_KEY);
        requirePinAuth(() => addExpense(payload), 'Authorize Expense Save');
      }
      showToast('Failed to add expense', res.error, 'error');
      return false;
    }
    showToast('Expense Recorded', `${payload.category}: Rs. ${payload.amount.toLocaleString()} logged for ${payload.paidBy}`, 'success');
    await refreshAll(true);
    return true;
  };

  const updateExpense = async (payload: Expense): Promise<boolean> => {
    // Optimistic UI update
    setExpenses((prev) => prev.map((e) => (String(e.id) === String(payload.id) ? payload : e)));
    showToast('Updating expense...', undefined, 'info');
    const res = await Api.updateExpense(payload, getEffectivePin());
    if (res.error) {
      if (res.error.toLowerCase().includes('pin') || res.error.toLowerCase().includes('unauthorized')) {
        setIsPinHubAuthorized(false);
        sessionStorage.removeItem(PIN_HUB_STORAGE_KEY);
        requirePinAuth(() => updateExpense(payload), 'Authorize Expense Update');
      }
      showToast('Failed to update expense', res.error, 'error');
      await refreshAll(true);
      return false;
    }
    showToast('Expense Updated', `${payload.category} updated successfully`, 'success');
    await refreshAll(true);
    return true;
  };

  const deleteExpense = async (id: string | number): Promise<boolean> => {
    // Optimistic UI removal
    setExpenses((prev) => prev.filter((e) => String(e.id) !== String(id)));
    showToast('Deleting expense...', undefined, 'info');
    const res = await Api.deleteExpense(id, getEffectivePin());
    if (res.error) {
      if (res.error.toLowerCase().includes('pin') || res.error.toLowerCase().includes('unauthorized')) {
        setIsPinHubAuthorized(false);
        sessionStorage.removeItem(PIN_HUB_STORAGE_KEY);
        requirePinAuth(() => deleteExpense(id), 'Authorize Expense Deletion');
      }
      showToast('Failed to delete from sheet', res.error, 'error');
      await refreshAll(true);
      return false;
    }
    showToast('Expense Deleted', 'Expense entry removed from records', 'success');
    await refreshAll(true);
    return true;
  };

  const addSettlement = async (payload: Omit<Settlement, 'id'>): Promise<boolean> => {
    showToast('Logging settlement...', undefined, 'info');
    const res = await Api.addSettlement(payload, getEffectivePin());
    if (res.error) {
      if (res.error.toLowerCase().includes('pin') || res.error.toLowerCase().includes('unauthorized')) {
        setIsPinHubAuthorized(false);
        sessionStorage.removeItem(PIN_HUB_STORAGE_KEY);
        requirePinAuth(() => addSettlement(payload), 'Authorize Settlement Log');
      }
      showToast('Failed to log settlement', res.error, 'error');
      return false;
    }
    showToast(
      'Settlement Logged',
      `${payload.paidFrom} paid Rs. ${payload.amount.toLocaleString()} to ${payload.paidTo}`,
      'success'
    );
    await refreshAll(true);
    return true;
  };

  const addVendor = async (payload: Omit<Vendor, 'id'>): Promise<boolean> => {
    showToast('Adding vendor...', undefined, 'info');
    const res = await Api.addVendor(payload, getEffectivePin());
    if (res.error) {
      if (res.error.toLowerCase().includes('pin') || res.error.toLowerCase().includes('unauthorized')) {
        setIsPinHubAuthorized(false);
        sessionStorage.removeItem(PIN_HUB_STORAGE_KEY);
        requirePinAuth(() => addVendor(payload), 'Authorize Vendor Add');
      }
      showToast('Failed to add vendor', res.error, 'error');
      return false;
    }
    showToast('Vendor Added', `${payload.name} has been added to vendor list`, 'success');
    await refreshAll(true);
    return true;
  };

  const updateApiUrl = (url: string) => {
    setStoredApiUrl(url);
    setApiUrlState(url);
    if (url) {
      setDemoModeExplicit(false);
      setIsDemo(false);
    } else {
      setDemoModeExplicit(true);
      setIsDemo(true);
    }
    showToast('API Configuration Updated', url ? 'Connected to live Google Apps Script endpoint' : 'Switched to Demo mode', 'info');
    refreshAll(false);
  };

  const toggleDemoMode = (enable: boolean) => {
    setDemoModeExplicit(enable);
    setIsDemo(enable);
    showToast(enable ? 'Demo Mode Enabled' : 'Live Mode Enabled', undefined, 'info');
    refreshAll(false);
  };

  return (
    <AppContext.Provider
      value={{
        isUnlocked,
        unlockApp,
        lockApp,
        isPinHubAuthorized,
        authorizePinHub,
        lockPinHub,
        requirePinAuth,
        isPinHubModalOpen,
        closePinHubModal,
        pinHubActionTitle,
        updatePin,
        isPinManagementOpen,
        setIsPinManagementOpen,
        activeTab,
        setActiveTab,
        dashboard,
        expenses,
        settlements,
        vendors,
        categories,
        loading,
        refreshing,
        error,
        lastSynced,
        isDemo,
        apiUrl,
        toasts,
        showToast,
        removeToast,
        theme,
        toggleTheme,
        refreshAll,
        addExpense,
        updateExpense,
        deleteExpense,
        addSettlement,
        addVendor,
        updateApiUrl,
        toggleDemoMode,
        settlementPreFillAmount,
        setSettlementPreFillAmount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
