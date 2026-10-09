/* ============================================================
   HELPERS
   ============================================================ */
const SUF = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
function fmt(n, dec){
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, dec);
  if (n < 1000){
    if (dec && n < 100 && n % 1) return n.toFixed(1);
    return String(Math.floor(n));
  }
  const i = Math.floor(Math.log10(n)/3);
  if (i >= SUF.length) return n.toExponential(2);
  const v = n / Math.pow(10, 3*i);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + ' ' + SUF[i];
}
function fmtTime(sec){
  sec = Math.max(0, Math.ceil(sec));
  if (!isFinite(sec) || sec > 3.15e9) return 'centuries';
  if (sec >= 31536000) return `${Math.floor(sec/31536000)}y ${Math.floor(sec%31536000/86400)}d`;
  const d = Math.floor(sec/86400), h = Math.floor(sec%86400/3600), m = Math.floor(sec%3600/60), s = sec%60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}
function clock(sec){ sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec/60) + ':' + String(sec%60).padStart(2,'0'); }

const ICONS = {
  star:'<path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z"/>',
  up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
  down:'<path d="M12 5v14M5 12l7 7 7-7"/>',
  warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.01"/>',
  drop:'<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  crumb:'<path d="M5 10l7-6 7 6-2 9H7z"/><path d="M10 12h.01M14 15h.01"/>',
  scroll:'<path d="M7 3h11a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4H7"/><path d="M7 3a3 3 0 0 0-3 3v1h3M7 3v15a3 3 0 0 1-3 3M11 8h5M11 12h5"/>',
  wasp:'<path d="M12 6a4 6 0 1 0 .01 0"/><path d="M8.5 10h7M8.3 13.5h7.4M12 6V3M10 4l-2-2M14 4l2-2M8 9C5 7 3 8 3 10M16 9c3-2 5-1 5 1"/>',
  swords:'<path d="M4 4l11 11M15 15l3 3M17 13l-4 4M20 4L9 15M9 15l-3 3M7 13l4 4"/>',
  cloud:'<path d="M7 15a4 4 0 1 1 1.3-7.8A5 5 0 0 1 18 9a3 3 0 0 1 0 6z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  beetle:'<path d="M12 5a6 7.5 0 1 0 .01 0"/><path d="M12 5v15M6.5 10H3M6.5 15H3M17.5 10H21M17.5 15H21M10 4L8 2M14 4l2-2"/>',
  mushroom:'<path d="M3 12a9 8 0 0 1 18 0z"/><path d="M9.5 12v6a2.5 2.5 0 0 0 5 0v-6M8 8h.01M14 7h.01"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><path d="M12 9a3 3 0 1 0 .01 0"/>',
  bug:'<path d="M12 6a7 7 0 1 0 .01 0"/><path d="M12 6v14M8.5 10h.01M15.5 11h.01M9 15h.01M15 16h.01M9 5L7 3M15 5l2-2"/>',
  quake:'<path d="M2 12h4l2-5 3 10 3-8 2 3h6"/>',
  radio:'<path d="M4 9h16v11H4z"/><path d="M8 9l8-5M8 14.5a1.5 1.5 0 1 0 .01 0M14 13h3M14 16h3"/>',
  map:'<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  sun:'<path d="M12 8a4 4 0 1 0 .01 0"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  snow:'<path d="M12 2v20M4 7l16 10M4 17L20 7M9 3l3 3 3-3M9 21l3-3 3 3"/>',
  leaf:'<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"/><path d="M5 19l8-8"/>',
  flower:'<path d="M12 9a3 3 0 1 0 .01 0"/><path d="M12 6a3 3 0 1 1 3 3M15 12a3 3 0 1 1-3 3M12 15a3 3 0 1 1-3-3M9 12a3 3 0 1 1 3-3M12 15v7"/>',
  clock:'<path d="M12 3a9 9 0 1 0 .01 0"/><path d="M12 7v5l3 2"/>',
  ant:'<path d="M5 12a2.5 2 0 1 0 .01 0M12 12a1.5 1.2 0 1 0 .01 0M18.5 12a2 2 0 1 0 .01 0"/><path d="M9 8l1 4-1 4M14 8l-1 4 1 4M20 10l2-3M20 14l2 3"/>',
  sound:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  mute:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  rubble:'<path d="M3 20l3-6 4 2 3-5 4 3 4 6z"/><path d="M8 7l2-3M14 6l1-3M17 9l3-2"/>',
  moon:'<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
  flask:'<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
  cards:'<path d="M8 3h11v15H8z"/><path d="M5 6v15h11"/><path d="M13.5 7.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"/>',
  ticket:'<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z"/><path d="M14 6v2M14 11v2M14 16v2"/>',
  bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  wing:'<path d="M3 17C8 17 14 13 21 4c-2 8-7 13-13 15"/><path d="M7 14c3-1 6-3 9-6M10 18c2-1 4-3 6-5"/>',
  gem:'<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12"/>',
  crown:'<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 19h14"/>',
  flag:'<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  rocket:'<path d="M12 2c4 3 5 8 4 13H8C7 10 8 5 12 2z"/><path d="M8 15l-3 4h4M16 15l3 4h-4M12 9a1.5 1.5 0 1 0 .01 0"/>',
  lock:'<path d="M5 11h14v10H5z"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  gift:'<path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12"/><path d="M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6 .5 6-1.5S14 5 12 9z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  oil:'<path d="M9 3h6v3H9zM8 6h8l1 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9z"/><path d="M10 13h4"/>',
};
const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||ICONS.star}</svg>`;

