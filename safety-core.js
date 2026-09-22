// RoadCoda safety dashboard: the counting. No page code here, so it can be tested on its own.
// Input is what safety_data(from, to) returns: incidents (one row each) and miles by
// month / driver / truck / terminal / customer. Months are 'YYYY-MM'; a range is whole months.
(function (root) {
  const DIMS = {
    driver: { label: 'Driver', miles: true }, truck: { label: 'Truck', miles: true }, trailer: { label: 'Trailer', miles: false },
    terminal: { label: 'Terminal', miles: true }, customer: { label: 'Customer', miles: true }, location: { label: 'Delivery location', miles: false },
    kind: { label: 'What happened', miles: false }, hour: { label: 'Hour of day', miles: false }, dow: { label: 'Day of week', miles: false },
  };
  const KIND = { collision: 'Collision', injury: 'Injury', cargo: 'Cargo damage', property: 'Property damage', other: 'Other' };
  const DOW = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const month = (at) => String(at).slice(0, 7);
  const NONE = '__none__';                                  // filter value for "no driver / not at a location…"
  const set = (v) => v != null && v !== '';
  const hit = (want, have) => (want === NONE ? have == null : have === want);

  // Months from a to b inclusive ('YYYY-MM')
  function months(a, b) {
    const out = []; let [y, m] = a.split('-').map(Number); const [by, bm] = b.split('-').map(Number);
    while (y < by || (y === by && m <= bm)) { out.push(`${y}-${String(m).padStart(2, '0')}`); if (++m > 12) { m = 1; y++; } }
    return out;
  }
  function shift(ym, n) { let [y, m] = ym.split('-').map(Number); m += n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}-${String(m).padStart(2, '0')}`; }

  // f = { from, to (months), kinds: [..], driver, truck, trailer, terminal, customer, location, kind, hour, dow,
  //       prev: 'preventable'|'non_preventable'|'undecided', dot, hurt, osha, status: 'open' }
  function keep(i, f) {
    const mo = month(i.at);
    if (f.from && mo < f.from) return false;
    if (f.to && mo > f.to) return false;
    if (f.kinds && f.kinds.length && !f.kinds.includes(i.kind)) return false;
    for (const d of ['driver', 'truck', 'trailer', 'terminal', 'customer', 'location', 'kind']) if (set(f[d]) && !hit(f[d], i[d])) return false;
    if (f.hour != null && f.hour !== '' && i.hour !== +f.hour) return false;
    if (f.dow != null && f.dow !== '' && i.dow !== +f.dow) return false;
    if (f.prev === 'undecided' ? (i.preventable === 'preventable' || i.preventable === 'non_preventable') : f.prev && i.preventable !== f.prev) return false;
    if (f.dot && !i.dot) return false;
    if (f.hurt && !i.hurt) return false;
    if (f.osha && !i.osha) return false;
    if (f.status === 'open' && i.status === 'closed') return false;
    return true;
  }
  const filter = (list, f) => list.filter((i) => keep(i, f));

  // Miles that match the filter. null when a filter has no miles behind it (a location, a trailer,
  // an hour…): a rate would be meaningless there.
  function milesFor(rows, f) {
    for (const d of ['trailer', 'location', 'kind', 'hour', 'dow']) if (set(f[d])) return null;
    let s = 0;
    for (const r of rows) {
      if (f.from && r.m < f.from) continue;
      if (f.to && r.m > f.to) continue;
      if (['driver', 'truck', 'terminal', 'customer'].some((d) => set(f[d]) && !hit(f[d], r[d]))) continue;
      s += +r.miles || 0;
    }
    return s;
  }
  const perMM = (n, mi) => (mi ? Math.round((n / mi) * 1e6 * 100) / 100 : null);

  function kpis(list, miles) {
    const k = { incidents: list.length, collisions: 0, injuries: 0, preventable: 0, nonPreventable: 0, undecided: 0, dot: 0, tests: 0,
      osha: 0, dart: 0, daysAway: 0, daysRestricted: 0, fatalities: 0, open: 0, late: 0, oshaCalls: 0, cost: null, delaySum: 0, delayN: 0 };
    for (const i of list) {
      if (i.kind === 'collision') k.collisions++;
      if (i.hurt) k.injuries++;
      if (i.preventable === 'preventable') k.preventable++; else if (i.preventable === 'non_preventable') k.nonPreventable++; else k.undecided++;
      if (i.dot) k.dot++;
      if (i.test) k.tests++;
      if (i.fatality) k.fatalities++;
      k.osha += +i.osha || 0; k.dart += +i.dart || 0; k.daysAway += +i.days_away || 0; k.daysRestricted += +i.days_restricted || 0;
      if (i.status !== 'closed') k.open++;
      if (i.osha_call) k.oshaCalls++;
      if (i.delay_h != null) { k.delaySum += +i.delay_h; k.delayN++; if (+i.delay_h > 24) k.late++; }
      if (i.cost != null) k.cost = (k.cost || 0) + +i.cost;
    }
    const decided = k.preventable + k.nonPreventable;
    k.preventableRate = decided ? Math.round((k.preventable / decided) * 1000) / 10 : null;   // % of the ones decided
    k.avgDelayH = k.delayN ? Math.round((k.delaySum / k.delayN) * 10) / 10 : null;
    k.miles = miles;
    k.perMM = { incidents: perMM(k.incidents, miles), preventable: perMM(k.preventable, miles), dot: perMM(k.dot, miles) };
    delete k.delaySum; delete k.delayN;
    return k;
  }

  function byMonth(list, rows, f) {
    return months(f.from, f.to).map((m) => {
      const g = list.filter((i) => month(i.at) === m);
      const mi = milesFor(rows, { ...f, from: m, to: m });
      return { m, collision: g.filter((i) => i.kind === 'collision').length, injury: g.filter((i) => i.kind === 'injury').length,
        other: g.filter((i) => i.kind !== 'collision' && i.kind !== 'injury').length,
        preventable: g.filter((i) => i.preventable === 'preventable').length, dot: g.filter((i) => i.dot).length,
        total: g.length, miles: mi, rate: perMM(g.length, mi) };
    });
  }

  function label(dim, key, names) {
    if (key == null || key === '') return dim === 'location' ? 'Not at a customer location' : dim === 'terminal' ? 'No terminal' : '—';
    if (dim === 'kind') return KIND[key] || key;
    if (dim === 'hour') { const h = +key; return `${h % 12 || 12}${h < 12 ? ' am' : ' pm'}`; }
    if (dim === 'dow') return DOW[key];
    const n = names && names[dim === 'trailer' ? 'truck' : dim]; return (n && n[key]) || 'Unknown';
  }

  // One row per driver / truck / … : counts, and miles and a rate where miles exist.
  // Drivers, trucks, terminals and customers with miles but no incidents are listed too (a clean record counts).
  function breakdown(list, rows, f, dim, names) {
    const map = new Map();
    const row = (key) => { if (!map.has(key)) map.set(key, { key, label: label(dim, key, names), incidents: 0, preventable: 0, dot: 0, hurt: 0, osha: 0, miles: null, rate: null }); return map.get(key); };
    for (const i of list) {
      const r = row(i[dim] ?? null); r.incidents++;
      if (i.preventable === 'preventable') r.preventable++;
      if (i.dot) r.dot++; if (i.hurt) r.hurt++; r.osha += +i.osha || 0;
    }
    if (DIMS[dim] && DIMS[dim].miles && !['trailer', 'location', 'kind', 'hour', 'dow'].some((d) => set(f[d]))) {
      for (const m of rows) {
        if (f.from && m.m < f.from) continue; if (f.to && m.m > f.to) continue;
        if (['driver', 'truck', 'terminal', 'customer'].some((d) => set(f[d]) && !hit(f[d], m[d]))) continue;
        const r = row(m[dim] ?? null); r.miles = (r.miles || 0) + (+m.miles || 0);
      }
      for (const r of map.values()) r.rate = perMM(r.incidents, r.miles);
    }
    let out = [...map.values()];
    if (dim === 'hour') { for (let h = 0; h < 24; h++) row(h); out = [...map.values()].sort((a, b) => a.key - b.key); }
    else if (dim === 'dow') { for (let d = 1; d <= 7; d++) row(d); out = [...map.values()].sort((a, b) => a.key - b.key); }
    else out.sort((a, b) => b.incidents - a.incidents || (b.rate || 0) - (a.rate || 0) || String(a.label).localeCompare(String(b.label)));
    return out;
  }

  // Everything the page shows for a filter; prev = the same number of months just before
  function summarize(data, f) {
    const n = months(f.from, f.to).length;
    const pf = { ...f, from: shift(f.from, -n), to: shift(f.from, -1) };
    const cur = filter(data.incidents, f), prev = filter(data.incidents, pf);
    return { list: cur, kpis: kpis(cur, milesFor(data.miles, f)), prev: kpis(prev, milesFor(data.miles, pf)), prevRange: pf, months: byMonth(cur, data.miles, f) };
  }

  root.RC_SAFETY = { NONE, DIMS, KIND, months, shift, filter, milesFor, kpis, byMonth, breakdown, summarize, label, perMM };
})(typeof window !== 'undefined' ? window : globalThis);
