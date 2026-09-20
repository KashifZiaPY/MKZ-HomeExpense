export const GOOGLE_SHEET_ID = '19tAXubGDgqhS06j0FJ5E_wiCLH4RZpblRyxcc_5Fhdk';
export const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/19tAXubGDgqhS06j0FJ5E_wiCLH4RZpblRyxcc_5Fhdk/edit';
export const DEFAULT_DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbxHrb1p8HKzj-_h0DeWL3_blCirI3ado4DgHtiOGv0X5NTuQBDRyF0kBoU-pzH_pnPkAg/exec';

export const CODE_GS_FIXED = `/*************************************************************************
 * HOUSEHOLD EXPENSE LEDGER — SETTLEMENT ENGINE
 * Kashif Zia & Asif Zia — 50/50 shared household expenses
 *
 * File 1 of 2: Code.gs
 *************************************************************************/

var CONFIG = {
  SPREADSHEET_ID: '19tAXubGDgqhS06j0FJ5E_wiCLH4RZpblRyxcc_5Fhdk',
  EXPENSE_SHEET_NAME: 'ExpenseDetails080726Onwards',
  SETTLEMENT_SHEET_NAME: 'Settlement Ledger',
  DASHBOARD_SHEET_NAME: 'Balance Dashboard',
  SETTINGS_SHEET_NAME: 'Settings',
  VENDOR_SHEET_NAME: 'Vender/Shopkeeper',

  NAVY: '#1a2744',
  NAVY_LIGHT: '#eef1f7',
  GREEN: '#1e7e34',
  RED: '#b02a2a',

  NAME_MAP: {
    'asif': 'Asif Zia',
    'kashif': 'Kashif Zia',
    'asif zia': 'Asif Zia',
    'kashif zia': 'Kashif Zia'
  }
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏠 Household Ledger')
    .addItem('⚙️ Setup System (Run Once)', 'setupSystem')
    .addSeparator()
    .addItem('🔄 Recalculate Dashboard', 'recalcDashboard')
    .addItem('➕ Add Settlement Payment', 'addSettlementEntry')
    .addItem('🔽 Refresh Vendor Dropdown', 'applyVendorValidation_')
    .addSeparator()
    .addItem('ℹ️ About This Logic', 'showAbout')
    .addToUi();
}

function setupSystem() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  var settings = ss.getSheetByName(CONFIG.SETTINGS_SHEET_NAME);
  if (!settings) {
    settings = ss.insertSheet(CONFIG.SETTINGS_SHEET_NAME);
    settings.getRange('A1:B6').setValues([
      ['Opening Balance Date', new Date('2026-07-07')],
      ['Opening Balance Amount', 33119],
      ['Opening Balance Payable By', 'Asif Zia'],
      ['Opening Balance Payable To', 'Kashif Zia'],
      ['Household Split Ratio', '50 / 50'],
      ['Security PIN (Settings Cell B6)', '']
    ]);
    settings.getRange('A1:A6').setFontWeight('bold');
    settings.setColumnWidth(1, 240);
    settings.setColumnWidth(2, 180);
    toast('Settings sheet created with opening balance and Security PIN configuration.');
  } else {
    var pinLabel = settings.getRange('A6').getValue();
    if (!pinLabel) {
      settings.getRange('A6').setValue('Security PIN (Settings Cell B6)').setFontWeight('bold');
    }
  }

  var settlement = ss.getSheetByName(CONFIG.SETTLEMENT_SHEET_NAME);
  if (!settlement) {
    settlement = ss.insertSheet(CONFIG.SETTLEMENT_SHEET_NAME);
    var headers = ['Sr#', 'Date', 'Paid From', 'Paid To', 'Amount', 'Notes', 'Recorded On'];
    settlement.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground(CONFIG.NAVY).setFontColor('#ffffff');
    settlement.setFrozenRows(1);
    settlement.setColumnWidths(1, 7, 130);

    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Asif Zia', 'Kashif Zia'], true)
      .setAllowInvalid(false)
      .build();
    settlement.getRange('C2:D200').setDataValidation(rule);
    toast('Settlement Ledger sheet created.');
  }

  var dashboard = ss.getSheetByName(CONFIG.DASHBOARD_SHEET_NAME);
  if (!dashboard) {
    dashboard = ss.insertSheet(CONFIG.DASHBOARD_SHEET_NAME);
    dashboard.setColumnWidth(1, 300);
    dashboard.setColumnWidth(2, 160);
    dashboard.setColumnWidth(3, 320);
  }

  ss.setActiveSheet(dashboard);
  ss.moveActiveSheet(1);

  applyVendorValidation_();
  recalcDashboard();
  SpreadsheetApp.getUi().alert('Setup complete ✅\\n\\nSheets created: Settings, Settlement Ledger, Balance Dashboard.\\nDashboard has been calculated.');
}

function recalcDashboard() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var dashboard = ss.getSheetByName(CONFIG.DASHBOARD_SHEET_NAME);
  var d = computeBalances_();
  if (!d) return;
  writeDashboard_(dashboard, d);
  toast('Dashboard recalculated.');
}

function computeBalances_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var expSheet = ss.getSheetByName(CONFIG.EXPENSE_SHEET_NAME);
  if (!expSheet) {
    SpreadsheetApp.getUi().alert('Could not find a tab named "' + CONFIG.EXPENSE_SHEET_NAME + '".');
    return null;
  }

  var settings = ss.getSheetByName(CONFIG.SETTINGS_SHEET_NAME);
  var settlement = ss.getSheetByName(CONFIG.SETTLEMENT_SHEET_NAME);

  var openingDate = new Date('2026-07-07');
  var openingAmount = 33119;
  var openingFrom = 'Asif Zia';
  var openingTo = 'Kashif Zia';

  if (settings) {
    try {
      var dVal = settings.getRange('B1').getValue();
      if (dVal) {
        var parsedD = toDate_(dVal);
        if (parsedD && !isNaN(parsedD.getTime())) openingDate = parsedD;
      }
      var aVal = Number(settings.getRange('B2').getValue());
      if (!isNaN(aVal) && aVal > 0) openingAmount = aVal;
      var fVal = String(settings.getRange('B3').getValue() || '').trim();
      if (fVal) openingFrom = fVal;
      var tVal = String(settings.getRange('B4').getValue() || '').trim();
      if (tVal) openingTo = tVal;
    } catch (err) {}
  }

  var openingSigned = (openingFrom === 'Asif Zia') ? openingAmount : -openingAmount;

  var data = findHeaderAndData_(expSheet);
  var kashifReceivable = 0;
  var asifReceivable = 0;
  var pendingVendorAsif = 0;
  var pendingVendorKashif = 0;
  var pendingByVendor = {};

  data.rows.forEach(function (row) {
    var date = toDate_(row[data.col.date]);
    var status = String(row[data.col.status] || '').trim().toLowerCase();
    var paidByRaw = String(row[data.col.paidBy] || '').trim().toLowerCase();
    var paidBy = CONFIG.NAME_MAP[paidByRaw] || (paidByRaw.indexOf('kashif') >= 0 ? 'Kashif Zia' : (paidByRaw.indexOf('asif') >= 0 ? 'Asif Zia' : null));
    var amount = Number(row[data.col.amount]) || 0;
    var half = amount / 2;
    var vendorName = data.col.vendor > -1 ? String(row[data.col.vendor] || '').trim() : '';

    if (!paidBy || !amount) return;

    if (status === 'unpaid' || status === 'due' || status === 'khaata') {
      if (paidBy === 'Asif Zia') pendingVendorAsif += amount;
      if (paidBy === 'Kashif Zia') pendingVendorKashif += amount;

      var key = vendorName || '(Vendor not entered)';
      if (!pendingByVendor[key]) pendingByVendor[key] = { amount: 0, payer: paidBy };
      pendingByVendor[key].amount += amount;
      if (pendingByVendor[key].payer !== paidBy) pendingByVendor[key].payer = 'Asif Zia / Kashif Zia';
      return;
    }

    if (status === 'paid' || status === '') {
      var isAfterOpening = !date || !openingDate || isNaN(openingDate.getTime()) || (date >= openingDate);
      if (isAfterOpening) {
        if (paidBy === 'Kashif Zia') kashifReceivable += half;
        if (paidBy === 'Asif Zia') asifReceivable += half;
      }
    }
  });

  var paidAsifToKashif = 0, paidKashifToAsif = 0;
  if (settlement && settlement.getLastRow() > 1) {
    var settlementRows = settlement.getDataRange().getValues().slice(1);
    settlementRows.forEach(function (r) {
      var date = toDate_(r[1]);
      var from = String(r[2] || '').trim();
      var to = String(r[3] || '').trim();
      var amount = Number(r[4]) || 0;
      if (!amount) return;
      if (from.indexOf('Asif') >= 0 && to.indexOf('Kashif') >= 0) paidAsifToKashif += amount;
      if (from.indexOf('Kashif') >= 0 && to.indexOf('Asif') >= 0) paidKashifToAsif += amount;
    });
  }

  var netSinceOpening = (kashifReceivable - asifReceivable) - paidAsifToKashif + paidKashifToAsif;
  var currentOutstanding = openingSigned + netSinceOpening;
  var pinFromSheet = '';
  try {
    pinFromSheet = String(settings.getRange('B6').getValue() || '').trim();
  } catch (e) {}

  var dateStr = '2026-07-07';
  try {
    dateStr = Utilities.formatDate(openingDate, Session.getScriptTimeZone() || 'GMT+5', 'yyyy-MM-dd');
  } catch (e) {}

  return {
    openingDate: dateStr,
    openingAmount: openingAmount,
    openingFrom: openingFrom,
    openingTo: openingTo,
    netSinceOpening: netSinceOpening,
    currentOutstanding: currentOutstanding,
    pendingVendorAsif: pendingVendorAsif,
    pendingVendorKashif: pendingVendorKashif,
    pendingByVendor: pendingByVendor,
    openingBalance: {
      amount: openingAmount,
      debtor: openingFrom,
      creditor: openingTo
    },
    finalBalance: {
      amount: Math.abs(currentOutstanding),
      debtor: currentOutstanding >= 0 ? 'Asif Zia' : 'Kashif Zia',
      creditor: currentOutstanding >= 0 ? 'Kashif Zia' : 'Asif Zia',
      signedAsifPerspective: currentOutstanding
    }
  };
}

function writeDashboard_(sheet, d) {
  sheet.clear();
  sheet.getRange('A1:C1').merge().setValue('🏠 HOUSEHOLD BALANCE DASHBOARD')
    .setBackground(CONFIG.NAVY).setFontColor('#ffffff').setFontWeight('bold')
    .setFontSize(14).setHorizontalAlignment('center');
  sheet.setRowHeight(1, 32);

  var rows = [
    ['Opening Balance (as of ' + Utilities.formatDate(d.openingDate, Session.getScriptTimeZone() || 'GMT+5', 'dd-MMM-yyyy') + ')',
      d.openingAmount, d.openingFrom + ' owes ' + d.openingTo],
    ['Net Movement Since Opening', Math.abs(d.netSinceOpening),
      d.netSinceOpening >= 0 ? 'Increases Asif → Kashif balance' : 'Reduces Asif → Kashif balance']
  ];
  sheet.getRange(3, 1, rows.length, 3).setValues(rows);

  var outstanding = d.currentOutstanding;
  var verdict = (Math.abs(outstanding) < 1)
    ? '✅ Fully Settled — no balance due either way'
    : (outstanding > 0 ? 'Asif Zia owes Kashif Zia' : 'Kashif Zia owes Asif Zia');

  sheet.getRange('A6').setValue('CURRENT OUTSTANDING BALANCE').setFontWeight('bold');
  sheet.getRange('B6').setValue(Math.abs(outstanding)).setFontWeight('bold')
    .setFontColor(outstanding === 0 ? CONFIG.GREEN : CONFIG.RED).setNumberFormat('#,##0');
  sheet.getRange('C6').setValue(verdict).setFontWeight('bold');
  sheet.getRange('A6:C6').setBackground(CONFIG.NAVY_LIGHT);

  sheet.getRange('A8').setValue('Pending Vendor Liabilities (not yet paid to shopkeepers)').setFontWeight('bold');
  sheet.getRange('A9').setValue('To be paid by Asif Zia');
  sheet.getRange('B9').setValue(d.pendingVendorAsif).setNumberFormat('#,##0');
  sheet.getRange('A10').setValue('To be paid by Kashif Zia');
  sheet.getRange('B10').setValue(d.pendingVendorKashif).setNumberFormat('#,##0');

  sheet.getRange('B3:B6').setNumberFormat('#,##0');

  var vendorRowStart = 12;
  sheet.getRange('A' + vendorRowStart).setValue('Owed to Each Vendor / Shopkeeper').setFontWeight('bold');
  var vendorHeaderRow = vendorRowStart + 1;
  sheet.getRange(vendorHeaderRow, 1, 1, 3).setValues([['Vendor', 'Amount Owed', 'To Be Paid By']])
    .setFontWeight('bold').setBackground(CONFIG.NAVY_LIGHT);

  var vendorNames = Object.keys(d.pendingByVendor || {}).sort();
  if (vendorNames.length === 0) {
    sheet.getRange(vendorHeaderRow + 1, 1).setValue('No pending vendor dues 🎉');
  } else {
    var vendorRows = vendorNames.map(function (name) {
      return [name, d.pendingByVendor[name].amount, d.pendingByVendor[name].payer];
    });
    sheet.getRange(vendorHeaderRow + 1, 1, vendorRows.length, 3).setValues(vendorRows);
    sheet.getRange(vendorHeaderRow + 1, 2, vendorRows.length, 1).setNumberFormat('#,##0');
  }
}

function addSettlementEntry() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SETTLEMENT_SHEET_NAME);
  if (!sheet) { ui.alert('Run Setup System first.'); return; }

  var fromResp = ui.prompt('Settlement Payment', 'Paid FROM (Asif Zia / Kashif Zia):', ui.ButtonSet.OK_CANCEL);
  if (fromResp.getSelectedButton() !== ui.Button.OK) return;
  var from = fromResp.getResponseText().trim();

  var toResp = ui.prompt('Settlement Payment', 'Paid TO (Asif Zia / Kashif Zia):', ui.ButtonSet.OK_CANCEL);
  if (toResp.getSelectedButton() !== ui.Button.OK) return;
  var to = toResp.getResponseText().trim();

  var amtResp = ui.prompt('Settlement Payment', 'Amount (Rs.):', ui.ButtonSet.OK_CANCEL);
  if (amtResp.getSelectedButton() !== ui.Button.OK) return;
  var amount = Number(amtResp.getResponseText().replace(/,/g, ''));
  if (!amount) { ui.alert('Invalid amount.'); return; }

  var noteResp = ui.prompt('Settlement Payment', 'Notes (optional):', ui.ButtonSet.OK_CANCEL);
  var notes = noteResp.getSelectedButton() === ui.Button.OK ? noteResp.getResponseText() : '';

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 7).setValues([[
    lastRow, new Date(), from, to, amount, notes, new Date()
  ]]);

  recalcDashboard();
  ui.alert('Settlement recorded ✅\\nDashboard updated.');
}

/**
 * Robust header and data finder (matches "Purchase", "Stat", "S", etc.)
 */
function findHeaderAndData_(sheet) {
  var values = sheet.getDataRange().getValues();
  var headerRowIdx = -1;

  for (var i = 0; i < Math.min(values.length, 10); i++) {
    var rowStr = values[i].join('|').toLowerCase();
    if (rowStr.indexOf('date') !== -1 && (rowStr.indexOf('amount') !== -1 || rowStr.indexOf('category') !== -1 || rowStr.indexOf('purchase') !== -1)) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) headerRowIdx = 1;

  var header = values[headerRowIdx].map(function (h) { return String(h).trim().toLowerCase(); });

  function findCol(keywords) {
    for (var i = 0; i < header.length; i++) {
      for (var k = 0; k < keywords.length; k++) {
        if (header[i] === keywords[k] || header[i].indexOf(keywords[k]) !== -1) return i;
      }
    }
    return -1;
  }

  var col = {
    date: findCol(['date']),
    category: findCol(['expense category', 'category']),
    details: findCol(['expense details', 'details', 'item']),
    amount: findCol(['amount', 'total', 'cost']),
    paidBy: findCol(['purchase', 'purchase by', 'paid by', 'buyer']),
    status: findCol(['stat', 'status']),
    vendor: findCol(['vender', 'vendor', 'shopkeeper']),
    id: findCol(['id', 'uuid'])
  };

  var rows = values.slice(headerRowIdx + 1).filter(function (r) {
    var hasDate = col.date > -1 && String(r[col.date] || '').trim() !== '';
    var amt = col.amount > -1 ? Number(r[col.amount]) : 0;
    var hasAmt = !isNaN(amt) && amt > 0;
    var hasCat = col.category > -1 && String(r[col.category] || '').trim() !== '';
    return (hasDate || hasCat) && hasAmt;
  });

  return { col: col, rows: rows, headerRowIdx: headerRowIdx };
}

function applyVendorValidation_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var expSheet = ss.getSheetByName(CONFIG.EXPENSE_SHEET_NAME);
  var vendorSheet = ss.getSheetByName(CONFIG.VENDOR_SHEET_NAME);
  if (!expSheet || !vendorSheet) return;

  var data = findHeaderAndData_(expSheet);
  if (data.col.vendor === -1) return;

  var vendorLastRow = vendorSheet.getLastRow();
  if (vendorLastRow < 2) return;

  var nameRange = vendorSheet.getRange(2, 2, vendorLastRow - 1, 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(nameRange, true)
    .setAllowInvalid(true)
    .build();

  var vendorColLetter = String.fromCharCode(65 + data.col.vendor);
  var firstDataRow = data.headerRowIdx + 2;
  expSheet.getRange(vendorColLetter + firstDataRow + ':' + vendorColLetter + '400').setDataValidation(rule);
  toast('Vendor dropdown applied to column ' + vendorColLetter + '.');
}

function toDate_(val) {
  if (val instanceof Date) return val;
  if (!val) return null;
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toast(msg) {
  SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Household Ledger', 4);
}

function showAbout() {
  SpreadsheetApp.getUi().alert('Settlement Logic\\n\\n• 50/50 shared household ledger between Kashif Zia & Asif Zia.');
}
`;

export const WEBAPP_API_FIXED = `/*************************************************************************
 * WEB APP API — exposes your existing Google Sheet as a JSON API.
 * File 2 of 2: Webapp api.gs
 * Shares CONFIG and all helper functions from Code.gs.
 *************************************************************************/

var ID_COL_HEADER = 'ID';

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'dashboard';
    var result;
    switch (action) {
      case 'dashboard':   result = computeBalances_(); break;
      case 'expenses':    result = getExpensesJson_(); break;
      case 'settlements': result = getSettlementsJson_(); break;
      case 'vendors':     result = getVendorsJson_(); break;
      case 'categories':  result = getCategoriesJson_(); break;
      default: return jsonResponse_({ error: 'Unknown action: ' + action });
    }
    return jsonResponse_({ data: result });
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ error: 'No POST data received' });
    }
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    // Security PIN verification against Settings cell B6
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var settings = ss.getSheetByName(CONFIG.SETTINGS_SHEET_NAME);
    var expectedPin = '';
    try {
      if (settings) {
        var cellPin = String(settings.getRange('B6').getValue() || '').trim();
        if (cellPin) expectedPin = cellPin;
      }
    } catch (err) {}

    // Live PIN Verification endpoint
    if (action === 'verifyPin') {
      var userPin = String(body.pin || '').trim();
      if (expectedPin && userPin === expectedPin) {
        return jsonResponse_({ data: { valid: true }, message: 'Security PIN verified successfully' });
      } else if (!expectedPin && userPin) {
        if (!settings) settings = ss.insertSheet(CONFIG.SETTINGS_SHEET_NAME);
        settings.getRange('A6').setValue('Security PIN (Settings Cell B6)').setFontWeight('bold');
        settings.getRange('B6').setValue(userPin);
        return jsonResponse_({ data: { valid: true }, message: 'Security PIN initialized successfully in Settings cell B6' });
      } else {
        return jsonResponse_({ error: 'Incorrect Security PIN. Verification failed against Google Sheet cell B6.' });
      }
    }

    // Live PIN Update endpoint (updates Settings cell B6)
    if (action === 'updatePin') {
      var currentPin = String(body.pin || '').trim();
      if (currentPin !== expectedPin) {
        return jsonResponse_({ error: 'Current Security PIN is incorrect.' });
      }
      var newPin = String((body.payload && body.payload.newPin) || '').trim();
      if (!newPin || newPin.length < 4) {
        return jsonResponse_({ error: 'New PIN must be at least 4 characters.' });
      }
      if (!settings) {
        settings = ss.insertSheet(CONFIG.SETTINGS_SHEET_NAME);
      }
      settings.getRange('B6').setValue(newPin);
      return jsonResponse_({ data: { success: true }, message: 'Security PIN updated successfully in Settings cell B6' });
    }

    // Verify client PIN for all modifying actions
    var clientPin = String(body.pin || '').trim();
    if (!clientPin || clientPin !== expectedPin) {
      return jsonResponse_({ error: 'Security PIN required: unauthorized modification. Please enter the PIN from Settings cell B6.' });
    }

    var result;

    switch (action) {
      case 'addExpense':     result = addExpense_(body.payload); break;
      case 'updateExpense':  result = updateExpense_(body.payload); break;
      case 'deleteExpense':  result = deleteExpense_(body.payload.id); break;
      case 'addSettlement':  result = addSettlement_(body.payload); break;
      case 'addVendor':      result = addVendor_(body.payload); break;
      default: return jsonResponse_({ error: 'Unknown action: ' + action });
    }

    return jsonResponse_({ data: result, message: 'Action completed successfully' });
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getExpensesJson_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.EXPENSE_SHEET_NAME);
  var data = findHeaderAndData_(sheet);
  var idCol = data.col.id;

  var list = data.rows.map(function (row, i) {
    var rawPaidBy = String(row[data.col.paidBy] || '').trim().toLowerCase();
    var normalizedPaidBy = CONFIG.NAME_MAP[rawPaidBy] || (rawPaidBy.indexOf('kashif') >= 0 ? 'Kashif Zia' : 'Asif Zia');
    var rawStat = String(row[data.col.status] || '').trim().toLowerCase();
    var normalizedStatus = (rawStat === 'unpaid' || rawStat === 'due' || rawStat === 'khaata') ? 'Unpaid' : 'Paid';

    return {
      id: idCol > -1 && row[idCol] ? String(row[idCol]) : ('exp-' + (i + 1)),
      serial: i + 1,
      date: formatDateString_(row[data.col.date]),
      category: row[data.col.category] || 'Miscellaneous',
      details: row[data.col.details] || '',
      amount: Number(row[data.col.amount]) || 0,
      paidBy: normalizedPaidBy,
      vendor: data.col.vendor > -1 ? (row[data.col.vendor] || '') : '',
      status: normalizedStatus
    };
  });

  return list.reverse();
}

function getSettlementsJson_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SETTLEMENT_SHEET_NAME);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues().slice(1).filter(function (r) { return r.join('').trim() !== ''; });
  var list = rows.map(function (r, i) {
    return {
      id: r[6] || r[0] || ('set-' + (i + 1)),
      date: formatDateString_(r[1]),
      paidFrom: r[2] || 'Asif Zia',
      paidTo: r[3] || 'Kashif Zia',
      amount: Number(r[4]) || 0,
      notes: r[5] || ''
    };
  });
  return list.reverse();
}

function getVendorsJson_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.VENDOR_SHEET_NAME);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues().slice(1).filter(function (r) { return r.join('').trim() !== ''; });
  return rows.map(function (r, i) {
    return { id: String(r[0] || ('v-' + (i + 1))), name: String(r[1] || r[0]), business: String(r[2] || r[1] || '') };
  });
}

function getCategoriesJson_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var expSheet = ss.getSheetByName(CONFIG.EXPENSE_SHEET_NAME);
  if (expSheet) {
    var data = findHeaderAndData_(expSheet);
    var colCat = data.col.category > -1 ? data.col.category + 1 : 3;
    var cell = expSheet.getRange(data.headerRowIdx + 2, colCat);
    var rule = cell.getDataValidation();
    if (rule) {
      var criteriaValues = rule.getCriteriaValues();
      if (criteriaValues && criteriaValues.length > 0) {
        if (Array.isArray(criteriaValues[0])) {
          return criteriaValues[0];
        }
        if (criteriaValues[0] && typeof criteriaValues[0].getValues === 'function') {
          var vals = criteriaValues[0].getValues();
          var list = [];
          for (var i = 0; i < vals.length; i++) {
            if (vals[i][0] && String(vals[i][0]).trim() !== '') list.push(String(vals[i][0]).trim());
          }
          if (list.length > 0) return list;
        }
      }
    }
  }

  // Exact categories from your Sheet Column C
  return [
    'Kiryana',
    'Vegetable',
    'Cylinder',
    'Milk',
    'Fesco',
    'Internet',
    'Maintenance'
  ];
}

function addExpense_(p) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.EXPENSE_SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var data = findHeaderAndData_(sheet);
  var newId = Utilities.getUuid();

  // Find the first row where Date (col 1), Details (col 3), and Amount (col 4) are blank
  var targetRowIdx = -1;
  var lastSerial = 0;

  for (var r = data.headerRowIdx + 1; r < values.length; r++) {
    var valDate = String(values[r][1] || '').trim();
    var valAmt = Number(values[r][4]) || 0;
    var valDetails = String(values[r][3] || '').trim();
    var valSr = Number(values[r][0]) || 0;
    if (valSr > lastSerial) lastSerial = valSr;

    if (valDate === '' && valAmt === 0 && valDetails === '') {
      targetRowIdx = r;
      break;
    }
  }

  var sheetRowNum = targetRowIdx === -1 ? sheet.getLastRow() + 1 : targetRowIdx + 1;
  var newSr = lastSerial + 1;
  var half = Number(p.amount) / 2;
  var rowArr = new Array(14).fill('');

  rowArr[0] = newSr; // Col A: Sr #
  rowArr[1] = p.date ? new Date(p.date) : new Date(); // Col B: Date
  rowArr[2] = p.category || 'Miscellaneous'; // Col C: Category
  rowArr[3] = p.details || ''; // Col D: Expense Details
  rowArr[4] = Number(p.amount) || 0; // Col E: Amount
  rowArr[5] = String(p.paidBy || '').toLowerCase().indexOf('kashif') >= 0 ? 'kashif' : 'asif'; // Col F: Purchase
  rowArr[6] = p.vendor || ''; // Col G: Vendor
  rowArr[7] = String(p.status || 'Paid').toLowerCase(); // Col H: Stat
  rowArr[8] = half; // Col I: Asif-Share
  rowArr[9] = half; // Col J: Kashif-Share
  rowArr[10] = ''; // Col K: Remar
  rowArr[11] = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5', 'dd-MM-yyyy HH:mm'); // Col L: TimeStamp
  rowArr[12] = 'Added via Web App'; // Col M: Edited
  rowArr[13] = newId; // Col N: ID

  sheet.getRange(sheetRowNum, 1, 1, rowArr.length).setValues([rowArr]);
  return { id: newId, serial: newSr, category: p.category, amount: p.amount, paidBy: p.paidBy, row: sheetRowNum };
}

function updateExpense_(p) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.EXPENSE_SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var data = findHeaderAndData_(sheet);

  var targetCol = data.col.id > -1 ? data.col.id : 13;
  var sheetRowNum = -1;

  for (var r = data.headerRowIdx + 1; r < values.length; r++) {
    var cellId = String(values[r][targetCol] || '');
    var cellSr = String(values[r][0] || '');
    if (cellId === String(p.id) || cellSr === String(p.id)) {
      sheetRowNum = r + 1;
      break;
    }
  }
  if (sheetRowNum === -1) throw new Error('Expense ID not found: ' + p.id);

  if (p.date !== undefined && data.col.date > -1) sheet.getRange(sheetRowNum, data.col.date + 1).setValue(new Date(p.date));
  if (p.category !== undefined && data.col.category > -1) sheet.getRange(sheetRowNum, data.col.category + 1).setValue(p.category);
  if (p.details !== undefined && data.col.details > -1) sheet.getRange(sheetRowNum, data.col.details + 1).setValue(p.details);
  if (p.amount !== undefined && data.col.amount > -1) {
    sheet.getRange(sheetRowNum, data.col.amount + 1).setValue(Number(p.amount));
    sheet.getRange(sheetRowNum, 9).setValue(Number(p.amount) / 2);
    sheet.getRange(sheetRowNum, 10).setValue(Number(p.amount) / 2);
  }
  if (p.paidBy !== undefined && data.col.paidBy > -1) {
    sheet.getRange(sheetRowNum, data.col.paidBy + 1).setValue(String(p.paidBy).toLowerCase().indexOf('kashif') >= 0 ? 'kashif' : 'asif');
  }
  if (p.vendor !== undefined && data.col.vendor > -1) sheet.getRange(sheetRowNum, data.col.vendor + 1).setValue(p.vendor);
  if (p.status !== undefined && data.col.status > -1) sheet.getRange(sheetRowNum, data.col.status + 1).setValue(String(p.status).toLowerCase());

  return { id: p.id, updated: true, row: sheetRowNum };
}

function deleteExpense_(id) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.EXPENSE_SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var data = findHeaderAndData_(sheet);

  var lastFilledRowIdx = -1;
  for (var i = values.length - 1; i > data.headerRowIdx; i--) {
    if (values[i].join('').trim() !== '') {
      lastFilledRowIdx = i;
      break;
    }
  }

  if (lastFilledRowIdx === -1) {
    throw new Error('No expense records available to delete.');
  }

  var targetCol = data.col.id > -1 ? data.col.id : 13;
  var lastRowCellId = String(values[lastFilledRowIdx][targetCol] || '');
  var lastRowCellSr = String(values[lastFilledRowIdx][0] || '');
  var lastRowStr = values[lastFilledRowIdx].join('|');

  var isLastEntry = (
    String(id) === lastRowCellId ||
    String(id) === lastRowCellSr ||
    (id && lastRowCellId && lastRowCellId.indexOf(String(id)) !== -1) ||
    (id && lastRowStr.indexOf(String(id)) !== -1)
  );

  if (!isLastEntry) {
    throw new Error('LIFO Rule Violation: Only the latest recorded entry (Serial #' + lastRowCellSr + ', Row ' + (lastFilledRowIdx + 1) + ') can be deleted to maintain ledger audit integrity. Earlier entries are permanently locked.');
  }

  sheet.deleteRow(lastFilledRowIdx + 1);
  return { id: id, deleted: true, rowDeleted: lastFilledRowIdx + 1, lifoVerified: true };
}

function addSettlement_(p) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SETTLEMENT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SETTLEMENT_SHEET_NAME);
  var lastRow = sheet.getLastRow();
  var newId = Utilities.getUuid();
  sheet.getRange(lastRow + 1, 1, 1, 7).setValues([[
    lastRow, new Date(p.date), p.paidFrom, p.paidTo, Number(p.amount), p.notes || '', new Date()
  ]]);
  return { id: newId };
}

function addVendor_(p) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.VENDOR_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.VENDOR_SHEET_NAME);
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 3).setValues([[lastRow, p.name, p.business || '']]);
  return { name: p.name };
}

function formatDateString_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'GMT+5', 'yyyy-MM-dd');
  }
  return String(val);
}
`;
