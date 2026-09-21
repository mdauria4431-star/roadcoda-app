// RoadCoda: screen access for office pages (include after config.js on every office page).
// - Hides menu links to screens this user can't open, and adds Users / My account links.
// - Blocks a screen the user can't open, and shows "View only" where they can only look.
// - Money (prices, revenue, costs) and driver pay stay hidden unless the user may see them.
// The database enforces all of this too; this script only keeps the screens tidy.
(function () {
  const SCREEN_OF = {
    'index.html': 'home', '': 'home', 'dispatch.html': 'dispatch', 'trip.html': 'dispatch', 'templates.html': 'dispatch', 'payroll.html': 'payroll', 'activity.html': 'invoices', 'profit.html': 'money', 'loads.html': 'loads', 'customers.html': 'customers',
    'drivers.html': 'drivers', 'equipment.html': 'equipment', 'rates.html': 'rates', 'invoices.html': 'invoices',
    'tolls.html': 'tolls', 'integrations.html': 'integrations', 'users.html': 'users',
  };
  const NAMES = { dispatch: 'Dispatch', loads: 'Loads', customers: 'Customers', drivers: 'Drivers', equipment: 'Equipment', rates: 'Rates',
                  invoices: 'Invoices', tolls: 'Tolls', payroll: 'Payroll', money: 'Profit (needs the money switch)', integrations: 'Integrations', users: 'Users' };
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
    window.RC_ACCESS = data;
    if (data.money) document.documentElement.classList.add('rc-money');
    if (data.pay) document.documentElement.classList.add('rc-pay');

    // Menu: remove screens they can't open; add Users (if allowed) and My account
    const nav = document.querySelector('header nav');
    if (nav) {
      nav.querySelectorAll('a').forEach((a) => { const s = SCREEN_OF[a.getAttribute('href')]; if (s && s !== 'home' && !can(s)) a.remove(); });
      if (can('users') && !nav.querySelector('a[href="users.html"]')) {
        const a = document.createElement('a'); a.href = 'users.html'; a.textContent = 'Users'; if (page === 'users') a.className = 'on';
        const drv = nav.querySelector('a[href="driver.html"]'); nav.insertBefore(a, drv || null);
      }
      if (!nav.querySelector('a[href="account.html"]')) {
        const a = document.createElement('a'); a.href = 'account.html'; a.textContent = 'My account'; nav.appendChild(a);
      }
    }
    if (page && page !== 'home' && !can(page)) {
      document.documentElement.classList.add('rc-blocked');
      note(`You don't have access to <b>${NAMES[page] || 'this screen'}</b>. Ask the owner if you need it. <a href="index.html">Go to Home</a>`);
    } else if (page && page !== 'home' && !can(page, 'edit')) {
      note(`<b>View only.</b> You can look at ${NAMES[page] || 'this screen'} but not change anything here.`);
    }
    resolveReady(data);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
