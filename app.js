/* Chloé — Suivi appareil dentaire — app.js */
'use strict';

const KEY  = 'chloe_dental_v1';
const GOAL = 18;

const SLOTS = [
  {f:0,  t:7,  p:2},
  {f:7,  t:12, p:3},
  {f:12, t:14, p:0},
  {f:14, t:19, p:3},
  {f:19, t:21, p:0},
  {f:21, t:23, p:1},
  {f:23, t:24, p:2},
];

const HOLIDAYS_ZB = [
  ['2025-07-05','2025-08-31'],
  ['2025-10-18','2025-11-02'],
  ['2025-12-20','2026-01-04'],
  ['2026-02-14','2026-03-01'],
  ['2026-04-11','2026-04-26'],
  ['2026-05-13','2026-05-17'],
  ['2026-07-04','2027-08-31'],
];

const FERIES = [
  '2025-11-11','2025-12-25','2026-01-01',
  '2026-04-06','2026-05-01','2026-05-08',
  '2026-05-14','2026-05-25',
];

const MONTHS  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DAYS    = ['Di','Lu','Ma','Me','Je','Ve','Sa'];
const S_COLS  = ['#FFCDD2','#FFE0B2','#FFF9C4','#DCEDC8','#8BC34A','#388E3C'];
const S_CLS   = ['s0','s1','s2','s3','s4','s5'];

let st   = loadSt();
let live = st.wearingStart ? new Date(st.wearingStart) : null;
let tid  = null;

/* ── Persistence ── */
function loadSt() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {sessions:{},wearingStart:null}; }
  catch(e) { return {sessions:{},wearingStart:null}; }
}
function saveSt() { localStorage.setItem(KEY, JSON.stringify(st)); }

/* ── Date helpers ── */
function dk(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function today() { return dk(new Date()); }

/* ── School calendar ── */
function isHol(d) {
  const k = dk(d);
  if (FERIES.includes(k)) return true;
  for (const [a,b] of HOLIDAYS_ZB) if (k >= a && k <= b) return true;
  return false;
}
function isSchool(d) {
  const w = d.getDay();
  return w > 0 && w < 6 && !isHol(d);
}

/* ── Points ── */
function pph(h) {
  for (const s of SLOTS) if (h >= s.f && h < s.t) return s.p;
  return 1;
}
function calcPts(s0, e0) {
  let p = 0, c = s0;
  while (c < e0) {
    const h  = new Date(c).getHours();
    const nh = new Date(c); nh.setMinutes(0,0,0); nh.setHours(h+1);
    const se = Math.min(nh.getTime(), e0);
    p += pph(h) * (se - c) / 3600000;
    c  = se;
  }
  return p;
}

/* ── Derived ── */
function sesForKey(k) { return st.sessions[k] || []; }
function ptsForKey(k) { return sesForKey(k).reduce((a,s) => a + s.pts, 0); }

function todayMs() {
  let ms = sesForKey(today()).reduce((a,s) => a + (s.endMs - s.startMs), 0);
  if (live) ms += Date.now() - live.getTime();
  return ms;
}
function todayPts() {
  let p = ptsForKey(today());
  if (live) p += calcPts(live.getTime(), Date.now());
  return p;
}

function scIdx(p) {
  const r = p / GOAL;
  if (r < .35) return 0; if (r < .55) return 1; if (r < .70) return 2;
  if (r < .85) return 3; if (r < .97) return 4; return 5;
}

function getStreak() {
  let n = 0; const d = new Date();
  for (let i = 0; i < 366; i++) {
    const k = dk(d), p = k === today() ? todayPts() : ptsForKey(k);
    if (p >= GOAL * .8) n++;
    else if (k !== today()) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
function weekAvg() {
  let t = 0, n = 0; const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = dk(d), p = k === today() ? todayPts() : ptsForKey(k);
    if (st.sessions[k] || (k === today() && live)) { t += p; n++; }
  }
  return n ? Math.round(t / n) : 0;
}
function cantineAuto() {
  if (!isSchool(new Date())) return false;
  const k = today(), n12 = new Date(), n14 = new Date();
  n12.setHours(12,0,0,0); n14.setHours(14,0,0,0);
  const hasReal = sesForKey(k).some(s => s.startMs < n14.getTime() && s.endMs > n12.getTime());
  const liveOk  = live && live.getTime() < n14.getTime() && Date.now() > n12.getTime();
  return !hasReal && !liveOk;
}

/* ── Formatting ── */
function fmtMs(ms) {
  const s = Math.floor(ms/1000);
  return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
function fmtDur(ms) {
  const m = Math.floor(ms/60000);
  return m < 60 ? `${m} min` : `${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}`;
}
function fmtHM(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ── Actions ── */
function putOn() {
  if (live) return;
  live = new Date(); st.wearingStart = live.toISOString();
  saveSt(); startTid(); render();
}
function takeOff() {
  if (!live) return;
  const e = Date.now(), s = live.getTime(), p = calcPts(s, e), k = dk(new Date(s));
  if (!st.sessions[k]) st.sessions[k] = [];
  st.sessions[k].push({ startMs:s, endMs:e, pts: Math.round(p*100)/100 });
  st.wearingStart = null; live = null;
  saveSt(); stopTid(); render();
}

/* ── Timer ── */
function startTid() { stopTid(); tid = setInterval(tick, 1000); }
function stopTid()  { if (tid) { clearInterval(tid); tid = null; } }
function tick() {
  document.getElementById('timer').textContent = fmtMs(todayMs());
  document.getElementById('spts').textContent  = Math.round(todayPts());
}

/* ── Render ── */
function render() {
  const now = new Date(), h = now.getHours(), w = !!live;

  document.getElementById('hdate').textContent =
    `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  document.getElementById('bon').disabled  = w;
  document.getElementById('boff').disabled = !w;

  const badge = document.getElementById('badge');
  badge.textContent = w ? 'Appareil en bouche ✓' : 'Appareil retiré';
  badge.className   = 'badge ' + (w ? 'badge-on' : 'badge-off');

  document.getElementById('tlbl').textContent = w
    ? "Aujourd'hui + session en cours"
    : "Temps avec l'appareil aujourd'hui";

  document.getElementById('timer').textContent   = fmtMs(todayMs());
  document.getElementById('spts').textContent    = Math.round(todayPts());
  document.getElementById('sstreak').textContent = getStreak() + ' 🔥';
  document.getElementById('savg').textContent    = weekAvg();

  const cb = document.getElementById('cbanner');
  cb.style.display = (isSchool(now) && h >= 12 && h < 14 && !w) ? 'block' : 'none';

  const sc = document.getElementById('school-chip');
  if (isHol(now))       { sc.textContent = '🏖️ Vacances — profite bien !'; sc.style.display = 'block'; }
  else if (isSchool(now)) { sc.textContent = '🏫 Jour d\'école · cantine 12h-14h auto'; sc.style.display = 'block'; }
  else                   { sc.style.display = 'none'; }

  renderCal(); renderWeek(); renderHist();
}

function renderCal() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const fd  = new Date(y, m, 1).getDay();
  const dim = new Date(y, m+1, 0).getDate();
  let html  = DAYS.map(d => `<div class="cdn">${d}</div>`).join('');
  for (let i = 0; i < fd; i++) html += '<div class="cc empty"></div>';
  for (let d = 1; d <= dim; d++) {
    const date = new Date(y, m, d), k = dk(date), isT = k === today();
    const fut  = date > now && !isT;
    let cls = 'cc', p = 0;
    if (fut) { cls += ' future'; }
    else { p = isT ? todayPts() : ptsForKey(k); cls += ' ' + (p > 0 || st.sessions[k] ? S_CLS[scIdx(p)] : 'nodata'); }
    if (isT) cls += ' tr';
    html += `<div class="${cls}">${d}</div>`;
  }
  document.getElementById('calgrid').innerHTML = html;
}

function renderWeek() {
  const now = new Date(); let html = '';
  for (let i = 6; i >= 0; i--) {
    const d  = new Date(now); d.setDate(d.getDate() - i);
    const k  = dk(d), p = k === today() ? todayPts() : ptsForKey(k);
    const pct = Math.min(p / GOAL, 1), ht = Math.max(4, Math.round(pct * 58));
    html += `<div class="wcol"><div class="wb" style="height:${ht}px;background:${S_COLS[scIdx(p)]}"></div><div class="wl">${DAYS[d.getDay()]}</div></div>`;
  }
  document.getElementById('wbar').innerHTML = html;
}

function renderHist() {
  const el   = document.getElementById('hlist');
  const ses  = sesForKey(today());
  const canto = cantineAuto();
  if (!ses.length && !live && !canto) {
    el.innerHTML = '<p class="empty-msg">Aucune session pour l\'instant 😊</p>';
    return;
  }
  let html = '';
  ses.forEach(s => {
    const a = new Date(s.startMs), b = new Date(s.endMs);
    const pr = Math.round(s.pts * 10) / 10;
    const cls = s.pts >= 2 ? 'hp-good' : s.pts >= .5 ? 'hp-meh' : 'hp-none';
    html += `<div class="hi"><span class="ht">${fmtHM(a)} → ${fmtHM(b)}</span><span class="hd">${fmtDur(s.endMs-s.startMs)}</span><span class="hp ${cls}">+${pr} pts</span></div>`;
  });
  if (canto) html += `<div class="hi cantine"><span class="ht">🏫 12:00 → 14:00</span><span class="hd">Cantine</span><span class="hp hp-cant">auto</span></div>`;
  if (live)  html += `<div class="hi live"><span class="ht">${fmtHM(live)} → en cours…</span><span class="hd" style="color:#7F77DD">⏱</span><span class="hp hp-live">en cours</span></div>`;
  el.innerHTML = html;
}

/* ── Init ── */
function init() {
  st   = loadSt();
  if (!st.sessions)     st.sessions     = {};
  if (!st.wearingStart) st.wearingStart = null;
  live = st.wearingStart ? new Date(st.wearingStart) : null;

  document.getElementById('bon').addEventListener('click',  putOn);
  document.getElementById('boff').addEventListener('click', takeOff);

  render();
  if (live) startTid();
  setInterval(render, 60000);

  (function midnight() {
    const n = new Date(); n.setDate(n.getDate()+1); n.setHours(0,0,5,0);
    setTimeout(() => { render(); midnight(); }, n - new Date());
  })();
}

document.addEventListener('DOMContentLoaded', init);
