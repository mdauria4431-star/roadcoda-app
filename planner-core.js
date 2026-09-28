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
//            runs (loads it may run in the day, drop and hook at the DC between), reload (drop and hook at the DC, min), maxDc (optional cap on time at the DC),
//            cap2 (the second trailer), drivers (2 = a team: the page gives it a team's hours), dayCost, trailer2Cost }
//   params:  { mph, roadFactor, returnToStart, buffer (min before a window closes), goal ('cost' | 'trucks' | 'hours' | 'miles'),
//              costs: { driverHr, perMile } — with them, plans are compared on what the day costs to run }
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
    COST_MPH = Number(p.mph) || 45; COSTS = p.costs || null;
    // on-time first: past the hard margin, a stop is wanted another params.preferSpare minutes (default 15)
    // clear of its window's close — a small cost per minute short, so among plans that cost about the same
    // the one with more room for traffic wins (never at the price of a truck or real money)
    SPARE_T = (p.buffer || 0) + (p.preferSpare != null ? Number(p.preferSpare) : 15);
    // a window that closes before it opens (10 pm – 5 am) runs past midnight: the close is the next day
    stops = stops.map(x => x && x.ws != null && x.we != null && x.we < x.ws ? Object.assign({}, x, { we: x.we + 1440 }) : x);
    const hasPt = (q) => q && q.lat != null && q.lng != null && isFinite(q.lat) && isFinite(q.lng);
    const pts = [depot, ...stops];                  // index 0 = depot, i+1 = stops[i]
    const n = pts.length, mi = new Float64Array(n * n), mt = new Float64Array(n * n);
    let real = 0, legs = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue;
      legs++;
      const g = p.leg ? p.leg(pts[i], pts[j]) : null;
      if (g) { mi[i * n + j] = g.miles; mt[i * n + j] = g.minutes; real++; continue; }
      if (!hasPt(pts[i]) || !hasPt(pts[j])) { mi[i * n + j] = Infinity; mt[i * n + j] = Infinity; continue; }   // no map point: can't be reached
      const m = crowMiles(pts[i], pts[j]) * p.roadFactor, local = p.localMph && m < p.localMiles;
      mi[i * n + j] = m; mt[i * n + j] = m / (local ? p.localMph : p.mph) * 60;
    }
    return { p, n, mi, mt, stops, real, legs, hasPt: (i) => !!p.leg || hasPt(pts[i]), miles: (i, j) => mi[i * n + j], mins: (i, j) => mt[i * n + j] };
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
    const multi = (v.runs || 1) > 1 || !!v.canReload;
    let start = v.start || 0, t = start, drive = 0, miles = 0, prev = 0, wait = 0, late = [], times = [], first = true;
    const loads = [{ pallets: 0, weight: 0, cube: 0, pieces: 0 }]; let seg = 0, since = 0, atDc = false, dcWait = 0; const reloads = [];
    const runMiles = [0], runStops = [0];                                  // per load
    const lastReal = (() => { for (let k = route.length - 1; k >= 0; k--) if (route[k] >= 0) return k; return -1; })();
    for (let k = 0; k < route.length; k++) {
      const si = route[k];
      if (si === RELOAD) {
        if (first || k > lastReal || since === 0) { times.push({ reload: true, skip: true }); continue; }   // nothing to reload for
        const leg = ctx.mins(prev, 0); t += leg; drive += leg; miles += ctx.miles(prev, 0); runMiles[seg] += ctx.miles(prev, 0);
        const at = t; t += (v.reload != null ? v.reload : 30);
        reloads.push({ arrive: at, leave: t }); times.push({ reload: true, arrive: at, start: t });
        seg++; since = 0; atDc = true; loads.push({ pallets: 0, weight: 0, cube: 0, pieces: 0 }); runMiles.push(0); runStops.push(0); prev = 0; continue;
      }
      const s = ctx.stops[si], node = si + 1;
      const leg = ctx.mins(prev, node);
      t += leg; drive += leg; miles += ctx.miles(prev, node); runMiles[seg] += ctx.miles(prev, node);
      if (first && s.ws != null && t < s.ws) { start += s.ws - t; t = s.ws; }   // leave later, don't wait
      if (atDc && s.ws != null && t < s.ws) { const d = s.ws - t; reloads[reloads.length - 1].leave += d; times[times.length - 1].start += d; t = s.ws; dcWait += d;   // wait at the DC, not the store (the driver's still on the clock)
        // a cap on the whole stop at the DC when one's given (v.maxDc); otherwise the wait is simply paid driver time
        const r0 = reloads[reloads.length - 1]; if (hard && v.maxDc != null && r0.leave - r0.arrive > v.maxDc + 1e-9) return null; }
      first = false; atDc = false;
      const arrive = t;
      if (s.ws != null && t < s.ws) {                                          // early: wait for the window
        // a tractor that can go back for another load doesn't sit at a store for long: that stop goes on a later load
        if (hard && multi && s.ws - t > (v.maxWait != null ? v.maxWait : 30) + 1e-9) return null;
        wait += s.ws - t; t = s.ws; }
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
      prev = node; since++; runStops[seg]++;
    }
    if (ctx.p.returnToStart && lastReal >= 0) { const leg = ctx.mins(prev, 0); t += leg; drive += leg; miles += ctx.miles(prev, 0); runMiles[seg] += ctx.miles(prev, 0); }
    for (let g = 0; g < loads.length; g++) { const cap = g === 0 ? v.cap : ((v.caps && v.caps[g]) || v.cap2 || v.cap);
      for (const d of DIMS) { const c = cap && cap[d]; if (c && loads[g][d] > c + 1e-9) return null; } }
    // more than one load in the day keeps an hour of driving and on-duty time spare for delays (as a driver's second load does)
    const spare = reloads.length ? (v.spare != null ? v.spare : 60) : 0;
    if (v.maxDrive && drive > v.maxDrive - spare + 1e-9) return null;
    if (v.maxDuty && t - start > v.maxDuty - spare + 1e-9) return null;
    if (v.latestEnd != null && lastReal >= 0 && t > v.latestEnd + 1e-9) return null;   // must be back for its next load
    if (hard && !isFinite(t)) return null;                // a stop with no map point can't be driven to
    const out = { miles, drive, wait, start, duty: t - start, end: t, load: loads[0], loads, late, times, reloads, dcWait, reload: reloads[0] || null,
             runMiles, runStops, stops: runStops.reduce((a, x) => a + x, 0), crew: v.drivers || 1, pref: v.pref || 0 };
    if (COSTS) out.dollars = dayCost(out, v);
    return out;
  }
  // Leave as late as possible without making any stop late: waits later in the day shrink too.
  function settle(ctx, route, v) {
    const e0 = evalRoute(ctx, route, v, false); if (!e0 || !route.length || !e0.wait) return e0;
    // a later start may not take any stop closer to its window's close than the wanted spare (margin + 15 min),
    // or than it already was — a shorter wait for the driver is not worth a tighter stop
    const keep = e0.times.map(t => t.spare != null ? Math.min(SPARE_T, t.spare) : null);
    const ok = (d) => { const e = evalRoute(ctx, route, Object.assign({}, v, { start: e0.start + d }), false);
      return e && e.late.length <= e0.late.length && e.times.every((t, i) => keep[i] == null || t.spare == null || t.spare >= keep[i] - 0.01) ? e : null; };
    let lo = 0, hi = e0.wait, best = e0;
    for (let i = 0; i < 14 && hi - lo > 0.5; i++) { const mid = (lo + hi) / 2, e = ok(mid); if (e) { lo = mid; best = e; } else hi = mid; }
    return best;
  }
  // What a route costs: its miles, plus waiting time counted like driving time (a minute waiting
  // = the miles a truck covers in a minute), plus lateness weighed heavily (re-order only)
  let COST_MPH = 45, COSTS = null, SPARE_T = 0;
  // fewest driver hours: every driver's on-duty minutes (a team counts both), a sliver of cost as the tie-break
  const hoursObj = (e) => e.stops ? e.duty * (e.crew || 1) + cost(e) * 0.001 : 0;
  const short = (e) => { let m = 0; for (const t of e.times) if (t.spare != null && t.spare < SPARE_T) m += SPARE_T - Math.max(0, t.spare); return m; };
  // What it costs to run a route for the day (params.costs, the company's figures): the truck's day and
  // its first trailer's day (vehicle.dayCost), a second trailer's day when it runs more than one load
  // (vehicle.trailer2Cost), the driver for every on-duty hour (costs.driverHr), and each mile
  // (costs.perMile: fuel, tires, maintenance). Equipment and drivers are the big part — what the
  // carrier needs to run the day is what the customer ends up paying for.
  function dayCost(e, v) {
    if (!e.stops) return 0;
    return (v.dayCost || 0) + (e.reloads.length ? (v.trailer2Cost || 0) : 0) + e.duty / 60 * (COSTS.driverHr || 0) * (v.drivers || 1) + e.miles * (COSTS.perMile || 0);
  }
  const cost = (e) => {
    const lateC = e.late.reduce((a, x) => a + x.minutes, 0) * 5;
    if (COSTS) return e.dollars + lateC * ((COSTS.perMile || 1)) + short(e) * 0.4 + (e.stops ? e.pref || 0 : 0);   // dollars (+40¢ a minute short of the wanted spare); waiting is paid through the driver's hours
    return e.miles + (e.wait || 0) * COST_MPH / 60 + lateC + short(e) * 0.15
      + (e.reloads || []).reduce((a, r) => a + (r.leave - r.arrive) * COST_MPH / 60 + 30, 0);
  };

  // Time limit for a whole plan (params.timeLimitMs, default 15 s): searching stops, the best plan so far is
  // returned; every hard rule still holds because only feasible moves are ever kept.
  let DEADLINE = Infinity;
  const late = () => Date.now() > DEADLINE;
  // 2-opt within a route, move the DC markers, then relocate stops between routes — full passes until a
  // pass finds nothing better (or the time limit). Each route's cost is kept, not re-worked per candidate.
  function improve(ctx, routes, vehicles, hard) {
    const ev = (r, k) => evalRoute(ctx, r, vehicles[k], hard);
    const cst = routes.map((r, k) => { const e = ev(r, k); return e ? cost(e) : null; });
    let better = true, pass = 0;
    while (better && pass++ < 60 && !late()) {
      better = false;
      for (let k = 0; k < routes.length; k++) {
        const r = routes[k]; if (r.length < 3 || cst[k] == null) continue;
        let improved = true;
        while (improved && !late()) {
          improved = false;
          for (let i = 0; i < r.length - 1 && !improved; i++) for (let j = i + 1; j < r.length; j++) {
            const cand = r.slice(0, i).concat(r.slice(i, j + 1).reverse(), r.slice(j + 1));
            const e = ev(cand, k); if (!e) continue;
            const c = cost(e);
            if (c < cst[k] - 1e-6) { r.splice(0, r.length, ...cand); cst[k] = c; improved = better = true; break; }
          }
        }
      }
      // DC trips: move each marker to where it costs least (to the end = not used)
      for (let k = 0; k < routes.length; k++) {
        const r = routes[k]; if (!r.includes(RELOAD) || cst[k] == null) continue;
        for (let i = 0; i < r.length; i++) {
          if (r[i] !== RELOAD) continue;
          const w = r.filter((_, x) => x !== i); let best = null;
          for (let pos = 0; pos <= w.length; pos++) {
            const cand = w.slice(0, pos).concat([RELOAD], w.slice(pos)), e = ev(cand, k); if (!e) continue;
            const c = cost(e); if (c < cst[k] - 1e-6 && (!best || c < best.c)) best = { cand, c };
          }
          if (best) { r.splice(0, r.length, ...best.cand); cst[k] = best.c; better = true; }
        }
      }
      // relocate each stop to its cheapest place anywhere (same route or another)
      for (let a = 0; a < routes.length && !late(); a++) for (let i = 0; i < routes[a].length; i++) {
        const si = routes[a][i]; if (si === RELOAD || cst[a] == null) continue;
        const fromWithout = routes[a].filter((_, x) => x !== i);
        const eA1 = ev(fromWithout, a); if (!eA1) continue;
        const cA1 = cost(eA1), gain = cst[a] - cA1;
        let best = null;
        for (let b = 0; b < routes.length; b++) {
          if (b !== a && cst[b] == null) continue;
          const target = b === a ? fromWithout : routes[b], base = b === a ? cA1 : cst[b];
          for (let pos = 0; pos <= target.length; pos++) {
            if (b === a && pos === i) continue;
            const cand = target.slice(0, pos).concat([si], target.slice(pos));
            const e = ev(cand, b); if (!e) continue;
            const c = cost(e), delta = c - base - gain;
            if (delta < -1e-6 && (!best || delta < best.delta)) best = { b, cand, c, delta };
          }
        }
        if (best) {
          if (best.b === a) { routes[a] = best.cand; cst[a] = best.c; }
          else { routes[a] = fromWithout; cst[a] = cA1; routes[best.b] = best.cand; cst[best.b] = best.c; }
          better = true; i--;           // the next stop has moved into this position
        }
      }
    }
    return routes;
  }

  // ── Search (ruin and recreate) ─────────────────────────────────────
  // Take the best plan found and keep reshaping it: pull out a group of stops (a random few, stops near
  // each other, or a whole truck's), put them back where each costs least, keep the result when it is
  // better (or, early on, nearly as good, so the search can get past a local best). Every move is checked
  // with the same hard rules — windows with the margin, capacity, hours — so every plan it keeps is legal.
  // Seeded: the same day planned twice gives the same plan, unless the time limit stops it first. Stops
  // when nothing has improved for a while.
  function search(ctx, routes, vehicles, unIdx, goal, accept, until) {
    const n = ctx.stops.length; if (!n || late()) return { routes, un: unIdx };
    let seedN = 1234567; const rnd = () => { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return seedN / 0x7fffffff; };
    // what is being cut: dollars (or the unpriced route cost) — or, on fewest miles, the miles themselves
    const obj = (e) => goal === 'miles' ? e.miles + cost(e) * 0.02 : goal === 'hours' ? hoursObj(e) : cost(e);   // (a sliver of cost: no extra truck to save a mile or two)
    const rc = (r, k) => { if (!realCount(r)) return 0; const e = evalRoute(ctx, r, vehicles[k], true); return e ? obj(e) : Infinity; };
    // on driver hours a plan is judged on its settled times (a truck leaves as late as its stops allow, so
    // waiting that can be slept off at home isn't counted); stops are still slotted in on the quick figure
    const judge = goal === 'hours' ? (r, k) => { if (!realCount(r)) return 0; if (!evalRoute(ctx, r, vehicles[k], true)) return Infinity; const e = settle(ctx, r, vehicles[k]); return e ? hoursObj(e) : Infinity; } : rc;
    const sig = vehicles.map(v => JSON.stringify(Object.assign({}, v, { id: null })));   // idle trucks alike in every setting
    // loads on a route: one, plus one per DC marker with a stop on each side of it
    const loadsOn = (r) => { let n = 0, run = 0; for (const i of r) { if (i === RELOAD) { if (run) { n++; run = 0; } } else run++; } return n + (run ? 1 : 0); };
    const measure = (rs, cs, un) => ({ miss: un.length, trucks: goal === 'trucks' ? rs.filter(r => realCount(r)).length * 1000 + rs.reduce((a, r) => a + loadsOn(r), 0) : 0, c: cs.reduce((a, b) => a + b, 0) });
    const lt = (a, b) => a.miss < b.miss || (a.miss === b.miss && (a.trucks < b.trucks || (a.trucks === b.trucks && a.c < b.c - 1e-6)));
    let cur = routes.map(r => r.slice()), cc = cur.map(judge), cq = cur.map(rc), cu = unIdx.slice(), cm = measure(cur, cc, cu);
    let best = cur.map(r => r.slice()), bu = cu.slice(), bm = cm;
    const maxIt = 60 * n + 2000, patience = Math.max(400, (ctx.p.patience || 8) * n);
    const near = (a) => ctx.stops.map((_, j) => j).sort((x, y) => ctx.miles(a + 1, x + 1) - ctx.miles(a + 1, y + 1));
    const nearCache = new Map(), nearOf = (a) => nearCache.get(a) || (nearCache.set(a, near(a)), nearCache.get(a));
    for (let it = 0, stale = 0; it < maxIt && stale < patience && !late() && Date.now() < until; it++, stale++) {
      const trial = cur.map(r => r.slice()), tc = cc.slice(), tq = cq.slice(), pool = cu.slice(), out = new Set(), changed = new Set();
      const where = new Map(); trial.forEach((r, k) => r.forEach(i => { if (i >= 0) where.set(i, k); }));
      const placed = [...where.keys()]; if (!placed.length && !pool.length) break;
      const q = 1 + Math.floor(rnd() * Math.min(40, Math.max(3, Math.ceil(n * 0.15))));
      const op = rnd();
      if (op < 0.15) {                                    // a whole truck's stops (the small ones more often)
        const used = trial.map((r, k) => k).filter(k => realCount(trial[k]));
        if (used.length) { used.sort((a, b) => realCount(trial[a]) - realCount(trial[b]));
          const k = used[Math.floor(Math.pow(rnd(), 2) * used.length)]; realOnly(trial[k]).forEach(i => out.add(i)); }
      } else if (op < 0.65 && placed.length) {            // stops near each other
        const a = placed[Math.floor(rnd() * placed.length)];
        for (const j of nearOf(a)) { if (out.size >= q) break; if (where.has(j) && rnd() < 0.9) out.add(j); }
      } else {                                            // a random few
        for (let t = 0; t < q * 3 && out.size < q && placed.length; t++) out.add(placed[Math.floor(rnd() * placed.length)]);
      }
      const touched = new Set([...out].map(i => where.get(i)));
      let bad = false;
      for (const k of touched) { trial[k] = trial[k].filter(i => !out.has(i)); tq[k] = rc(trial[k], k); if (tq[k] === Infinity) bad = true; changed.add(k); }
      if (bad) continue;
      // put them back, in one of a few orders, each at its cheapest legal place
      const back = [...pool, ...out], ord = rnd();
      if (ord < 0.35) back.sort((a, b) => ((ctx.stops[a].we ?? 1e9) - (ctx.stops[b].we ?? 1e9)));
      else if (ord < 0.6) back.sort((a, b) => ctx.miles(0, b + 1) - ctx.miles(0, a + 1));
      else for (let x = back.length - 1; x > 0; x--) { const y = Math.floor(rnd() * (x + 1)); [back[x], back[y]] = [back[y], back[x]]; }
      const left = [];
      for (const si of back) {
        let b = null; const triedEmpty = new Set();
        for (let k = 0; k < trial.length; k++) {
          if (tq[k] === Infinity) continue;
          const empty = !realCount(trial[k]);
          if (empty) { if (triedEmpty.has(sig[k])) continue; triedEmpty.add(sig[k]); }
          const open = empty && goal === 'trucks' ? 1e6 : 0;
          for (let pos = 0; pos <= trial[k].length; pos++) {
            if (rnd() < 0.01) continue;                   // skip a spot now and then: keeps the search moving
            const cand = trial[k].slice(0, pos).concat([si], trial[k].slice(pos));
            const e = evalRoute(ctx, cand, vehicles[k], true); if (!e) continue;
            const c = obj(e), add = c - tq[k] + open;
            if (!b || add < b.add) b = { k, cand, c, add };
          }
        }
        if (b) { trial[b.k] = b.cand; tq[b.k] = b.c; changed.add(b.k); } else left.push(si);
      }
      for (const k of changed) tc[k] = judge === rc ? tq[k] : judge(trial[k], k);
      const tm = measure(trial, tc, left);
      const T = accept * Math.max(0, 1 - it / maxIt);   // by count, not the clock: same day, same plan (unless the time limit cuts it)
      const ok = tm.miss < bm.miss || (tm.miss === bm.miss && (tm.trucks < bm.trucks || (tm.trucks === bm.trucks && tm.c <= bm.c * (1 + T))));
      if (!ok) continue;
      cur = trial; cc = tc; cq = tq; cu = left; cm = tm;
      if (lt(tm, bm)) { best = trial.map(r => r.slice()); bu = left.slice(); bm = tm; stale = 0; }
    }
    if (goal === 'cost' || goal === 'trucks') improveUsed(ctx, best, vehicles);   // tidy the trucks in use; never re-opens an emptied one
    return { routes: best, un: bu };
  }

  function summarize(ctx, routes, vehicles, unassigned) {
    return {
      routes: routes.map((r, k) => { const e = settle(ctx, r, vehicles[k]);
        // runs: the stops before and after a working DC marker (one run when there's none)
        const runs = [[]], rt = [[]]; (e ? e.times : r.map(() => ({}))).forEach((tm, x) => {
          if (r[x] === RELOAD) { if (tm && !tm.skip && tm.arrive != null) { runs.push([]); rt.push([]); } return; }
          runs[runs.length - 1].push(ctx.stops[r[x]].id); rt[rt.length - 1].push(tm); });
        return { vehicle: vehicles[k].id, _seq: r.slice(), stops: r.filter(i => i >= 0).map(i => ctx.stops[i].id), runs, runTimes: rt, reloads: e ? e.reloads : [],
                 miles: e ? e.miles : 0, drive: e ? e.drive : 0, duty: e ? e.duty : 0, crew: vehicles[k].drivers || 1, end: e ? e.end : null,
                 start: e ? e.start : null, wait: e ? e.wait : 0, loads: e ? e.loads : [], cost: e && COSTS ? e.dollars : null,
                 costParts: e && COSTS && e.stops ? { equipment: (vehicles[k].dayCost || 0) + (e.reloads.length ? (vehicles[k].trailer2Cost || 0) : 0), driver: e.duty / 60 * (COSTS.driverHr || 0) * (vehicles[k].drivers || 1), miles: e.miles * (COSTS.perMile || 0) } : null,
                 runMiles: e ? e.runMiles.filter((m, g) => e.runStops[g]) : [], cap2: vehicles[k].cap2 || vehicles[k].cap || {},
                 load: e ? e.load : null, cap: vehicles[k].cap || {}, late: e ? e.late : [], times: e ? e.times.filter(t => !t.reload) : [] }; }),
      unassigned, realLegs: ctx.real, legs: ctx.legs,
      miles: routes.reduce((a, r, k) => { const e = evalRoute(ctx, r, vehicles[k], false); return a + (e ? e.miles : 0); }, 0),
      cost: COSTS ? routes.reduce((a, r, k) => { const e = settle(ctx, r, vehicles[k]); return a + (e ? e.dollars : 0); }, 0) : null,
    };
  }

  // Plan the day: which stop on which truck, in what order. Windows, capacity and hours are hard limits;
  // a stop that fits nowhere comes back in `unassigned` with the reason.
  // params.goal: 'miles' (default) = fewest total miles; 'trucks' = as few trucks as the windows,
  // capacity and hours allow, then the fewest miles for those trucks. Windows are never broken either way.
  // The safety margin and the hours are never broken: a stop that can't have both waits in `unassigned`.
  // Tractors that can run more than one load (drop and hook at the DC): the plan is chosen by
  //   1. every stop placed, 2. the fewest tractors (equipment and drivers used fully), 3. the fewest
  //   loads (full trailers), 4. the fewest miles — trying at most 1, 2, 3 … loads per tractor (on the
  //   fewest-trucks goal; the lowest-cost goal ranks by dollars).
  function plan(depot, stops, vehicles, params) {
    params = params || {};
    stops = (stops || []).map(x => x && x.noBuffer ? Object.assign({}, x, { noBuffer: false }) : x);   // the margin is never waived
    const outer = DEADLINE === Infinity;                    // the top-level call sets the time limit
    if (outer) DEADLINE = Date.now() + ((params && params.timeLimitMs) || 15000);
    try { const r = planInner(depot, stops, vehicles, params); if (outer && r) { r.timedOut = late(); delete r.vs; } return r; }
    finally { if (outer) DEADLINE = Infinity; }
  }
  function planInner(depot, stops, vehicles, params) {
    const goal = (params && params.goal) || 'trucks', priced = !!(params && params.costs);
    // 'cost': the lowest cost to run the day (equipment, drivers' hours, miles), every stop on time with
    // its margin and every driver within hours; among equal costs the fewest trucks. Both ways of
    // building a plan are tried, at 1, 2, 3 … loads per tractor.
    const one = (vs) => goal === 'cost' || goal === 'miles' || goal === 'hours' ? [planMiles(depot, stops, vs, params), planFewestTrucks(depot, stops, vs, params)]
      : [planFewestTrucks(depot, stops, vs, params)];
    const loadsOf = (r) => r.routes.filter(x => x.stops.length).reduce((a, x) => a + x.runs.length, 0), trucksOf = (r) => r.routes.filter(x => x.stops.length).length;
    const crewMin = (r) => Math.round(r.routes.filter(x => x.stops.length).reduce((a, x) => a + x.duty * (x.crew || 1), 0));
    const score = (r) => goal === 'miles' ? [r.unassigned.length, r.miles]
      : goal === 'hours' ? [r.unassigned.length, crewMin(r), trucksOf(r), r.miles]
      : goal === 'cost' && priced ? [r.unassigned.length, Math.round(r.cost), trucksOf(r), r.miles]
      : [r.unassigned.length, trucksOf(r), loadsOf(r), r.miles];   // fewest trucks: tractors first, then loads (trailers)
    const better = (p, q) => { for (let i = 0; i < p.length; i++) { if (p[i] < q[i] - 1e-6) return true; if (p[i] > q[i] + 1e-6) return false; } return false; };
    // on cost: empty whole trucks, the dearest first (a team, say), whenever the others — used or not —
    // can take their stops for less
    const polish = (r, vs) => {
      if (!priced) return r;          // on every goal: a truck is only emptied when the day gets cheaper
      const ctx = makeCtx(depot, stops, params), routes = r.routes.map(x => x._seq.slice());
      const total = (rs) => rs.reduce((a, x, k) => { const e = evalRoute(ctx, x, vs[k], true);
        return a + (!e ? 1e12 : goal === 'hours' ? hoursObj(settle(ctx, x, vs[k]) || e) : cost(e)); }, 0);
      let cur = total(routes);
      for (let guard = 0; guard < vs.length; guard++) {
        const used = routes.map((x, k) => k).filter(k => realCount(routes[k]))
          .sort((a, b) => cost(evalRoute(ctx, routes[b], vs[b], true)) - cost(evalRoute(ctx, routes[a], vs[a], true)));
        let done = false;
        for (const k of used) {
          if (late()) break;
          const trial = routes.map(x => x.slice()); trial[k] = seed(vs[k]);
          let ok = true; const touched = new Set();
          for (const si of realOnly(routes[k]).sort(byWindow(ctx))) {
            const b = bestInsert(ctx, trial, vs, si, k); if (!b) { ok = false; break; }
            trial[b.k] = b.cand; touched.add(b.k);
          }
          if (!ok) continue;
          const tk = [...touched], sub = improve(ctx, tk.map(j => trial[j]), tk.map(j => vs[j]), true);
          tk.forEach((j, x) => { trial[j] = sub[x]; });
          const t = total(trial);
          if (t < cur - 0.5) { routes.splice(0, routes.length, ...trial); cur = t; done = true; break; }
        }
        if (!done) break;
      }
      const out = summarize(ctx, routes, vs, r.unassigned); return out;
    };
    const maxR = Math.max(1, ...vehicles.map(v => v.runs || 1));
    let best = null, bestS = null, bestVs = null;
    for (let cap = 1; cap <= maxR; cap++) {
      const vs = vehicles.map(v => Object.assign({}, v, { runs: Math.min(v.runs || 1, cap), canReload: (v.runs || 1) > 1 }));
      const rs = one(vs).map(r => Object.assign(polish(r, vs), { vs }));
      // teams cost two drivers: on cost, also plan without them (a team is kept only where it pays or is needed)
      const solo = vs.filter(v => !(v.drivers > 1));
      if ((goal === 'cost' || goal === 'hours') && priced && solo.length && solo.length < vs.length) rs.push(...one(solo).map(r => Object.assign(polish(r, solo), { vs: solo })));
      for (const r of rs) { const sc = score(r); if (!best || better(sc, bestS)) { best = r; bestS = sc; best.loadsPerTractor = cap; bestVs = r.vs || vs; } }
      if (cap > 1 && !rs.some(r => r.routes.some(x => x.runs.length === cap))) break;   // no tractor used the extra load: more won't change it
      if (late()) break;
    }
    if (!best || params.search === false || !stops.length) return best;
    // then search from the best plan for the rest of the time (the vehicles it was planned on)
    const ctx = makeCtx(depot, stops, params);
    // twice: once staying close to the best (suits tight windows), once ranging wider (suits wide windows)
    const start = best.routes.map(r => r._seq.slice()), on = new Set(start.flat());
    const un0 = ctx.stops.map((_, i) => i).filter(i => !on.has(i));
    const g = goal === 'cost' && !priced ? 'miles' : goal, acc = ctx.p.accept ? [ctx.p.accept] : [0.01, 0.08];
    const tot = (f) => score(summarize(ctx, f.routes, bestVs, f.un));
    // (fewest trucks: also a search on miles alone — a shorter day often frees a truck on its own)
    const runs = acc.map(a => [g, a]).concat(g === 'trucks' && !ctx.p.accept ? [['miles', 0.08]] : []);
    let found = null;
    runs.forEach(([gg, a], x) => {
      const until = Date.now() + (DEADLINE - Date.now()) / (runs.length - x);
      const f = search(ctx, start.map(r => r.slice()), bestVs, un0.slice(), gg, a, until);
      if (!found || better(tot(f), tot(found))) found = f;
    });
    const r2 = summarize(ctx, found.routes, bestVs, found.un.map(i => ({ id: ctx.stops[i].id, why: whyNot(ctx, i, bestVs) })));
    const out = better(score(r2), bestS) ? r2 : best;
    out.loadsPerTractor = best.loadsPerTractor;
    return out;
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
    // C: the fewest trucks that take every stop — plan on the first k trucks (multi-load tractors, then
    // the biggest first), k = 1, 2, … and keep the first that places as many stops as all of them do
    const best = Math.min(a.unassigned.length, b.unassigned.length);
    const rank = vehicles.map((v, k) => k).sort((x, y) => ((vehicles[y].runs || 1) > 1) - ((vehicles[x].runs || 1) > 1) || capSize(vehicles[y]) - capSize(vehicles[x]));
    const have = Math.min(...[ra, b.routes].map(rs => rs.filter(r => realCount(r)).length));
    // (halving the range: about log2(trucks) plans instead of one per truck count)
    let lo = 1, hi = have - 1, found = null;
    while (lo <= hi && !late()) {
      const k = (lo + hi) >> 1, pick = rank.slice(0, k), sub = pick.map(i => vehicles[i]);
      const c = planMiles(depot, stops, sub, params);
      if (c.unassigned.length > best) { lo = k + 1; continue; }
      found = { pick, c }; hi = k - 1;
    }
    if (found) {
      const rc = vehicles.map(seed); found.pick.forEach((vi, j) => { rc[vi] = found.c.routes[j]._seq.slice(); });
      improveUsed(ctx, rc, vehicles); tries.push({ routes: rc, unassigned: found.c.unassigned });
    }
    const score = (t) => [t.unassigned.length, t.routes.filter(r => realCount(r)).length,
      t.routes.reduce((m, r, k) => { const e = evalRoute(ctx, r, vehicles[k], false); return m + (e ? cost(e) : 0); }, 0)];
    tries.sort((x, y) => { const p = score(x), q = score(y); return p[0] - q[0] || p[1] - q[1] || p[2] - q[2]; });
    return summarize(ctx, tries[0].routes, vehicles, tries[0].unassigned);
  }

  function whyNot(ctx, si, vehicles) {
    const s = ctx.stops[si];
    if (!vehicles.length) return 'no trucks available';
    if (!ctx.hasPt(si + 1)) return 'no map point';
    const tooBig = vehicles.every(v => DIMS.some(d => v.cap && v.cap[d] && ((s.demand && s.demand[d]) || 0) > v.cap[d]));
    if (tooBig) return 'bigger than any truck';
    const alone = vehicles.some(v => evalRoute(ctx, [si], v, true));
    if (!alone) return s.we != null ? (ctx.p.buffer ? `can't be reached ${ctx.p.buffer} min before its window closes` : 'delivery window can\'t be reached') : 'too far for the driver\'s hours';
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
