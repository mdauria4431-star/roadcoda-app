// RoadCoda: real drive times between places (123), shared by the route planner and the load page.
// Google's miles and minutes between two map points are kept in drive_times, so each pair of places
// is asked once; after that they come from RoadCoda. Google's times are for a car, so a truck takes
// them × the company's truck factor (Route planner › Setup).
// 147: with HERE set up, times come from HERE's truck routing and are used as they are (no factor);
// remembered Google times are asked again from HERE and replaced.
(function () {
  let ENGINE = null;   // 'here' | 'google', asked once per page
  async function engine(sb) {
    if (ENGINE) return ENGINE;
    try { const { data } = await sb.functions.invoke('route-miles', { body: { action: 'engine' } }); ENGINE = data && data.engine === 'here' ? 'here' : 'google'; }
    catch (_) { ENGINE = 'google'; }
    return ENGINE;
  }
  const key = (p) => `${(+p.lat).toFixed(4)},${(+p.lng).toFixed(4)}`;
  const ok = (p) => p && p.lat != null && p.lng != null && Number.isFinite(+p.lat) && Number.isFinite(+p.lng);

  // Every remembered time among these points: Map 'from|to' -> { miles, minutes }
  async function load(sb, points) {
    const keys = [...new Set(points.filter(ok).map(key))], cache = new Map(), eng = await engine(sb);
    for (let i = 0; i < keys.length; i += 150) {
      let { data, error } = await sb.from('drive_times').select('from_key, to_key, miles, minutes, source').in('from_key', keys.slice(i, i + 150)).in('to_key', keys);
      if (error && /source/.test(error.message || '')) ({ data, error } = await sb.from('drive_times').select('from_key, to_key, miles, minutes').in('from_key', keys.slice(i, i + 150)).in('to_key', keys));   // 147 not run yet
      if (error) return { cache, error };                 // 123 not installed yet: estimates only
      (data || []).forEach(r => { const src = r.source || 'google';
        if (eng === 'here' && src !== 'here') return;    // a Google car time: ask HERE for the truck time instead
        cache.set(r.from_key + '|' + r.to_key, { miles: Number(r.miles), minutes: Number(r.minutes), source: src }); });
    }
    return { cache };
  }

  // Ask Google for the pairs not remembered yet, remember them, and add them to the cache.
  // pairs: [[a, b], ...] of points. Returns { asked, found, error }.
  async function fill(sb, cache, pairs) {
    const want = [], seen = new Set();
    pairs.forEach(([a, b]) => { if (!ok(a) || !ok(b)) return; const k = key(a) + '|' + key(b);
      if (key(a) === key(b) || cache.has(k) || seen.has(k)) return; seen.add(k); want.push({ k, from: { lat: +a.lat, lng: +a.lng }, to: { lat: +b.lat, lng: +b.lng } }); });
    if (!want.length) return { asked: 0, found: 0 };
    let found = 0, last = null;
    for (let i = 0; i < want.length; i += 2500) {
      const part = want.slice(i, i + 2500);
      const { data, error } = await sb.functions.invoke('route-miles', { body: { action: 'matrix', pairs: part.map(w => ({ from: w.from, to: w.to })) } });
      if (error || !data || !Array.isArray(data.times)) {
        let m = error ? error.message : 'No answer'; try { m = (await error.context.json()).error || m; } catch (_) {}
        return { asked: want.length, found, error: m };
      }
      const rows = [], src = data.source === 'here' ? 'here' : 'google';
      data.times.forEach((t, j) => { if (!t) return; const w = part[j], [f, to] = w.k.split('|');
        cache.set(w.k, { miles: t.miles, minutes: t.minutes, source: src }); rows.push({ from_key: f, to_key: to, miles: t.miles, minutes: t.minutes, source: src, fetched_at: new Date().toISOString() }); found++; });
      for (let r = 0; r < rows.length; r += 500) {
        const up = await sb.from('drive_times').upsert(rows.slice(r, r + 500), { onConflict: 'carrier_id,from_key,to_key' });
        if (up.error && /source/.test(up.error.message || '')) await sb.from('drive_times').upsert(rows.slice(r, r + 500).map(({ source, ...x }) => x), { onConflict: 'carrier_id,from_key,to_key' });
      }
      last = src;
    }
    return { asked: want.length, found, source: last };
  }

  // For planner-core: (a, b) -> { miles, minutes as a truck } | null
  const leg = (cache, factor) => (a, b) => { if (!ok(a) || !ok(b)) return null; const g = cache.get(key(a) + '|' + key(b));
    return g ? { miles: g.miles, minutes: g.source === 'here' ? g.minutes : g.minutes * (Number(factor) || 1) } : null; };
  // How many of these pairs have HERE truck times (for the planner's note)
  const fromHere = (cache, pairs) => pairs.filter(([a, b]) => ok(a) && ok(b) && (cache.get(key(a) + '|' + key(b)) || {}).source === 'here').length;

  // Every ordered pair among some points (the planner), or each point to the next (one load)
  const allPairs = (pts) => { const out = []; pts.forEach(a => pts.forEach(b => { if (a !== b) out.push([a, b]); })); return out; };
  const inOrder = (pts, back) => { const out = []; for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i], pts[i + 1]]); if (back && pts.length > 1) out.push([pts[pts.length - 1], pts[0]]); return out; };

  window.RC_DRIVE = { key, load, fill, leg, allPairs, inOrder, engine, fromHere };
})();
