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
  { id: '2026-10-02-fuel-feed', date: '2026-10-02', title: 'Fuel-card purchases come in by themselves',
    body: 'With Motive or Geotab connected, fuel bought on the company cards now comes into RoadCoda on its own: Motive Card (every item on the ticket), the other cards connected in Motive (EFS, Comdata, WEX, Fleetcor) and the cards loaded into Geotab. Diesel goes straight into the IFTA report by state. Anything worth a look (snacks or gas on the card, a purchase on a day with no load, far from where the truck was) is listed on Payroll: press Deduct to take it from the driver\'s pay, or OK. Nothing is deducted by itself.',
    link: 'payroll.html', linkText: 'Open Payroll', screen: ['payroll', 'ifta'] },
  { id: '2026-10-02-eld-dvir', date: '2026-10-02', title: 'Inspections from Samsara, Motive and Geotab',
    body: 'Drivers who do their pre-trip and post-trip in the Samsara, Motive or Geotab app now show up in RoadCoda too: the report under Safety › Inspections (marked with the ELD\'s name), and each defect on Dispatch, Equipment and the open-defects list. An unsafe defect takes the truck or trailer out of service until it\'s repaired, here or in the ELD (a repair signed off there is picked up within the hour). It comes in with the ELD connection; switch it off on the Integrations page.',
    link: 'inspections.html', linkText: 'Open Inspections', screen: ['equipment', 'safety', 'dispatch'] },
  { id: '2026-10-02-here-truck', date: '2026-10-02', title: 'Truck miles and truck tolls',
    body: 'Work out miles on a load now uses truck routing: the route a truck can legally take for its height, weight, length and axles (no low bridges, parkways or truck-restricted roads), the drive time for a truck, and the truck\'s own toll price at E-ZPass rates for its real axle count. The load also shows miles by state. Put the truck on the load first for the exact toll; without one it works it out for a tractor with a 53\' trailer. Change to a truck with more or fewer axles and the toll estimate adjusts. The Route planner and load ETAs now use truck drive times too (not car times with a factor), and address lookups come from the same truck map.',
    link: 'loads.html', linkText: 'Open Loads', screen: ['loads', 'dispatch'] },
  { id: '2026-09-30-compliance-watch', date: '2026-09-30', title: 'Compliance watch: CSA scores, return to duty, revoked ELDs',
    body: 'Safety › Compliance watch puts what an auditor or insurer looks at first on one page. Add your USDOT number and RoadCoda pulls your CSA categories, out-of-service rates and crashes from FMCSA every Monday — and flags a category that\'s climbing or near the threshold before it turns into a warning letter; new alerts can be emailed to your safety contact. It also tracks return to duty after a drug or alcohol violation (SAP, the return-to-duty test, follow-up tests — Dispatch sees only "not cleared"), checks your ELD against the devices FMCSA has revoked, and lists overdue Clearinghouse queries, CDLs and medical cards.',
    link: 'compliance-watch.html', linkText: 'Open Compliance watch', screen: ['safety'] },
  { id: '2026-09-30-pod-check', date: '2026-09-30', title: 'AI check of BOLs and PODs before you bill',
    body: 'Every BOL / POD photo or scan on a load is now read by AI a few minutes after it\'s added. It flags what makes a customer short-pay: no receiver signature, a PO that isn\'t the customer\'s, the receiver\'s written exception (short, damaged), a count that doesn\'t match, a missing page, or a photo it can\'t read. You\'ll see it on the trip under Documents and as the close-out flag AI — look at the photo, then fix it or click "Checked — it\'s fine". It never blocks billing on its own.',
    screen: ['dispatch', 'invoices'], feature: 'pod_check' },
  { id: '2026-09-30-load-fill', date: '2026-09-30', title: 'Dispatch: how full each truck is, live',
    body: 'A new Full column on the dispatch board shows how full each truck is right now: what it left with, less what\'s been delivered, plus what\'s been picked up (returns, cores, cages, totes) — refused freight stays on. Before a truck leaves, under 80% shows amber and 80% or more green; once it\'s running, it turns amber at 90% and red at 100% so you know there\'s no room for returns. Hover for the pallets. Set each truck\'s capacity on Equipment.',
    link: 'dispatch.html', linkText: 'Open Dispatch', screen: ['dispatch'] },
  { id: '2026-09-30-receivables', date: '2026-09-30', title: 'Receivables: payments, short-pays and aging',
    body: 'Money › Receivables shows every open invoice by customer — current, 1–30, 31–60, 61–90 and 90+ days past due. Record a check once and apply it to several invoices (partial payments too); anything left over stays on the customer\'s account as a credit. Short-paid invoices stay open with a note until collected or written off. One click emails a customer a statement of what\'s open.',
    link: 'ar.html', linkText: 'Open Receivables', screen: ['invoices'], feature: 'invoicing' },
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
