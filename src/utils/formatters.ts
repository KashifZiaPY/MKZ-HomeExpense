import { format, parseISO, isValid } from 'date-fns';

/**
 * Format numbers as Pakistani Rupee (e.g. Rs. 12,345)
 */
export function formatPKR(amount: number | string | undefined | null, includeSymbol = true): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return includeSymbol ? 'Rs. 0' : '0';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formatted = new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(absNum);

  const prefix = isNegative ? '-' : '';
  return includeSymbol ? `${prefix}Rs. ${formatted}` : `${prefix}${formatted}`;
}

/**
 * Format date string safely
 */
export function formatDate(dateString: string | undefined | null, formatPattern = 'dd MMM yyyy'): string {
  if (!dateString) return '—';
  try {
    const trimmed = String(dateString).trim();
    // Check if it matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsed = parseISO(trimmed.substring(0, 10));
      if (isValid(parsed)) return format(parsed, formatPattern);
    }
    const parsed = new Date(trimmed);
    if (isValid(parsed)) {
      return format(parsed, formatPattern);
    }
    return dateString;
  } catch {
    return String(dateString);
  }
}

/**
 * Today's date formatted as YYYY-MM-DD for input[type="date"]
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Describe who owes whom based on signed currentOutstanding:
 * Positive = Asif Zia owes Kashif Zia
 * Negative = Kashif Zia owes Asif Zia
 * 0 = Fully Settled
 */
export function getBalanceStatus(currentOutstanding: number) {
  if (Math.abs(currentOutstanding) < 0.01) {
    return {
      status: 'settled' as const,
      debtor: null,
      creditor: null,
      amount: 0,
      title: 'All Balances Settled',
      subtitle: 'Neither brother owes any household money',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      heroBg: 'from-emerald-900 to-teal-950 text-white',
      accentColor: 'text-emerald-400',
    };
  }

  if (currentOutstanding > 0) {
    return {
      status: 'asif_owes' as const,
      debtor: 'Asif Zia' as const,
      creditor: 'Kashif Zia' as const,
      amount: currentOutstanding,
      title: 'Asif Zia owes Kashif Zia',
      subtitle: 'Asif needs to reimburse Kashif 50% share',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      heroBg: 'from-slate-900 via-rose-950 to-slate-900 text-white',
      accentColor: 'text-rose-400',
    };
  }

  return {
    status: 'kashif_owes' as const,
    debtor: 'Kashif Zia' as const,
    creditor: 'Asif Zia' as const,
    amount: Math.abs(currentOutstanding),
    title: 'Kashif Zia owes Asif Zia',
    subtitle: 'Kashif needs to reimburse Asif 50% share',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    heroBg: 'from-slate-900 via-sky-950 to-slate-900 text-white',
    accentColor: 'text-sky-400',
  };
}

/**
 * Generate CSV and trigger browser download
 */
export function exportExpensesToCSV(expenses: Array<Record<string, any>>, filename = 'zia-household-expenses.csv') {
  if (!expenses || expenses.length === 0) return;

  const headers = ['ID', 'Date', 'Category', 'Details', 'Amount (PKR)', 'Paid By', 'Vendor', 'Vendor Status'];
  const rows = expenses.map(e => [
    `"${e.id || ''}"`,
    `"${e.date || ''}"`,
    `"${(e.category || '').replace(/"/g, '""')}"`,
    `"${(e.details || '').replace(/"/g, '""')}"`,
    e.amount || 0,
    `"${e.paidBy || ''}"`,
    `"${(e.vendor || '').replace(/"/g, '""')}"`,
    `"${e.status || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
