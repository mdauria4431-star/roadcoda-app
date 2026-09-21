// RoadCoda: sample employee handbook wording (#19).
// SAMPLE LANGUAGE ONLY — NOT LEGAL ADVICE. Every carrier must have its own
// attorney review its handbook before using it; employment law differs by state.
// {placeholders} are filled from the carrier's answers on Setup › Handbooks;
// anything not answered prints as [fill in: …]. Lines starting "- " are bullets.
(function (root) {
  const FIELDS = {
    both: [
      ['company', 'Company legal name', 'e.g. Ridgeline Dedicated LLC'], ['dba', 'Doing business as (optional)', ''], ['address', 'Main address', ''],
      ['phone', 'Main phone', ''], ['state', 'State(s) where employees work', 'e.g. New Jersey'], ['effective', 'Effective date', 'e.g. October 1, 2026'],
      ['hr_name', 'Who handles HR questions', 'name or title'], ['hr_contact', 'HR phone / email', ''], ['payday', 'Payday', 'e.g. every Friday by direct deposit'],
      ['probation_days', 'Introductory period (days, optional)', 'e.g. 90'], ['holidays', 'Paid holidays', 'e.g. New Year\'s Day, Memorial Day, July 4th, Labor Day, Thanksgiving, Christmas'],
      ['pto', 'Paid time off policy (your words)', 'e.g. 5 days after 90 days, 10 days after one year'],
    ],
    driver: [
      ['dispatch_phone', 'Dispatch phone (24/7)', ''], ['safety_name', 'Safety contact (name or title)', ''], ['safety_phone', 'Safety phone', ''],
      ['der_name', 'DOT drug & alcohol contact (DER)', 'Designated Employer Representative'], ['passengers', 'Passengers', 'none|authorized'],
      ['pc', 'Personal conveyance', 'no|yes'], ['fuel_card', 'Fuel card rules (your words, optional)', 'e.g. company trucks only; no personal fuel or purchases'],
      ['uniform', 'Uniform / appearance (optional)', 'e.g. company shirt and safety vest at customer sites'],
    ],
    office: [
      ['office_hours', 'Normal office hours', 'e.g. Monday–Friday, 8:00 am – 5:00 pm'], ['remote', 'Remote work', 'no|approved'],
      ['dress', 'Dress code (optional)', 'e.g. business casual'],
    ],
  };

  const T = (key, title, text) => ({ key, title, text });
  const COMMON_START = [
    T('welcome', 'Welcome', `Welcome to {company_name}. This handbook explains how we work and what we expect of each other. It does not cover every situation — when something isn't covered, ask {hr_name}, {hr_contact}.\n\nThis handbook takes effect {effective}. We may change it at any time; when we do, you will get the new version and be asked to acknowledge it.`),
    T('at_will', 'Employment relationship', `[Attorney: confirm this section for {state}.] Unless a written agreement signed by an owner says otherwise, employment with {company_name} is at will: either you or the company may end it at any time, with or without cause or notice. Nothing in this handbook is a contract or a promise of employment for any length of time.`),
    T('eeo', 'Equal opportunity and respect at work', `{company_name} makes employment decisions without regard to race, color, religion, sex (including pregnancy, sexual orientation and gender identity), national origin, age, disability, genetic information, veteran status, or any other status protected by federal, state or local law. [Attorney: add any categories {state} protects.]\n\nHarassment, discrimination and retaliation are not tolerated — from co-workers, managers, customers or anyone else we deal with. If you experience or see it, tell {hr_name} or any owner. You will not be punished for reporting in good faith.`),
    T('intro_period', 'Introductory period', `New employees work an introductory period of {probation_days} days so both sides can see whether the job is a good fit. Finishing it does not change the at-will relationship.`),
  ];
  const COMMON_END = [
    T('pto', 'Paid time off and holidays', `Paid time off: {pto}\n\nPaid holidays: {holidays}\n\nAsk for time off as early as you can, and in writing. [Attorney: check {state}'s paid sick leave and payout rules.]`),
    T('conduct', 'Conduct and discipline', `We expect honesty, safe work, respect for customers and co-workers, and care for company equipment. Examples of conduct that can lead to discipline up to and including termination:\n- Dishonesty, including false records or logs\n- Working under the influence of alcohol or drugs\n- Violence, threats or weapons at work\n- Theft or misuse of company or customer property\n- Harassment or discrimination\n- Repeated lateness or no-call/no-show\n\nThe company decides the discipline that fits the situation; it does not have to follow any set order of steps.`),
    T('privacy', 'Company systems and information', `Company phones, computers, email, apps (including RoadCoda) and vehicles are for company business and may be monitored. Customer information, rates and routes are confidential — do not share them outside the company.`),
    T('leaving', 'Leaving the company', `Please give at least two weeks' notice if you resign. Return all company property — keys, cards, phones, uniforms, equipment — by your last day. Your final pay will be handled as {state} law requires. [Attorney: confirm final pay timing for {state}.]`),
  ];

  const DRIVER = [
    ...COMMON_START,
    T('pay', 'Pay and the pay week', `Driver pay follows your written pay rates (per mile, stop, load, hour, day or other items shown in your pay statement). The pay week runs {pay_week}. Only completed trips that dispatch has verified are paid; a trip still being checked is paid in the next week. Payday: {payday}.\n\nYou can see your own pay lines in the driver app under My pay. If something looks wrong, tell the office right away.`),
    T('hos', 'Hours of service and the ELD', `Every driver follows the federal hours-of-service rules (49 CFR Part 395) and records duty status on the electronic logging device. Never drive past your available hours, and never ask anyone to change a log. If dispatch asks for something you can't legally do, say so — you will not be disciplined for refusing to break hours-of-service rules.`),
    T('drug_alcohol', 'Drug and alcohol testing', `Drivers in safety-sensitive jobs are covered by our separate DOT drug and alcohol testing policy (49 CFR Parts 40 and 382), which you receive and sign for separately. Questions go to our Designated Employer Representative: {der_name}.`),
    T('inspections', 'Vehicle inspections', `Do a pre-trip inspection before every trip and a post-trip inspection at the end of the day, and report defects on the vehicle inspection report. Do not drive a vehicle with a defect that makes it unsafe — call dispatch at {dispatch_phone}.`),
    T('safe_driving', 'Safe driving', `- Seat belt on, always\n- Obey speed limits and slow down for weather, work zones and traffic\n- {cell_rule}\n- No passengers {passenger_rule}\n- Personal conveyance: {pc_rule}\n- Use the driver app only when the truck is stopped — it locks while moving`),
    T('accidents', 'Accidents and injuries', `If you are in an accident or hurt at work:\n- Make the scene safe and call 911 if anyone is hurt\n- Call dispatch at {dispatch_phone}\n- Report it in the driver app (Report accident / injury): photos, other parties, and witness cards\n- Don't admit fault or discuss blame at the scene — give facts to police and the company\n\nSome accidents require a post-accident drug and alcohol test under DOT rules; the app and dispatch will tell you. Safety contact: {safety_name}, {safety_phone}.`),
    T('customers', 'At the customer', `You represent {company_name} at every stop. Be courteous, follow each customer's site rules and delivery instructions, and keep door and gate codes private. Scan and photograph as the app asks, get the receiver's name, and report shortages, overages or damage (OS&D) before you leave. Dispatch handles delays and detention with the customer — you don't have to.`),
    T('equipment', 'Trucks, fuel and equipment', `Keep your truck clean and secure; lock it whenever you leave it. Fuel card rules: {fuel_card}. Report tolls, tickets and damage right away.\n\nUniform and appearance: {uniform}`),
    ...COMMON_END,
  ];

  const OFFICE = [
    ...COMMON_START,
    T('hours', 'Work hours and timekeeping', `Normal office hours are {office_hours}. Your manager will tell you your schedule.\n\nIf you are paid by the hour, record all time worked accurately — by clocking in and out, or as your manager directs — and don't work off the clock. Overtime must be approved in advance, and is paid as the law requires. [Attorney: confirm overtime rules for {state}.]`),
    T('pay', 'Pay', `Office staff are paid {office_schedule}. Payday: {payday}. Tell {hr_name} right away if your pay looks wrong.`),
    T('remote', 'Working remotely', `{remote_rule}`),
    T('dress', 'Dress and appearance', `{dress}`),
    T('safety', 'Safety', `Report any injury, however minor, to {hr_name} the same day. Keep walkways and exits clear, and report unsafe conditions.`),
    ...COMMON_END,
  ];

  const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  function derived(a, ctx) {
    const start = (ctx.pay_week_start || 7) - 1, end = (start + 6) % 7;
    return {
      company_name: a.dba ? `${a.company || '[fill in: company legal name]'} (doing business as ${a.dba})` : a.company,
      pay_week: `${WEEK[start]} 12:01 am to ${WEEK[end]} 11:59 pm`,
      office_schedule: { W: 'every week', B: 'every two weeks', S: 'twice a month (the 1st–15th and the 16th–end of month)', M: 'once a month' }[ctx.office_pay_frequency] || 'on the company pay schedule',
      cell_rule: 'No hand-held phone use while driving — federal rules for commercial drivers allow only hands-free, one-touch use (49 CFR 392.80 and 392.82). No texting, ever',
      passenger_rule: a.passengers === 'authorized' ? 'unless an owner has authorized them in writing in advance' : 'at any time',
      pc_rule: a.pc === 'yes' ? 'allowed only within company rules and FMCSA guidance, logged correctly on the ELD; ask the safety contact before first use' : 'not allowed',
      remote_rule: a.remote === 'approved' ? 'Remote work may be approved by your manager in writing. When working remotely, follow the same hours, timekeeping and confidentiality rules as in the office.' : 'Office positions are performed at the office unless an owner approves otherwise in writing.',
    };
  }
  const BLANK = (label) => `<mark>[fill in: ${label}]</mark>`;
  function fill(text, a, ctx, labels) {
    const d = derived(a, ctx);
    return text.replace(/\{(\w+)\}/g, (_, k) => {
      const v = d[k] != null && d[k] !== '' ? d[k] : a[k];
      return v != null && String(v).trim() !== '' ? escHtml(String(v)) : BLANK(labels[k] || k.replace(/_/g, ' '));
    });
  }
  function escHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  // text → HTML: paragraphs, "- " bullets
  function toHtml(filled) {
    return filled.split(/\n\n+/).map(block => {
      const lines = block.split('\n');
      if (lines.every(l => l.startsWith('- '))) return '<ul>' + lines.map(l => `<li>${l.slice(2)}</li>`).join('') + '</ul>';
      return lines.map(l => l.startsWith('- ') ? `<ul><li>${l.slice(2)}</li></ul>` : `<p>${l}</p>`).join('');
    }).join('\n');
  }
  function sections(kind) { return kind === 'office' ? OFFICE : DRIVER; }
  function labelsFor(kind) { return Object.fromEntries([...FIELDS.both, ...FIELDS[kind]].map(([k, l]) => [k, l.toLowerCase()])); }

  // Build the whole handbook. setup = { answers, sections: {key: {off, text}} }, ctx = { pay_week_start, office_pay_frequency }
  function build(kind, setup, ctx, opt) {
    const a = setup.answers || {}, over = setup.sections || {}, labels = labelsFor(kind), o = opt || {};
    // [Attorney: …] notes are for the carrier's lawyer: kept in drafts and the Word file, dropped from the published copy
    const strip = (t) => o.draft ? t : t.replace(/\s*\[Attorney:[^\]]*\]\s*/g, ' ').replace(/^ +| +$/gm, '');
    const list = sections(kind).filter(s => !(over[s.key] && over[s.key].off) && !(s.key === 'intro_period' && !a.probation_days) && !(s.key === 'dress' && !a.dress));
    const title = `${kind === 'office' ? 'Office Staff' : 'Driver'} Handbook`;
    // wording is escaped first, so a carrier's own text can never carry HTML
    const body = list.map((s, i) => `<h2>${i + 1}. ${escHtml(s.title)}</h2>\n${toHtml(fill(escHtml(strip((over[s.key] && over[s.key].text) || s.text)), a, ctx, labels))}`).join('\n');
    const ack = `<h2>Acknowledgment</h2><p>I received the ${escHtml(a.company || 'company')} ${title}${o.version ? ' (version ' + o.version + ')' : ''}. I understand it is my responsibility to read it and follow it, that the company may change it, and that it is not a contract of employment.</p>
      <p>Name: ______________________________ &nbsp; Signature: ______________________________ &nbsp; Date: ____________</p>`;
    const draft = o.draft ? `<div class="draft">DRAFT — SAMPLE LANGUAGE, NOT LEGAL ADVICE. Have your attorney review this handbook before you use it.</div>` : '';
    const blanks = (body.match(/\[fill in:/g) || []).length;
    const html = `${draft}<h1>${fill('{company_name}', a, ctx, labels)}</h1><div class="sub">${title}${o.version ? ' · Version ' + o.version : ''} · Effective ${fill('{effective}', a, ctx, labels)}</div>\n${body}\n${ack}`;
    return { title, html, blanks, count: list.length };
  }
  const CSS = `body{font-family:Georgia,'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#111;max-width:7in;margin:0 auto}
    h1{font-family:Arial,sans-serif;font-size:22pt;margin:0 0 4pt} .sub{font-family:Arial,sans-serif;color:#555;margin-bottom:18pt}
    h2{font-family:Arial,sans-serif;font-size:14pt;margin:18pt 0 6pt;page-break-after:avoid} p{margin:0 0 8pt} ul{margin:0 0 8pt 18pt}
    mark{background:#fff3b0} .draft{border:2px solid #b00;color:#b00;font-family:Arial,sans-serif;font-weight:bold;padding:6pt 10pt;margin-bottom:14pt}`;

  const api = { FIELDS, sections, build, CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RC_HANDBOOK = api;
})(typeof window !== 'undefined' ? window : this);
