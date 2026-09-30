// What's new in RoadCoda (#68). Newest first. Add an entry here when something ships — nothing else to change.
//   id       never reused; once someone has seen it, it stops showing as new for them
//   date     the day it went live (YYYY-MM-DD)
//   title    a few plain words
//   body     what it does and what to do, in everyday words (dispatchers read this)
//   link     the screen to open, and linkText for the button
//   screen   only people who can open this screen see it (dispatch, customers, money, users…)
//   feature  only companies with this module switched on see it
// Who has seen what is kept per person on each computer or phone.
window.RC_WHATS_NEW = [
  { id: '2026-09-30-arriving', date: '2026-09-30', title: 'New customer notice: arriving soon',
    body: 'Stores can now get an "arriving in about an hour" email (or 30 minutes, or an hour and a half) before the driver\'s planned arrival, on top of "On the way". Tick "Arriving soon" on a stop customer (Customers) and pick how long before; the company default is on Rates › Customer notifications. It isn\'t sent if the driver is already there or a "Running late" notice went out.',
    link: 'customers.html', linkText: 'Open Customers', screen: ['customers'] },
  { id: '2026-09-30-dvir', date: '2026-09-30', title: 'Pre-trip and post-trip inspections in the driver app',
    body: 'Drivers now do their vehicle inspections on the phone: OK or Defect on each item, a photo and note for a defect, and a signature. A defect shows on Dispatch and Equipment right away; one marked "unsafe to drive" takes the truck out of service (and off the Route planner) until someone certifies the repair on Safety › Inspections. The next driver reviews that repair on their pre-trip. Edit the checklist, or add one for reefers or liftgate trucks, on the same page. Let your drivers know.',
    link: 'inspections.html', linkText: 'Open Inspections', screen: ['equipment', 'safety', 'dispatch'] },
  { id: '2026-09-30-fsc-peg', date: '2026-09-30', title: 'Contract fuel surcharges: peg and percent',
    body: 'For customers whose contract sets the fuel surcharge as a percent over a peg price (DOE − peg − discount, ÷ peg, × peg ÷ MPG × miles), pick "Peg and percent (contract)" on the Rates page. Every load in the customer\'s billing week gets the same percent, from the DOE week they ask for (current, 1 or 2 weeks before). If DOE is late because of a Monday holiday, the invoice uses the latest price and the difference is added to the next invoice as a true-up line with the math shown.',
    link: 'rates.html', linkText: 'Open Rates', screen: ['rates', 'money'] },
  { id: '2026-09-28-scorecard', date: '2026-09-28', title: 'On-time scorecard for each customer',
    body: 'See how you are doing for a customer week by week, month by month or quarter by quarter: on-time %, how late the late ones were, time at the store, issues, claims and miles. Print it or save it as a PDF for your business review. Your customers can see the same scorecard in their portal.',
    link: 'scorecard.html', linkText: 'Open the scorecard', screen: ['customers', 'dispatch'] },
  { id: '2026-09-28-nav-spanish', date: '2026-09-28', title: 'Driver app: Navigate button and Spanish',
    body: 'Each stop in the driver app now has a Navigate button that opens Google Maps, Apple Maps, Waze, CoPilot or Sygic — the driver picks one once. Drivers can also switch the app to Spanish with the EN / ES button at the top. Let your drivers know.',
    link: 'driver.html', linkText: 'See the driver app' },
  { id: '2026-09-28-planner-template', date: '2026-09-28', title: 'Route planner: start from your templates',
    body: 'On the Route planner, "Create from template and plan" makes the day\'s loads from the customer\'s saved templates and plans them in one click — no file to import for your regular runs. To make a template, plan and apply a normal day, then use "Save as template".',
    link: 'planner.html', linkText: 'Open the Route planner', screen: ['dispatch'], feature: 'route_planner' },
  { id: '2026-09-27-planner-help', date: '2026-09-27', title: 'Route planner tells you what to do',
    body: 'When a stop can\'t be planned, the planner now says why in plain words and what would fix it — for example "a truck would need to leave by 3:40" — with a button to try it. Change the leave time for just today, split an order that is too big for one truck, and see why a load is light. Customer settings are never changed from here.',
    link: 'planner.html', linkText: 'Open the Route planner', screen: ['dispatch'], feature: 'route_planner' },
  { id: '2026-09-27-dedicated', date: '2026-09-27', title: 'Dedicated trucks and drivers are planned first',
    body: 'Give a truck or driver a Home account (Equipment and Drivers). The planner uses that customer\'s own trucks and drivers first, keeps every assigned driver working, and only then tells you if rentals are needed — and how many.',
    link: 'equipment.html', linkText: 'Set Home accounts', screen: ['dispatch'], feature: 'route_planner' },
  { id: '2026-09-27-plan-goals', date: '2026-09-27', title: 'New planning goals',
    body: 'Pick "Lowest cost to the customer" (the usual choice), "Fewest trucks" when you are short of trucks, or "Fewest driver hours" when drivers are short on hours. "Aim for extra time at stops" leaves more room before each window closes.',
    link: 'planner.html', linkText: 'Open the Route planner', screen: ['dispatch'], feature: 'route_planner' },
  { id: '2026-09-27-cost-report', date: '2026-09-27', title: 'Cost report: what each delivery costs',
    body: 'Money › Cost report shows what each delivery costs — per stop, per case and per mile — by customer and by delivery location. Made for private fleets, useful to any carrier.',
    link: 'costs.html', linkText: 'Open the cost report', screen: ['money'], feature: 'cost_report' },
];

(function () {
  function uid() {
    try {
      var k = Object.keys(localStorage).filter(function (x) { return /^sb-.*-auth-token$/.test(x); })[0];
      var s = k && JSON.parse(localStorage.getItem(k));
      return (s && s.user && s.user.id) || 'anon';
    } catch (e) { return 'anon'; }
  }
  function key() { return 'rc-wn-seen-' + uid(); }
  function seen() {
    try {
      var v = localStorage.getItem(key());
      if (v == null) {
        // First visit on this device: anything older than 30 days isn't news
        var cut = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
        var old = window.RC_WHATS_NEW.filter(function (e) { return e.date < cut; }).map(function (e) { return e.id; });
        localStorage.setItem(key(), JSON.stringify(old)); return old;
      }
      return JSON.parse(v) || [];
    } catch (e) { return []; }
  }
  // Only what this person can use: their access and the company's modules
  function mine(acc) {
    return window.RC_WHATS_NEW.filter(function (e) {
      if (acc && e.screen && acc.can && !e.screen.some(function (s) { return acc.can(s) || (s === 'money' && acc.money); })) return false;
      if (acc && e.feature && acc.feature && !acc.feature(e.feature)) return false;
      return true;
    });
  }
  window.RC_WN = {
    mine: mine,
    isNew: function (e) { return seen().indexOf(e.id) < 0; },
    unseen: function (acc) { var s = seen(); return mine(acc).filter(function (e) { return s.indexOf(e.id) < 0; }); },
    markSeen: function () {
      try { var s = seen(); window.RC_WHATS_NEW.forEach(function (e) { if (s.indexOf(e.id) < 0) s.push(e.id); }); localStorage.setItem(key(), JSON.stringify(s)); } catch (e) {}
    },
  };
})();
