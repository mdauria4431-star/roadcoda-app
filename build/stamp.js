// RoadCoda: stamp every script and stylesheet link with this deploy's version (119).
// Render runs it on each deploy (Build Command: node build/stamp.js). It changes only
// Render's copy of the files, never GitHub's.
//   <script src="shell.js">      → <script src="shell.js?v=<commit>">
//   <link href="app.css">        → <link href="app.css?v=<commit>">
//   s.src = 'assistant.js'  (in .js files) → 'assistant.js?v=<commit>'
// A new version is a new address, so every browser fetches the new file.
// It also writes version.json, which open pages check to offer "Refresh".
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const v = (process.env.RENDER_GIT_COMMIT || '').slice(0, 12) || Date.now().toString(36);
const local = '[A-Za-z0-9_.-]+';   // a file next to the page: no http, no ${…}
let pages = 0, links = 0;
for (const f of fs.readdirSync(root)) {
  const p = path.join(root, f);
  if (f.endsWith('.html')) {
    let s = fs.readFileSync(p, 'utf8'), n = 0;
    s = s.replace(new RegExp(`(<script[^>]*\\ssrc=")(${local}\\.js)(\\?v=[^"]*)?"`, 'g'), (m, a, file) => { n++; return `${a}${file}?v=${v}"`; });
    s = s.replace(new RegExp(`(<link[^>]*\\shref=")(${local}\\.css)(\\?v=[^"]*)?"`, 'g'), (m, a, file) => { n++; return `${a}${file}?v=${v}"`; });
    if (n) { fs.writeFileSync(p, s); pages++; links += n; }
  } else if (f.endsWith('.js')) {
    let s = fs.readFileSync(p, 'utf8'), n = 0;
    s = s.replace(new RegExp(`(\\.src\\s*=\\s*')(${local}\\.js)(\\?v=[^']*)?'`, 'g'), (m, a, file) => { n++; return `${a}${file}?v=${v}'`; });
    if (n) { fs.writeFileSync(p, s); links += n; }
  }
}
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ version: v, built_at: new Date().toISOString() }) + '\n');
console.log(`RoadCoda version ${v}: ${links} links stamped on ${pages} pages; version.json written.`);
