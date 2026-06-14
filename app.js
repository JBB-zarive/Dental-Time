/* ===================================
   Chloé — Suivi appareil dentaire
   app.js
   =================================== */

'use strict';

// ── Configuration ────────────────────────────────────────────────
const CONFIG = {
  storageKey:   'chloe_dental_v1',
  dailyGoalPts: 18,

  // Points par heure selon la tranche horaire
  // 0 = repas (pas de pénalité, juste 0)
  slots: [
    { from: 0,  to: 7,  pts: 2 },   // nuit
    { from: 7,  to: 12, pts: 3 },   // matin actif
    { from: 12, to: 14, pts: 0 },   // déjeuner Chloé
    { from: 14, to: 19, pts: 3 },   // après-midi actif
    { from: 19, to: 21, pts: 0 },   // dîner Chloé
    { from: 21, to: 23, pts: 1 },   // soirée
    { from: 23, to: 24, pts: 2 },   // nuit tardive
  ],
};

const MONTHS   = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DAY_ABBR = ['Di','Lu','Ma','Me','Je','Ve','Sa'];
const SCORE_COLORS = ['#F7C1C1','#FAC775','#FAE88D','#C0DD97','#639922','#3B6D11'];

// ── State ─────────────────────────────────────────────────────────
let state = { sessions: {}, wearingStart: null };
let liveStart      = null;   // Date | null
let timerInterval  = null;

// ── Persistence ───────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    return raw ? JSON.parse(raw) : { sessions: {}, wearingStart: null };
  } catch (e) {
    return { sessions: {}, wearingStart: null };
  }
}

function saveState() {
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); }
  catch (e) { console.warn('Impossible de sauvegarder :', e); }
}

// ── Date helpers ──────────────────────────────────────────────────
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() { return dateKey(new Date()); }

// ── Points calculation ────────────────────────────────────────────
function ptsPerHour(hour) {
  for (const slot of CONFIG.slots) {
    if (hour >= slot.from && hour < slot.to) return slot.pts;
  }
  return 1;
}

function calcPoints(startMs, endMs) {
  let pts = 0;
  let cur = startMs;

  while (cur < endMs) {
    const d    = new Date(cur);
    const hour = d.getHours();

    // Fin de l'heure courante
    const nextHour = new Date(cur);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(hour + 1);

    const segEnd = Math.min(nextHour.getTime(), endMs);
    const frac   = (segEnd - cur) / 3_600_000;   // fraction d'heure
    pts += ptsPerHour(hour) * frac;
    cur  = segEnd;
  }
  return pts;
}

// ── Derived data ──────────────────────────────────────────────────
function sessionsForKey(key) { return state.sessions[key] || []; }

function totalMsForKey(key) {
  return sessionsForKey(key).reduce((a, s) => a + (s.endMs - s.startMs), 0);
}

function ptsForKey(key) {
  return sessionsForKey(key).reduce((a, s) => a + s.pts, 0);
}

function todayTotalMs() {
  let ms = totalMsForKey(todayKey());
  if (liveStart) ms += Date.now() - liveStart.getTime();
  return ms;
}

function todayPoints() {
  let pts = ptsForKey(todayKey());
  if (liveStart) pts += calcPoints(liveStart.getTime(), Date.now());
  return pts;
}

function scoreClass(pts) {
  const pct = pts / CONFIG.dailyGoalPts;
  if (pct < 0.35) return 'score-0';
  if (pct < 0.55) return 'score-1';
  if (pct < 0.70) return 'score-2';
  if (pct < 0.85) return 'score-3';
  if (pct < 0.97) return 'score-4';
  return 'score-5';
}

function scoreColorIndex(pts) {
  const pct = pts / CONFIG.dailyGoalPts;
  if (pct < 0.35) return 0;
  if (pct < 0.55) return 1;
  if (pct < 0.70) return 2;
  if (pct < 0.85) return 3;
  if (pct < 0.97) return 4;
  return 5;
}

function streak() {
  let count = 0;
  const d   = new Date();
  const threshold = CONFIG.dailyGoalPts * 0.8;

  while (count < 366) {
    const k   = dateKey(d);
    const pts = k === todayKey() ? todayPoints() : ptsForKey(k);

    if (pts >= threshold) {
      count++;
    } else if (k === todayKey()) {
      // aujourd'hui pas encore atteint → on continue en remontant
      d.setDate(d.getDate() - 1);
      continue;
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function weekAvg() {
  let total = 0, days = 0;
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k   = dateKey(d);
    const pts = k === todayKey() ? todayPoints() : ptsForKey(k);
    if (state.sessions[k] || (k === todayKey() && liveStart)) {
      total += pts;
      days++;
    }
  }
  return days > 0 ? Math.round(total / days) : 0;
}

// ── Formatting ────────────────────────────────────────────────────
function fmtMs(ms) {
  const s   = Math.floor(ms / 1000);
  const hh  = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm  = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss  = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function fmtDuration(ms) {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

function fmtHHMM(date) {
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

// ── Actions ───────────────────────────────────────────────────────
function putOn() {
  if (liveStart) return;
  liveStart              = new Date();
  state.wearingStart     = liveStart.toISOString();
  saveState();
  startTimer();
  render();
}

function takeOff() {
  if (!liveStart) return;
  const endMs   = Date.now();
  const startMs = liveStart.getTime();
  const pts     = calcPoints(startMs, endMs);
  const key     = dateKey(new Date(startMs));

  if (!state.sessions[key]) state.sessions[key] = [];
  state.sessions[key].push({
    startMs,
    endMs,
    pts: Math.round(pts * 100) / 100,
  });

  state.wearingStart = null;
  liveStart          = null;
  saveState();
  stopTimer();
  render();
}

// ── Timer ─────────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  timerInterval = setInterval(tickTimer, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function tickTimer() {
  document.getElementById('timer').textContent       = fmtMs(todayTotalMs());
  document.getElementById('score-today').textContent = Math.round(todayPoints());
}

// ── Render helpers ────────────────────────────────────────────────
function renderHeader() {
  const now = new Date();
  document.getElementById('header-date').textContent =
    `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

function renderStatus() {
  const wearing = !!liveStart;

  document.getElementById('btn-on').disabled  = wearing;
  document.getElementById('btn-off').disabled = !wearing;

  const badge = document.getElementById('status-badge');
  badge.textContent = wearing ? 'Appareil en bouche ✓' : 'Appareil retiré';
  badge.className   = `status-badge ${wearing ? 'badge-on' : 'badge-off'}`;

  document.getElementById('status-label').textContent = wearing
    ? "Aujourd'hui + session en cours"
    : "Temps avec l'appareil aujourd'hui";

  document.getElementById('timer').textContent       = fmtMs(todayTotalMs());
  document.getElementById('score-today').textContent = Math.round(todayPoints());
  document.getElementById('streak-val').textContent  = `${streak()} 🔥`;
  document.getElementById('week-avg').textContent    = weekAvg();
}

function renderCalendar() {
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = DAY_ABBR.map(d => `<div class="cal-day-name">${d}</div>`).join('');

  // Empty cells before day 1
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const date    = new Date(year, month, d);
    const key     = dateKey(date);
    const isToday = key === todayKey();
    const isPast  = date < now && !isToday;

    let cls  = 'cal-cell';
    let pts  = 0;
    let tip  = '';

    if (!isPast && !isToday) {
      cls += ' future';
    } else {
      pts  = isToday ? todayPoints() : ptsForKey(key);
      tip  = `${Math.round(pts)} pts`;

      if (pts > 0 || state.sessions[key]) {
        cls += ` ${scoreClass(pts)}`;
      } else {
        cls += ' no-data';
      }
    }

    if (isToday) cls += ' today-ring';

    html += `<div class="${cls}" title="${tip}">${d}</div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
}

function renderWeekly() {
  const now = new Date();
  let   html = '';

  for (let i = 6; i >= 0; i--) {
    const d   = new Date(now);
    d.setDate(d.getDate() - i);
    const key  = dateKey(d);
    const pts  = key === todayKey() ? todayPoints() : ptsForKey(key);
    const pct  = Math.min(pts / CONFIG.dailyGoalPts, 1);
    const h    = Math.max(4, Math.round(pct * 58));
    const ci   = scoreColorIndex(pts);
    const col  = SCORE_COLORS[ci];

    html += `
      <div class="w-col">
        <div class="w-bar" style="height:${h}px; background:${col};"></div>
        <div class="w-lbl">${DAY_ABBR[d.getDay()]}</div>
      </div>`;
  }

  document.getElementById('weekly-bar').innerHTML = html;
  document.getElementById('goal-pts').textContent = CONFIG.dailyGoalPts;
}

function renderHistory() {
  const list     = document.getElementById('history-list');
  const sessions = sessionsForKey(todayKey());

  if (!sessions.length && !liveStart) {
    list.innerHTML = '<p class="empty-msg">Aucune session pour l\'instant</p>';
    return;
  }

  let html = '';

  sessions.forEach(s => {
    const start    = new Date(s.startMs);
    const end      = new Date(s.endMs);
    const dur      = fmtDuration(s.endMs - s.startMs);
    const ptsRound = Math.round(s.pts * 10) / 10;
    const ptsCls   = s.pts >= 2 ? 'pts-good' : s.pts >= 0.5 ? 'pts-meh' : 'pts-none';

    html += `
      <div class="hist-item">
        <span class="hist-time">${fmtHHMM(start)} → ${fmtHHMM(end)}</span>
        <span class="hist-dur">${dur}</span>
        <span class="hist-pts ${ptsCls}">+${ptsRound} pts</span>
      </div>`;
  });

  if (liveStart) {
    html += `
      <div class="hist-item live">
        <span class="hist-time">${fmtHHMM(liveStart)} → en cours…</span>
        <span class="hist-dur" style="color:#7F77DD;">⏱</span>
        <span class="hist-pts pts-live">en cours</span>
      </div>`;
  }

  list.innerHTML = html;
}

// ── Full render ───────────────────────────────────────────────────
function render() {
  renderHeader();
  renderStatus();
  renderCalendar();
  renderWeekly();
  renderHistory();
}

// ── Init ──────────────────────────────────────────────────────────
function init() {
  state = loadState();
  if (!state.sessions)    state.sessions    = {};
  if (!state.wearingStart) state.wearingStart = null;

  // Restore live session if page was closed while wearing
  if (state.wearingStart) {
    liveStart = new Date(state.wearingStart);
  }

  // Wire up buttons
  document.getElementById('btn-on').addEventListener('click',  putOn);
  document.getElementById('btn-off').addEventListener('click', takeOff);

  render();

  if (liveStart) startTimer();

  // Re-render at midnight to flip the day
  scheduleMidnightRefresh();
}

function scheduleMidnightRefresh() {
  const now       = new Date();
  const midnight  = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  const msUntil   = midnight.getTime() - now.getTime();
  setTimeout(() => { render(); scheduleMidnightRefresh(); }, msUntil);
}

document.addEventListener('DOMContentLoaded', init);
