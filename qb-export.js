// RoadCoda: QuickBooks export files (#27).
// Online:  invoice import CSV, journal entry import CSV, and a payments list to record (Online has no payments import).
// Desktop: IIF — INVOICE, PAYMENT and GENERAL JOURNAL transactions (tab-separated, !TRNS / !SPL / !ENDTRNS headers).
// Used by qb-export.html; also loads in Node for testing (module.exports).
(function (root) {
  const cell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = (rows) => rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
  // IIF is read as plain text by QuickBooks Desktop: no tabs, line breaks or quotes inside a field, and plain dashes / quotes
  const ascii = (s) => s.replace(/[\u2012-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '').replace(/\u2026/g, '...').replace(/[^\x20-\x7E]/g, '');
  const iif = (rows) => rows.map(r => r.map(v => ascii(String(v ?? '').replace(/[\t\r\n"]+/g, ' ').trim())).join('\t')).join('\r\n') + '\r\n';
  const mdy = (s) => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${m}/${d}/${y}`; };
  const n2 = (x) => (Math.round((+x || 0) * 100) / 100).toFixed(2);
  const q = (x) => x == null || x === '' ? '' : String(Math.round(+x * 10000) / 10000);
  const groupBy = (a, k) => a.reduce((m, x) => { (m[x[k]] ||= []).push(x); return m; }, {});

  // lines = rows from qb_invoice_lines; S = qb_settings
  function invoices(edition, lines, S) {
    const byInv = groupBy(lines.filter(l => +l.amount !== 0), 'invoice_id'), warnings = [], exported = [], files = [];
    const ids = Object.keys(byInv);
    const unmapped = [...new Set(lines.filter(l => !l.qb_item).map(l => l.line_key))];
    if (unmapped.length) warnings.push(`These kinds of line have no QuickBooks item yet, so they go out as "${S.default_item}": ${unmapped.join(', ')}.`);
    if (edition === 'online') {
      const head = ['InvoiceNo', 'Customer', 'InvoiceDate', 'DueDate', 'Terms', 'Location', 'Memo', 'Item(Product/Service)', 'ItemDescription', 'ItemQuantity', 'ItemRate', 'ItemAmount', 'Taxable', 'TaxRate', 'Service Date'];
      const hand = [];
      let rows = [], part = 1;
      const flush = () => { if (rows.length) files.push({ name: `QBO-invoices${files.length || rows.length >= 1000 ? '-part' + part : ''}.csv`, text: csv([head, ...rows]) }); rows = []; part++; };
      for (const id of ids) {
        const ls = byInv[id], h = ls[0];
        if (ls.some(l => +l.amount < 0)) { hand.push(`${h.invoice_no} (${h.customer})`); continue; }   // QBO import takes no negative lines
        if (rows.length + ls.length > 999) flush();
        ls.forEach(l => rows.push([h.invoice_no, h.customer, mdy(h.invoice_date), mdy(h.due_date || h.invoice_date), h.terms_days ? `Net ${h.terms_days}` : '', '', h.memo || '',
          l.qb_item || S.default_item, l.description || '', q(l.qty), q(l.rate), n2(l.amount), 'N', '', mdy(l.service_date)]));
        exported.push(id);
      }
      flush();
      if (files.length > 1) files.forEach((f, i) => f.name = `QBO-invoices-part${i + 1}.csv`); else if (files[0]) files[0].name = 'QBO-invoices.csv';
      if (hand.length) warnings.push(`QuickBooks Online won't import an invoice with a credit (negative) line — enter these by hand: ${hand.join(', ')}.`);
    } else {
      const rows = [['!TRNS', 'TRNSID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO', 'DUEDATE'],
                    ['!SPL', 'SPLID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO', 'QNTY', 'PRICE', 'INVITEM'], ['!ENDTRNS']];
      for (const id of ids) {
        const ls = byInv[id], h = ls[0], total = ls.reduce((a, l) => a + +l.amount, 0);
        rows.push(['TRNS', '', 'INVOICE', mdy(h.invoice_date), S.ar_account, h.customer, n2(total), h.invoice_no, h.memo || '', mdy(h.due_date || h.invoice_date)]);
        // IIF invoice lines are credits to income: amounts and quantities go in negative
        ls.forEach(l => rows.push(['SPL', '', 'INVOICE', mdy(h.invoice_date), l.account || S.income_account, '', n2(-l.amount), h.invoice_no, l.description || '',
          l.qty == null ? '' : q(-l.qty), l.rate == null ? '' : q(l.rate), l.qb_item || S.default_item]));
        rows.push(['ENDTRNS']);
        exported.push(id);
      }
      if (exported.length) files.push({ name: 'QBD-invoices.iif', text: iif(rows) });
    }
    return { files, warnings, exported, count: exported.length };
  }

  function payments(edition, pays, S) {
    const files = [], warnings = [], exported = pays.map(p => p.invoice_id);
    if (!pays.length) return { files, warnings, exported, count: 0 };
    if (edition === 'online') {
      files.push({ name: 'QBO-payments-to-record.csv', text: csv([['Customer', 'Invoice No', 'Payment Date', 'Amount', 'Reference No', 'Deposit To'],
        ...pays.map(p => [p.customer, p.invoice_no, mdy(p.paid_on), n2(p.amount), p.payment_ref || '', S.deposit_account])]) });
      warnings.push('QuickBooks Online has no import for payments. Record each one with + New › Receive payment (or match the deposits in Banking) — this list has everything you need.');
    } else {
      const rows = [['!TRNS', 'TRNSID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO'], ['!SPL', 'SPLID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO'], ['!ENDTRNS']];
      pays.forEach(p => {
        rows.push(['TRNS', '', 'PAYMENT', mdy(p.paid_on), S.deposit_account, p.customer, n2(p.amount), p.payment_ref || '', `Payment for invoice ${p.invoice_no}`]);
        rows.push(['SPL', '', 'PAYMENT', mdy(p.paid_on), S.ar_account, p.customer, n2(-p.amount), p.payment_ref || '', `Invoice ${p.invoice_no}`]);
        rows.push(['ENDTRNS']);
      });
      files.push({ name: 'QBD-payments.iif', text: iif(rows) });
      warnings.push('After importing, open Receive Payments for each customer and make sure every payment is applied to its invoice.');
    }
    return { files, warnings, exported, count: pays.length };
  }

  // lines = rows from qb_payroll (one journal per period_id)
  function payroll(edition, lines, S) {
    const byP = groupBy(lines.filter(l => +(l.debit || 0) || +(l.credit || 0)), 'period_id'), files = [], warnings = [], exported = [];
    const ids = Object.keys(byP).sort((a, b) => String(byP[a][0].ends_on).localeCompare(byP[b][0].ends_on));
    const bad = [];
    for (const id of ids) {
      const ls = byP[id], d = ls.reduce((a, l) => a + +(l.debit || 0), 0), c = ls.reduce((a, l) => a + +(l.credit || 0), 0);
      if (Math.abs(d - c) > 0.005) bad.push(ls[0].ends_on);
    }
    if (bad.length) warnings.push(`These periods don't balance and were left out — check them in RoadCoda: ${bad.join(', ')}.`);
    const good = ids.filter(id => !bad.includes(byP[id][0].ends_on));
    if (edition === 'online') {
      const rows = [];
      good.forEach(id => { const ls = byP[id], h = ls[0], no = `${h.kind === 'office' ? 'OFF' : 'PAY'}-${String(h.ends_on).replace(/-/g, '')}`;
        ls.forEach(l => rows.push([no, mdy(h.ends_on), l.account, l.debit ? n2(l.debit) : '', l.credit ? n2(l.credit) : '', l.memo || '', '', '', ''])); exported.push(id); });
      if (rows.length) files.push({ name: 'QBO-payroll-journal.csv', text: csv([['JournalNo', 'JournalDate', 'AccountName', 'Debits', 'Credits', 'Description', 'Name', 'Location', 'Class'], ...rows]) });
      if (rows.length > 1000) warnings.push('More than 1,000 journal lines — QuickBooks Online imports up to 1,000 rows a file; export a shorter date range.');
    } else {
      const rows = [['!TRNS', 'TRNSID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO'], ['!SPL', 'SPLID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO'], ['!ENDTRNS']];
      good.forEach(id => { const ls = byP[id], h = ls[0], no = `${h.kind === 'office' ? 'OFF' : 'PAY'}-${String(h.ends_on).replace(/-/g, '')}`;
        ls.forEach((l, i) => rows.push([i === 0 ? 'TRNS' : 'SPL', '', 'GENERAL JOURNAL', mdy(h.ends_on), l.account, '', n2(+(l.debit || 0) - +(l.credit || 0)), no, l.memo || '']));
        rows.push(['ENDTRNS']); exported.push(id); });
      if (exported.length) files.push({ name: 'QBD-payroll-journal.iif', text: iif(rows) });
    }
    if (exported.length) warnings.push('Wages before taxes. Employer taxes and withholding come from your payroll company — don\'t post the same payroll twice if it already sends a journal to QuickBooks.');
    return { files, warnings, exported, count: exported.length };
  }

  const api = { invoices, payments, payroll, mdy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RC_QB = api;
})(typeof window !== 'undefined' ? window : this);
