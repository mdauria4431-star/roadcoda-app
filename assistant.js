// RoadCoda: dispatch assistant panel (110). Loaded by shell.js on office pages when the company
// has the add-on. Questions go to the dispatch-assistant server function; answers show a disclaimer.
(function () {
  if (window.RCAssistant) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DISCLAIMER = 'Estimate only. Drive times don\'t include traffic, weather, loading or stops beyond required breaks. Hours of service are calculated from the figures shown and don\'t apply exceptions (short-haul unless set, adverse conditions, sleeper-berth splits, state rules). The driver\'s ELD is the legal record. The driver and carrier remain responsible for complying with FMCSA rules — never pressure a driver to exceed their hours.';
  const css = `
  .rca-btn{position:fixed;right:18px;bottom:18px;z-index:8000;border-radius:999px;padding:11px 16px;font-weight:700;border:1px solid var(--line,#ccc);
    background:var(--violet,#6a3fe0);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;font-size:14px}
  .rca{position:fixed;right:18px;bottom:70px;z-index:8001;width:min(420px,calc(100vw - 24px));height:min(560px,calc(100vh - 100px));display:flex;flex-direction:column;
    background:var(--surface,#fff);color:var(--ink,#111);border:1px solid var(--line,#ccc);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden}
  .rca .rca-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line,#ddd)}.rca .rca-top b{flex:1}
  .rca .log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px;font-size:14px}
  .rca .me{align-self:flex-end;background:var(--violet,#6a3fe0);color:#fff;border-radius:12px 12px 2px 12px;padding:8px 11px;max-width:85%}
  .rca .bot{align-self:flex-start;background:var(--surface-2,#f3f3f7);border-radius:12px 12px 12px 2px;padding:8px 11px;max-width:92%;white-space:pre-wrap}
  .rca .disc{font-size:11px;color:var(--ink-3,#777);margin-top:6px;line-height:1.35;white-space:normal}
  .rca .err{color:#c62828}.rca .hint{font-size:12px;color:var(--ink-3,#777)}
  .rca form{display:flex;gap:6px;padding:10px;border-top:1px solid var(--line,#ddd)}
  .rca textarea{flex:1;resize:none;height:44px;font:inherit;padding:8px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit}
  .rca .mic{width:44px;border-radius:8px;border:1px solid var(--line,#ccc);background:transparent;cursor:pointer;font-size:18px}
  .rca .mic.on{background:#c62828;color:#fff;border-color:#c62828}
  .rca .go{border-radius:8px;border:0;background:var(--violet,#6a3fe0);color:#fff;font-weight:700;padding:0 14px;cursor:pointer}`;
  let sb, open = false, history = [], busy = false, rec = null;

  function build() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const btn = document.createElement('button'); btn.className = 'rca-btn'; btn.type = 'button'; btn.textContent = '💬 Ask dispatch assistant';
    const box = document.createElement('div'); box.className = 'rca'; box.hidden = true;
    box.innerHTML = `<div class="rca-top"><b>Dispatch assistant</b><button type="button" class="btn small" data-h>History</button><button type="button" class="btn small" data-x>Close</button></div>
      <div class="log" data-log><div class="hint">Ask in plain words, or tap 🎤 and speak. For example:<br>• If Carlos leaves Enfield, CT at 2 pm, when does he get to Washington, DC?<br>• A driver has driven 7 h and been on duty 9 h — how much time does he have left?<br>• Who can still take a 4-hour run today?<br>• Where is load 1047?</div></div>
      <form data-f><button type="button" class="mic" data-mic title="Speak">🎤</button><textarea data-q placeholder="Ask about drive times, hours, loads, stops…"></textarea><button class="go">Ask</button></form>`;
    document.body.appendChild(btn); document.body.appendChild(box);
    const q = (s) => box.querySelector(s), log = q('[data-log]'), ta = q('[data-q]');
    btn.onclick = () => { open = !open; box.hidden = !open; if (open) ta.focus(); };
    q('[data-x]').onclick = () => { open = false; box.hidden = true; };
    // 111: the company's own record of questions and answers (90 days)
    q('[data-h]').onclick = async () => {
      const { data, error } = await sb.from('assistant_log').select('asked_at, asked_by_name, question, answer').order('asked_at', { ascending: false }).limit(30);
      const d = document.createElement('div'); d.className = 'bot';
      d.innerHTML = error ? `<span class="err">${esc(error.message)}</span>` : !data.length ? 'No questions yet.' :
        '<b>Recent questions</b> (kept 90 days)' + data.map(r => `<div style="margin-top:8px;border-top:1px solid var(--line,#ddd);padding-top:6px"><div class="hint">${esc(new Date(r.asked_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))} · ${esc(r.asked_by_name || '')}</div><div><b>${esc(r.question)}</b></div><div>${esc(r.answer)}</div></div>`).join('');
      log.appendChild(d); log.scrollTop = log.scrollHeight;
    };
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); q('[data-f]').requestSubmit(); } });

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { q('[data-mic]').hidden = true; }
    q('[data-mic]').onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
      const before = ta.value ? ta.value + ' ' : '';
      rec.onresult = (e) => { ta.value = before + [...e.results].map(r => r[0].transcript).join(''); };
      rec.onend = () => { rec = null; q('[data-mic]').classList.remove('on'); if (ta.value.trim()) q('[data-f]').requestSubmit(); };
      rec.onerror = (e) => { rec = null; q('[data-mic]').classList.remove('on'); if (e.error === 'not-allowed') say('Microphone access was blocked — allow it in the browser, or type instead.', true); };
      q('[data-mic]').classList.add('on'); rec.start();
    };

    function say(text, err, disc) {
      const d = document.createElement('div'); d.className = err ? 'bot err' : 'bot';
      d.innerHTML = esc(text) + (disc ? `<div class="disc">${esc(DISCLAIMER)}</div>` : '');
      log.appendChild(d); log.scrollTop = log.scrollHeight;
    }
    q('[data-f]').onsubmit = async (e) => {
      e.preventDefault(); const question = ta.value.trim(); if (!question || busy) return;
      const me = document.createElement('div'); me.className = 'me'; me.textContent = question; log.appendChild(me);
      ta.value = ''; busy = true; const wait = document.createElement('div'); wait.className = 'bot hint'; wait.textContent = 'Working it out…'; log.appendChild(wait); log.scrollTop = log.scrollHeight;
      try {
        const { data, error } = await sb.functions.invoke('dispatch-assistant', { body: { question, history } });
        wait.remove();
        if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch (_) {} say(m, true); }
        else if (data && data.error) say(data.error, true);
        else {
          say(data.answer, false, true); history.push({ role: 'user', content: question }, { role: 'assistant', content: data.answer }); history = history.slice(-10);
          if (data.month_left_usd != null && data.month_left_usd < 5) { const n = document.createElement('div'); n.className = 'hint'; n.textContent = 'This month\'s assistant allowance is nearly used up. It starts again on the 1st, or RoadCoda can raise it.'; log.appendChild(n); }
        }
      } catch (err) { wait.remove(); say(err.message || String(err), true); }
      busy = false;
    };
  }

  window.RCAssistant = { start() {
    if (!window.supabase || !window.RC_CONFIG) return;
    sb = window.supabase.createClient(RC_CONFIG.SUPABASE_URL, RC_CONFIG.SUPABASE_KEY);
    build();
  } };
  window.RCAssistant.start();
})();
