// RoadCoda: one spreadsheet upload for every setup screen (109).
// A screen calls RCUpload.open({...}) with its own fields, row checks, matching and saving.
// The file is read in this browser only; it is never sent anywhere or kept.
//
//   title      'Upload trucks and trailers'
//   template   link to the setup template (shown as a download link)
//   fields     [{ key, label, re: /header regex/, required, rec }]  — order = guessing priority
//   blocked    /header regex/ for columns that must never be read (SSN, bank …)
//   parse(get, raw) → { values, errors: [], warnings: [] }   get(key) = the cell under that field's column
//                      (return mergeUp: true to fold a follow-on row into the row above; append: [keys] to add to text fields)
//   match(values) → existing record or null                  (decides Add vs Update)
//   describe(values) → short text for the preview row
//   save(rows) → Promise<{ added, updated, failed: [{ row, message }] }>   rows = [{ values, existing }]
//   confirmText(nAdd, nUpd) → optional question asked before saving (e.g. sending invitations)
//   report     { kind, key(values, cell), scope(values, opts) } — record what couldn't be finished for the
//              Setup › What we found report (116). Only the columns matched to fields are sent, never refused ones.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = `
  .rcu-back{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:28px 12px;overflow:auto}
  .rcu{background:var(--surface,#fff);color:var(--ink,#111);border:1px solid var(--line,#ddd);border-radius:12px;width:min(1180px,100%);padding:18px 20px;font-size:14px}
  .rcu h2{margin:0 0 4px;font-size:18px}.rcu .mini{font-size:12.5px;color:var(--ink-3,#666)}
  .rcu .rowx{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0}
  .rcu table{width:100%;border-collapse:collapse;font-size:12.5px}.rcu th,.rcu td{border-bottom:1px solid var(--line-soft,#eee);padding:5px 6px;text-align:left;vertical-align:top}
  .rcu .map{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 12px;margin:8px 0}
  .rcu .map label{display:flex;flex-direction:column;font-size:12px;gap:2px}.rcu .map select{height:30px}
  .rcu .req{color:#6a3fe0;font-weight:600}.rcu .rec{color:#a07800;font-weight:600}
  .rcu .tag{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid}
  .rcu .t-new{color:#1e8e3e;border-color:#1e8e3e}.rcu .t-upd{color:#1a73e8;border-color:#1a73e8}.rcu .t-bad{color:#c62828;border-color:#c62828}
  .rcu .err{color:#c62828}.rcu .warn{color:#a07800}.rcu .ok{color:#1e8e3e}
  .rcu .scroll{max-height:46vh;overflow:auto;border:1px solid var(--line,#ddd);border-radius:8px}
  .rcu .blocked{background:#c62828;color:#fff;border-radius:8px;padding:8px 12px;margin:8px 0;font-weight:600}`;
  let styled = false;

  function open(cfg) {
    if (!styled) { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); styled = true; }
    const back = document.createElement('div'); back.className = 'rcu-back';
    back.innerHTML = `<div class="rcu" role="dialog" aria-label="${esc(cfg.title)}">
      <div class="rowx" style="margin-top:0"><h2 style="flex:1">${esc(cfg.title)}</h2><button class="btn small" data-x>Close</button></div>
      <div class="mini">Excel or CSV. Best with the RoadCoda template${cfg.template ? ` — <a href="${esc(cfg.template)}" download>download it here</a>` : ''}; other layouts work too, you match the columns below. The file stays in this browser; nothing is saved until you press the button at the bottom.</div>
      <div class="rowx"><input type="file" accept=".xlsx,.xls,.csv,.txt" data-file>
        <label data-sheetwrap hidden>Tab <select data-sheet></select></label>
        <label data-hdrwrap hidden>Header row <select data-hdr></select></label></div>
      <div data-body></div></div>`;
    document.body.appendChild(back);
    const q = (s) => back.querySelector(s);
    const close = () => back.remove();
    q('[data-x]').onclick = close; back.addEventListener('click', (e) => { if (e.target === back) close(); });
    const st = { wb: null, rows: [], header: 0, map: {}, blockedCols: [], leave: new Set(), edits: {}, open: null }; let skipped = 0;

    q('[data-file]').onchange = (e) => { const f = e.target.files[0]; if (f) loadFile(f); };
    st.opts = Object.fromEntries((cfg.options || []).map(o => [o.key, o.value || '']));
    if (cfg.file) setTimeout(() => loadFile(cfg.file), 0);                          // opened with a file already chosen
    async function loadFile(f) {
      st.fileName = f.name;
      q('[data-body]').innerHTML = '<div class="mini">Reading the file…</div>';
      try {
        if (!window.XLSX) throw new Error('The spreadsheet reader did not load. Check your connection and refresh.');
        st.wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true, raw: /\.(csv|txt)$/i.test(f.name) });
        const names = st.wb.SheetNames;
        q('[data-sheet]').innerHTML = names.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('');
        q('[data-sheetwrap]').hidden = names.length < 2;
        q('[data-sheet]').onchange = () => loadSheet(+q('[data-sheet]').value);
        const pref = cfg.preferSheet ? Math.max(0, names.findIndex(n => cfg.preferSheet.test(n))) : 0;
        q('[data-sheet]').value = String(pref); loadSheet(pref);
      } catch (err) { q('[data-body]').innerHTML = `<div class="err">${esc(err.message || err)}</div>`; }
    }

    function loadSheet(i) {
      const ws = st.wb.Sheets[st.wb.SheetNames[i]]; st.opts.__sheet = st.wb.SheetNames[i]; st.recorded = false;
      st.rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
        .map(r => r.map(c => c == null ? '' : c));
      st.rows = pasted(st.rows);
      st.header = Math.max(0, st.rows.slice(0, 20).findIndex(r => r.filter(c => /[A-Za-z]/.test(String(c))).length >= 2));
      q('[data-hdr]').innerHTML = st.rows.slice(0, 20).map((r, j) => `<option value="${j}" ${j === st.header ? 'selected' : ''}>Row ${j + 1}: ${esc(r.filter(Boolean).slice(0, 4).join(' · ').slice(0, 60))}</option>`).join('');
      q('[data-hdrwrap]').hidden = false;
      q('[data-hdr]').onchange = () => { st.header = +q('[data-hdr]').value; guess(); draw(); };
      guess(); draw();
    }

    // A list pasted from an email: everything in column A, fields separated by | marks
    // ("Harbor Grill | 828 Elm St Pawtucket RI 02860 | recv 6a-2p | Sandra Moreau 413-555-0120").
    // Split it into columns, join a line that wrapped onto the next row, and name the columns by
    // what's in them, so the rest of the upload works as if it were a normal sheet.
    function pasted(rows) {
      st.pasteNote = '';
      const one = rows.map(r => r.filter(c => String(c).trim() !== ''));
      const filled = one.filter(r => r.length), piped = filled.filter(r => r.length === 1 && (String(r[0]).match(/\|/g) || []).length >= 2);
      if (piped.length < 3 || piped.length < filled.length * 0.5) return rows;
      const lines = []; let joined = 0;
      for (const r of one) {
        if (r.length !== 1) { if (r.length) lines.push({ t: r.join(' | '), p: true }); continue; }
        const s = String(r[0]);
        if (/^\s*\|/.test(s) && lines.length && lines[lines.length - 1].p) { lines[lines.length - 1].t += ' ' + s.trim(); joined++; continue; }
        lines.push({ t: s, p: /\|/.test(s) });
      }
      const data = lines.map(l => l.p ? l.t.split('|').map(x => x.trim()).filter((x, i, a) => x !== '' || i < a.length - 1) : [l.t.trim()]);
      const n = Math.max(...data.map(r => r.length));
      const share = (j, re) => { const v = data.filter(r => r.length > 1).map(r => String(r[j] || '')); return v.length && v.filter(s => re.test(s)).length / v.length > 0.5; };
      const hdr = [];
      for (let j = 0; j < n; j++) {
        hdr.push(share(j, /^\d+\s+\S.*\b[A-Za-z]{2}\.?,?\s+\d{5}\b/) ? 'Address'
          : share(j, /\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/) ? 'Contact'        // before hours: "413-555-0120" looks like "3-5"
          : share(j, /^(recv|rcv|receiving|hours|hrs)\b|\d\s*(a|am|p|pm)?\s*(-|–|to)\s*\d/i) ? 'Receiving hours'
          : j === 0 ? 'Name' : 'Column ' + (j + 1));
      }
      st.pasteNote = `Pasted list: split on the | marks${joined ? `, ${joined} line${joined > 1 ? 's' : ''} that wrapped onto the next row joined back` : ''}.`;
      return [hdr, ...data];
    }

    // A header split over two rows ("BILL TO" over "Address | City | Zip") is read as one: "BILL TO Address"…
    function twoRows() {
      const H = st.rows[st.header] || [], N = st.rows[st.header + 1] || [];
      const txt = N.filter(c => typeof c === 'string' && /[A-Za-z]/.test(c) && c.length < 40);
      const fillsGap = N.some((c, j) => String(c).trim() && !String(H[j] ?? '').trim());
      return txt.length >= 2 && txt.length === N.filter(c => String(c).trim()).length && fillsGap;
    }
    function head() {
      const H = st.rows[st.header] || [];
      if (!st.two) return H.map(h => String(h).replace(/\s*\*\s*$/, '').trim());
      const N = st.rows[st.header + 1] || [], out = []; let group = '';
      for (let j = 0; j < Math.max(H.length, N.length); j++) {
        const h = String(H[j] ?? '').trim(), n = String(N[j] ?? '').trim();
        if (h && n) group = h; else if (h) group = '';
        out.push((n ? [h || group, n].filter(Boolean).join(' ') : h).replace(/\s*\*\s*$/, ''));
      }
      return out;
    }
    function guess() {
      st.two = twoRows(); st.leave = new Set(); st.edits = {}; st.open = null;
      const h = head(), used = new Set();
      st.blockedCols = cfg.blocked ? h.map((x, j) => cfg.blocked.test(x) ? j : -1).filter(j => j >= 0) : [];
      st.blockedCols.forEach(j => used.add(j));
      st.map = {};
      for (const f of cfg.fields) { const j = h.findIndex((x, k) => x && !used.has(k) && f.re.test(x)); if (j >= 0) { st.map[f.key] = j; used.add(j); } }
    }
    function parsed() {
      const out = []; skipped = 0;
      if (cfg.begin) cfg.begin();                                                 // e.g. reset duplicate checks
      const first = st.header + (st.two ? 2 : 1);
      let prev = null;                                                             // the row above, for "same as above"
      st.rows.slice(first).forEach((r, i) => {
        const line = first + 1 + i;
        if (!r.some(c => String(c).trim() !== '')) return;                        // blank row
        if (r.filter(c => String(c).trim() !== '').length === 1 && cfg.fields.filter(f => st.map[f.key] != null).length > 2) { skipped++; return; }  // "=== TRACTORS ===", a note line
        if (/^(grand\s+)?totals?\b/i.test(String(r.find(c => String(c).trim() !== '') || '').trim())) { skipped++; return; }   // "Total active accounts: 8"
        const ed = st.edits[line] || {};                                           // corrections typed in here win over the file
        const get = (k) => (k in ed) ? ed[k] : (st.map[k] != null ? r[st.map[k]] : '');
        if (st.leave.has(line)) { out.push({ line, left: true, values: {}, errors: [], warnings: [], cell: get }); return; }   // the user left it out
        const p = cfg.parse(get, r, prev, st.opts) || { values: {}, errors: [], warnings: [] };
        p.raw = r; p.cell = (k) => (k in ed) ? ed[k] : (st.map[k] != null ? r[st.map[k]] : '');
        if (Object.keys(ed).length) p.warnings = [`Corrected here: ${Object.keys(ed).map(k => (cfg.fields.find(f => f.key === k) || {}).label || k).join(', ')}`, ...(p.warnings || [])];
        // a follow-on row (e.g. the second line of a two-row yard): its values fill the row above
        if (p.mergeUp) {
          const last = out.length ? out[out.length - 1] : null;
          if (last && !last.left) {
            for (const [k, val] of Object.entries(p.values || {})) {
              if (val == null || val === '') continue;
              const cur = last.values[k];
              if (cur == null || cur === '') last.values[k] = val;
              else if (p.append && p.append.includes(k) && !String(cur).includes(String(val))) last.values[k] = cur + ' ' + val;
            }
            last.warnings = [...(last.warnings || []), ...(p.warnings || [])];
            if (!last.errors.length && cfg.match) last.existing = cfg.match(last.values);
            return;
          }
          p.errors = ['This row has no name and nothing above it to join to'];
        }
        if (!p.errors.length) prev = p.values;
        if (p.skip) return;
        // updating a record that's already saved only needs what the file has — required fields are already on it
        const already = !p.errors.length && cfg.match ? cfg.match(p.values) : null;
        if (cfg.checkRequired !== false && !already) for (const f of cfg.fields) if (f.required && (p.values[f.key] == null || p.values[f.key] === '')) {
          if (!p.errors.some(e => e.startsWith(f.label))) p.errors.push(`${f.label} is required`);
        }
        const existing = p.errors.length ? null : cfg.match(p.values);
        out.push({ line, ...p, existing });
      });
      return out;
    }
    function editor(r) {
      const errs = r.errors.join(' ').toLowerCase();
      const hit = (f) => errs.includes(f.label.toLowerCase()) || f.label.toLowerCase().split(/[^a-z#]+/).some(w => w.length >= 4 && !['code', 'name', 'date', 'type'].includes(w) && errs.includes(w));
      const inp = (f) => `<label><span class="${hit(f) ? 'req' : ''}">${esc(f.label)}${hit(f) ? ' — needs fixing' : ''}</span><input data-edit="${f.key}" value="${esc(txt(r.cell(f.key)))}" style="height:30px;${hit(f) ? 'outline:2px solid #c62828' : ''}"></label>`;
      const need = cfg.fields.filter(hit), rest = cfg.fields.filter(f => !hit(f));
      return `<tr data-editor><td colspan="5" style="background:var(--panel-2,rgba(127,127,127,.08))">
        <div class="mini" style="margin:2px 0 6px">Correct row ${r.line} here — the file isn't changed; what you type is what gets saved.${r.errors.some(e => /twice/.test(e)) ? ' <b>A duplicate:</b> tick Leave out on the row you don\'t want instead.' : ''}</div>
        ${need.length ? `<div class="map">${need.map(inp).join('')}</div>` : ''}
        <details ${need.length ? '' : 'open'}><summary class="mini" style="cursor:pointer">Other fields</summary><div class="map">${rest.map(inp).join('')}</div></details>
        <div class="rowx"><button type="button" class="btn primary small" data-apply="${r.line}">Apply</button><button type="button" class="btn small" data-cancel>Cancel</button>${st.edits[r.line] ? `<button type="button" class="btn small" data-undo="${r.line}">Undo my changes</button>` : ''}</div></td></tr>`;
    }
    function draw() {
      const h = head(), rows = parsed();
      // the same note on 3+ rows ("No name in the file — named …") is said once at the top, not on every row
      const pat = (w) => w.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, '#');
      const counts = {}; rows.forEach(r => (r.warnings || []).forEach(w => { if (!/^Corrected here/.test(w)) counts[pat(w)] = (counts[pat(w)] || 0) + 1; }));
      const common = Object.keys(counts).filter(k => counts[k] >= 3);
      rows.forEach(r => { r.shown = (r.warnings || []).filter(w => !common.includes(pat(w))); });
      const summary = common.map(k => `${counts[k]} rows: ${k.replace(/"…"/g, '…').replace(/#/g, 'N')}`);
      const ok = rows.filter(r => !r.left && !r.errors.length), add = ok.filter(r => !r.existing), upd = ok.filter(r => r.existing), bad = rows.filter(r => r.errors.length), gone = rows.filter(r => r.left);
      const opts = (sel) => '<option value="">(not in file)</option>' + h.map((x, j) => st.blockedCols.includes(j) ? '' : `<option value="${j}" ${sel === j ? 'selected' : ''}>${esc(x || 'Column ' + (j + 1))}</option>`).join('');
      // a file that belongs somewhere else: just say so, instead of a screen of red rows
      if (cfg.wrongFile && cfg.wrongFile(h)) {
        q('[data-body]').innerHTML = `<div class="blocked" style="background:#a07800">${cfg.wrongFile(h).html}</div>
          <div class="mini">Wrong idea? Pick another tab or header row above.</div>`;
        back.querySelectorAll('[data-wrong]').forEach(b => b.onclick = () => { close(); cfg.wrongFile(h).act(); });
        return;
      }
      q('[data-body]').innerHTML = `
        ${st.blockedCols.length ? `<div class="blocked">Not read: ${st.blockedCols.map(j => esc(h[j])).join(', ')}. RoadCoda never reads or stores Social Security or bank numbers. Please delete that column from your file.</div>` : ''}
        ${st.two ? '<div class="mini" style="margin-top:6px">The header takes two rows here, so they were read together.</div>' : ''}
        ${(cfg.options || []).length ? `<div class="rowx">${cfg.options.map(o => `<label style="display:flex;flex-direction:column;font-size:12px;gap:2px">${esc(o.label)}<select data-opt="${o.key}" style="height:30px">${o.choices.map(([v, t]) => `<option value="${esc(v)}" ${st.opts[o.key] === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`).join('')}</div>` : ''}
        <div class="mini" style="margin-top:6px"><span class="req">Purple</span> = required · <span class="rec">yellow</span> = recommended. Change any match that's wrong.</div>
        <div class="map">${cfg.fields.map(f => `<label><span class="${f.required ? 'req' : f.rec ? 'rec' : ''}">${esc(f.label)}${f.required ? ' *' : ''}</span><select data-map="${f.key}">${opts(st.map[f.key])}</select></label>`).join('')}</div>
        ${cfg.banner ? (cfg.banner(st) || '') : ''}
        ${summary.length ? `<div class="mini" style="margin:6px 0;padding:8px 10px;border:1px solid var(--line,#ccc);border-radius:8px">Done for you: ${summary.map(esc).join(' · ')}</div>` : ''}
        <div class="rowx"><b>${rows.length} row${rows.length === 1 ? '' : 's'}</b>
          <span class="tag t-new">${add.length} new</span><span class="tag t-upd">${upd.length} update${upd.length === 1 ? '' : 's'}</span><span class="tag t-bad">${bad.length} need fixing</span>${gone.length ? `<span class="tag" style="color:var(--ink-3,#888);border-color:var(--ink-3,#888)">${gone.length} left out</span>` : ''}
          <span class="mini">Click <b>Fix ›</b> to correct a row right here, or tick <b>Leave out</b> on a row you don't want (an old duplicate, a closed account). Rows still needing fixes aren't saved.${skipped ? ` ${skipped} heading, note or total line${skipped === 1 ? '' : 's'} skipped.` : ''}${st.pasteNote ? ' ' + esc(st.pasteNote) : ''}</span></div>
        <div class="scroll"><table><thead><tr><th>Row</th><th>Leave out</th><th></th><th>What</th><th>Notes</th></tr></thead><tbody>
          ${rows.map(r => `<tr style="${r.left ? 'opacity:.45' : ''}"><td>${r.line}</td><td><input type="checkbox" data-leave="${r.line}" ${r.left ? 'checked' : ''} title="Don't load this row"></td>
            <td>${r.left ? '<span class="mini">left out</span>' : `<button type="button" data-open="${r.line}" class="tag ${r.errors.length ? 't-bad' : r.existing ? 't-upd' : 't-new'}" style="cursor:pointer;background:transparent" title="Click to correct this row">${r.errors.length ? 'Fix ›' : r.existing ? 'Update' : 'New'}</button>`}</td>
            <td>${r.left ? '' : esc(cfg.describe(r.values))}</td>
            <td>${r.errors.map(e => `<div class="err">${esc(e)}</div>`).join('')}${(r.shown || []).map(w => `<div class="warn">${esc(w)}</div>`).join('')}</td></tr>${st.open === r.line && !r.left ? editor(r) : ''}`).join('') || '<tr><td colspan="5" class="mini">No rows under the header.</td></tr>'}
        </tbody></table></div>
        <div class="rowx"><button class="btn primary" data-go ${ok.length ? '' : 'disabled'}>${ok.length ? `Add ${add.length} and update ${upd.length}` : 'Nothing to save yet'}</button>${cfg.report && !ok.length && (bad.length || gone.length) && !st.recorded ? `<button class="btn" data-report title="Puts the rows still needing fixes and the rows left out on Setup › What we found, to send to the customer.">Close and put ${bad.length + gone.length} row${bad.length + gone.length === 1 ? '' : 's'} on the setup report</button>` : ''}<span data-msg></span></div>
        ${cfg.report && (bad.length || gone.length) ? `<div class="mini">Rows still needing fixes and rows left out go on <b>Setup › What we found</b> when you save, so the customer can answer them.</div>` : ''}`;
      back.querySelectorAll('[data-opt]').forEach(s => s.onchange = () => { st.opts[s.dataset.opt] = s.value; draw(); });
      back.querySelectorAll('[data-setopt]').forEach(b => b.onclick = () => { const [k, v] = b.dataset.setopt.split('='); st.opts[k] = v; st.opts['asked_' + k] = '1'; draw(); });
      back.querySelectorAll('[data-map]').forEach(s => s.onchange = () => { const k = s.dataset.map; if (s.value === '') delete st.map[k]; else st.map[k] = +s.value; draw(); });
      const keepScroll = (fn) => { const y = q('.scroll').scrollTop; fn(); draw(); q('.scroll').scrollTop = y; };
      back.querySelectorAll('[data-open]').forEach(b => b.onclick = () => keepScroll(() => { const n = +b.dataset.open; st.open = st.open === n ? null : n; }));
      back.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => keepScroll(() => { st.open = null; }));
      back.querySelectorAll('[data-undo]').forEach(b => b.onclick = () => keepScroll(() => { delete st.edits[+b.dataset.undo]; st.open = null; }));
      back.querySelectorAll('[data-apply]').forEach(b => b.onclick = () => keepScroll(() => {
        const n = +b.dataset.apply, row = parsed().find(x => x.line === n), ed = { ...(st.edits[n] || {}) };
        back.querySelectorAll('[data-editor] [data-edit]').forEach(i => { const k = i.dataset.edit; if (i.value !== txt(row ? row.cell(k) : '') || k in ed) ed[k] = i.value; });
        for (const k of Object.keys(ed)) if (row && st.map[k] != null && ed[k] === txt(row.raw[st.map[k]])) delete ed[k];   // unchanged from the file
        if (Object.keys(ed).length) st.edits[n] = ed; else delete st.edits[n];
        st.open = null;
      }));
      setTimeout(() => { const f = back.querySelector('[data-editor] input[style*="outline"]') || back.querySelector('[data-editor] input'); if (f) f.focus(); }, 0);
      back.querySelectorAll('[data-editor] input').forEach(i => i.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); back.querySelector('[data-apply]').click(); }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); back.querySelector('[data-cancel]').click(); }
      });
      back.querySelectorAll('[data-leave]').forEach(c => c.onchange = () => { const n = +c.dataset.leave; if (c.checked) st.leave.add(n); else st.leave.delete(n); const y = q('.scroll').scrollTop; draw(); q('.scroll').scrollTop = y; });
      // ---- Setup › What we found (116): what couldn't be finished, and what was saved ----
      const client = cfg.report && (cfg.report.client || (typeof sb !== 'undefined' ? sb : null));
      const errText = (r) => (r.errors || []).join(' ').toLowerCase();
      const problemKeys = (r) => cfg.fields.filter(f => {
        const e = errText(r), l = f.label.toLowerCase();
        return e.includes(l) || l.split(/[^a-z#]+/).some(w => w.length >= 4 && !['code', 'name', 'date', 'type'].includes(w) && e.includes(w));
      }).map(f => f.key);
      const cellsOf = (r) => { const o = {}; if (!r.cell) return o;
        for (const f of cfg.fields) { if (st.map[f.key] == null && !((st.edits[r.line] || {})[f.key] !== undefined)) continue; const v = txt(r.cell(f.key)); if (v !== '') o[f.key] = v; }
        return o; };
      const firstReq = cfg.fields.find(f => f.required) || cfg.fields[0];
      const keyOf = (r) => { let k = ''; try { k = txt((cfg.report.key ? cfg.report.key(r.values || {}, r.cell || (() => '')) : '') || (r.cell ? r.cell(firstReq.key) : '')); } catch (e) { k = ''; }
        return k || `${st.fileName || ''} · ${st.opts.__sheet || ''} · row ${r.line}`; };   // no name or number: the same row of the same file
      const scopeOf = (r) => { try { return cfg.report.scope ? txt(cfg.report.scope(r.values || {}, st.opts) || '') : ''; } catch (e) { return ''; } };
      const labelOf = (r) => { let d = ''; try { d = r.values && Object.keys(r.values).length ? cfg.describe(r.values) : ''; } catch (e) { d = ''; }
        return d || Object.values(cellsOf(r)).slice(0, 4).join(' · '); };
      async function record(savedRows, res) {
        if (!client || st.recorded) return '';
        const failedLines = new Set(((res && res.failed) || []).map(f => f.line));
        const rowsOut = [];
        for (const r of bad) rowsOut.push({ status: 'needs_fix', line: r.line, key: keyOf(r), scope: scopeOf(r), label: labelOf(r),
          messages: [...r.errors, ...(r.shown || []).filter(w => !/^Corrected here/.test(w))], cells: cellsOf(r), problems: problemKeys(r) });
        for (const r of gone) rowsOut.push({ status: 'left_out', line: r.line, key: keyOf(r), scope: scopeOf(r), label: labelOf(r),
          messages: ['Left out when the data was loaded'], cells: cellsOf(r), problems: [] });
        for (const f of ((res && res.failed) || [])) { const r = rows.find(x => x.line === f.line); if (r) rowsOut.push({ status: 'needs_fix', line: r.line, key: keyOf(r), scope: scopeOf(r),
          label: labelOf(r), messages: [f.message], cells: cellsOf(r), problems: [] }); }
        const after = new Map(); for (const n of ((res && res.notes) || [])) after.set(n.line, [...(after.get(n.line) || []), n.message]);   // what the save itself found (e.g. zips looked up)
        for (const r of savedRows) { if (failedLines.has(r.line)) continue; const w = (r.shown || []).filter(x => !/when you save$/.test(x)).concat((r.warnings || []).filter(x => /^Corrected here/.test(x)), after.get(r.line) || []);
          if (w.length) rowsOut.push({ status: 'noted', line: r.line, key: keyOf(r), scope: scopeOf(r), label: labelOf(r), messages: w, cells: {}, problems: [] }); }
        const saved = savedRows.filter(r => !failedLines.has(r.line)).map(r => ({ key: keyOf(r), scope: scopeOf(r) }));
        const { error } = await client.rpc('setup_record_upload', { p: {
          kind: cfg.report.kind, title: cfg.title, file_name: st.fileName || '', sheet: st.opts.__sheet || '',
          added: res ? res.added : 0, updated: res ? res.updated : 0, skipped,
          fields: cfg.fields.map(f => ({ key: f.key, label: f.label, re: f.re.source, flags: f.re.flags, required: !!f.required })),
          done_for_you: summary, rows: rowsOut, saved } });
        if (error) return /setup_record_upload|schema cache/.test(error.message) ? '' : ` <span class="err">Not added to the setup report: ${esc(error.message)}</span>`;
        st.recorded = true;
        const n = rowsOut.filter(x => x.status !== 'noted').length;
        return n ? ` <span class="mini">${n} row${n === 1 ? '' : 's'} added to <a href="setup-report.html">What we found</a>.</span>` : '';
      }
      const rq = q('[data-report]');
      if (rq) rq.onclick = async () => { rq.disabled = true; const m = await record([], null); if (st.recorded) close(); else { q('[data-msg]').innerHTML = m || '<span class="err">Could not add them to the setup report.</span>'; rq.disabled = false; } };
      q('[data-go]').onclick = async () => {
        if (cfg.confirmText) { const t = cfg.confirmText(add.length, upd.length); if (t && !confirm(t)) return; }
        q('[data-go]').disabled = true; q('[data-msg]').innerHTML = '<span class="mini">Saving…</span>';
        try {
          const res = await cfg.save(ok.map(r => ({ values: r.values, existing: r.existing, line: r.line })));
          let rep = ''; try { rep = await record(ok, res); } catch (e) { rep = ''; }
          const nt = res.notes || [], np = {}; nt.forEach(n => { const k = n.message.replace(/\d{5}/g, '#').replace(/: .*$/, ''); np[k] = (np[k] || 0) + 1; });
          q('[data-msg]').innerHTML = `<span class="ok">${res.added} added, ${res.updated} updated.</span>` + rep +
            (nt.length ? `<div class="warn">${Object.entries(np).map(([k, n]) => `${n} row${n === 1 ? '' : 's'}: ${esc(k)}`).join(' · ')}</div>` : '') +
            (res.failed && res.failed.length ? `<div class="err">${res.failed.map(f => `Row ${f.line}: ${esc(f.message)}`).join('<br>')}</div>` : '');
          if (rq) rq.hidden = true;
          if (cfg.after) cfg.after();
        } catch (err) { q('[data-msg]').innerHTML = `<span class="err">${esc(err.message || err)}</span>`; q('[data-go]').disabled = false; }
      };
    }
  }

  // ---- helpers the screens share ----
  const txt = (v) => v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim();
  function num(v) { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[,$\s]/g, '').replace(/ft|'|mi(les)?/gi, '')); return Number.isFinite(n) ? n : NaN; }
  function date(v) {
    if (v === '' || v == null) return null;
    if (v instanceof Date && !isNaN(v)) return new Date(v.getTime() - v.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10);
    const s = String(v).trim(); let m;
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/))) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
    // "Feb 2027", "Feb-27", "February 2027": the last day of that month
    if ((m = s.match(/^([A-Za-z]{3,9})[\s\-\/.,]+(\d{2}|\d{4})$/))) {
      const mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[1].slice(0, 3).toLowerCase());
      if (mo >= 0) { const y = m[2].length === 2 ? 2000 + +m[2] : +m[2]; return new Date(Date.UTC(y, mo + 1, 0)).toISOString().slice(0, 10); }
    }
    return undefined;   // present but unreadable
  }
  // "7a", "0700", "07:00", "7:30 PM", an Excel time → "HH:MM"
  function time(v) {
    if (v === '' || v == null) return null;
    if (v instanceof Date && !isNaN(v)) return String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0');
    if (typeof v === 'number' && v >= 0 && v < 1) { const m = Math.round(v * 1440); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
    const m = String(v).trim().match(/^(\d{1,2})(?::?(\d{2}))?\s*([ap])?\.?\s*m?\.?$/i); if (!m) return undefined;
    let h = +m[1]; const mi = +(m[2] || 0); if (m[3]) { const pm = /p/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return h > 23 || mi > 59 ? undefined : String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
  }
  // "7a-11a", "0800-1600", "08:00 to 16:00", "6AM - 2PM", "recv 7-5", "07:00–17:00 Mon-Fri" → [start, end]
  function hours(text) {
    const s = String(text || '').replace(/^\s*((recv|receiving|hrs|hours)\s*)+/i, '').replace(/\s+(mon|tue|wed|thu|fri|sat|sun|7 ?days|daily).*$/i, '').trim();
    const m = s.match(/^(.+?)\s*(?:-|–|—|to)\s*(.+)$/i); if (!m) return null;
    let a = time(m[1]), b = time(m[2]); if (!a || !b) return null;
    if (!/[ap]/i.test(m[2]) && !/:|\d{4}/.test(m[2]) && b <= a && +b.slice(0, 2) < 12) b = String(+b.slice(0, 2) + 12).padStart(2, '0') + b.slice(2);   // "7-5" = 7 am to 5 pm
    return [a, b];
  }
  const MAP = {};
  const VW = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
  const WT = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  function vinProblem(v) {
    if (v.length !== 17) return `VIN has ${v.length} characters, not 17`;
    if (/[IOQ]/.test(v)) return 'VIN contains I, O or Q (never used in VINs; often a 1 or 0 typed as a letter)';
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return 'VIN has characters that aren\'t allowed';
    const s = [...v].reduce((a, c, i) => a + (/\d/.test(c) ? +c : VW[c]) * WT[i], 0) % 11;
    return (s === 10 ? 'X' : String(s)) === v[8] ? null : 'VIN check digit doesn\'t match — probably a typo';
  }
  window.RCUpload = { open, txt, num, date, time, hours, vinProblem, MAP };
})();
