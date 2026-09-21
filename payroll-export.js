// RoadCoda: payroll company import files (#39).
// Builds the approved pay week as ADP Workforce Now, ADP RUN, Paylocity,
// Paychex Flex or Gusto's own import file, from the same pay lines the
// Payroll page shows. Layouts follow each provider's published import format.
// Used by payroll.html; also loads in Node for testing (module.exports).
(function (root) {
  const PROVIDERS = {
    quickbooks:   { name: 'QuickBooks Payroll', deductions: true },
    adp_wfn:      { name: 'ADP Workforce Now', deductions: true, needs: ['company_code'] },
    adp_run:      { name: 'ADP RUN', deductions: false, needs: ['company_code'] },
    paylocity:    { name: 'Paylocity', deductions: true },
    paychex_flex: { name: 'Paychex Flex', deductions: false, needs: ['client_id'] },
    gusto:        { name: 'Gusto', deductions: false, idOptional: true },
  };
  const NEED_LABEL = { company_code: 'the company code', client_id: 'the Paychex client ID' };

  const cell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = (rows) => rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
  const n2 = (x) => (Math.round((+x || 0) * 100) / 100).toFixed(2);
  const ymd = (s) => s.split('-').map(Number);
  const mdy = (s) => { const [y, m, d] = ymd(s); return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`; };
  const compact = (s, fmt) => { const [y, m, d] = ymd(s); const p = (x) => String(x).padStart(2, '0');
    return fmt === 'yymmdd' ? p(y % 100) + p(m) + p(d) : fmt === 'mmddyy' ? p(m) + p(d) + p(y % 100) : p(m) + p(d) + y; };
  const end = (s) => /[.!?]$/.test(s) ? s : s + '.';   // no double period after "Ana P."
  const addDays = (s, k) => { const [y, m, d] = ymd(s); const t = new Date(Date.UTC(y, m - 1, d + k)); return t.toISOString().slice(0, 10); };

  // The code a pay item goes under at this company, and whether it goes as hours
  function codeOf(type, provider) {
    const c = (type && type.payroll_codes && type.payroll_codes[provider]) || null;
    if (!c || !String(c.code || '').trim()) return null;
    return { code: String(c.code).trim(), hours: c.send === 'hours' && type.unit === 'hour' };
  }

  // Group the week's lines: one entry per driver per code (hours or dollars)
  function groups(provider, lines, types) {
    const out = new Map(), unmapped = new Map();
    for (const x of lines) {
      const t = types[x.activity_type_id] || null;
      const c = codeOf(t, provider);
      if (!c) { unmapped.set(x.activity_type_id || x.pay_type, x.pay_type); continue; }
      const k = [x.driver_id, x.is_deduction ? 'D' : 'E', c.code, c.hours ? 'h' : 'a'].join('|');
      if (!out.has(k)) out.set(k, { driver_id: x.driver_id, ded: !!x.is_deduction, code: c.code, asHours: c.hours, hours: 0, amount: 0, items: new Set() });
      const g = out.get(k);
      g.hours += +(x.qty || 0) * (t && t.unit === 'hour' ? 1 : 0);
      g.amount += x.is_deduction ? -(+x.amount || 0) : (+x.amount || 0);   // deductions go out as positive amounts
      g.items.add(x.pay_type);
    }
    return { list: [...out.values()], unmapped: [...unmapped.values()] };
  }

  // p = { provider, settings, lines, drivers: {id: {full_name, employee_no}}, types: {id: {name, unit, payroll_codes}}, from, approved }
  function build(p) {
    const P = PROVIDERS[p.provider]; if (!P || p.provider === 'quickbooks') throw new Error('Pick a payroll company');
    const S = p.settings || {}, to = addDays(p.from, 6), blockers = [], warnings = [];
    (P.needs || []).forEach(k => { if (!String(S[k] || '').trim()) blockers.push(`Enter ${NEED_LABEL[k]} under Payroll company settings.`); });
    const lines = (p.lines || []).filter(x => +x.amount !== 0 || +x.qty !== 0);
    const G = groups(p.provider, lines, p.types || {});
    if (G.unmapped.length) blockers.push(end(`Give these pay items their ${P.name} code: ${G.unmapped.sort().join(', ')}`));
    const id = (d) => String((p.drivers[d] || {}).employee_no || '').trim();
    const name = (d) => (p.drivers[d] || {}).full_name || 'Unknown driver';
    const noId = [...new Set(G.list.map(g => g.driver_id))].filter(d => !id(d)).map(name).sort();
    if (noId.length) (P.idOptional ? warnings : blockers).push(end(`${noId.length === 1 ? 'This driver has' : 'These drivers have'} no Employee # (their ${P.name} ID)${P.idOptional ? ' — Gusto will match them by name' : ''}: ${noId.join(', ')}`));
    if (!p.approved) warnings.push('This week is not approved yet — approve and lock it before importing, or the payroll company gets numbers that can still change.');
    const ded = G.list.filter(g => g.ded), earn = G.list.filter(g => !g.ded);
    if (ded.length && !P.deductions) warnings.push(`${P.name} doesn't take deductions in its import file — enter these in ${P.name} yourself: ` +
      ded.map(g => `${name(g.driver_id)} ${g.code} $${n2(g.amount)}`).join('; ') + '.');
    const order = (a, b) => name(a.driver_id).localeCompare(name(b.driver_id)) || (a.ded - b.ded) || a.code.localeCompare(b.code);
    let rows = [], fileName = '', text = '';

    if (p.provider === 'adp_wfn') {
      const co = String(S.company_code || '').trim().toUpperCase(), batch = String(S.batch_id || '').trim() || compact(to, 'yymmdd');
      rows = [['Co Code', 'Batch ID', 'File #', 'Reg Hours', 'O/T Hours', 'Hours 3 Code', 'Hours 3 Amount', 'Earnings 3 Code', 'Earnings 3 Amount', 'Adjust Ded Code', 'Adjust Ded Amount']];
      G.list.slice().sort(order).forEach(g => {
        const r = [co, batch, id(g.driver_id), '', '', '', '', '', '', '', ''];
        if (g.ded) { r[9] = g.code; r[10] = n2(g.amount); }
        else if (g.asHours && /^REG$/i.test(g.code)) r[3] = n2(g.hours);
        else if (g.asHours && /^(OT|O\/T)$/i.test(g.code)) r[4] = n2(g.hours);
        else if (g.asHours) { r[5] = g.code; r[6] = n2(g.hours); }
        else { r[7] = g.code; r[8] = n2(g.amount); }
        rows.push(r);
      });
      fileName = `PR${(co + '___').slice(0, Math.max(3, co.length))}EPI.csv`;
      text = csv(rows);
    } else if (p.provider === 'adp_run') {
      const co = String(S.company_code || '').trim(), freq = S.pay_frequency || 'W', rate = String(S.rate_code || '').trim() || 'BASE';
      const title = ['IID', 'Pay Frequency', 'Pay Period Start', 'Pay Period End', S.run_identifier === 'time_clock_id' ? 'Employee Time Clock ID' : 'Employee ID',
                     'Earnings Code', 'Pay Hours', 'Dollars', 'Separate Check', 'Worked In Dept', 'Rate Code'];
      rows = [title];
      earn.slice().sort(order).forEach(g => rows.push([co, freq, mdy(p.from), mdy(to), id(g.driver_id), g.code,
        g.asHours ? n2(g.hours) : '', g.asHours ? '' : n2(g.amount), '0', '', rate]));
      fileName = `${{ W: 'Weekly', B: 'Biweekly', S: 'Semimonthly', M: 'Monthly' }[freq]}-${compact(p.from)}-${compact(to)}.csv`;
      text = '##GENERIC## V1.0\r\n' + csv(rows);
      rows = [['##GENERIC## V1.0'], ...rows];
    } else if (p.provider === 'paylocity') {
      const rc = String(S.rate_code || '').trim();
      G.list.slice().sort(order).forEach(g => rows.push([id(g.driver_id), g.ded ? 'D' : 'E', g.code,
        g.asHours ? n2(g.hours) : '', g.asHours ? '' : n2(g.amount), '', g.ded ? '' : rc]));
      fileName = `PL${compact(to, 'mmddyy')}.csv`;          // Paylocity likes short file names
      text = csv(rows);                                      // no header row
    } else if (p.provider === 'paychex_flex') {
      const cl = String(S.client_id || '').trim();
      rows = [['Client ID', 'Worker ID', 'Org', 'Job Number', 'Pay Component', 'Rate', 'Rate Number', 'Hours', 'Units', 'Line Date', 'Amount',
               'Check Seq Number', 'Override State', 'Override Local', 'Override Local Jurisdiction', 'Labor Assignment']];
      earn.slice().sort(order).forEach(g => rows.push([cl, id(g.driver_id), '', '', g.code, '', '', g.asHours ? n2(g.hours) : '', '', mdy(to),
        g.asHours ? '' : n2(g.amount), '', '', '', '', '']));
      fileName = `paychex-${to}.csv`;
      text = csv(rows);
    } else if (p.provider === 'gusto') {
      const cols = [...new Set(earn.map(g => g.code))].sort();
      rows = [['Employee ID', 'Last name', 'First name', ...cols]];
      [...new Set(earn.map(g => g.driver_id))].sort((a, b) => name(a).localeCompare(name(b))).forEach(d => {
        const parts = name(d).trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : '', first = parts.join(' ');
        rows.push([id(d), last, first, ...cols.map(c => { const g = earn.find(x => x.driver_id === d && x.code === c); return g ? (g.asHours ? n2(g.hours) : n2(g.amount)) : ''; })]);
      });
      fileName = `gusto-payroll-${to}.csv`;
      text = csv(rows);
    }
    const totals = { earnings: earn.reduce((a, g) => a + (g.asHours ? 0 : g.amount), 0), hours: earn.reduce((a, g) => a + (g.asHours ? g.hours : 0), 0),
                     deductions: ded.reduce((a, g) => a + g.amount, 0), drivers: new Set(G.list.map(g => g.driver_id)).size };
    return { provider: P.name, fileName, text, rows, blockers, warnings, totals };
  }

  const api = { PROVIDERS, build, codeOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RC_PAYROLL_EXPORT = api;
})(typeof window !== 'undefined' ? window : this);
