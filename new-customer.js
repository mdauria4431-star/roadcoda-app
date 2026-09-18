// RoadCoda: "New customer" window, shared by Loads, Dispatch and Rates.
// Adds a contract (bill-to) customer. Office logins only (the database enforces it).
// Use: RCNewCustomer.open(sb, (customer) => { ...select it... });
(function () {
  const css = `
  dialog.rc-nc{border:0;border-radius:12px;padding:0;width:min(640px,calc(100vw - 32px));color:var(--ink,#1c1f24);background:var(--surface,#fff);box-shadow:0 20px 60px rgba(0,0,0,.25)}
  dialog.rc-nc::backdrop{background:rgba(20,22,26,.45)}
  .rc-nc form{padding:20px 22px;display:grid;gap:14px}
  .rc-nc h2{margin:0;font-family:Archivo,sans-serif;font-size:20px}
  .rc-nc .g{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .rc-nc .full{grid-column:1/-1}
  .rc-nc label{display:grid;gap:4px;font-size:13px;font-weight:600;color:var(--muted,#5b5750)}
  .rc-nc input,.rc-nc select,.rc-nc textarea{height:40px;border:1px solid var(--line,#e2ddd3);border-radius:8px;padding:0 10px;font:inherit;font-size:15px;font-weight:400;color:var(--ink,#1c1f24);background:#fff}
  .rc-nc textarea{height:64px;padding:8px 10px;resize:vertical}
  .rc-nc .chk{display:flex;gap:8px;align-items:center;font-weight:500;color:var(--ink,#1c1f24)}
  .rc-nc .chk input{height:18px;width:18px}
  .rc-nc fieldset{border:1px solid var(--line,#e2ddd3);border-radius:10px;padding:10px 12px 12px;margin:0}
  .rc-nc legend{font-size:13px;font-weight:700;padding:0 6px}
  .rc-nc .hint{font-size:13px;color:var(--muted,#5b5750);margin:0}
  .rc-nc .err{color:var(--late,#8f2318);font-size:14px;min-height:1em}
  .rc-nc .acts{display:flex;gap:10px;justify-content:flex-end}
  .rc-nc button{height:40px;padding:0 16px;border-radius:8px;border:1px solid var(--line,#e2ddd3);background:#fff;font-weight:600;font:inherit;font-weight:600;cursor:pointer}
  .rc-nc button.p{background:var(--accent,#0f5e63);border-color:var(--accent,#0f5e63);color:#fff}
  @media (max-width:560px){.rc-nc .g{grid-template-columns:1fr}}`;

  const html = `
  <form method="dialog" novalidate>
    <h2>New customer</h2>
    <p class="hint">The company you haul for and bill. Their stores and suppliers are added later as delivery customers.</p>
    <div class="g">
      <label class="full">Customer name *<input name="name" required autocomplete="off" placeholder="e.g. ABC Foods"></label>
      <label>Customer code<input name="customer_code" maxlength="12" placeholder="ABC (used in invoice numbers)"></label>
      <label>Payment terms (days)<input name="terms_days" type="number" min="0" step="1" placeholder="Blank = your default"></label>
      <label>Contact name<input name="contact_name"></label>
      <label>Contact phone<input name="contact_phone" type="tel"></label>
      <label class="full">Contact / billing email<input name="contact_email" type="email"></label>
      <label class="full">Bill-to address<textarea name="bill_address" placeholder="Street, City, State ZIP"></textarea></label>
    </div>
    <fieldset>
      <legend>How you run and bill them</legend>
      <div class="g">
        <label class="full chk"><input type="checkbox" name="master_bill" checked> Master bill: one combined weekly invoice (untick for one invoice per load)</label>
        <label>Week starts on<select name="week_start_dow">
          <option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option>
          <option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select></label>
        <label>Miles billed by<select name="miles_basis"><option value="route">Route miles (Google)</option><option value="hub">Hub miles (driver odometer)</option></select></label>
        <label>Trucks start at (name)<input name="start_name" placeholder="e.g. ABC Route 9 DC"></label>
        <label>Start address<input name="start_address" placeholder="Blank = your yard"></label>
      </div>
    </fieldset>
    <p class="hint">Rates, the dedicated contract, CPI date, POs and invoice number format are set on the Rates page after saving.</p>
    <div class="err" role="alert"></div>
    <div class="acts"><button type="button" data-x>Cancel</button><button type="submit" class="p">Save customer</button></div>
  </form>`;

  let dlg, sbc, done;
  function build() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    dlg = document.createElement('dialog'); dlg.className = 'rc-nc'; dlg.innerHTML = html; document.body.appendChild(dlg);
    const f = dlg.querySelector('form'), err = dlg.querySelector('.err');
    dlg.querySelector('[data-x]').onclick = () => dlg.close();
    f.onsubmit = async (e) => {
      e.preventDefault(); err.textContent = '';
      const v = (n) => (f.elements[n].value || '').trim();
      const name = v('name');
      if (!name) { err.textContent = 'Enter the customer name.'; f.elements.name.focus(); return; }
      const email = v('contact_email');
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'That email doesn\'t look right.'; return; }
      const btn = f.querySelector('.p'); btn.disabled = true;
      try {
        const { data: same } = await sbc.from('customers').select('id, name').ilike('name', name.replace(/[%_]/g, '\\$&'));
        if (same && same.length) { err.textContent = `${same[0].name} is already a customer. Pick it from the list.`; return; }
        const row = {
          name, customer_code: v('customer_code').toUpperCase() || null,
          terms_days: v('terms_days') === '' ? null : parseInt(v('terms_days'), 10),
          contact_name: v('contact_name') || null, contact_phone: v('contact_phone') || null, contact_email: email || null,
          bill_address: v('bill_address') || null,
          master_bill: f.elements.master_bill.checked, week_start_dow: parseInt(f.elements.week_start_dow.value, 10),
          miles_basis: f.elements.miles_basis.value,
          start_name: v('start_name') || null, start_address: v('start_address') || null
        };
        const { data, error } = await sbc.from('customers').insert(row).select('id, name, start_name, start_address').single();
        if (error) { err.textContent = /row-level security|permission/i.test(error.message) ? 'Only office logins can add customers.' : error.message; return; }
        dlg.close();
        if (done) done(data);
      } finally { btn.disabled = false; }
    };
  }
  window.RCNewCustomer = {
    open(sb, onSaved, prefill) {
      if (!dlg) build();
      sbc = sb; done = onSaved;
      const f = dlg.querySelector('form'); f.reset();
      dlg.querySelector('.err').textContent = '';
      if (prefill) f.elements.name.value = prefill;
      dlg.showModal(); f.elements.name.focus();
    }
  };
})();
