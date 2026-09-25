// RoadCoda: stamp every script and stylesheet link with this deploy's version (119).
// Render runs it on each deploy (Build Command: node build/stamp.js). It changes only 
// Render's copy of the files, never GitHub's.
//   <script src="shell.js">      → <script src="shell.js?v=<commit>">
//   <link href="app.css">        → <link href="app.css?v=<commit>">
//   s.src = 'assistant.js'  (in .js files) → 'assistant.js?v=<commit>'
// A new version is a new address, so every browser fetches the new file.
// It also writes version.json, which open pages check to offer "Refresh".
// Last, it removes the files that are for building RoadCoda, not for running it
// (database scripts, install notes, server code), so the website doesn't hand
// them out. Only on Render: run on a computer, it would delete your own copies.
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

// ---- keep build files off the website (Render's copy only; GitHub keeps them) ----
if (process.env.RENDER || process.env.RENDER_GIT_COMMIT || process.env.RENDER_SERVICE_ID) {
  const dropExt = /\.(sql|md|py)$/i;                                 // database scripts, install notes, seed generator
  const dropDirs = ['functions', 'sftp-worker', 'tools', 'build'];   // server code and this script
  let gone = 0;
  for (const f of fs.readdirSync(root)) {
    const p = path.join(root, f);
    if (fs.statSync(p).isFile() && dropExt.test(f)) { fs.rmSync(p); gone++; }
  }
  for (const d of dropDirs) {
    const p = path.join(root, d);
    if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); gone++; }
  }
  console.log(`RoadCoda: ${gone} build files and folders kept off the website.`);
}
