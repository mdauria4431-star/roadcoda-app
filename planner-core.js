// RoadCoda: route planning engine (#20). Pure functions — used by planner.html, and testable in Node.
//
// Distances are straight-line × a road factor, at an average truck speed (carrier settings), plus
// time at each stop. That's the usual way small fleets plan; once a plan is applied, each load's
// real road miles come from the normal "Recalculate miles & price".
//
// Times are minutes after midnight on the planning day.
//   point:   { lat, lng }
//   stop:    { id, lat, lng, ws, we (window start / end, minutes; null = any time), service (minutes),
//              demand: { pallets, weight, cube, pieces } }
//   vehicle: { id, cap: { pallets, weight, cube, pieces } (null / 0 = no limit), start (minutes),
//              maxDrive (minutes, e.g. 660 = 11 h), maxDuty (minutes, e.g. 840 = 14 h) }
//   params:  { mph, roadFactor, returnToStart }
(function (root) {
  const DIMS = ['pallets', 'weight', 'cube', 'pieces'];
  const R = 3958.8;                                  // earth radius, miles
  function crowMiles(a, b) {
    const rad = (x) => x * Math.PI / 180, dLa = rad(b.lat - a.lat), dLo = rad(b.lng - a.lng);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function makeCtx(depot, stops, params) {
    const p = Object.assign({ mph: 45, roadFactor: 1.25, returnToStart: true }, params || {});
    const pts = [depot, ...stops];                  // index 0 = depot, i+1 = stops[i]
    const n = pts.length, mi = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) mi[i * n + j] = i === j ? 0 : crowMiles(pts[i], pts[j]) * p.roadFactor;
    return { p, n, mi, stops, miles: (i, j) => mi[i * n + j], mins: (i, j) => mi[i * n + j] / p.mph * 60 };
  }

  // Walk a route (array of stop indexes into ctx.stops). hard = windows must hold.
  function evalRoute(ctx, route, v, hard) {
    let t = v.start || 0, drive = 0, miles = 0, prev = 0, late = [];
    const load = { pallets: 0, weight: 0, cube: 0, pieces: 0 };
    for (const si of route) {
      const s = ctx.stops[si], node = si + 1;
      const leg = ctx.mins(prev, node);
      t += leg; drive += leg; miles += ctx.miles(prev, node);
      if (s.ws != null && t < s.ws) t = s.ws;                         // early: wait for the window
      if (s.we != null && t > s.we) { if (hard) return null; late.push({ id: s.id, minutes: Math.round(t - s.we) }); }
      t += s.service || 0;
      for (const d of DIMS) load[d] += (s.demand && s.demand[d]) || 0;
      prev = node;
    }
    if (ctx.p.returnToStart && route.length) { const leg = ctx.mins(prev, 0); t += leg; drive += leg; miles += ctx.miles(prev, 0); }
    for (const d of DIMS) { const c = v.cap && v.cap[d]; if (c && load[d] > c + 1e-9) return null; }
    if (v.maxDrive && drive > v.maxDrive + 1e-9) return null;
    if (v.maxDuty && t - (v.start || 0) > v.maxDuty + 1e-9) return null;
    return { miles, drive, duty: t - (v.start || 0), end: t, load, late };
  }
  const cost = (e) => e.miles + e.late.reduce((a, x) => a + x.minutes, 0) * 5;   // lateness weighs heavily (reorder only)

  // 2-opt within a route, then relocate between routes, until nothing improves
  function improve(ctx, routes, vehicles, hard) {
    let better = true, guard = 0;
    const ev = (r, k) => evalRoute(ctx, r, vehicles[k], hard);
    while (better && guard++ < 50) {
      better = false;
      for (let k = 0; k < routes.length; k++) {
        const r = routes[k]; let base = ev(r, k);
        for (let i = 0; i < r.length - 1; i++) for (let j = i + 1; j < r.length; j++) {
          const cand = r.slice(0, i).concat(r.slice(i, j + 1).reverse(), r.slice(j + 1));
          const e = ev(cand, k);
          if (e && base && cost(e) < cost(base) - 1e-6) { r.splice(0, r.length, ...cand); base = e; better = true; }
        }
      }
      for (let a = 0; a < routes.length; a++) for (let i = 0; i < routes[a].length; i++) {
        const si = routes[a][i], fromWithout = routes[a].filter((_, x) => x !== i);
        const eA0 = ev(routes[a], a), eA1 = ev(fromWithout, a); if (!eA0 || !eA1) continue;
        let best = null;
        for (let b = 0; b < routes.length; b++) {
          const target = b === a ? fromWithout : routes[b];
          const eB0 = b === a ? eA1 : ev(routes[b], b); if (!eB0) continue;
          for (let pos = 0; pos <= target.length; pos++) {
            const cand = target.slice(0, pos).concat([si], target.slice(pos));
            const e = ev(cand, b); if (!e) continue;
            const delta = b === a ? cost(e) - cost(eA0) : cost(e) - cost(eB0) + cost(eA1) - cost(eA0);
            if (delta < -1e-6 && (!best || delta < best.delta)) best = { b, cand, delta };
          }
        }
        if (best) { if (best.b === a) routes[a] = best.cand; else { routes[a] = fromWithout; routes[best.b] = best.cand; } better = true; break; }
      }
    }
    return routes;
  }

  function summarize(ctx, routes, vehicles, unassigned) {
    return {
      routes: routes.map((r, k) => { const e = evalRoute(ctx, r, vehicles[k], false);
        return { vehicle: vehicles[k].id, stops: r.map(i => ctx.stops[i].id), miles: e ? e.miles : 0, drive: e ? e.drive : 0, duty: e ? e.duty : 0, end: e ? e.end : null,
                 load: e ? e.load : null, cap: vehicles[k].cap || {}, late: e ? e.late : [] }; }),
      unassigned,
      miles: routes.reduce((a, r, k) => { const e = evalRoute(ctx, r, vehicles[k], false); return a + (e ? e.miles : 0); }, 0),
    };
  }

  // Plan the day: which stop on which truck, in what order. Windows, capacity and hours are hard limits;
  // a stop that fits nowhere comes back in `unassigned` with the reason.
  function plan(depot, stops, vehicles, params) {
    const ctx = makeCtx(depot, stops, params);
    const routes = vehicles.map(() => []), unassigned = [];
    const order = stops.map((s, i) => i).sort((a, b) =>
      ((stops[a].we ?? 1e9) - (stops[b].we ?? 1e9)) || (ctx.miles(0, b + 1) - ctx.miles(0, a + 1)));
    for (const si of order) {
      let best = null;
      for (let k = 0; k < vehicles.length; k++) {
        const base = evalRoute(ctx, routes[k], vehicles[k], true); if (!base) continue;
        for (let pos = 0; pos <= routes[k].length; pos++) {
          const cand = routes[k].slice(0, pos).concat([si], routes[k].slice(pos));
          const e = evalRoute(ctx, cand, vehicles[k], true); if (!e) continue;
          const add = e.miles - base.miles + (routes[k].length ? 0 : 5);   // small nudge against opening a truck for one stop
          if (!best || add < best.add) best = { k, cand, add };
        }
      }
      if (best) routes[best.k] = best.cand;
      else unassigned.push({ id: stops[si].id, why: whyNot(ctx, si, vehicles) });
    }
    improve(ctx, routes, vehicles, true);
    return summarize(ctx, routes, vehicles, unassigned);
  }
  function whyNot(ctx, si, vehicles) {
    const s = ctx.stops[si];
    const tooBig = vehicles.every(v => DIMS.some(d => v.cap && v.cap[d] && ((s.demand && s.demand[d]) || 0) > v.cap[d]));
    if (tooBig) return 'bigger than any truck';
    const alone = vehicles.some(v => evalRoute(ctx, [si], v, true));
    if (!alone) return s.we != null ? 'delivery window can\'t be reached' : 'too far for the driver\'s hours';
    return 'no room left on any truck';
  }

  // Re-order one load: every stop stays; windows are soft (late stops are reported, not dropped)
  function reorder(depot, stops, vehicle, params) {
    const ctx = makeCtx(depot, stops, params);
    const v = Object.assign({}, vehicle, { cap: null, maxDrive: null, maxDuty: null });   // same freight, same truck
    let route = [];
    const order = stops.map((s, i) => i).sort((a, b) => ((stops[a].we ?? 1e9) - (stops[b].we ?? 1e9)));
    for (const si of order) {
      let best = null;
      for (let pos = 0; pos <= route.length; pos++) {
        const cand = route.slice(0, pos).concat([si], route.slice(pos)), e = evalRoute(ctx, cand, v, false);
        if (!best || cost(e) < best.c) best = { cand, c: cost(e) };
      }
      route = best.cand;
    }
    const routes = improve(ctx, [route], [v], false);
    const out = summarize(ctx, routes, [v], []), r = out.routes[0];
    const cur = evalRoute(ctx, stops.map((_, i) => i), v, false);
    const lim = vehicle;
    return { order: r.stops, miles: r.miles, drive: r.drive, duty: r.duty, late: r.late, before: { miles: cur.miles, drive: cur.drive, duty: cur.duty, late: cur.late },
             overHours: (lim.maxDrive && r.drive > lim.maxDrive) || (lim.maxDuty && r.duty > lim.maxDuty) };
  }

  const api = { plan, reorder, crowMiles, DIMS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RC_PLANNER = api;
})(typeof window !== 'undefined' ? window : this);
