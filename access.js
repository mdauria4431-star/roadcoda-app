// RoadCoda: screen access for office pages (include after config.js on every office page).
// - Hides menu links to screens this user can't open, and adds Users / My account links.
// - Blocks a screen the user can't open, and shows "View only" where they can only look.
// - Money (prices, revenue, costs) and driver pay stay hidden unless the user may see them.
// The database enforces all of this too; this script only keeps the screens tidy.
(function () {
  const SCREEN_OF = {
    'index.html': 'home', '': 'home', 'dispatch.html': 'dispatch', 'trip.html': 'dispatch', 'templates.html': 'dispatch', 'payroll.html': 'payroll', 'activity.html': 'invoices', 'profit.html': 'money', 'messages.html': 'dispatch', 'incidents.html': 'safety', 'safety.html': 'safety', 'customer-logins.html': 'customers', 'ratings.html': 'dispatch', 'retention.html': 'safety', 'getting-started.html': 'home', 'containers.html': 'containers', 'office-payroll.html': 'office_payroll', 'handbooks.html': 'safety', 'trip-sheet.html': 'dispatch', 'ifta.html': 'ifta', 'qb-export.html': 'invoices', 'compliance.html': 'safety', 'claims.html': 'safety', 'loads.html': 'loads', 'customers.html': 'customers',
    'drivers.html': 'drivers', 'equipment.html': 'equipment', 'rates.html': 'rates', 'invoices.html': 'invoices',
    'tolls.html': 'tolls', 'integrations.html': 'integrations', 'users.html': 'users', 'features.html': 'home', 'devices.html': 'home', 'planner.html': 'dispatch',
  };
  // Pages that belong to a module the carrier can switch off (82)
  const FEATURE_OF = { 'containers.html': 'containers', 'ifta.html': 'ifta', 'claims.html': 'claims', 'compliance.html': 'compliance', 'handbooks.html': 'handbooks',
    'retention.html': 'retention', 'office-payroll.html': 'office_payroll', 'qb-export.html': 'quickbooks', 'tolls.html': 'tolls', 'profit.html': 'profit',
    'activity.html': 'activity_files', 'ratings.html': 'ratings', 'trip-sheet.html': 'trip_sheets', 'planner.html': 'route_planner' };
  const FEATURE_NAME = { containers: 'Returnable containers', ifta: 'IFTA fuel tax', claims: 'Claims & subrogation', compliance: 'Driver files & inspections', handbooks: 'Employee handbooks',
    retention: 'Onboarding & retention', office_payroll: 'Office staff payroll', quickbooks: 'QuickBooks export', tolls: 'Tolls', profit: 'Profit reports', activity_files: 'Customer activity files',
    ratings: 'Delivery ratings', trip_sheets: 'Trip sheets', route_planner: 'Route planner' };
  const pageFile = location.pathname.split('/').pop() || 'index.html';
  const NAMES = { dispatch: 'Dispatch', loads: 'Loads', customers: 'Customers', drivers: 'Drivers', equipment: 'Equipment', rates: 'Rates',
                  invoices: 'Invoices', tolls: 'Tolls', payroll: 'Payroll', money: 'Profit (needs the money switch)', safety: 'Incidents', containers: 'Containers', office_payroll: 'Office payroll', ifta: 'IFTA / fuel tax', integrations: 'Integrations', users: 'Users' };
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
    if (data.money) document.documentElement.classList.add('rc-money');
    if (data.pay) document.documentElement.classList.add('rc-pay');

    // Menu: remove screens they can't open; add Users (if allowed) and My account
    const nav = document.querySelector('header nav');
    if (nav) {
      nav.querySelectorAll('a').forEach((a) => { const h = a.getAttribute('href'), s = SCREEN_OF[h]; if ((s && s !== 'home' && !can(s)) || (FEATURE_OF[h] && !data.feature(FEATURE_OF[h]))) a.remove(); });
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
      if (!nav.querySelector('a[href="account.html"]')) {
        const a = document.createElement('a'); a.href = 'account.html'; a.textContent = 'My account'; nav.appendChild(a);
      }
    }
    if (FEATURE_OF[pageFile] && !data.feature(FEATURE_OF[pageFile])) {
      document.documentElement.classList.add('rc-blocked');
      note(`<b>${FEATURE_NAME[FEATURE_OF[pageFile]] || 'This module'}</b> is switched off for your company. ${data.owner || can('users', 'edit') ? '<a href="features.html">Switch it on under Features</a>.' : 'Ask the owner if you need it.'} <a href="index.html">Go to Home</a>`);
    } else if (page && page !== 'home' && !can(page)) {
      document.documentElement.classList.add('rc-blocked');
      note(`You don't have access to <b>${NAMES[page] || 'this screen'}</b>. Ask the owner if you need it. <a href="index.html">Go to Home</a>`);
    } else if (page && page !== 'home' && !can(page, 'edit')) {
      note(`<b>View only.</b> You can look at ${NAMES[page] || 'this screen'} but not change anything here.`);
    }
    resolveReady(data);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
