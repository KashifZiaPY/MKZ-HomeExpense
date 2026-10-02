import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Settlement, DashboardData } from '../types';
import { formatPKR, formatDate } from './formatters';
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

  // Filter expenses by date range
  const fromNorm = options.fromDate;
  const toNorm = options.toDate;

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

  // Calculations for Summary
  // 1. Opening Balance details
  const openingAmount = Number(dashboard?.openingBalance?.amount ?? dashboard?.openingAmount ?? 0);
  const openingDateRaw = dashboard?.openingBalance?.date || dashboard?.openingDate || '';
  const openingDateFormatted = openingDateRaw ? formatDate(openingDateRaw, 'dd MMM yyyy') : 'Baseline';
  const openingDebtor = dashboard?.openingBalance?.debtor || dashboard?.openingFrom || '';
  const openingCreditor = dashboard?.openingBalance?.creditor || dashboard?.openingTo || '';
  const openingIsSettled = openingAmount === 0 || !openingDebtor || openingDebtor === openingCreditor;

  let openingText = 'Fully Settled (Rs. 0)';
  let openingPlainDesc = 'Accounts were balanced (Rs. 0)';
  if (!openingIsSettled) {
    openingText = `${formatPdfPKR(openingAmount)} (${openingDebtor} owed ${openingCreditor})`;
    openingPlainDesc = `${openingDebtor} owed ${openingCreditor} ${formatPdfPKR(openingAmount)}`;
  }

  // 2. Total Expenses Recorded (This Period) = sum of ALL expenses in the date range, Paid + Unpaid combined
  const totalRecordedPeriod = periodExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // 3. Asif & Kashif Fronted = sum of amounts, filtered to ONLY status = "Paid" AND within the date range
  let asifFrontedPeriod = 0;
  let kashifFrontedPeriod = 0;

  periodExpenses.forEach((exp) => {
    const amt = Number(exp.amount) || 0;
    const isPaid = String(exp.status || '').trim().toLowerCase() === 'paid';
    if (!isPaid) return; // Unpaid is NOT fronted yet

    const payer = String(exp.paidBy || '').trim().toLowerCase();
    if (payer.includes('asif')) {
      asifFrontedPeriod += amt;
    } else if (payer.includes('kashif')) {
      kashifFrontedPeriod += amt;
    }
  });

  // 4. Period Settlements
  const totalSettlementsPeriod = periodSettlements.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // 5. Current Outstanding Balance = pulled directly from live ?action=dashboard finalBalance
  const finalBalance = dashboard?.finalBalance;
  const currentOutstandingAmount = Number(finalBalance?.amount ?? Math.abs(dashboard?.currentOutstanding ?? 0));
  const debtor = finalBalance?.debtor || (dashboard?.currentOutstanding && dashboard.currentOutstanding > 0 ? 'Asif Zia' : 'Kashif Zia');
  const creditor = finalBalance?.creditor || (dashboard?.currentOutstanding && dashboard.currentOutstanding > 0 ? 'Kashif Zia' : 'Asif Zia');
  const isSettled = currentOutstandingAmount === 0 || !debtor || debtor === creditor;

  let balanceText = 'Fully Settled (Rs. 0)';
  let kashifPosition = 'Rs. 0 (Balanced)';
  let asifPosition = 'Rs. 0 (Balanced)';
  let plainEnglishNetHeadline = '';
  let plainEnglishAction = '';

  if (isSettled) {
    balanceText = 'Fully Settled (Rs. 0)';
    kashifPosition = 'Rs. 0 (No receivable / payable)';
    asifPosition = 'Rs. 0 (No receivable / payable)';
    plainEnglishNetHeadline = 'All household balances are fully settled. Neither brother owes any amount to the other.';
    plainEnglishAction = 'No settlement payment is required at this time.';
  } else if (debtor.toLowerCase().includes('asif')) {
    // Asif owes Kashif -> Kashif has RECEIVABLE, Asif has PAYABLE
    balanceText = `${formatPdfPKR(currentOutstandingAmount)} (Asif Zia owes Kashif Zia)`;
    kashifPosition = `Receivable: ${formatPdfPKR(currentOutstandingAmount)} (from Asif Zia)`;
    asifPosition = `Payable: ${formatPdfPKR(currentOutstandingAmount)} (to Kashif Zia)`;
    plainEnglishNetHeadline = `Kashif Zia is RECEIVABLE ${formatPdfPKR(currentOutstandingAmount)} from Asif Zia (Asif Zia has a net payable of ${formatPdfPKR(currentOutstandingAmount)} to Kashif Zia).`;
    plainEnglishAction = `To settle the account, Asif Zia needs to pay ${formatPdfPKR(currentOutstandingAmount)} to Kashif Zia.`;
  } else {
    // Kashif owes Asif -> Asif has RECEIVABLE, Kashif has PAYABLE
    balanceText = `${formatPdfPKR(currentOutstandingAmount)} (Kashif Zia owes Asif Zia)`;
    kashifPosition = `Payable: ${formatPdfPKR(currentOutstandingAmount)} (to Asif Zia)`;
    asifPosition = `Receivable: ${formatPdfPKR(currentOutstandingAmount)} (from Kashif Zia)`;
    plainEnglishNetHeadline = `Asif Zia is RECEIVABLE ${formatPdfPKR(currentOutstandingAmount)} from Kashif Zia (Kashif Zia has a net payable of ${formatPdfPKR(currentOutstandingAmount)} to Asif Zia).`;
    plainEnglishAction = `To settle the account, Kashif Zia needs to pay ${formatPdfPKR(currentOutstandingAmount)} to Asif Zia.`;
  }

  let cursorY = 14;

  // -------------------------------------------------------------
  // 1. HEADER (Navy block #1a2744 matching app branding)
  // -------------------------------------------------------------
  const headerHeight = 28;
  doc.setFillColor(26, 39, 68); // #1a2744
  doc.roundedRect(margin, cursorY, contentWidth, headerHeight, 3, 3, 'F');

  // App Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('MKZ-Household — Expense & Settlement Report', margin + 6, cursorY + 11);

  // Subtitle (Period & Timestamp)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Report Period: ${fromFormatted} to ${toFormatted}`, margin + 6, cursorY + 19);
  doc.text(`Generated: ${generatedTimestamp}`, margin + 6, cursorY + 24);

  cursorY += headerHeight + 8;

  // -------------------------------------------------------------
  // 2. SUMMARY SECTION (if included)
  // -------------------------------------------------------------
  if (options.includeSummary) {
    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 39, 68); // #1a2744
    doc.text('1. SUMMARY OVERVIEW & NET POSITION', margin, cursorY);
    cursorY += 4;

    // Plain English Executive Summary Callout Box
    const calloutBoxY = cursorY;
    const calloutPadding = 4;
    const calloutWidth = contentWidth;

    // Measure text to dynamically calculate height
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const textLines = [
      `• Net Balance: ${plainEnglishNetHeadline}`,
      `• Action Required: ${plainEnglishAction}`,
      `• Baseline Opening (${openingDateFormatted}): ${openingPlainDesc}`,
      `• Period Spend Fronted: Asif fronted ${formatPdfPKR(asifFrontedPeriod)} | Kashif fronted ${formatPdfPKR(kashifFrontedPeriod)} | Settlements paid: ${formatPdfPKR(totalSettlementsPeriod)}`,
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
    doc.setFillColor(isSettled ? 16 : 79, isSettled ? 185 : 70, isSettled ? 129 : 229);
    doc.roundedRect(margin, calloutBoxY, 2.5, estimatedHeight, 1, 1, 'F');

    // Callout Content
    let textCursor = calloutBoxY + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 39, 68);
    doc.text('EXECUTIVE SUMMARY (PLAIN ENGLISH):', margin + calloutPadding + 2, textCursor);
    textCursor += 4.5;

    textLines.forEach((line, idx) => {
      const splitLines = doc.splitTextToSize(line, calloutWidth - calloutPadding * 2 - 4);
      if (idx === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(isSettled ? 4 : 190, isSettled ? 120 : 18, isSettled ? 87 : 60); // emerald or rose
      } else if (idx === 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59); // slate-800
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(71, 85, 105); // slate-600
      }
      doc.text(splitLines, margin + calloutPadding + 2, textCursor);
      textCursor += splitLines.length * 4.2;
    });

    cursorY = calloutBoxY + estimatedHeight + 5;

    // Summary Table with clear breakdown including Opening Balance & Net Payables
    const summaryRows = [
      [
        `Baseline Opening Balance (as of ${openingDateFormatted})`,
        openingText,
        'Historical starting ledger balance before current period activity',
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
        'Direct Settlements Paid (This Period)',
        formatPdfPKR(totalSettlementsPeriod),
        'Direct brother-to-brother reimbursement transfers in date range',
      ],
      [
        `Current Outstanding Balance (as of ${todayStr})`,
        balanceText,
        'Live overall household balance computed from all entries to date',
      ],
      [
        'Kashif Zia Net Position',
        kashifPosition,
        debtor.toLowerCase().includes('asif') && !isSettled
          ? 'Kashif is owed this amount (money to receive from Asif)'
          : !isSettled
          ? 'Kashif needs to pay this amount to Asif'
          : 'Even (no money owed)',
      ],
      [
        'Asif Zia Net Position',
        asifPosition,
        debtor.toLowerCase().includes('asif') && !isSettled
          ? 'Asif needs to pay this amount to Kashif'
          : !isSettled
          ? 'Asif is owed this amount (money to receive from Kashif)'
          : 'Even (no money owed)',
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
        // Highlight Opening Balance row (index 0)
        if (data.section === 'body' && data.row.index === 0) {
          data.cell.styles.fillColor = [248, 250, 252]; // slate-50
          if (data.column.index === 1) {
            data.cell.styles.textColor = [30, 58, 138]; // blue-900
          }
        }
        // Highlight Current Outstanding Balance row (index 5)
        if (data.section === 'body' && data.row.index === 5) {
          data.cell.styles.fillColor = [241, 245, 249]; // slate-100
          if (data.column.index === 1) {
            data.cell.styles.textColor = isSettled ? [4, 120, 87] : [190, 18, 60]; // emerald or rose
          }
        }
        // Highlight Kashif Position row (index 6)
        if (data.section === 'body' && data.row.index === 6) {
          data.cell.styles.fillColor = [255, 255, 255];
          if (data.column.index === 1) {
            data.cell.styles.textColor = debtor.toLowerCase().includes('asif') && !isSettled ? [4, 120, 87] : [30, 41, 59];
          }
        }
        // Highlight Asif Position row (index 7)
        if (data.section === 'body' && data.row.index === 7) {
          data.cell.styles.fillColor = [255, 255, 255];
          if (data.column.index === 1) {
            data.cell.styles.textColor = debtor.toLowerCase().includes('asif') && !isSettled ? [190, 18, 60] : [4, 120, 87];
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
        return [
          formatDate(e.date, 'dd-MMM-yy'),
          e.category || 'General',
          e.details || '—',
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
        head: [['Vendor', 'Amount Owed', 'To Be Paid By']],
        body: vendorRows,
        foot: [totalRow],
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
