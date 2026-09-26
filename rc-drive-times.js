// RoadCoda: real drive times between places (123), shared by the route planner and the load page.
// Google's miles and minutes between two map points are kept in drive_times, so each pair of places
// is asked once; after that they come from RoadCoda. Google's times are for a car, so a truck takes
// them × the company's truck factor (Route planner › Setup).
(function () {
  const key = (p) => `${(+p.lat).toFixed(4)},${(+p.lng).toFixed(4)}`;
  const ok = (p) => p && p.lat != null && p.lng != null && Number.isFinite(+p.lat) && Number.isFinite(+p.lng);

  // Every remembered time among these points: Map 'from|to' -> { miles, minutes }
  async function load(sb, points) {
    const keys = [...new Set(points.filter(ok).map(key))], cache = new Map();
    for (let i = 0; i < keys.length; i += 150) {
      const { data, error } = await sb.from('drive_times').select('from_key, to_key, miles, minutes').in('from_key', keys.slice(i, i + 150)).in('to_key', keys);
      if (error) return { cache, error };                 // 123 not installed yet: estimates only
      (data || []).forEach(r => cache.set(r.from_key + '|' + r.to_key, { miles: Number(r.miles), minutes: Number(r.minutes) }));
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
    let found = 0;
    for (let i = 0; i < want.length; i += 2500) {
      const part = want.slice(i, i + 2500);
      const { data, error } = await sb.functions.invoke('route-miles', { body: { action: 'matrix', pairs: part.map(w => ({ from: w.from, to: w.to })) } });
      if (error || !data || !Array.isArray(data.times)) {
        let m = error ? error.message : 'No answer'; try { m = (await error.context.json()).error || m; } catch (_) {}
        return { asked: want.length, found, error: m };
      }
      const rows = [];
      data.times.forEach((t, j) => { if (!t) return; const w = part[j], [f, to] = w.k.split('|');
        cache.set(w.k, { miles: t.miles, minutes: t.minutes }); rows.push({ from_key: f, to_key: to, miles: t.miles, minutes: t.minutes, fetched_at: new Date().toISOString() }); found++; });
      for (let r = 0; r < rows.length; r += 500) await sb.from('drive_times').upsert(rows.slice(r, r + 500), { onConflict: 'carrier_id,from_key,to_key' });
    }
    return { asked: want.length, found };
  }

  // For planner-core: (a, b) -> { miles, minutes as a truck } | null
  const leg = (cache, factor) => (a, b) => { if (!ok(a) || !ok(b)) return null; const g = cache.get(key(a) + '|' + key(b));
    return g ? { miles: g.miles, minutes: g.minutes * (Number(factor) || 1) } : null; };

  // Every ordered pair among some points (the planner), or each point to the next (one load)
  const allPairs = (pts) => { const out = []; pts.forEach(a => pts.forEach(b => { if (a !== b) out.push([a, b]); })); return out; };
  const inOrder = (pts, back) => { const out = []; for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i], pts[i + 1]]); if (back && pts.length > 1) out.push([pts[pts.length - 1], pts[0]]); return out; };

  window.RC_DRIVE = { key, load, fill, leg, allPairs, inOrder };
})();
