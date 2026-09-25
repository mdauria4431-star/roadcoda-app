// RoadCoda: tell a page that's been open a while that a new version is out (119).
// Checks version.json every 5 minutes and when the tab comes back into view. It never
// reloads by itself, so nobody loses a half-typed load, invoice or signature: it shows
// a bar with Refresh and Later. Does nothing where version.json doesn't exist
// (a local copy, or before Render's build step is set up).
(function () {
  if (window.__rcUpdate) return; window.__rcUpdate = true;
  const me = document.currentScript && document.currentScript.src || '';
  let mine = (me.match(/[?&]v=([^&]+)/) || [])[1] || null;   // the version this page was loaded with
  let snoozed = 0, bar = null;
  async function latest() {
    try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return null; return (await r.json()).version || null; }
    catch (e) { return null; }
  }
  function show() {
    if (bar || Date.now() < snoozed) return;
    bar = document.createElement('div');
    bar.id = 'rc-update-bar'; bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;background:#16212d;color:#e8eef5;border:1px solid #2a3a4c;border-radius:12px;padding:10px 12px 10px 16px;display:flex;gap:10px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.35);font:14px system-ui,sans-serif;max-width:calc(100% - 24px);flex-wrap:wrap';
    bar.innerHTML = '<span style="flex:1;min-width:180px">RoadCoda was updated. Refresh when you\'re ready.</span>' +
      '<button type="button" data-r style="height:32px;padding:0 14px;border-radius:8px;border:0;background:#4da3ff;color:#06121f;font-weight:700;cursor:pointer">Refresh</button>' +
      '<button type="button" data-l style="height:32px;padding:0 12px;border-radius:8px;border:1px solid #2a3a4c;background:transparent;color:#e8eef5;cursor:pointer">Later</button>';
    bar.querySelector('[data-r]').onclick = () => location.reload();
    bar.querySelector('[data-l]').onclick = () => { bar.remove(); bar = null; snoozed = Date.now() + 30 * 60 * 1000; };
    document.body.appendChild(bar);
  }
  async function check() {
    const v = await latest(); if (!v) return;
    if (!mine) { mine = v; return; }            // a page loaded without a stamp: remember what was current
    if (v !== mine) show();
  }
  check();
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
})();
