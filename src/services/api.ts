import { DashboardData, Expense, Settlement, Vendor, ApiResponse } from '../types';

// Default deployed Web App URL provided by user
export const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxHrb1p8HKzj-_h0DeWL3_blCirI3ado4DgHtiOGv0X5NTuQBDRyF0kBoU-pzH_pnPkAg/exec';

// Storage keys
const API_URL_STORAGE_KEY = 'zia_expenses_api_url';
const USE_DEMO_STORAGE_KEY = 'zia_expenses_use_demo';

export function getStoredApiUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string) || DEFAULT_API_URL;
  const sessionStored = sessionStorage.getItem(API_URL_STORAGE_KEY);
  if (sessionStored !== null && sessionStored.trim() !== '') {
    return sessionStored.trim();
  }
  const stored = localStorage.getItem(API_URL_STORAGE_KEY);
  if (stored !== null && stored.trim() !== '') {
    return stored.trim();
  }
  return envUrl.trim();
}

export function setStoredApiUrl(url: string) {
  if (!url) {
    sessionStorage.removeItem(API_URL_STORAGE_KEY);
    localStorage.removeItem(API_URL_STORAGE_KEY);
  } else {
    sessionStorage.setItem(API_URL_STORAGE_KEY, url.trim());
    localStorage.setItem(API_URL_STORAGE_KEY, url.trim());
  }
}

export function isDemoModeExplicit(): boolean {
  const sessionVal = sessionStorage.getItem(USE_DEMO_STORAGE_KEY);
  if (sessionVal !== null) return sessionVal === 'true';
  return localStorage.getItem(USE_DEMO_STORAGE_KEY) === 'true';
}

export function setDemoModeExplicit(enable: boolean) {
  sessionStorage.setItem(USE_DEMO_STORAGE_KEY, enable ? 'true' : 'false');
  localStorage.setItem(USE_DEMO_STORAGE_KEY, enable ? 'true' : 'false');
}

// Initial realistic Zia Household sample data for seamless offline preview / fallback
let mockDashboard: DashboardData = {
  openingDate: '2026-09-01',
  openingAmount: 0,
  openingFrom: 'Asif Zia',
  openingTo: 'Kashif Zia',
  netSinceOpening: 4250,
  currentOutstanding: 4250, // Positive = Asif Zia owes Kashif Zia Rs. 4,250
  pendingVendorAsif: 3320,
  pendingVendorKashif: 0,
  pendingByVendor: {
    'Hafiz Sirhandi': {
      amount: 3320,
      payer: 'Asif Zia',
    },
  },
};

let mockCategories: string[] = [
  'Kiryana',
  'Vegetable',
  'Cylinder',
  'Milk',
  'Fesco',
  'Internet',
  'Maintenance',
];

let mockVendors: Vendor[] = [
  { id: '1', name: 'Hafiz Sirhandi', business: 'Hafiz Kiryana Store' },
  { id: '2', name: 'Malik Kiryana', business: 'Malik Kiryana GhallaMandi' },
  { id: '3', name: 'Zahoor Ahmad', business: 'Milk Supplier' },
  { id: '4', name: 'Usman Nangi', business: 'Milk Supplier' },
  { id: '5', name: 'Cash', business: 'Misc.' },
];

let mockExpenses: Expense[] = [
  {
    id: 'exp-101',
    date: '2026-09-18',
    category: 'Milk',
    details: '20 Litres Pure Milk Usman Nangi',
    amount: 12600,
    paidBy: 'Kashif Zia',
    vendor: 'Usman Nangi',
    status: 'Paid',
  },
  {
    id: 'exp-102',
    date: '2026-09-17',
    category: 'Kiryana',
    details: 'Atta 20kg, Cooking Oil 5L, Daal Chana, Sugar',
    amount: 3320,
    paidBy: 'Asif Zia',
    vendor: 'Hafiz Sirhandi',
    status: 'Unpaid',
  },
  {
    id: 'exp-103',
    date: '2026-09-16',
    category: 'Milk',
    details: 'Milk Zahoor Kashif',
    amount: 5580,
    paidBy: 'Kashif Zia',
    vendor: 'Zahoor Ahmad',
    status: 'Paid',
  },
  {
    id: 'exp-104',
    date: '2026-09-15',
    category: 'Cylinder',
    details: 'cylinder cash shared by kashif',
    amount: 4000,
    paidBy: 'Kashif Zia',
    vendor: 'Cash',
    status: 'Paid',
  },
  {
    id: 'exp-105',
    date: '2026-09-14',
    category: 'Maintenance',
    details: 'ups repaired 15.08.26 Ashraf sb',
    amount: 4500,
    paidBy: 'Kashif Zia',
    vendor: 'Cash',
    status: 'Paid',
  },
  {
    id: 'exp-106',
    date: '2026-09-12',
    category: 'Cylinder',
    details: 'cylinder cash shared by kashif',
    amount: 4000,
    paidBy: 'Kashif Zia',
    vendor: 'Cash',
    status: 'Paid',
  },
  {
    id: 'exp-107',
    date: '2026-09-10',
    category: 'Internet',
    details: 'internet riaz sep 2026',
    amount: 1500,
    paidBy: 'Kashif Zia',
    vendor: 'Cash',
    status: 'Paid',
  },
];

let mockSettlements: Settlement[] = [
  {
    id: 'set-1',
    date: '2026-09-15',
    paidFrom: 'Asif Zia',
    paidTo: 'Kashif Zia',
    amount: 12000,
    notes: 'Meezan Bank transfer for electricity & dairy split',
  },
  {
    id: 'set-2',
    date: '2026-09-02',
    paidFrom: 'Kashif Zia',
    paidTo: 'Asif Zia',
    amount: 8500,
    notes: 'Raast payment settling August groceries balance',
  },
];

// Helper to recalculate mock dashboard
function updateMockDashboard() {
  let asifPaid = 0;
  let kashifPaid = 0;

  for (const exp of mockExpenses) {
    if (exp.paidBy === 'Asif Zia') asifPaid += Number(exp.amount) || 0;
    if (exp.paidBy === 'Kashif Zia') kashifPaid += Number(exp.amount) || 0;
  }

  // Each brother's share is (total) / 2
  // If Kashif paid more, Asif owes Kashif (kashifPaid - asifPaid) / 2
  let asifSettledToKashif = 0;
  let kashifSettledToAsif = 0;

  for (const s of mockSettlements) {
    if (s.paidFrom === 'Asif Zia' && s.paidTo === 'Kashif Zia') {
      asifSettledToKashif += Number(s.amount) || 0;
    } else if (s.paidFrom === 'Kashif Zia' && s.paidTo === 'Asif Zia') {
      kashifSettledToAsif += Number(s.amount) || 0;
    }
  }

  // Net outstanding from Asif's perspective:
  // (Total paid by Kashif - Total paid by Asif)/2 - asifSettledToKashif + kashifSettledToAsif
  const rawExpenseDiff = (kashifPaid - asifPaid) / 2;
  const currentOutstanding = Math.round(rawExpenseDiff - asifSettledToKashif + kashifSettledToAsif);

  // Pending vendor dues
  const pendingByVendor: Record<string, { amount: number; payer: 'Asif Zia' | 'Kashif Zia' }> = {};
  let pendingVendorAsif = 0;
  let pendingVendorKashif = 0;

  for (const exp of mockExpenses) {
    if (exp.status === 'Unpaid' && exp.vendor) {
      const amt = Number(exp.amount) || 0;
      const payer = (exp.paidBy as 'Asif Zia' | 'Kashif Zia') || 'Asif Zia';
      if (!pendingByVendor[exp.vendor]) {
        pendingByVendor[exp.vendor] = { amount: 0, payer };
      }
      pendingByVendor[exp.vendor].amount += amt;
      if (payer === 'Asif Zia') pendingVendorAsif += amt;
      else pendingVendorKashif += amt;
    }
  }

  mockDashboard = {
    ...mockDashboard,
    netSinceOpening: currentOutstanding,
    currentOutstanding,
    pendingVendorAsif,
    pendingVendorKashif,
    pendingByVendor,
  };
}

/**
 * Execute GET request against Google Apps Script backend via server proxy or direct fetch
 */
async function apiGet<T>(action: string): Promise<ApiResponse<T>> {
  const apiUrl = getStoredApiUrl();
  const isDemo = isDemoModeExplicit();

  if (!apiUrl || isDemo) {
    // Return mock data
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (action === 'dashboard') {
      updateMockDashboard();
      return { data: mockDashboard as unknown as T };
    }
    if (action === 'expenses') return { data: [...mockExpenses] as unknown as T };
    if (action === 'settlements') return { data: [...mockSettlements] as unknown as T };
    if (action === 'vendors') return { data: [...mockVendors] as unknown as T };
    if (action === 'categories') return { data: [...mockCategories] as unknown as T };
    return { error: `Unknown action: ${action}` };
  }

  // 1. Try server proxy first (bypasses browser CORS & iframe redirect restrictions)
  try {
    const proxyUrl = `/api/proxy?action=${encodeURIComponent(action)}&targetUrl=${encodeURIComponent(apiUrl)}`;
    const proxyRes = await fetch(proxyUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json && (json.data !== undefined || json.error !== undefined)) {
        return json;
      }
    }
  } catch (proxyErr) {
    console.warn('Backend proxy fetch failed, attempting direct fetch...', proxyErr);
  }

  // 2. Fallback to direct client-side fetch
  try {
    const url = new URL(apiUrl);
    url.searchParams.set('action', action);

    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Google Apps Script did not return valid JSON. Ensure "Who has access" is set to "Anyone".');
    }

    return json;
  } catch (error: any) {
    console.error(`API GET error for action=${action}:`, error);

    // Provide local fallback so UI remains functional while highlighting connection issue
    if (action === 'dashboard') return { data: mockDashboard as unknown as T, error: error?.message };
    if (action === 'expenses') return { data: [...mockExpenses] as unknown as T, error: error?.message };
    if (action === 'settlements') return { data: [...mockSettlements] as unknown as T, error: error?.message };
    if (action === 'vendors') return { data: [...mockVendors] as unknown as T, error: error?.message };
    if (action === 'categories') return { data: [...mockCategories] as unknown as T, error: error?.message };

    return {
      error: error?.message || 'Failed to communicate with Google Apps Script backend.',
    };
  }
}

// Default security PIN fallback
let mockPin = 'MKZ33028@';

/**
 * Execute POST request against Google Apps Script backend via server proxy or direct fetch
 * CRITICAL: Must use Content-Type: text/plain to avoid CORS preflight failures in Google Apps Script!
 */
async function apiPost<T>(action: string, payload: any, pin?: string): Promise<ApiResponse<T>> {
  const apiUrl = getStoredApiUrl();
  const isDemo = isDemoModeExplicit();
  const effectivePin = (pin || '').trim();

  if (!apiUrl || isDemo) {
    // Local mock mutation for instant preview testing
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (action === 'verifyPin') {
      if (effectivePin === mockPin || effectivePin === 'MKZ33028@') {
        return { data: { valid: true } as unknown as T, message: 'Security PIN verified successfully' };
      }
      return { error: 'Incorrect Security PIN. Verification failed.' };
    }

    if (action === 'updatePin') {
      if (effectivePin !== mockPin && effectivePin !== 'MKZ33028@') {
        return { error: 'Current Security PIN is incorrect.' };
      }
      const newPin = String((payload && payload.newPin) || '').trim();
      if (!newPin || newPin.length < 4) {
        return { error: 'New PIN must be at least 4 characters long.' };
      }
      mockPin = newPin;
      return { data: { success: true } as unknown as T, message: 'Security PIN updated successfully' };
    }

    if (action === 'addExpense') {
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        date: payload.date || new Date().toISOString().slice(0, 10),
        category: payload.category || 'Kiryana',
        details: payload.details || '',
        amount: Number(payload.amount) || 0,
        paidBy: payload.paidBy || 'Asif Zia',
        vendor: payload.vendor || '',
        status: payload.status || 'Paid',
      };
      mockExpenses = [newExp, ...mockExpenses];
      updateMockDashboard();
      return { data: newExp as unknown as T, message: 'Expense recorded successfully (Demo Mode - Local only)' };
    }

    if (action === 'updateExpense') {
      mockExpenses = mockExpenses.map((exp) =>
        String(exp.id) === String(payload.id)
          ? {
              ...exp,
              date: payload.date ?? exp.date,
              category: payload.category ?? exp.category,
              details: payload.details ?? exp.details,
              amount: payload.amount !== undefined ? Number(payload.amount) : exp.amount,
              paidBy: payload.paidBy ?? exp.paidBy,
              vendor: payload.vendor ?? exp.vendor,
              status: payload.status ?? exp.status,
            }
          : exp
      );
      updateMockDashboard();
      return { data: payload as unknown as T, message: 'Expense updated successfully (Demo Mode - Local only)' };
    }

    if (action === 'deleteExpense') {
      mockExpenses = mockExpenses.filter((exp) => String(exp.id) !== String(payload.id));
      updateMockDashboard();
      return { data: { success: true } as unknown as T, message: 'Expense deleted successfully (Demo Mode - Local only)' };
    }

    if (action === 'addSettlement') {
      const newSettlement: Settlement = {
        id: `set-${Date.now()}`,
        date: payload.date || new Date().toISOString().slice(0, 10),
        paidFrom: payload.paidFrom || 'Asif Zia',
        paidTo: payload.paidTo || 'Kashif Zia',
        amount: Number(payload.amount) || 0,
        notes: payload.notes || '',
      };
      mockSettlements = [newSettlement, ...mockSettlements];
      updateMockDashboard();
      return { data: newSettlement as unknown as T, message: 'Reimbursement settlement logged successfully (Demo Mode - Local only)' };
    }

    if (action === 'addVendor') {
      const newVendor: Vendor = {
        id: `v-${Date.now()}`,
        name: payload.name || 'New Vendor',
        business: payload.business || '',
      };
      mockVendors = [...mockVendors, newVendor];
      return { data: newVendor as unknown as T, message: 'Vendor added successfully (Demo Mode - Local only)' };
    }

    return { error: `Unsupported mock POST action: ${action}` };
  }

  // 1. Try server proxy first
  try {
    const proxyRes = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        payload,
        pin: effectivePin,
        targetUrl: apiUrl,
      }),
    });

    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json && (json.data !== undefined || json.error !== undefined)) {
        return json;
      }
    }
  } catch (proxyErr) {
    console.warn('Backend proxy POST failed, attempting direct fetch...', proxyErr);
  }

  // 2. Fallback to direct client-side POST
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        payload,
        pin: effectivePin,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Server returned non-JSON response. Ensure Google Apps Script is deployed as Web App with access "Anyone".');
    }

    return json;
  } catch (error: any) {
    console.error(`API POST error for action=${action}:`, error);
    return {
      error: error?.message || 'Failed to submit data to Google Sheet. Check your VITE_API_URL and deployment permissions.',
    };
  }
}

// Export high-level API methods
export const Api = {
  getDashboard: () => apiGet<DashboardData>('dashboard'),
  getExpenses: () => apiGet<Expense[]>('expenses'),
  getSettlements: () => apiGet<Settlement[]>('settlements'),
  getVendors: () => apiGet<Vendor[]>('vendors'),
  getCategories: () => apiGet<string[]>('categories'),

  addExpense: (payload: Omit<Expense, 'id'>, pin?: string) => apiPost<Expense>('addExpense', payload, pin),
  updateExpense: (payload: Expense, pin?: string) => apiPost<Expense>('updateExpense', payload, pin),
  deleteExpense: (id: string | number, pin?: string) => apiPost<{ success: boolean }>('deleteExpense', { id }, pin),
  addSettlement: (payload: Omit<Settlement, 'id'>, pin?: string) => apiPost<Settlement>('addSettlement', payload, pin),
  addVendor: (payload: Omit<Vendor, 'id'>, pin?: string) => apiPost<Vendor>('addVendor', payload, pin),

  verifyPin: (pin: string) => apiPost<{ valid: boolean }>('verifyPin', {}, pin),
  updatePin: (currentPin: string, newPin: string) => apiPost<{ success: boolean }>('updatePin', { newPin }, currentPin),
};
