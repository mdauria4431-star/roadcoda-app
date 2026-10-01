// RoadCoda: reading a customer's delivery list (Excel, CSV, PDF) — which column is which.
// Used by Loads › Import delivery list and Route planner › Import.
//
// Customers' lists come out of their own systems with long headings ("Service Location - Address Line 1",
// "Stop - Open/Close Detail - Open Time", "Order Type Quantities - CASES"), so a heading can match
// anywhere, some headings are ruled out ("Address Line 2", "Departure Time"), and when several columns
// fit, the one with the most filled-in rows wins. A quantity column of all zeros is never picked.
(function () {
  // [key, fits, must not be]
  const RULES = [
    ['type', /(^|[-–] ?)(order|stop) ?type$|^type$|stop ?type|^p\/?u$|pu ?\/ ?del|pick ?up ?\/ ?del|^action$|^activity$/i, /unload|quantit|unit/i],
    ['code', /store ?(#|no\.?|num(ber)?)$|^code$|store ?code|site ?(#|no|id|code)|loc(ation)? ?(#|no|id|code)|location ?- ?id|^acct|account ?(#|no|num)|dest ?(#|no)|^#$|^store$|customer ?(#|no|id|code)|ship ?to ?(#|no|id|code)/i,
      /zip|postal|route|driver|equip|truck|order|outbound|sequence|phone/i],
    ['route', /route|^load ?(#|no|num|id)?$|trip|^run|truck ?(#|no)?$/i, /time|start|end|seq|driver|unload|type|mile/i],
    ['qty', /qty|quantit|pallets?|plts?|cases?|\bcs\b|pieces|pcs|units?$|count|cages?|totes?|boxes|weight|\blbs?\b|pounds/i, /unit ?type|uom|seq|sequence|time|#$|number/i],
    ['unit', /^unit$|unit ?(type|of measure)|uom|^units? ?of/i, null],
    ['zip', /zip|postal/i, null],
    ['state', /\bstate\b|^st$|\bprov/i, /statement/i],
    ['city', /city|town/i, null],
    ['address', /address ?(line)? ?1$|^address$|street|addr|full ?address|delivery ?address|address$/i, /line ?2|address ?2|e-?mail|city|state|zip/i],
    ['wend', /close ?time|window ?(close|end|to)|^close$|latest|time ?to|deliver ?by|receiving ?(close|end)|^to$|until|^end$|end ?time|closes/i, /departure|arrival|route|open ?time|driver|shift/i],
    ['wstart', /open ?time|window ?(open|start|from)|^open$|earliest|time ?from|delivery ?from|receiving ?(open|start|hours)|^from$|appt|appointment|^window$|delivery ?window|time ?window|^start$|start ?time|opens|^hours$/i,
      /departure|arrival|route|close ?time|driver|shift/i],
    ['name', /description|store ?name|consignee|ship ?to|deliver(y)? ?to|customer ?name|location ?name|account ?name|dest(ination)? ?name|stop ?name|^name$|^customer$|^location$|^store$|^site$|^account$/i,
      /\bid\b|#|no\.?$|number|code|zip|postal|driver|first|last|address|city|state/i],
  ];
  // what a quantity column counts, from its heading
  function unitOf(h) {
    h = String(h || '');
    if (/pallets?|plts?/i.test(h)) return 'pallets';
    if (/cases?|\bcs\b/i.test(h)) return 'cases';
    if (/boxes|\bbox\b|cartons?|ctns?/i.test(h)) return 'boxes';
    if (/cages?/i.test(h)) return 'cages';
    if (/totes?/i.test(h)) return 'totes';
    if (/weight|\blbs?\b|pounds/i.test(h)) return 'pounds';
    return null;
  }
  const RANK = { pallets: 0, cases: 1, boxes: 2, cages: 2, totes: 2, null: 3, pounds: 4 };
  const isNum = (v) => v !== '' && v != null && !isNaN(Number(String(v).replace(/[,\s]/g, '')));
  const KINDS = /^(p|d|o|pu|del|dl|pickup|pick ?up|delivery|drop|backhaul|bh|stop|deliver)$/i;

  // head: the heading row; rows: the rows under it. Returns { map: {key: column}, unit: guessed unit or null }
  function guess(head, rows) {
    head = head.map(h => String(h == null ? '' : h).trim());
    const filled = (i, nonzero) => rows.reduce((a, r) => { const v = String(r[i] ?? '').trim();
      return a + (v !== '' && (!nonzero || Number(v.replace(/[^\d.]/g, '')) > 0) ? 1 : 0); }, 0);
    const vals = (i) => rows.map(r => String(r[i] ?? '').trim()).filter(Boolean);
    const map = {}, used = new Set();
    for (const [key, re, not] of RULES) {
      let cand = head.map((h, i) => i).filter(i => head[i] && !used.has(i) && re.test(head[i]) && !(not && not.test(head[i])));
      if (key === 'type') cand = cand.filter(i => { const v = vals(i); return v.length && v.filter(x => KINDS.test(x)).length >= v.length * 0.8; });
      if (key === 'unit') cand = cand.filter(i => { const v = vals(i); return v.length && v.filter(isNum).length < v.length * 0.2; });
      if (key === 'qty') {
        cand = cand.filter(i => filled(i, true) > 0 && vals(i).filter(isNum).length >= vals(i).length * 0.8);
        cand.sort((x, y) => RANK[unitOf(head[x])] - RANK[unitOf(head[y])] || filled(y, true) - filled(x, true) || x - y);
      } else cand.sort((x, y) => filled(y) - filled(x) || x - y);
      if (cand.length) { map[key] = cand[0]; used.add(cand[0]); }
    }
    return { map, unit: map.qty != null ? unitOf(head[map.qty]) : null };
  }

  // A store on several rows of the same load (several orders) is one stop with all of it, when the
  // rows count the same thing. key(row) says which load a row goes on.
  function mergeRepeats(stops, key) {
    const seen = new Map(), out = [];
    for (const s of stops) {
      const k = [key ? key(s) : '', s.type, String(s.address || '').toUpperCase().replace(/\s+/g, ' '), String(s.name || s.code || '').toUpperCase(), s.unit].join('|');
      const m = s.address || s.name || s.code ? seen.get(k) : null;
      if (m) { m.qty = (Number(m.qty) || 0) + (Number(s.qty) || 0); m.orders = (m.orders || 1) + 1;
        if (!m.window_start) m.window_start = s.window_start; if (!m.window_end) m.window_end = s.window_end; continue; }
      seen.set(k, s); out.push(s);
    }
    return out;
  }

  // a unit written in a cell ("CS", "Plts", "lbs", "Cases") → one of the app's units, or null
  function unitCell(v, units) {
    const t = String(v || '').trim().toLowerCase(); if (!t) return null;
    const alias = { cs: 'cases', case: 'cases', ca: 'cases', plt: 'pallets', plts: 'pallets', pl: 'pallets', pal: 'pallets', lb: 'pounds', lbs: 'pounds', '#': 'pounds', bx: 'boxes', box: 'boxes', ctn: 'boxes', carton: 'boxes', cartons: 'boxes' };
    const u = alias[t] || units.find(x => t.startsWith(x.replace(/e?s$/, '')));
    return u && units.includes(u) ? u : null;
  }

  window.RC_LISTMATCH = { guess, unitOf, unitCell, mergeRepeats };
})();
