// RoadCoda: turns the shared page header into the console sidebar.
// Include on every office page AFTER access.js:
//     <script src="access.js"></script>
//     <script src="shell.js"></script>
// It waits for access.js to finish hiding screens before it groups the menu,
// so a link this user can't open never leaves an empty group behind.
// Nothing here changes what a page does — only how the furniture is arranged.
(function () {
  'use strict';

  // Theme first, before anything paints, so there's no flash of the wrong one.
  // Auto (the default) follows the device — light by day, dark at night if the
  // phone or computer switches — and changes live when the device does.
  // Light or Dark, once picked, sticks on this device.
  var html = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var pref = 'auto';
  try { var saved = localStorage.getItem('rc-theme'); if (saved === 'light' || saved === 'dark' || saved === 'auto') pref = saved; } catch (e) {}
  function applyTheme() {
    var t = pref === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : pref;
    html.setAttribute('data-rc-theme', t);
    html.setAttribute('data-rc-theme-pref', pref);
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', t === 'light' ? '#e9edf4' : '#070c14');
    if (window.RC_THEME && window.RC_THEME.onchange) window.RC_THEME.onchange();
  }
  window.RC_THEME = {
    get: function () { return pref; },
    set: function (p) { pref = p; try { localStorage.setItem('rc-theme', p); } catch (e) {} applyTheme(); },
    onchange: null,
  };
  applyTheme();
  if (mq) { var live = function () { if (pref === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', live); else if (mq.addListener) mq.addListener(live); }
  try {
    if (localStorage.getItem('rc-rail') === 'in') document.documentElement.classList.add('rc-rail-in');
  } catch (e) {}

  // The mark: octagon, violet hairline, the R traced from the real artwork.
  var MARK =
    '<svg viewBox="-1 -1 26 26" aria-hidden="true">' +
    '<path style="fill:var(--hexfill)" d="M23.09 7.41L16.59 0.91H7.41L0.91 7.41V16.59L7.41 23.09H16.59L23.09 16.59Z"/>' +
    '<path style="fill:none;stroke:var(--rim);stroke-width:1;vector-effect:non-scaling-stroke" d="M23.09 7.41L16.59 0.91H7.41L0.91 7.41V16.59L7.41 23.09H16.59L23.09 16.59Z"/>' +
    '<path style="fill:var(--glyph)" transform="translate(12 12) scale(1.07) translate(-11.77 -12.25)" ' +
    'd="M6.72 7.27 L8.13 9.17 L13.61 9.17 L13.93 9.23 L14.20 9.38 L14.45 9.65 L14.54 9.82 L14.62 10.16 L14.62 10.39 ' +
    'L14.54 10.75 L14.41 10.98 L14.22 11.19 L14.01 11.34 L13.61 11.46 L9.63 11.48 L9.63 13.09 L13.70 17.22 L16.69 17.22 ' +
    'L12.98 13.27 L13.00 13.23 L13.70 13.23 L14.18 13.17 L14.94 12.94 L15.49 12.64 L15.82 12.39 L16.16 12.05 L16.46 11.65 ' +
    'L16.67 11.21 L16.79 10.68 L16.81 10.26 L16.75 9.71 L16.63 9.27 L16.39 8.79 L16.08 8.34 L15.70 7.96 L15.32 7.69 ' +
    'L15.00 7.52 L14.60 7.37 L14.20 7.29 Z"/></svg>';

  // Six visible groups instead of eleven flat links. Setup is weekly work, so
  // it folds away — that's what buys the dispatch board its width.
  var GROUPS = [
    { name: 'Daily', items: ['index.html', 'dispatch.html', 'messages.html', 'ratings.html', 'templates.html', 'loads.html', 'containers.html'] },
    { name: 'Money', items: ['invoices.html', 'activity.html', 'payroll.html', 'office-payroll.html', 'profit.html', 'tolls.html', 'ifta.html', 'qb-export.html'] },
    { name: 'Safety', items: ['incidents.html', 'claims.html', 'compliance.html', 'retention.html', 'handbooks.html'] },
    { name: 'Setup', items: ['getting-started.html', 'customers.html', 'customer-logins.html', 'drivers.html', 'equipment.html', 'rates.html', 'integrations.html', 'users.html', 'features.html', 'devices.html'], fold: true },
  ];
  var ICON = {
    'index.html': '◎', 'dispatch.html': '▤', 'messages.html': '✉', 'ratings.html': '★', 'incidents.html': '⚠', 'retention.html': '♥', 'handbooks.html': '▭', 'compliance.html': '☑', 'claims.html': '⚖', 'features.html': '⊞', 'devices.html': '▯', 'getting-started.html': '✓', 'templates.html': '↻', 'loads.html': '▸', 'containers.html': '▦',
    'invoices.html': '§', 'activity.html': '≡', 'payroll.html': '$', 'office-payroll.html': '$', 'profit.html': '%', 'tolls.html': '¤', 'ifta.html': '⛽', 'qb-export.html': '⇪',
    'customers.html': '·', 'drivers.html': '·', 'equipment.html': '·',
    'rates.html': '·', 'integrations.html': '·', 'users.html': '·',
    'driver.html': '▢', 'account.html': '⊙',
  };
  var NAME = { 'index.html': 'Home', 'dispatch.html': 'Dispatch', 'loads.html': 'Loads',
    'invoices.html': 'Invoices', 'tolls.html': 'Tolls', 'customers.html': 'Customers',
    'drivers.html': 'Drivers', 'equipment.html': 'Equipment', 'rates.html': 'Rates',
    'integrations.html': 'Integrations', 'users.html': 'Users', 'driver.html': 'Driver app',
    'account.html': 'My account', 'trip.html': 'Trip', 'templates.html': 'Templates', 'payroll.html': 'Payroll', 'activity.html': 'Activity file', 'profit.html': 'Profit', 'messages.html': 'Messages', 'incidents.html': 'Incidents', 'customer-logins.html': 'Customer logins', 'ratings.html': 'Ratings', 'retention.html': 'Retention', 'getting-started.html': 'Getting started', 'features.html': 'Features', 'devices.html': 'Devices' };

  function href(a) { return (a.getAttribute('href') || '').split('/').pop(); }

  // Give a link its icon and wrap its text. The wrap matters: collapsed, the
  // rail hides .rc-lbl, and a bare text node can't be hidden by CSS.
  function dress(a, key, noIcon) {
    if (!a || a.dataset.rcDressed) return;
    a.dataset.rcDressed = '1';
    var text = (a.textContent || '').trim();
    a.textContent = '';
    var lb = document.createElement('span');
    lb.className = 'rc-lbl';
    lb.textContent = text || NAME[key] || key;
    if (!noIcon) {
      var ic = document.createElement('span');
      ic.className = 'rc-ic';
      ic.textContent = ICON[key] || '·';
      a.appendChild(ic);
    }
    a.appendChild(lb);
    a.title = lb.textContent;          // the tooltip is the label when collapsed
  }

  function build() {
    var header = document.querySelector('header');
    var nav = header && header.querySelector('nav');
    if (!header || !nav) return;
    if (header.dataset.rcDone) return;
    header.dataset.rcDone = '1';

    // Title leads with the screen: Chrome fades long tab titles, so
    // "RoadCoda — Dispatch" renders as three identical tabs when three are open.
    var here = location.pathname.split('/').pop() || 'index.html';
    if (NAME[here]) document.title = NAME[here] + ' · RoadCoda';

    // Phones: the menu folds away behind a button (app.css shows it under 900px)
    var menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'rc-menubtn';
    menu.setAttribute('aria-label', 'Menu');
    menu.setAttribute('aria-expanded', 'false');
    menu.innerHTML = '<span aria-hidden="true">☰</span> <span>' + (NAME[location.pathname.split('/').pop() || 'index.html'] || 'Menu') + '</span>';
    menu.onclick = function () {
      var open = html.classList.toggle('rc-menu-open');
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    header.insertBefore(menu, header.firstChild);
    nav.addEventListener('click', function (e) { if (e.target.closest('a[href]:not([href="#"])')) html.classList.remove('rc-menu-open'); });

    // Brand gets the mark
    var brand = header.querySelector('.brand');
    if (brand && !brand.querySelector('.rc-mark')) {
      var m = document.createElement('span');
      m.className = 'rc-mark';
      m.innerHTML = MARK;
      var words = document.createElement('b');
      words.style.fontWeight = '700';
      words.innerHTML = brand.innerHTML;
      brand.innerHTML = '';
      brand.appendChild(m);
      brand.appendChild(words);
    }

    // The pages carry an inline style on <nav> for the old top bar
    // (display:flex; gap:14px; flex-wrap:wrap). An inline style beats any
    // stylesheet, and flex-wrap:wrap in a height-limited column wraps the menu
    // into a second column over the page. Drop it; app.css takes over.
    nav.removeAttribute('style');

    // Index the links access.js left in place
    var links = {};
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) { links[href(a)] = a; });
    // Templates lives under Dispatch: anyone who can open Dispatch gets it,
    // without every page having to carry the link in its own header.
    // Payroll likewise shows for anyone allowed to open it
    var acc = window.RC_ACCESS;
    if (!links['payroll.html'] && (!acc || (acc.can && acc.can('payroll')))) {
      var pl = document.createElement('a');
      pl.href = 'payroll.html'; pl.textContent = 'Payroll';
      if (here === 'payroll.html') pl.className = 'on';
      nav.appendChild(pl); links['payroll.html'] = pl;
    }
    // Profit is for whoever has the money switch
    if (!links['profit.html'] && (!acc || acc.money) && (!acc || !acc.feature || acc.feature('profit'))) {
      var pr = document.createElement('a');
      pr.href = 'profit.html'; pr.textContent = 'Profit';
      if (here === 'profit.html') pr.className = 'on';
      nav.appendChild(pr); links['profit.html'] = pr;
    }
    // The activity file lives with invoicing: whoever can open Invoices gets it
    if (links['invoices.html'] && !links['activity.html'] && (!acc || !acc.feature || acc.feature('activity_files'))) {
      var al = document.createElement('a');
      al.href = 'activity.html'; al.textContent = 'Activity file';
      if (here === 'activity.html') al.className = 'on';
      nav.appendChild(al); links['activity.html'] = al;
    }
    if (!links['customer-logins.html'] && (!acc || (acc.can && acc.can('customers')))) {
      var cl = document.createElement('a');
      cl.href = 'customer-logins.html'; cl.textContent = 'Customer logins';
      if (here === 'customer-logins.html') cl.className = 'on';
      nav.appendChild(cl); links['customer-logins.html'] = cl;
    }
    if (!links['retention.html'] && (!acc || (acc.can && acc.can('safety')))) {
      var rt = document.createElement('a');
      rt.href = 'retention.html'; rt.textContent = 'Retention';
      if (here === 'retention.html') rt.className = 'on';
      nav.appendChild(rt); links['retention.html'] = rt;
    }
    if (!links['getting-started.html'] && (!acc || (acc.can && acc.can('users')))) {
      var gs = document.createElement('a');
      gs.href = 'getting-started.html'; gs.textContent = 'Getting started';
      if (here === 'getting-started.html') gs.className = 'on';
      nav.appendChild(gs); links['getting-started.html'] = gs;
    }
    if (!links['incidents.html'] && (!acc || (acc.can && acc.can('safety')))) {
      var il = document.createElement('a');
      il.href = 'incidents.html'; il.textContent = 'Incidents';
      if (here === 'incidents.html') il.className = 'on';
      nav.appendChild(il); links['incidents.html'] = il;
    }
    if (links['dispatch.html'] && !links['messages.html']) {
      var ml = document.createElement('a');
      ml.href = 'messages.html'; ml.textContent = 'Messages';
      if (here === 'messages.html') ml.className = 'on';
      nav.appendChild(ml); links['messages.html'] = ml;
    }
    if (links['dispatch.html'] && !links['ratings.html']) {
      var rl = document.createElement('a');
      rl.href = 'ratings.html'; rl.textContent = 'Ratings';
      if (here === 'ratings.html') rl.className = 'on';
      nav.appendChild(rl); links['ratings.html'] = rl;
    }
    if (links['dispatch.html'] && !links['templates.html']) {
      var tl = document.createElement('a');
      tl.href = 'templates.html'; tl.textContent = 'Templates';
      if (here === 'templates.html') tl.className = 'on';
      nav.appendChild(tl); links['templates.html'] = tl;
    }

    var frag = document.createDocumentFragment();
    var used = {};
    GROUPS.forEach(function (g) {
      var present = g.items.filter(function (k) { return links[k]; });
      if (!present.length) return;
      var head = document.createElement('div');
      head.className = 'rc-sec';
      head.textContent = g.name;
      frag.appendChild(head);
      var box = frag;
      if (g.fold) {
        var toggle = document.createElement('a');
        toggle.href = '#';
        toggle.innerHTML = '<span class="rc-ic">⚙</span><span class="rc-lbl">' + g.name + '</span>';
        var sub = document.createElement('div');
        sub.className = 'rc-sub';
        var open = true;
        try { open = localStorage.getItem('rc-fold-' + g.name) !== 'shut'; } catch (e) {}
        sub.hidden = !open;
        toggle.title = g.name;
        toggle.onclick = function (ev) {
          ev.preventDefault();
          // Collapsed, the sub-list is hidden anyway — open the rail instead
          if (document.documentElement.classList.contains('rc-rail-in')) {
            document.documentElement.classList.remove('rc-rail-in');
            try { localStorage.setItem('rc-rail', 'out'); } catch (e) {}
            sub.hidden = false;
            return;
          }
          sub.hidden = !sub.hidden;
          try { localStorage.setItem('rc-fold-' + g.name, sub.hidden ? 'shut' : 'open'); } catch (e) {}
        };
        head.remove();                       // the fold button is its own label
        frag.appendChild(toggle);
        frag.appendChild(sub);
        box = sub;
      }
      present.forEach(function (k) {
        var a = links[k]; used[k] = 1;
        dress(a, k, !!g.fold);      // folded children are text, indented under the fold
        box.appendChild(a);
      });
      // A group whose links this user can't open shouldn't leave a heading behind
      if (!box.children.length) { head.remove(); }
    });

    // Anything not in a group (driver app, my account) goes to the bottom
    var rest = Object.keys(links).filter(function (k) { return !used[k]; });
    var foot = document.createElement('div');
    foot.className = 'rc-foot';
    rest.forEach(function (k) {
      dress(links[k], k);
      foot.appendChild(links[k]);
    });

    nav.innerHTML = '';
    nav.appendChild(frag);

    // Who am I, then the controls
    var who = header.querySelector('.who');
    if (who) header.appendChild(who);
    header.appendChild(foot);

    var theme = document.createElement('button');
    theme.type = 'button';
    theme.className = 'rc-railbtn';
    // Auto → Light → Dark → Auto
    function paintTheme() {
      var p = window.RC_THEME.get(), dark = html.getAttribute('data-rc-theme') !== 'light';
      theme.innerHTML = '<span class="rc-ic">' + (p === 'auto' ? '◐' : dark ? '☾' : '☀') + '</span><span class="rc-lbl">' +
        (p === 'auto' ? 'Auto (' + (dark ? 'dark' : 'light') + ')' : dark ? 'Dark' : 'Light') + '</span>';
      theme.title = p === 'auto' ? 'Follows this device. Click for Light.' : p === 'light' ? 'Click for Dark.' : 'Click to follow this device again.';
    }
    window.RC_THEME.onchange = paintTheme;
    paintTheme();
    theme.onclick = function () {
      var p = window.RC_THEME.get();
      window.RC_THEME.set(p === 'auto' ? 'light' : p === 'light' ? 'dark' : 'auto');
    };
    foot.appendChild(theme);

    var rail = document.createElement('button');
    rail.type = 'button';
    rail.className = 'rc-railbtn';
    function paintRail() {
      var inn = document.documentElement.classList.contains('rc-rail-in');
      rail.innerHTML = '<span class="rc-ic">' + (inn ? '»' : '«') + '</span><span class="rc-lbl">Collapse</span>';
    }
    paintRail();
    rail.onclick = function () {
      var inn = document.documentElement.classList.toggle('rc-rail-in');
      try { localStorage.setItem('rc-rail', inn ? 'in' : 'out'); } catch (e) {}
      paintRail();
    };
    foot.appendChild(rail);

    var out = header.querySelector('#signout');
    if (out) foot.appendChild(out);
  }

  function start() {
    // Let access.js settle first so grouping sees the final link set
    var ready = window.RC_ACCESS_READY || Promise.resolve(null);
    ready.then(build, build);
    // and a backstop in case access.js never loaded on this page
    setTimeout(build, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
