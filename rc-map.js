// RoadCoda maps (87): shared by the office live map and the customer tracking page.
// Map tiles: OpenStreetMap by default — fine for a pilot. Before real volume, sign up with a map
// service (MapTiler, Stadia…) and add two lines to config.js, e.g.
//   window.RC_CONFIG.MAP_TILES = 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR-KEY';
//   window.RC_CONFIG.MAP_ATTRIBUTION = '&copy; MapTiler &copy; OpenStreetMap contributors';
// A map-tile key only draws maps, so it's safe in a web page (limit it to your web address in the service's settings).
(function (root) {
  const cfg = () => root.RC_CONFIG || {};
  function tiles(map) {
    const url = cfg().MAP_TILES || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = cfg().MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    return root.L.tileLayer(url, { maxZoom: 19, attribution }).addTo(map);
  }
  const escH = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // how old a position is, in words
  function ago(t, now) {
    if (!t) return 'no position';
    const m = Math.max(0, Math.round(((now ? new Date(now) : new Date()) - new Date(t)) / 60000));
    if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} h ${m % 60 ? (m % 60) + ' min ' : ''}ago`;
    return `${Math.floor(h / 24)} d ago`;
  }
  // fresh < 15 min, aging < 60 min, stale after
  const age = (t) => (!t ? 'none' : (Date.now() - new Date(t)) / 60000 < 15 ? 'fresh' : (Date.now() - new Date(t)) / 60000 < 60 ? 'aging' : 'stale');
  // a truck: a round badge with an arrow for its heading when moving
  function truckIcon(label, color, heading, moving, dashed) {
    const arrow = moving && heading != null ? `<i style="position:absolute;left:50%;top:-9px;margin-left:-5px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid ${color};transform-origin:5px 23px;transform:rotate(${Number(heading) || 0}deg)"></i>` : '';
    const w = Math.max(44, 16 + String(label).length * 7.5);   // wide enough for the unit number on one line
    return root.L.divIcon({ className: 'rc-truck', iconSize: [w, 28], iconAnchor: [w / 2, 14], popupAnchor: [0, -14],
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;height:28px;width:${w}px;white-space:nowrap;padding:0 6px;border-radius:14px;background:${color};color:#fff;font:600 11px/1 'IBM Plex Mono',monospace;border:2px ${dashed ? 'dashed' : 'solid'} #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${arrow}${escH(label)}</div>` });
  }
  function stopIcon(label, color) {
    return root.L.divIcon({ className: 'rc-stop', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11],
      html: `<div style="width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid ${color};color:#111;font:700 10px/16px sans-serif;text-align:center">${escH(label)}</div>` });
  }
  root.RC_MAP = { tiles, ago, age, truckIcon, stopIcon, esc: escH };
})(typeof window !== 'undefined' ? window : globalThis);
