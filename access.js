// RoadCoda: screen access for office pages (include after config.js on every office page).
// - Hides menu links to screens this user can't open, and adds Users / My account links.
// - Blocks a screen the user can't open, and shows "View only" where they can only look.
// - Money (prices, revenue, costs) and driver pay stay hidden unless the user may see them.
// The database enforces all of this too; this script only keeps the screens tidy.
(function () {
  // 100: the website tour. A tour guest's requests run read-only in the database, so a save
  // comes back as Postgres' "read-only transaction" error — show it as the tour's own words.
  // Wraps every client the page makes; does nothing for anyone who isn't on the tour.
  const TOUR_MSG = 'This is the RoadCoda tour — try anything you like, but nothing is saved. Talk to us to run it with your own data.';
  if (window.supabase && window.supabase.createClient && !window.supabase.__rcTourWrapped) {
    const orig = window.supabase.createClient;
    const tourFetch = async (input, init) => {
      const res = await fetch(input, init);
      if (res.status >= 400 && res.status < 500 && (res.status === 405 || (window.RC_ACCESS && window.RC_ACCESS.guest))) {
        let txt = '';
        try { txt = await res.clone().text(); } catch (_) { return res; }
        if (/25006|read-only transaction|row-level security|tour/i.test(txt)) {
          let j; try { j = JSON.parse(txt); } catch (_) { j = {}; }
          j.message = TOUR_MSG; j.error = TOUR_MSG; j.details = null; j.hint = null;
          return new Response(JSON.stringify(j), { status: res.status, statusText: res.statusText, headers: res.headers });
        }
      }
      return res;
    };
    window.supabase.createClient = function (url, key, opts) {
      opts = opts || {};
      return orig(url, key, Object.assign({}, opts, { global: Object.assign({}, opts.global || {}, { fetch: opts.global && opts.global.fetch || tourFetch }) }));
    };
    window.supabase.__rcTourWrapped = true;
  }
  window.RC_TOUR_MSG = TOUR_MSG;

  const SCREEN_OF = {
    'index.html': 'home', '': 'home', 'dispatch.html': 'dispatch', 'trip.html': 'dispatch', 'templates.html': 'dispatch', 'payroll.html': 'payroll', 'activity.html': 'invoices', 'profit.html': 'money', 'messages.html': 'dispatch', 'incidents.html': 'safety', 'safety.html': 'safety', 'customer-logins.html': 'customers', 'ratings.html': 'dispatch', 'retention.html': 'safety', 'getting-started.html': 'home', 'setup-report.html': 'users', 'settings-check.html': 'users', 'containers.html': 'containers', 'office-payroll.html': 'office_payroll', 'handbooks.html': 'safety', 'trip-sheet.html': 'dispatch', 'ifta.html': 'ifta', 'qb-export.html': 'invoices', 'compliance.html': 'safety', 'claims.html': 'safety', 'loads.html': 'loads', 'customers.html': 'customers',
    'drivers.html': 'drivers', 'equipment.html': 'equipment', 'rates.html': 'rates', 'invoices.html': 'invoices',
    'tolls.html': 'tolls', 'integrations.html': 'integrations', 'edi.html': 'integrations', 'users.html': 'users', 'features.html': 'home', 'devices.html': 'home', 'company.html': 'home', 'planner.html': 'dispatch', 'map.html': 'dispatch', 'dock.html': 'dock', 'texts.html': 'dispatch',
  };
  // Pages that belong to a module the carrier can switch off (82)
  const FEATURE_OF = { 'containers.html': 'containers', 'ifta.html': 'ifta', 'claims.html': 'claims', 'compliance.html': 'compliance', 'handbooks.html': 'handbooks',
    'retention.html': 'retention', 'office-payroll.html': 'office_payroll', 'qb-export.html': 'quickbooks', 'tolls.html': 'tolls', 'profit.html': 'profit',
    'activity.html': 'activity_files', 'ratings.html': 'ratings', 'trip-sheet.html': 'trip_sheets', 'planner.html': 'route_planner', 'map.html': 'live_tracking', 'dock.html': 'dock_scanning', 'texts.html': 'texts', 'edi.html': 'edi' };
  const FEATURE_NAME = { containers: 'Returnable containers', ifta: 'IFTA fuel tax', claims: 'Claims & subrogation', compliance: 'Driver files & inspections', handbooks: 'Employee handbooks',
    retention: 'Onboarding & retention', office_payroll: 'Office staff payroll', quickbooks: 'QuickBooks export', tolls: 'Tolls', profit: 'Profit reports', activity_files: 'Customer activity files',
    ratings: 'Delivery ratings', trip_sheets: 'Trip sheets', route_planner: 'Route planner', live_tracking: 'Live tracking (a RoadCoda add-on)', dock_scanning: 'Dock & load-out scanning (a RoadCoda add-on)', texts: 'Text messages (a RoadCoda add-on)' };
  const pageFile = location.pathname.split('/').pop() || 'index.html';
  const NAMES = { dispatch: 'Dispatch', loads: 'Loads', customers: 'Customers', drivers: 'Drivers', equipment: 'Equipment', rates: 'Rates',
                  invoices: 'Invoices', tolls: 'Tolls', payroll: 'Payroll', money: 'Profit (needs the money switch)', safety: 'Incidents', dock: 'Dock scanning', containers: 'Containers', office_payroll: 'Office payroll', ifta: 'IFTA / fuel tax', integrations: 'Integrations', users: 'Users' };
  const page = SCREEN_OF[location.pathname.split('/').pop()] ?? null;

  // Until we know, money and pay stay hidden (no flash of numbers for people who shouldn't see them)
  const css = document.createElement('style');
  css.textContent = 'html:not(.rc-money) .money{display:none!important}html:not(.rc-pay) .pay{display:none!important}' +
    'html.rc-blocked #app{display:none!important}.rc-note{max-width:1180px;margin:16px auto 0;padding:0 24px}' +
    '.rc-note div{background:#fff8e6;border:1px solid #e6c77a;border-radius:10px;padding:10px 14px;font-size:14px;line-height:1.5}';
  document.head.appendChild(css);

  let resolveReady; window.RC_ACCESS_READY = new Promise((r) => { resolveReady = r; });
  window.RC_ACCESS = null;
  const legacy = () => { document.documentElement.classList.add('rc-money', 'rc-pay'); resolveReady(null); };

  function note(html) {
    const main = document.querySelector('main'); if (!main) return;
    const d = document.createElement('div'); d.className = 'rc-note'; d.innerHTML = `<div>${html}</div>`;
    main.parentNode.insertBefore(d, main);
  }

  async function run() {
    // "Forgot password?" under every office sign-in form
    const lv = document.getElementById('login-view');
    if (lv && !lv.querySelector('.rc-forgot')) {
      const a = document.createElement('a'); a.href = 'account.html'; a.className = 'rc-forgot'; a.textContent = 'Forgot password?';
      a.style.cssText = 'font-size:14px;color:#0f5e63'; lv.appendChild(a);
    }
    if (!window.supabase || !window.RC_CONFIG) return legacy();
    const c = window.supabase.createClient(RC_CONFIG.SUPABASE_URL, RC_CONFIG.SUPABASE_KEY);
    const { data: { session } } = await c.auth.getSession();
    if (!session) {
      // Not signed in yet: once the page signs someone in, reload so their access applies from the start
      const t = setInterval(async () => { const { data: { session: s2 } } = await c.auth.getSession(); if (s2) { clearInterval(t); location.reload(); } }, 1200);
      resolveReady(null); return;
    }
    // 95: two-factor. Supabase Auth holds the codes; this asks for one when a session
    // is still at password-only, and blocks the app when the company requires it and the
    // person hasn't set it up. Runs on every office page because access.js does.
    async function twoFactorGate(access) {
      let factors;
      try { factors = (await c.auth.mfa.listFactors()).data; } catch (_) { return true; }   // older project: carry on
      const verified = (factors && factors.totp || []).filter(f => f.status === 'verified');
      let aal = 'aal1';
      try { aal = (await c.auth.mfa.getAuthenticatorAssuranceLevel()).data.currentLevel || 'aal1'; } catch (_) {}
      const onAccount = (location.pathname.split('/').pop() || '') === 'account.html';

      if (verified.length && aal !== 'aal2') { await askForCode(verified[0].id); return false; }
      if (access && access.mfa_required && !verified.length && !onAccount) {
        document.documentElement.classList.add('rc-blocked');
        note('<b>Your company requires two-factor sign-in.</b> Set it up once on <a href="account.html">My account</a>, then carry on. <a href="index.html">Home</a>');
        return false;
      }
      return true;
    }

    function askForCode(factorId) {
      return new Promise(() => {   // never resolves: the page reloads on success
        document.documentElement.classList.add('rc-blocked');
        const back = document.createElement('div');
        back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:10000';
        back.innerHTML = '<div style="background:var(--surface,#fff);border:1px solid var(--line,#ddd);border-radius:12px;max-width:380px;width:100%;padding:18px;color:var(--ink,#111);font-family:system-ui,sans-serif">'
          + '<h2 style="margin:0 0 4px;font-size:17px">Two-factor sign-in</h2>'
          + '<div style="font-size:13px;color:var(--ink-3,#666)">Open your authenticator app and enter the 6-digit code for RoadCoda.</div>'
          + '<input id="rc-mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" '
          + 'style="width:100%;height:44px;margin-top:12px;padding:0 12px;font-size:22px;letter-spacing:.3em;text-align:center;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--panel-2,#f7f7f7);color:inherit">'
          + '<div style="display:flex;gap:8px;align-items:center;margin-top:12px">'
          + '<button id="rc-mfa-go" style="height:36px;padding:0 14px;border:0;border-radius:8px;background:var(--accent,#5b3cc4);color:#fff;font-weight:600;cursor:pointer">Continue</button>'
          + '<button id="rc-mfa-out" style="height:36px;padding:0 12px;border:1px solid var(--line,#ccc);border-radius:8px;background:transparent;color:inherit;cursor:pointer">Sign out</button>'
          + '<span id="rc-mfa-msg" style="font-size:12.5px"></span></div>'
          + '<div style="font-size:12px;color:var(--ink-3,#666);margin-top:10px">Lost your phone? Ask your RoadCoda owner to clear it for you.</div></div>';
        document.body.appendChild(back);
        const box = back.querySelector('#rc-mfa-code'), msg = back.querySelector('#rc-mfa-msg');
        box.focus();
        async function go() {
          const code = (box.value || '').replace(/\D/g, '');
          if (code.length !== 6) { msg.innerHTML = '<span style="color:#c62828">Six digits.</span>'; return; }
          msg.textContent = 'Checking…';
          const { error } = await c.auth.mfa.challengeAndVerify({ factorId, code });
          if (error) { msg.innerHTML = '<span style="color:#c62828">' + (error.message || 'That code didn\'t work') + '</span>'; box.value = ''; box.focus(); return; }
          location.reload();
        }
        back.querySelector('#rc-mfa-go').onclick = go;
        box.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        back.querySelector('#rc-mfa-out').onclick = async () => { await c.auth.signOut(); location.href = 'index.html'; };
      });
    }

    const { data, error } = await c.rpc('my_access');
    if (error || !data) return legacy();                       // before 37_user_access.sql: everything as before
    if (data.role === 'driver') { resolveReady(data); return; }
    const can = (s, lvl) => data.owner || (!!data.screens && !!data.screens[s] && (lvl !== 'edit' || data.screens[s] === 'edit'));
    data.can = can; data.money = can('money'); data.pay = data.money || can('payroll');
    // Feature modules (82): anything tagged data-feature="x" hides while x is switched off — including parts drawn later
    const feats = data.features || null;
    data.feature = (k) => !feats || feats[k] !== false;
    if (feats) {
      const off = Object.keys(feats).filter(k => feats[k] === false);
      if (off.length) { const st = document.createElement('style'); st.textContent = off.map(k => `[data-feature="${k}"]`).join(',') + '{display:none!important}'; document.head.appendChild(st); }
    }
    // A new carrier picks a preset first (owner, or whoever may switch features)
    if (data.features && !data.feature_preset && (data.owner || can('users', 'edit')) && pageFile !== 'features.html') { location.href = 'features.html?welcome=1'; return; }
    window.RC_ACCESS = data;
    if (data.guest) tourMode(c, data);
    else if (!(await twoFactorGate(data))) return;   // 95: ask for the code, or send them to set it up
    if (data.money) document.documentElement.classList.add('rc-money');
    if (data.pay) document.documentElement.classList.add('rc-pay');

    // Menu: remove screens they can't open; add Users (if allowed) and My account
    const nav = document.querySelector('header nav');
    if (nav) {
      nav.querySelectorAll('a').forEach((a) => { const h = a.getAttribute('href'), s = SCREEN_OF[h]; if ((s && s !== 'home' && !can(s)) || (FEATURE_OF[h] && !data.feature(FEATURE_OF[h])) || (data.guest && h === 'account.html')) a.remove(); });
      // Every page gets the same full menu: add any standard page this page's own list left out,
      // if this user can open it (the sidebar then groups them).
      const FULL = [['index.html', 'Home'], ['dispatch.html', 'Dispatch'], ['messages.html', 'Messages'], ['ratings.html', 'Ratings'],
        ['templates.html', 'Templates'], ['planner.html', 'Route planner'], ['loads.html', 'Loads'], ['containers.html', 'Containers'], ['invoices.html', 'Invoices'], ['activity.html', 'Activity file'],
        ['payroll.html', 'Payroll'], ['office-payroll.html', 'Office payroll'], ['profit.html', 'Profit'], ['tolls.html', 'Tolls'], ['ifta.html', 'IFTA'], ['qb-export.html', 'QuickBooks'], ['incidents.html', 'Incidents'], ['retention.html', 'Retention'], ['compliance.html', 'Compliance'], ['claims.html', 'Claims'], ['handbooks.html', 'Handbooks'],
        ['getting-started.html', 'Getting started'], ['customers.html', 'Customers'], ['customer-logins.html', 'Customer logins'], ['drivers.html', 'Drivers'],
        ['equipment.html', 'Equipment'], ['rates.html', 'Rates'], ['integrations.html', 'Integrations'], ['features.html', 'Features'], ['devices.html', 'Devices'], ['driver.html', 'Driver app']];
      const here = location.pathname.split('/').pop() || 'index.html';
      FULL.forEach(([h, t]) => {
        if (nav.querySelector(`a[href="${h}"]`)) return;
        const s = SCREEN_OF[h];
        if (s && s !== 'home' && !can(s)) return;
        if (FEATURE_OF[h] && !data.feature(FEATURE_OF[h])) return;
        const a = document.createElement('a'); a.href = h; a.textContent = t; if (h === here) a.className = 'on';
        nav.appendChild(a);
      });
      if (can('users') && !nav.querySelector('a[href="users.html"]')) {
        const a = document.createElement('a'); a.href = 'users.html'; a.textContent = 'Users'; if (page === 'users') a.className = 'on';
        const drv = nav.querySelector('a[href="driver.html"]'); nav.insertBefore(a, drv || null);
      }
      if (!data.guest && !nav.querySelector('a[href="account.html"]')) {
        const a = document.createElement('a'); a.href = 'account.html'; a.textContent = 'My account'; nav.appendChild(a);
      }
    }
    if (FEATURE_OF[pageFile] && !data.feature(FEATURE_OF[pageFile])) {
      document.documentElement.classList.add('rc-blocked');
      const addon = ['live_tracking', 'edi', 'texts', 'ai_reader', 'dock_scanning'].includes(FEATURE_OF[pageFile]);   // paid add-ons: only RoadCoda switches them
      note(addon ? `<b>${FEATURE_NAME[FEATURE_OF[pageFile]]}</b> isn't on for your company. It's a paid add-on — <a href="features.html">ask RoadCoda about it</a>. <a href="index.html">Go to Home</a>`
        : `<b>${FEATURE_NAME[FEATURE_OF[pageFile]] || 'This module'}</b> is switched off for your company. ${data.owner || can('users', 'edit') ? '<a href="features.html">Switch it on under Features</a>.' : 'Ask the owner if you need it.'} <a href="index.html">Go to Home</a>`);
    } else if (page && page !== 'home' && !can(page)) {
      document.documentElement.classList.add('rc-blocked');
      note(`You don't have access to <b>${NAMES[page] || 'this screen'}</b>. Ask the owner if you need it. <a href="index.html">Go to Home</a>`);
    } else if (page && page !== 'home' && !can(page, 'edit')) {
      // the dock station scans and releases on View; only its Setup needs Edit (88)
      if (page !== 'dock') note(`<b>View only.</b> You can look at ${NAMES[page] || 'this screen'} but not change anything here.`);
    }
    resolveReady(data);
  }
  // 100: tour mode — a slim bar on every page, and Sign out becomes Leave the tour
  function tourMode(c, data) {
    document.documentElement.classList.add('rc-guest');
    if (pageFile === 'account.html') { location.href = 'dispatch.html'; return; }
    const st = document.createElement('style');
    st.textContent = '.rc-tour{position:sticky;top:0;z-index:30;margin:0 0 12px;padding:10px 14px;border-radius:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;' +
      'background:linear-gradient(90deg,color-mix(in srgb,var(--accent,#7c5cff) 22%,var(--surface,#fff)),var(--surface,#fff));border:1px solid color-mix(in srgb,var(--accent,#7c5cff) 45%,var(--line,#ddd));' +
      'color:var(--ink,#111);font-size:13.5px;line-height:1.4}.rc-tour b{font-weight:700}.rc-tour .rc-tour-go{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}' +
      '.rc-tour a{display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:8px;font-weight:600;text-decoration:none;border:1px solid var(--line,#ccc);color:var(--ink,#111)}' +
      '.rc-tour a.rc-tour-talk{background:var(--accent,#7c5cff);border-color:transparent;color:#fff}';
    document.head.appendChild(st);
    const bar = document.createElement('div');
    bar.className = 'rc-tour';
    bar.innerHTML = '<span><b>You\'re on the RoadCoda tour.</b> This is ' + (data.tour_carrier || 'a sample company').replace(/\s*\(sample\)\s*$/i, '') +
      ', a sample carrier. Click anything and try it — nothing you do is saved.</span><span class="rc-tour-go">' +
      '<a href="driver.html">See the driver\'s phone</a>' +
      '<a class="rc-tour-talk" href="mailto:support@roadcoda.com?subject=RoadCoda%20%E2%80%94%20I%20took%20the%20tour">Talk to us</a>' +
      '<a class="rc-tour-leave" href="#">Back to roadcoda.com</a></span>';
    const place = () => { const main = document.querySelector('main'); if (main && !main.querySelector('.rc-tour')) main.insertBefore(bar, main.firstChild); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
    const leave = async (e) => { e.preventDefault(); e.stopImmediatePropagation(); try { await c.auth.signOut(); } catch (_) {} location.href = 'https://roadcoda.com/'; };
    bar.querySelector('.rc-tour-leave').addEventListener('click', leave);
    // the page's own Sign out button leaves the tour instead of showing a sign-in form
    document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('#signout'); if (b) leave(e); }, true);
    const relabel = () => { const b = document.getElementById('signout'); if (b) b.textContent = 'Leave the tour'; };
    relabel(); setTimeout(relabel, 800); setTimeout(relabel, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
