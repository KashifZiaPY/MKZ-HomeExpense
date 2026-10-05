import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Settlement, DashboardData } from '../types';
import { formatPKR, formatDate, formatLumpSumDetail } from './formatters';
import { format, parseISO, isValid } from 'date-fns';

export interface PdfExportOptions {
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  includeSummary: boolean;
  includeExpenses: boolean;
  includeSettlements: boolean;
  includePendingVendors: boolean;
}

/**
 * Format currency without symbol or with Rs. for PDF table alignment
 */
export function formatPdfPKR(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'Rs. 0';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formatted = new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(absNum);

  const prefix = isNegative ? '-' : '';
  return `${prefix}Rs. ${formatted}`;
}

/**
 * Normalize a date string to YYYY-MM-DD
 */
function normalizeDate(dStr: string | undefined | null): string {
  if (!dStr) return '';
  const trimmed = String(dStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }
  try {
    const d = new Date(trimmed);
    if (isValid(d)) {
      return format(d, 'yyyy-MM-dd');
    }
  } catch {}
  return trimmed;
}

export function generateHouseholdPdfReport(
  options: PdfExportOptions,
  expenses: Expense[],
  settlements: Settlement[],
  dashboard: DashboardData | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const todayStr = format(new Date(), 'dd MMM yyyy');
  const generatedTimestamp = format(new Date(), 'dd MMM yyyy, hh:mm a');
  const fromFormatted = formatDate(options.fromDate, 'dd MMM yyyy');
  const toFormatted = formatDate(options.toDate, 'dd MMM yyyy');

  // -------------------------------------------------------------
  // FINANCIAL LEDGER RECONCILIATION & PERIOD ACCOUNTING
  // Convention: Signed Asif perspective (Positive = Asif Zia pays Kashif Zia; Negative = Kashif Zia pays Asif Zia)
  // -------------------------------------------------------------
  const fromNorm = options.fromDate;
  const toNorm = options.toDate;

  // 1. Starting Baseline Balance (from backend/settings, e.g. 07-Jul-2026)
  const baselineAmount = Number(dashboard?.openingBalance?.amount ?? dashboard?.openingAmount ?? 0);
  const baselineDateRaw = dashboard?.openingBalance?.date || dashboard?.openingDate || '';
  const baselineDebtor = dashboard?.openingBalance?.debtor || dashboard?.openingFrom || 'Asif Zia';
  const baselineCreditor = dashboard?.openingBalance?.creditor || dashboard?.openingTo || 'Kashif Zia';

  // Baseline signed value: positive if Asif owes Kashif, negative if Kashif owes Asif
  const baselineSigned = baselineDebtor.toLowerCase().includes('asif') ? baselineAmount : -baselineAmount;

  // 2. Prior Period Activity (all entries before fromNorm)
  let priorAsifPaid = 0;
  let priorKashifPaid = 0;
  let priorAsifToKashifSettlement = 0;
  let priorKashifToAsifSettlement = 0;

  expenses.forEach((exp) => {
    const expDate = normalizeDate(exp.date);
    if (!expDate) return;
    if (expDate < fromNorm) {
      const isPaid = String(exp.status || '').trim().toLowerCase() === 'paid';
      if (!isPaid) return;
      const amt = Number(exp.amount) || 0;
      const payer = String(exp.paidBy || '').trim().toLowerCase();
      if (payer.includes('asif')) priorAsifPaid += amt;
      else if (payer.includes('kashif')) priorKashifPaid += amt;
    }
  });

  settlements.forEach((s) => {
    const sDate = normalizeDate(s.date);
    if (!sDate) return;
    if (sDate < fromNorm) {
      const amt = Number(s.amount) || 0;
      const from = String(s.paidFrom || '').trim().toLowerCase();
      const to = String(s.paidTo || '').trim().toLowerCase();
      if (from.includes('asif') && to.includes('kashif')) priorAsifToKashifSettlement += amt;
      else if (from.includes('kashif') && to.includes('asif')) priorKashifToAsifSettlement += amt;
    }
  });

  // Period Opening Balance = Baseline + Prior Net Expenses - Prior Net Settlements
  const priorNetExpenseMovement = (priorKashifPaid - priorAsifPaid) / 2;
  const priorNetSettlements = priorAsifToKashifSettlement - priorKashifToAsifSettlement;
  const periodOpeningSigned = baselineSigned + priorNetExpenseMovement - priorNetSettlements;
  const periodOpeningAmount = Math.abs(periodOpeningSigned);
  const periodOpeningDebtor = periodOpeningSigned > 0.001 ? 'Asif Zia' : (periodOpeningSigned < -0.001 ? 'Kashif Zia' : '');
  const periodOpeningCreditor = periodOpeningSigned > 0.001 ? 'Kashif Zia' : (periodOpeningSigned < -0.001 ? 'Asif Zia' : '');
  const periodOpeningIsSettled = Math.abs(periodOpeningSigned) < 0.01;

  let periodOpeningText = 'Fully Settled (Rs. 0)';
  if (!periodOpeningIsSettled) {
    periodOpeningText = `${formatPdfPKR(periodOpeningAmount)} (${periodOpeningDebtor} to pay ${periodOpeningCreditor})`;
  }

  // 3. Current Period Activity (fromNorm <= date <= toNorm)
  const periodExpenses = expenses.filter((e) => {
    const expDate = normalizeDate(e.date);
    if (!expDate) return false;
    return expDate >= fromNorm && expDate <= toNorm;
  });

  // Sort ascending by date (oldest first - statement view)
  periodExpenses.sort((a, b) => {
    const da = normalizeDate(a.date);
    const db = normalizeDate(b.date);
    return da.localeCompare(db);
  });

  // Filter settlements by date range & sort ascending
  const periodSettlements = settlements.filter((s) => {
    const sDate = normalizeDate(s.date);
    if (!sDate) return false;
    return sDate >= fromNorm && sDate <= toNorm;
  });

  periodSettlements.sort((a, b) => {
    const da = normalizeDate(a.date);
    const db = normalizeDate(b.date);
    return da.localeCompare(db);
  });

  const totalRecordedPeriod = periodExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  let asifFrontedPeriod = 0;
  let kashifFrontedPeriod = 0;

  periodExpenses.forEach((exp) => {
    const isPaid = String(exp.status || '').trim().toLowerCase() === 'paid';
    if (!isPaid) return; // Unpaid is NOT fronted yet
    const amt = Number(exp.amount) || 0;
    const payer = String(exp.paidBy || '').trim().toLowerCase();
    if (payer.includes('asif')) asifFrontedPeriod += amt;
    else if (payer.includes('kashif')) kashifFrontedPeriod += amt;
  });

  let asifToKashifPeriodSettlement = 0;
  let kashifToAsifPeriodSettlement = 0;
  periodSettlements.forEach((s) => {
    const amt = Number(s.amount) || 0;
    const from = String(s.paidFrom || '').trim().toLowerCase();
    const to = String(s.paidTo || '').trim().toLowerCase();
    if (from.includes('asif') && to.includes('kashif')) asifToKashifPeriodSettlement += amt;
    else if (from.includes('kashif') && to.includes('asif')) kashifToAsifPeriodSettlement += amt;
  });

  const totalSettlementsPeriod = asifToKashifPeriodSettlement + kashifToAsifPeriodSettlement;
  const periodNetExpenseMovement = (kashifFrontedPeriod - asifFrontedPeriod) / 2;
  const periodNetSettlementMovement = asifToKashifPeriodSettlement - kashifToAsifPeriodSettlement;
  const periodTotalNetMovement = periodNetExpenseMovement - periodNetSettlementMovement;

  // 4. Period Closing Balance (as of toNorm)
  const periodClosingSigned = periodOpeningSigned + periodTotalNetMovement;
  const periodClosingAmount = Math.abs(periodClosingSigned);
  const periodClosingDebtor = periodClosingSigned > 0.001 ? 'Asif Zia' : (periodClosingSigned < -0.001 ? 'Kashif Zia' : '');
  const periodClosingCreditor = periodClosingSigned > 0.001 ? 'Kashif Zia' : (periodClosingSigned < -0.001 ? 'Asif Zia' : '');
  const periodClosingIsSettled = Math.abs(periodClosingSigned) < 0.01;

  let periodClosingText = 'Fully Settled (Rs. 0)';
  let kashifPeriodPosition = 'Rs. 0 (Balanced)';
  let asifPeriodPosition = 'Rs. 0 (Balanced)';
  let executiveNetHeadline = '';
  let executiveAction = '';

  if (periodClosingIsSettled) {
    periodClosingText = 'Fully Settled (Rs. 0)';
    kashifPeriodPosition = 'Rs. 0 (No payment pending)';
    asifPeriodPosition = 'Rs. 0 (No payment pending)';
    executiveNetHeadline = `All balances for this report period (${fromFormatted} – ${toFormatted}) are fully settled (Rs. 0).`;
    executiveAction = `No settlement payment is required for this report period.`;
  } else if (periodClosingSigned > 0) {
    // Asif pays Kashif
    periodClosingText = `${formatPdfPKR(periodClosingAmount)} (Asif Zia to pay Kashif Zia)`;
    kashifPeriodPosition = `Receivable: ${formatPdfPKR(periodClosingAmount)} (from Asif Zia)`;
    asifPeriodPosition = `Payable: ${formatPdfPKR(periodClosingAmount)} (to Kashif Zia)`;
    executiveNetHeadline = `For this report period (${fromFormatted} – ${toFormatted}), Kashif Zia is RECEIVABLE ${formatPdfPKR(periodClosingAmount)} from Asif Zia (Asif Zia has a net payable of ${formatPdfPKR(periodClosingAmount)} to Kashif Zia).`;
    executiveAction = `To settle this report period, Asif Zia needs to pay ${formatPdfPKR(periodClosingAmount)} to Kashif Zia.`;
  } else {
    // Kashif pays Asif
    periodClosingText = `${formatPdfPKR(periodClosingAmount)} (Kashif Zia to pay Asif Zia)`;
    kashifPeriodPosition = `Payable: ${formatPdfPKR(periodClosingAmount)} (to Asif Zia)`;
    asifPeriodPosition = `Receivable: ${formatPdfPKR(periodClosingAmount)} (from Kashif Zia)`;
    executiveNetHeadline = `For this report period (${fromFormatted} – ${toFormatted}), Asif Zia is RECEIVABLE ${formatPdfPKR(periodClosingAmount)} from Kashif Zia (Kashif Zia has a net payable of ${formatPdfPKR(periodClosingAmount)} to Asif Zia).`;
    executiveAction = `To settle this report period, Kashif Zia needs to pay ${formatPdfPKR(periodClosingAmount)} to Asif Zia.`;
  }

  // 5. Live Current Overall Balance (as of today, for live reference)
  const finalBalance = dashboard?.finalBalance;
  const liveOutstandingAmount = Number(finalBalance?.amount ?? Math.abs(dashboard?.currentOutstanding ?? 0));
  const liveDebtor = finalBalance?.debtor || (dashboard?.currentOutstanding && dashboard.currentOutstanding > 0 ? 'Asif Zia' : 'Kashif Zia');
  const liveCreditor = finalBalance?.creditor || (dashboard?.currentOutstanding && dashboard.currentOutstanding > 0 ? 'Kashif Zia' : 'Asif Zia');
  const liveIsSettled = liveOutstandingAmount === 0 || !liveDebtor || liveDebtor === liveCreditor;
  const liveBalanceText = liveIsSettled ? 'Fully Settled (Rs. 0)' : `${formatPdfPKR(liveOutstandingAmount)} (${liveDebtor} to pay ${liveCreditor})`;

  let cursorY = 14;

  // -------------------------------------------------------------
  // 1. HEADER (Navy block #1a2744 matching app branding)
  // -------------------------------------------------------------
  const headerHeight = 26;
  doc.setFillColor(26, 39, 68); // #1a2744
  doc.roundedRect(margin, cursorY, contentWidth, headerHeight, 3, 3, 'F');

  // App Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text('MKZ-Household — Expense & Settlement Report', margin + 6, cursorY + 10);

  // Subtitle (Period & Timestamp)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Report Period: ${fromFormatted} to ${toFormatted}`, margin + 6, cursorY + 17);
  doc.text(`Generated: ${generatedTimestamp}`, margin + 6, cursorY + 22);

  cursorY += headerHeight + 5;

  // -------------------------------------------------------------
  // TOP PROMINENT HERO: NET SETTLEMENT PAYABLE / RECEIVABLE BANNER
  // Located on the very top so any brother immediately recognizes how much to pay/receive
  // -------------------------------------------------------------
  const heroBannerHeight = 24;
  const isRose = periodClosingSigned > 0.001; // Asif owes Kashif
  const isSky = periodClosingSigned < -0.001; // Kashif owes Asif

  if (isRose) {
    // Soft rose tint with rose border
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(225, 29, 72); // rose-600
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, cursorY, contentWidth, heroBannerHeight, 2.5, 2.5, 'FD');

    // Left accent bar
    doc.setFillColor(190, 18, 60); // rose-700
    doc.roundedRect(margin, cursorY, 3.5, heroBannerHeight, 1.2, 1.2, 'F');

    // Top Tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(159, 18, 57);
    doc.text(`★ NET SETTLEMENT POSITION FOR PERIOD ENDING: ${toFormatted.toUpperCase()}`, margin + 6, cursorY + 5.5);

    // Huge Main Headline
    doc.setFontSize(13);
    doc.setTextColor(136, 19, 55);
    doc.text(`ASIF ZIA TO PAY:  ${formatPdfPKR(periodClosingAmount)}  -->  TO KASHIF ZIA`, margin + 6, cursorY + 12.5);

    // Sub-bar with clear breakdown & action
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(190, 18, 60);
    doc.text(`• Asif Zia: NET PAYABLE ${formatPdfPKR(periodClosingAmount)}`, margin + 6, cursorY + 18.5);

    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text(`• Kashif Zia: NET RECEIVABLE ${formatPdfPKR(periodClosingAmount)}`, margin + 70, cursorY + 18.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`(To balance the ledger for ${toFormatted}, Asif Zia needs to pay ${formatPdfPKR(periodClosingAmount)} to Kashif Zia)`, margin + 6, cursorY + 22);

  } else if (isSky) {
    // Soft sky tint with sky border
    doc.setFillColor(240, 249, 255); // sky-50
    doc.setDrawColor(2, 132, 199); // sky-600
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, cursorY, contentWidth, heroBannerHeight, 2.5, 2.5, 'FD');

    // Left accent bar
    doc.setFillColor(3, 105, 161); // sky-700
    doc.roundedRect(margin, cursorY, 3.5, heroBannerHeight, 1.2, 1.2, 'F');

    // Top Tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(3, 105, 161);
    doc.text(`★ NET SETTLEMENT POSITION FOR PERIOD ENDING: ${toFormatted.toUpperCase()}`, margin + 6, cursorY + 5.5);

    // Huge Main Headline
    doc.setFontSize(13);
    doc.setTextColor(12, 74, 110);
    doc.text(`KASHIF ZIA TO PAY:  ${formatPdfPKR(periodClosingAmount)}  -->  TO ASIF ZIA`, margin + 6, cursorY + 12.5);

    // Sub-bar with clear breakdown & action
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161);
    doc.text(`• Kashif Zia: NET PAYABLE ${formatPdfPKR(periodClosingAmount)}`, margin + 6, cursorY + 18.5);

    doc.setTextColor(4, 120, 87);
    doc.text(`• Asif Zia: NET RECEIVABLE ${formatPdfPKR(periodClosingAmount)}`, margin + 70, cursorY + 18.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`(To balance the ledger for ${toFormatted}, Kashif Zia needs to pay ${formatPdfPKR(periodClosingAmount)} to Asif Zia)`, margin + 6, cursorY + 22);

  } else {
    // Balanced (Rs. 0)
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, cursorY, contentWidth, heroBannerHeight, 2.5, 2.5, 'FD');

    // Left accent bar
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(margin, cursorY, 3.5, heroBannerHeight, 1.2, 1.2, 'F');

    // Top Tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87);
    doc.text(`★ NET SETTLEMENT POSITION FOR PERIOD ENDING: ${toFormatted.toUpperCase()}`, margin + 6, cursorY + 5.5);

    // Huge Main Headline
    doc.setFontSize(13);
    doc.setTextColor(6, 78, 59);
    doc.text(`ACCOUNTS FULLY BALANCED (RS. 0) — ALL SETTLED`, margin + 6, cursorY + 13);

    // Sub-bar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text(`Neither brother has any pending payment to the other for the period ending ${toFormatted}.`, margin + 6, cursorY + 19);
  }

  cursorY += heroBannerHeight + 6;

  // Track any lump-sum vendor settlement entries in this period
  const lumpSumEntries = periodExpenses.filter((e) => {
    const detailsLower = String(e.details || '').toLowerCase();
    return detailsLower.includes('lump-sum') || detailsLower.includes('cleared on') || detailsLower.includes('paid on');
  });

  const lumpSumTotal = lumpSumEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // -------------------------------------------------------------
  // 2. SUMMARY SECTION (if included)
  // -------------------------------------------------------------
  if (options.includeSummary) {
    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(26, 39, 68); // #1a2744
    doc.text('1. SUMMARY OVERVIEW & RECONCILED POSITION', margin, cursorY);
    cursorY += 4;

    // Executive Summary Callout Box
    const calloutBoxY = cursorY;
    const calloutPadding = 4;
    const calloutWidth = contentWidth;

    // Measure text to dynamically calculate height
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const textLines = [
      `• Net Settlement Due: ${executiveNetHeadline}`,
      `• Action Required: ${executiveAction}`,
      `• Period Reconciliation: Started at ${periodOpeningText} on ${fromFormatted} | Net Period Change: ${periodTotalNetMovement >= 0 ? '+' : ''}${formatPdfPKR(periodTotalNetMovement)} | Closing at ${periodClosingText}`,
      `• Period Activity: Asif fronted ${formatPdfPKR(asifFrontedPeriod)} | Kashif fronted ${formatPdfPKR(kashifFrontedPeriod)} | Settlements paid: ${formatPdfPKR(totalSettlementsPeriod)}`,
      ...(lumpSumEntries.length > 0
        ? [
            `• Lump-Sum Vendor Clearances in Period: ${formatPdfPKR(lumpSumTotal)} across ${lumpSumEntries.length} voucher(s) settled on dated 05.10.2026 by Asif Zia`,
          ]
        : []),
      `• Live Overall Household Balance (as of ${todayStr}): ${liveBalanceText}`,
    ];

    // Calculate box height based on wrapped lines
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let estimatedHeight = 10; // title height
    textLines.forEach((line) => {
      const splitLines = doc.splitTextToSize(line, calloutWidth - calloutPadding * 2 - 4);
      estimatedHeight += splitLines.length * 4.2;
    });
    estimatedHeight += 3;

    // Draw Callout Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, calloutBoxY, calloutWidth, estimatedHeight, 2, 2, 'FD');

    // Left accent bar (indigo / emerald)
    doc.setFillColor(periodClosingIsSettled ? 16 : 79, periodClosingIsSettled ? 185 : 70, periodClosingIsSettled ? 129 : 229);
    doc.roundedRect(margin, calloutBoxY, 2.5, estimatedHeight, 1, 1, 'F');

    // Callout Content
    let textCursor = calloutBoxY + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 39, 68);
    doc.text('EXECUTIVE RECONCILIATION SUMMARY:', margin + calloutPadding + 2, textCursor);
    textCursor += 4.5;

    textLines.forEach((line, idx) => {
      const splitLines = doc.splitTextToSize(line, calloutWidth - calloutPadding * 2 - 4);
      if (idx === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(periodClosingIsSettled ? 4 : 190, periodClosingIsSettled ? 120 : 18, periodClosingIsSettled ? 87 : 60); // emerald or rose
      } else if (idx === 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59); // slate-800
      } else if (idx === 2) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138); // blue-900
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(71, 85, 105); // slate-600
      }
      doc.text(splitLines, margin + calloutPadding + 2, textCursor);
      textCursor += splitLines.length * 4.2;
    });

    cursorY = calloutBoxY + estimatedHeight + 5;

    // Summary Table with mathematically reconciled breakdown
    const summaryRows = [
      [
        `Period Opening Balance (as of ${fromFormatted})`,
        periodOpeningText,
        `Net brought-forward ledger balance at start of report period (${fromFormatted})`,
      ],
      [
        'Total Expenses Recorded (This Period)',
        formatPdfPKR(totalRecordedPeriod),
        'All logged activity in date range (Paid + Unpaid combined)',
      ],
      [
        'Asif Zia Fronted (This Period)',
        formatPdfPKR(asifFrontedPeriod),
        'Vendor-paid expenses only (excludes Unpaid bills)',
      ],
      [
        'Kashif Zia Fronted (This Period)',
        formatPdfPKR(kashifFrontedPeriod),
        'Vendor-paid expenses only (excludes Unpaid bills)',
      ],
      [
        'Net Expense Movement (50% Share)',
        `${periodNetExpenseMovement >= 0 ? '+' : ''}${formatPdfPKR(periodNetExpenseMovement)}`,
        periodNetExpenseMovement >= 0
          ? 'Asif share of Kashif spend (+ adds to Asif payable)'
          : 'Kashif share of Asif spend (+ adds to Kashif payable)',
      ],
      [
        'Direct Settlements Paid (This Period)',
        formatPdfPKR(totalSettlementsPeriod),
        'Direct brother-to-brother reimbursement transfers in date range',
      ],
      ...(lumpSumEntries.length > 0
        ? [
            [
              'Lump-Sum Vendor Clearances (In Period)',
              formatPdfPKR(lumpSumTotal),
              `Hafiz Sirhandi monthly dues cleared on dated 05.10.2026 by Asif Zia (${lumpSumEntries.length} vouchers reconciled)`,
            ],
          ]
        : []),
      [
        `Period Closing Balance (as of ${toFormatted})`,
        periodClosingText,
        `Reconciled net balance at the end of this report period (${toFormatted})`,
      ],
      [
        'Kashif Zia Net Position (Period End)',
        kashifPeriodPosition,
        periodClosingSigned > 0.001
          ? 'Kashif will receive this amount from Asif'
          : periodClosingSigned < -0.001
          ? 'Kashif needs to pay this amount to Asif'
          : 'Balanced (Rs. 0 / Even)',
      ],
      [
        'Asif Zia Net Position (Period End)',
        asifPeriodPosition,
        periodClosingSigned > 0.001
          ? 'Asif needs to pay this amount to Kashif'
          : periodClosingSigned < -0.001
          ? 'Asif will receive this amount from Kashif'
          : 'Balanced (Rs. 0 / Even)',
      ],
      [
        `Current Live Overall Balance (as of ${todayStr})`,
        liveBalanceText,
        'Live overall household balance as of today across all entries to date',
      ],
    ];

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Metric / Account Line', 'Amount / Status', 'Explanation & Scope']],
      body: summaryRows,
      theme: 'grid',
      headStyles: {
        fillColor: [26, 39, 68],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold', fontSize: 8, textColor: [30, 41, 59] },
        1: { cellWidth: 55, fontStyle: 'bold', fontSize: 8.5, textColor: [15, 23, 42] },
        2: { cellWidth: 'auto', fontSize: 7.5, textColor: [100, 116, 139] },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const metricName = String(data.row.raw ? (data.row.raw as any)[0] : '');

          if (metricName.startsWith('Period Opening Balance')) {
            data.cell.styles.fillColor = [248, 250, 252]; // slate-50
            if (data.column.index === 1) {
              data.cell.styles.textColor = [30, 58, 138]; // blue-900
            }
          } else if (metricName.startsWith('Period Closing Balance')) {
            data.cell.styles.fillColor = [241, 245, 249]; // slate-100
            if (data.column.index === 1) {
              data.cell.styles.textColor = periodClosingIsSettled ? [4, 120, 87] : [190, 18, 60]; // emerald or rose
            }
          } else if (metricName.startsWith('Kashif Zia Net Position')) {
            data.cell.styles.fillColor = [255, 255, 255];
            if (data.column.index === 1) {
              data.cell.styles.textColor = periodClosingSigned > 0.001 ? [4, 120, 87] : [30, 41, 59];
            }
          } else if (metricName.startsWith('Asif Zia Net Position')) {
            data.cell.styles.fillColor = [255, 255, 255];
            if (data.column.index === 1) {
              data.cell.styles.textColor = periodClosingSigned > 0.001 ? [190, 18, 60] : [4, 120, 87];
            }
          } else if (metricName.startsWith('Lump-Sum Vendor Clearances')) {
            data.cell.styles.fillColor = [254, 252, 232]; // amber-50
            if (data.column.index === 1) {
              data.cell.styles.textColor = [180, 83, 9]; // amber-700
            }
          } else if (metricName.startsWith('Current Live Overall Balance')) {
            data.cell.styles.fillColor = [248, 250, 252]; // slate-50
            if (data.column.index === 1) {
              data.cell.styles.textColor = [71, 85, 105]; // slate-600
            }
          }
        }
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 8;
  }

  // -------------------------------------------------------------
  // 3. EXPENSE DETAILS TABLE (if included)
  // -------------------------------------------------------------
  if (options.includeExpenses) {
    // Check if we need space for section title
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 39, 68);
    doc.text(
      `2. EXPENSE DETAILS (${periodExpenses.length} entries — ${fromFormatted} to ${toFormatted})`,
      margin,
      cursorY
    );
    cursorY += 4;

    if (periodExpenses.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('No expenses recorded in this period.', margin, cursorY + 4);
      cursorY += 12;
    } else {
      const expenseTableBody = periodExpenses.map((e) => {
        const isPaid = String(e.status || '').trim().toLowerCase() === 'paid';
        const formattedDetails = formatLumpSumDetail(e.details) || '—';
        return [
          formatDate(e.date, 'dd-MMM-yy'),
          e.category || 'General',
          formattedDetails,
          formatPdfPKR(e.amount),
          e.paidBy || '—',
          e.vendor || '—',
          isPaid ? 'Paid' : 'Unpaid',
        ];
      });

      // Total row at bottom
      const totalRow = [
        'Total',
        '',
        `${periodExpenses.length} item(s)`,
        formatPdfPKR(totalRecordedPeriod),
        '',
        '',
        '',
      ];

      autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Category', 'Details', 'Amount', 'Paid By', 'Vendor', 'Status']],
        body: expenseTableBody,
        foot: [totalRow],
        showFoot: 'lastPage',
        theme: 'striped',
        headStyles: {
          fillColor: [26, 39, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2,
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5,
          cellPadding: 2.5,
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 20 }, // Date
          1: { cellWidth: 24 }, // Category
          2: { cellWidth: 50 }, // Details
          3: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }, // Amount
          4: { cellWidth: 22 }, // Paid By
          5: { cellWidth: 26 }, // Vendor
          6: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }, // Status
        },
        didParseCell: (data) => {
          // Color the Status column in body
          if (data.section === 'body' && data.column.index === 6) {
            const val = String(data.cell.raw || '');
            if (val === 'Paid') {
              data.cell.styles.textColor = [4, 120, 87]; // emerald-700
            } else {
              data.cell.styles.textColor = [217, 119, 6]; // amber-600
            }
          }
          // Align footer amount right
          if (data.section === 'foot' && data.column.index === 3) {
            data.cell.styles.halign = 'right';
          }
        },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // -------------------------------------------------------------
  // 4. SETTLEMENTS TABLE (if included)
  // -------------------------------------------------------------
  if (options.includeSettlements) {
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 39, 68);
    doc.text(`3. SETTLEMENTS (${fromFormatted} to ${toFormatted})`, margin, cursorY);
    cursorY += 4;

    if (periodSettlements.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('No settlements recorded in this period.', margin, cursorY + 4);
      cursorY += 12;
    } else {
      const settlementTotal = periodSettlements.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const settlementTableBody = periodSettlements.map((s) => [
        formatDate(s.date, 'dd-MMM-yy'),
        s.paidFrom || '—',
        s.paidTo || '—',
        formatPdfPKR(s.amount),
        s.notes || '—',
      ]);

      const totalRow = ['Total', '', '', formatPdfPKR(settlementTotal), ''];

      autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Paid From', 'Paid To', 'Amount', 'Notes / Reference']],
        body: settlementTableBody,
        foot: [totalRow],
        showFoot: 'lastPage',
        theme: 'striped',
        headStyles: {
          fillColor: [26, 39, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2,
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5,
          cellPadding: 2.5,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.section === 'foot' && data.column.index === 3) {
            data.cell.styles.halign = 'right';
          }
        },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // -------------------------------------------------------------
  // 5. PENDING VENDOR DUES (if included, live snapshot)
  // -------------------------------------------------------------
  if (options.includePendingVendors) {
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 39, 68);
    doc.text('4. PENDING VENDOR DUES', margin, cursorY);
    cursorY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Pending Vendor Dues — Current as of ${todayStr}, not limited to the report period above`,
      margin,
      cursorY
    );
    cursorY += 4;

    const pendingByVendor = dashboard?.pendingVendor?.byVendor || dashboard?.pendingByVendor || {};
    const pendingEntries = Object.entries(pendingByVendor).filter(([_, val]) => Number(val.amount) > 0);

    if (pendingEntries.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(4, 120, 87); // emerald
      doc.text(`No pending vendor dues as of ${todayStr}. All vendor bills are cleared.`, margin, cursorY + 4);
      cursorY += 12;
    } else {
      let totalPending = 0;
      const vendorRows = pendingEntries.map(([vendorName, val]) => {
        const amt = Number(val.amount) || 0;
        totalPending += amt;
        return [vendorName, formatPdfPKR(amt), val.payer || 'Household'];
      });

      const totalRow = ['Total Pending Dues', formatPdfPKR(totalPending), ''];

      autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [['Vendor', 'Amount Payable', 'To Be Paid By']],
        body: vendorRows,
        foot: [totalRow],
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: {
          fillColor: [26, 39, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2,
        },
        footStyles: {
          fillColor: [254, 243, 199], // amber-100
          textColor: [180, 83, 9], // amber-700
          fontStyle: 'bold',
          fontSize: 8.5,
          cellPadding: 2.5,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 45, halign: 'right', fontStyle: 'bold', textColor: [217, 119, 6] },
          2: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.section === 'foot' && data.column.index === 1) {
            data.cell.styles.halign = 'right';
          }
        },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // -------------------------------------------------------------
  // 6. FOOTER on every page (Page number & Generated via MKZ-Household)
  // -------------------------------------------------------------
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Divider line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Left: Generated via MKZ-Household
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Generated via MKZ-Household', margin, pageHeight - 7);

    // Right: Page X of Y
    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // Download filename: MKZ-Household-Report_[FromDate]_to_[ToDate].pdf
  const filename = `MKZ-Household-Report_${options.fromDate}_to_${options.toDate}.pdf`;
  doc.save(filename);
}
