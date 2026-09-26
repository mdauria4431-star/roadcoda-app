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
//   vehicle: { id, cap: { pallets, weight, cube, pieces } (null / 0 = no limit), start (minutes, earliest it can leave),
//              latestEnd (minutes, must be back by — another load; null = no limit),
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

  // Miles and minutes between every two points. params.leg(a, b) can give a real value (Google's
  // drive time, already adjusted for a truck); otherwise straight-line × road factor, at the local
  // speed for short legs (under localMiles) and the average speed for longer ones.
  function makeCtx(depot, stops, params) {
    const p = Object.assign({ mph: 45, roadFactor: 1.25, returnToStart: true, localMph: null, localMiles: 0 }, params || {});
    COST_MPH = Number(p.mph) || 45;
    const pts = [depot, ...stops];                  // index 0 = depot, i+1 = stops[i]
    const n = pts.length, mi = new Float64Array(n * n), mt = new Float64Array(n * n);
    let real = 0, legs = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue;
      legs++;
      const g = p.leg ? p.leg(pts[i], pts[j]) : null;
      if (g) { mi[i * n + j] = g.miles; mt[i * n + j] = g.minutes; real++; continue; }
      const m = crowMiles(pts[i], pts[j]) * p.roadFactor, local = p.localMph && m < p.localMiles;
      mi[i * n + j] = m; mt[i * n + j] = m / (local ? p.localMph : p.mph) * 60;
    }
    return { p, n, mi, mt, stops, real, legs, miles: (i, j) => mi[i * n + j], mins: (i, j) => mt[i * n + j] };
  }

  // Walk a route (array of stop indexes into ctx.stops). hard = windows must hold.
  // A truck that would reach its first stop before the window opens leaves later instead of waiting
  // there (start = when it actually leaves). Waiting at later stops is counted in `wait`.
  // Several runs a day (vehicle.runs > 1): a route holds DC markers (RELOAD = -1). At one that has stops
  // before and after it the truck drives back to the DC, drops its trailer and hooks the next, loaded
  // one (v.reload minutes), and the load starts again from zero on that trailer (v.cap2). The same driver
  // does every run, so drive and on-duty limits count the whole day; hours and windows decide how many
  // runs are used. A marker first, last, or right after another does nothing.
  const RELOAD = -1;
  const realCount = (r) => r.reduce((a, i) => a + (i >= 0 ? 1 : 0), 0);
  const seed = (v) => Array(Math.max(0, Math.min(8, (v && v.runs) || 1) - 1)).fill(RELOAD);
  const realOnly = (r) => r.filter(i => i >= 0);
  function evalRoute(ctx, route, v, hard) {
    let start = v.start || 0, t = start, drive = 0, miles = 0, prev = 0, wait = 0, late = [], times = [], first = true;
    const loads = [{ pallets: 0, weight: 0, cube: 0, pieces: 0 }]; let seg = 0, since = 0; const reloads = [];
    const lastReal = (() => { for (let k = route.length - 1; k >= 0; k--) if (route[k] >= 0) return k; return -1; })();
    for (let k = 0; k < route.length; k++) {
      const si = route[k];
      if (si === RELOAD) {
        if (first || k > lastReal || since === 0) { times.push({ reload: true, skip: true }); continue; }   // nothing to reload for
        const leg = ctx.mins(prev, 0); t += leg; drive += leg; miles += ctx.miles(prev, 0);
        const at = t; t += (v.reload != null ? v.reload : 30);
        reloads.push({ arrive: at, leave: t }); times.push({ reload: true, arrive: at, start: t });
        seg++; since = 0; loads.push({ pallets: 0, weight: 0, cube: 0, pieces: 0 }); prev = 0; continue;
      }
      const s = ctx.stops[si], node = si + 1;
      const leg = ctx.mins(prev, node);
      t += leg; drive += leg; miles += ctx.miles(prev, node);
      if (first && s.ws != null && t < s.ws) { start += s.ws - t; t = s.ws; }   // leave later, don't wait
      first = false;
      const arrive = t;
      if (s.ws != null && t < s.ws) { wait += s.ws - t; t = s.ws; }             // early: wait for the window
      // safety margin: arrive at least `buffer` minutes before the window closes (a stop that can't be
      // reached with it at all is placed without it, marked noBuffer, and shown as tight)
      const buf = s.noBuffer ? 0 : (ctx.p.buffer || 0);
      const tight = s.we != null && t > s.we - (ctx.p.buffer || 0) && t <= s.we;
      times.push({ arrive, start: t, tight, spare: s.we != null ? s.we - t : null, run: seg });
      if (s.we != null && t > s.we - buf) {
        if (hard) return null;
        if (t > s.we) late.push({ id: s.id, minutes: Math.round(t - s.we) });
      }
      t += s.service || 0;
      for (const d of DIMS) loads[seg][d] += (s.demand && s.demand[d]) || 0;
      prev = node; since++;
    }
    if (ctx.p.returnToStart && lastReal >= 0) { const leg = ctx.mins(prev, 0); t += leg; drive += leg; miles += ctx.miles(prev, 0); }
    for (let g = 0; g < loads.length; g++) { const cap = g === 0 ? v.cap : ((v.caps && v.caps[g]) || v.cap2 || v.cap);
      for (const d of DIMS) { const c = cap && cap[d]; if (c && loads[g][d] > c + 1e-9) return null; } }
    if (v.maxDrive && drive > v.maxDrive + 1e-9) return null;
    if (v.maxDuty && t - start > v.maxDuty + 1e-9) return null;
    if (v.latestEnd != null && lastReal >= 0 && t > v.latestEnd + 1e-9) return null;   // must be back for its next load
    return { miles, drive, wait, start, duty: t - start, end: t, load: loads[0], loads, late, times, reloads, reload: reloads[0] || null };
  }
  // Leave as late as possible without making any stop late: waits later in the day shrink too.
  function settle(ctx, route, v) {
    const e0 = evalRoute(ctx, route, v, false); if (!e0 || !route.length || !e0.wait) return e0;
    const ok = (d) => { const e = evalRoute(ctx, route, Object.assign({}, v, { start: e0.start + d }), false); return e && e.late.length <= e0.late.length ? e : null; };
    let lo = 0, hi = e0.wait, best = e0;
    for (let i = 0; i < 14 && hi - lo > 0.5; i++) { const mid = (lo + hi) / 2, e = ok(mid); if (e) { lo = mid; best = e; } else hi = mid; }
    return best;
  }
  // What a route costs: its miles, plus waiting time counted like driving time (a minute waiting
  // = the miles a truck covers in a minute), plus lateness weighed heavily (re-order only)
  let COST_MPH = 45;
  // Each trip back to the DC for another trailer also counts its drop-and-hook time and a fixed 30 miles
  // (another trailer to load), so the truck reloads when capacity, windows or truck count need it,
  // not to fill time it would otherwise wait.
  const cost = (e) => e.miles + (e.wait || 0) * COST_MPH / 60 + e.late.reduce((a, x) => a + x.minutes, 0) * 5
    + (e.reloads || []).reduce((a, r) => a + (r.leave - r.arrive) * COST_MPH / 60 + 30, 0);

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
      // DC trips: move each marker to where it costs least (to the end = not used)
      for (let k = 0; k < routes.length; k++) {
        const r = routes[k]; if (!r.includes(RELOAD)) continue;
        for (let i = 0; i < r.length; i++) {
          if (r[i] !== RELOAD) continue;
          const base = ev(r, k); if (!base) continue;
          const w = r.filter((_, x) => x !== i); let best = null;
          for (let pos = 0; pos <= w.length; pos++) {
            const cand = w.slice(0, pos).concat([RELOAD], w.slice(pos)), e = ev(cand, k);
            if (e && cost(e) < cost(base) - 1e-6 && (!best || cost(e) < best.c)) best = { cand, c: cost(e) };
          }
          if (best) { r.splice(0, r.length, ...best.cand); better = true; }
        }
      }
      for (let a = 0; a < routes.length; a++) for (let i = 0; i < routes[a].length; i++) {
        const si = routes[a][i]; if (si === RELOAD) continue;
        const fromWithout = routes[a].filter((_, x) => x !== i);
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
      routes: routes.map((r, k) => { const e = settle(ctx, r, vehicles[k]);
        // runs: the stops before and after a working DC marker (one run when there's none)
        const runs = [[]], rt = [[]]; (e ? e.times : r.map(() => ({}))).forEach((tm, x) => {
          if (r[x] === RELOAD) { if (tm && !tm.skip && tm.arrive != null) { runs.push([]); rt.push([]); } return; }
          runs[runs.length - 1].push(ctx.stops[r[x]].id); rt[rt.length - 1].push(tm); });
        return { vehicle: vehicles[k].id, _seq: r.slice(), stops: r.filter(i => i >= 0).map(i => ctx.stops[i].id), runs, runTimes: rt, reloads: e ? e.reloads : [],
                 miles: e ? e.miles : 0, drive: e ? e.drive : 0, duty: e ? e.duty : 0, end: e ? e.end : null,
                 start: e ? e.start : null, wait: e ? e.wait : 0, loads: e ? e.loads : [], cap2: vehicles[k].cap2 || vehicles[k].cap || {},
                 load: e ? e.load : null, cap: vehicles[k].cap || {}, late: e ? e.late : [], times: e ? e.times.filter(t => !t.reload) : [] }; }),
      unassigned, realLegs: ctx.real, legs: ctx.legs,
      miles: routes.reduce((a, r, k) => { const e = evalRoute(ctx, r, vehicles[k], false); return a + (e ? e.miles : 0); }, 0),
    };
  }

  // Plan the day: which stop on which truck, in what order. Windows, capacity and hours are hard limits;
  // a stop that fits nowhere comes back in `unassigned` with the reason.
  // params.goal: 'miles' (default) = fewest total miles; 'trucks' = as few trucks as the windows,
  // capacity and hours allow, then the fewest miles for those trucks. Windows are never broken either way.
  function plan(depot, stops, vehicles, params) {
    if (params && params.goal === 'trucks') return planFewestTrucks(depot, stops, vehicles, params);
    return planMiles(depot, stops, vehicles, params);
  }
  function planMiles(depot, stops, vehicles, params) {
    const ctx = makeCtx(depot, stops, params);
    const routes = vehicles.map(seed), unassigned = [];
    const order = stops.map((s, i) => i).sort((a, b) =>
      ((stops[a].we ?? 1e9) - (stops[b].we ?? 1e9)) || (ctx.miles(0, b + 1) - ctx.miles(0, a + 1)));
    for (const si of order) {
      let best = null;
      for (let k = 0; k < vehicles.length; k++) {
        const base = evalRoute(ctx, routes[k], vehicles[k], true); if (!base) continue;
        for (let pos = 0; pos <= routes[k].length; pos++) {
          const cand = routes[k].slice(0, pos).concat([si], routes[k].slice(pos));
          const e = evalRoute(ctx, cand, vehicles[k], true); if (!e) continue;
          const add = cost(e) - cost(base) + (realCount(routes[k]) ? 0 : 5);   // small nudge against opening a truck for one stop
          if (!best || add < best.add) best = { k, cand, add };
        }
      }
      if (best) routes[best.k] = best.cand;
      else unassigned.push({ id: stops[si].id, why: whyNot(ctx, si, vehicles) });
    }
    improve(ctx, routes, vehicles, true);
    placeTight(ctx, routes, vehicles, unassigned);
    return summarize(ctx, routes, vehicles, unassigned);
  }
  // A stop that fits nowhere with the safety margin: try it without (it'll show as tight)
  function placeTight(ctx, routes, vehicles, unassigned) {
    if (!(ctx.p.buffer > 0) || !unassigned.length) return;
    for (let u = unassigned.length - 1; u >= 0; u--) {
      const si = ctx.stops.findIndex(x => x.id === unassigned[u].id); if (si < 0) continue;
      ctx.stops[si].noBuffer = true;
      const b = bestInsert(ctx, routes, vehicles, si, -1);
      if (b) { routes[b.k] = b.cand; unassigned.splice(u, 1); } else ctx.stops[si].noBuffer = false;
    }
  }
  // ── Fewest trucks ──────────────────────────────────────────────────
  // Cheapest place for stop si across the given routes (hard limits); null if it fits nowhere.
  function bestInsert(ctx, routes, vehicles, si, skip) {
    let best = null;
    for (let k = 0; k < routes.length; k++) {
      if (k === skip) continue;
      const base = evalRoute(ctx, routes[k], vehicles[k], true); if (!base) continue;
      for (let pos = 0; pos <= routes[k].length; pos++) {
        const cand = routes[k].slice(0, pos).concat([si], routes[k].slice(pos));
        const e = evalRoute(ctx, cand, vehicles[k], true); if (!e) continue;
        const add = cost(e) - cost(base);
        if (!best || add < best.add) best = { k, cand, add };
      }
    }
    return best;
  }
  const capSize = (v) => (v.cap && (v.cap.pallets || v.cap.cube || v.cap.weight || v.cap.pieces)) || 1e9;
  const byWindow = (ctx) => (a, b) => ((ctx.stops[a].we ?? 1e9) - (ctx.stops[b].we ?? 1e9)) || (ctx.miles(0, b + 1) - ctx.miles(0, a + 1));
  // Empty whole trucks: take the lightest used truck and try to fit every one of its stops on the
  // others (still on time, still within capacity and hours). Keep going while a truck can be emptied.
  function eliminate(ctx, routes, vehicles) {
    for (let guard = 0; guard < vehicles.length; guard++) {
      const used = routes.map((r, k) => k).filter(k => realCount(routes[k]));
      if (used.length <= 1) break;
      used.sort((a, b) => realCount(routes[a]) - realCount(routes[b]) || capSize(vehicles[a]) - capSize(vehicles[b]));
      let done = false;
      for (const k of used) {
        const trial = routes.map(r => r.slice()); trial[k] = seed(vehicles[k]);
        const others = trial.map((r, j) => (j === k || !realCount(r)) ? null : j).filter(j => j !== null);
        let ok = true;
        for (const si of realOnly(routes[k]).sort(byWindow(ctx))) {
          const sub = others.map(j => trial[j]), vs = others.map(j => vehicles[j]);
          const b = bestInsert(ctx, sub, vs, si, -1);
          if (!b) { ok = false; break; }
          trial[others[b.k]] = b.cand;
        }
        if (ok) { routes.splice(0, routes.length, ...trial); done = true; break; }
      }
      if (!done) break;
    }
    return routes;
  }
  // Shorten the miles without re-opening an emptied truck: improve only the trucks in use.
  function improveUsed(ctx, routes, vehicles) {
    const used = routes.map((r, k) => k).filter(k => realCount(routes[k]));
    const sub = improve(ctx, used.map(k => routes[k]), used.map(k => vehicles[k]), true);
    used.forEach((k, i) => { routes[k] = sub[i]; });
    return routes;
  }
  // Fill one truck at a time (biggest first): each stop goes on the truck already being filled if it
  // fits on time, and a new truck is started only when it doesn't.
  function fillInTurn(ctx, vehicles) {
    const routes = vehicles.map(seed), unassigned = [];
    const opened = [];
    const order = ctx.stops.map((s, i) => i).sort(byWindow(ctx));
    const bySize = vehicles.map((v, k) => k).sort((a, b) => capSize(vehicles[b]) - capSize(vehicles[a]));
    for (const si of order) {
      const sub = opened.map(k => routes[k]), vs = opened.map(k => vehicles[k]);
      let b = opened.length ? bestInsert(ctx, sub, vs, si, -1) : null;
      if (b) { routes[opened[b.k]] = b.cand; continue; }
      const next = bySize.find(k => !opened.includes(k) && evalRoute(ctx, [si], vehicles[k], true));
      if (next != null) { opened.push(next); routes[next] = [si].concat(seed(vehicles[next])); } else unassigned.push({ id: ctx.stops[si].id, why: whyNot(ctx, si, vehicles) });
    }
    return { routes, unassigned };
  }
  function planFewestTrucks(depot, stops, vehicles, params) {
    const ctx = makeCtx(depot, stops, params);
    const tries = [];
    // A: the fewest-miles plan, then empty trucks from it
    const a = planMiles(depot, stops, vehicles, params);
    const idx = Object.fromEntries(stops.map((s, i) => [s.id, i]));
    const ra = a.routes.map(r => r._seq.slice());
    eliminate(ctx, ra, vehicles); improveUsed(ctx, ra, vehicles); eliminate(ctx, ra, vehicles); improveUsed(ctx, ra, vehicles);
    tries.push({ routes: ra, unassigned: a.unassigned });
    // B: fill one truck at a time, then empty any truck that still can be
    const b = fillInTurn(ctx, vehicles);
    improveUsed(ctx, b.routes, vehicles); eliminate(ctx, b.routes, vehicles); improveUsed(ctx, b.routes, vehicles);
    tries.push(b);
    const score = (t) => [t.unassigned.length, t.routes.filter(r => realCount(r)).length,
      t.routes.reduce((m, r, k) => { const e = evalRoute(ctx, r, vehicles[k], false); return m + (e ? cost(e) : 0); }, 0)];
    tries.sort((x, y) => { const p = score(x), q = score(y); return p[0] - q[0] || p[1] - q[1] || p[2] - q[2]; });
    placeTight(ctx, tries[0].routes, vehicles, tries[0].unassigned);
    return summarize(ctx, tries[0].routes, vehicles, tries[0].unassigned);
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

  // Times along a load in the order given (the load page's ETAs): arrival at each stop, with waits
  // for windows and time at each stop; no limits applied, nothing re-ordered.
  function timeline(depot, stops, vehicle, params) {
    const ctx = makeCtx(depot, stops, params);
    const v = Object.assign({}, vehicle, { cap: null, maxDrive: null, maxDuty: null });
    const e = settle(ctx, stops.map((_, i) => i), v);
    return { times: e.times, late: e.late, miles: e.miles, end: e.end, start: e.start, wait: e.wait, drive: e.drive, duty: e.duty, realLegs: ctx.real, legs: ctx.legs };
  }

  const api = { plan, reorder, timeline, crowMiles, DIMS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RC_PLANNER = api;
})(typeof window !== 'undefined' ? window : this);
