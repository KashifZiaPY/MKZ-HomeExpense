export type BrotherName = 'Asif Zia' | 'Kashif Zia';

export type VendorStatus = 'Paid' | 'Unpaid';

export interface PendingVendorItem {
  amount: number;
  payer: BrotherName | string;
}

export interface FinalBalanceData {
  amount: number;
  debtor: BrotherName | string;
  creditor: BrotherName | string;
  signedAsifPerspective?: number;
}

export interface OpeningBalanceData {
  amount: number;
  debtor: BrotherName | string;
  creditor: BrotherName | string;
  date?: string;
}

export interface ExpensesSummaryData {
  total?: number;
  asifPaid: number;
  kashifPaid: number;
  halfShare?: number;
  netFromExpenses: number;
}

export interface SettlementsSummaryData {
  total?: number;
  asifToKashif?: number;
  kashifToAsif?: number;
  netSettlement?: number;
}

export interface PendingVendorData {
  byVendor: Record<string, PendingVendorItem>;
  asif: number;
  kashif: number;
}

export interface DashboardData {
  // Authoritative fields from GET ?action=dashboard
  finalBalance: FinalBalanceData;
  openingBalance: OpeningBalanceData;
  expenses: ExpensesSummaryData;
  settlements?: SettlementsSummaryData;
  pendingVendor: PendingVendorData;

  // Convenience & backward-compatibility properties
  openingDate: string;
  openingAmount: number;
  openingFrom: BrotherName | string;
  openingTo: BrotherName | string;
  netSinceOpening: number;
  currentOutstanding: number; // positive: Asif Zia owes Kashif Zia; negative: Kashif Zia owes Asif Zia; 0: settled
  pendingVendorAsif: number;
  pendingVendorKashif: number;
  pendingByVendor: Record<string, PendingVendorItem>;
  pinProtected?: boolean;
  pin?: string;
}

export interface Expense {
  id: string | number;
  date: string; // YYYY-MM-DD or formatted date string
  category: string;
  details: string;
  amount: number;
  paidBy: BrotherName | string;
  vendor?: string;
  status: VendorStatus | string; // 'Paid' | 'Unpaid'
}

export interface Settlement {
  id: string | number;
  date: string;
  paidFrom: BrotherName | string;
  paidTo: BrotherName | string;
  amount: number;
  notes?: string;
}

export interface Vendor {
  id: string | number;
  name: string;
  business?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export type TabType = 'dashboard' | 'add-expense' | 'expenses' | 'settlements' | 'vendors' | 'reports';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
