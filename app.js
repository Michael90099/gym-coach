// GymCoach – UI-Logik

let state = loadState();
let session = loadSession();
let currentTab = 'home';
let selectedWorkoutKey = null;
let restInterval = null;

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const view = $('#view');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

// Versionsnummer aus dem eigenen Script-Tag – pflegt sich beim Bump von selbst
function appVersion() {
  const s = document.querySelector('script[src*="app.js"]');
  const m = s && s.src.match(/v=(\d+)/);
  return m ? m[1] : '?';
}

function fmtTime(sec) {
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

// ---------- Effekte: Toast, Konfetti, Zähl-Animation ----------

function toast(msg) {
  $$('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function confetti(count) {
  const old = $('#confettiCanvas');
  if (old) old.remove();
  const canvas = document.createElement('canvas');
  canvas.id = 'confettiCanvas';
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const colors = ['#ffa657', '#ffd166', '#4dd4ac', '#7cc4ff', '#ff8fa3'];
  const parts = Array.from({ length: count || 90 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.5,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 11 - 4,
    size: Math.random() * 7 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }));
  const t0 = performance.now();
  (function frame(t) {
    const elapsed = (t - t0) / 1000;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 2.2);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (elapsed < 2.2) requestAnimationFrame(frame);
    else canvas.remove();
  })(t0);
}

function animateCount(el, to, suffix) {
  if (!el) return; // Ziel kann schon geschlossen sein (z. B. Zusammenfassung sofort weggetippt)
  const dur = 900, t0 = performance.now();
  (function frame(t) {
    const k = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(to * eased) + (suffix || '');
    if (k < 1) requestAnimationFrame(frame);
  })(t0);
}

// ---------- Topbar ----------

function renderTopbar() {
  const { streak } = getStreak(state);
  $('#topbarStats').innerHTML =
    '<span class="chip streak">🔥 ' + streak + ' Wo.</span>' +
    '<span class="chip pts">★ ' + state.points + ' P</span>';
}

// ---------- Tabs ----------

$$('.tab').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  currentTab = tab;
  closeHoldTimer();
  $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}

function render() {
  renderTopbar();
  if (session && currentTab === 'home') return renderWorkout();
  if (currentTab === 'home') return renderHome();
  if (currentTab === 'history') return renderHistory();
  if (currentTab === 'progress') return renderProgress();
  if (currentTab === 'body') return renderBody();
  if (currentTab === 'mobility') return renderMobility();
  if (currentTab === 'running') return renderRunning();
  if (currentTab === 'plan') return renderPlanView();
}

// ---------- Home ----------

function suggestedWorkoutKey() {
  const order = PLAN.workouts.map((w) => w.key);
  if (!state.lastWorkoutKey) return order[0];
  const i = order.indexOf(state.lastWorkoutKey);
  return order[(i + 1) % order.length];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen, Michael! ☀️';
  if (h < 17) return 'Servus Michael! 💪';
  return 'Guten Abend, Michael! 🌙';
}

function weekStripHtml() {
  const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const trainedDays = new Set(state.logs.map((l) => new Date(l.date).toDateString()));
  return names.map((n, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const trained = trainedDays.has(d.toDateString());
    const isToday = d.toDateString() === now.toDateString();
    return '<div class="wday' + (trained ? ' trained' : '') + (isToday ? ' today' : '') + '">' +
      '<div class="d-label">' + n + '</div>' +
      '<div class="d-dot">' + (trained ? '✓' : d.getDate()) + '</div></div>';
  }).join('');
}

// Erinnerung ans Backup – iOS kann den Speicher einer Web-App löschen,
// dann wären Verlauf, Punkte und Streak weg.
function backupHintHtml() {
  if (state.logs.length < 3) return '';
  const days = state.lastExportAt ? (Date.now() - new Date(state.lastExportAt).getTime()) / 86400000 : null;
  if (days != null && days < 21) return '';
  return '<div class="card backup-hint">' +
    '<h2>💾 Zeit für ein Backup</h2>' +
    '<p class="muted small">' + (days == null
      ? 'Du hast noch nie gesichert. Deine ' + state.logs.length + ' Trainings liegen nur auf diesem iPhone – iOS kann den Speicher irgendwann leeren.'
      : 'Letztes Backup vor ' + Math.round(days) + ' Tagen.') +
    '</p><button class="btn secondary" id="homeExportBtn">⬇︎ Jetzt sichern</button></div>';
}

function renderHome() {
  const { streak, thisWeekCount, goal } = getStreak(state);
  const lvl = getLevel(state.points);
  if (!selectedWorkoutKey) selectedWorkoutKey = suggestedWorkoutKey();

  const dateLine = new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' });

  const picker = PLAN.workouts.map((w) =>
    '<button data-key="' + w.key + '" class="' + (w.key === selectedWorkoutKey ? 'sel' : '') + '">' + w.key +
    (w.key === suggestedWorkoutKey() ? ' • dran' : '') + '</button>'
  ).join('');

  const badges = state.badges.slice(-4).map((id) => {
    const b = BADGES.find((x) => x.id === id);
    return b ? '<span title="' + esc(b.name) + '" style="font-size:24px">' + b.icon + '</span>' : '';
  }).join(' ');

  view.innerHTML =
    '<div class="card hero">' +
      '<div class="date-line">' + esc(dateLine) + '</div>' +
      '<div class="greeting">' + greeting() + '</div>' +
      '<div class="quote">' + esc(pickQuote(QUOTES.start)) + '</div>' +
    '</div>' +

    '<div class="stat-row">' +
      '<div class="stat-tile"><div class="val flame"><span class="flame-icon">🔥</span> <span data-count="' + streak + '">0</span></div><div class="lbl">Wochen-Streak</div></div>' +
      '<div class="stat-tile"><div class="val gold" data-count="' + state.points + '">0</div><div class="lbl">Punkte</div></div>' +
      '<div class="stat-tile"><div class="val" data-count="' + state.logs.length + '">0</div><div class="lbl">Trainings</div></div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="level-line"><span><b>' + lvl.icon + ' ' + lvl.name + '</b> · Level ' + lvl.level + '</span>' +
      '<span>' + (lvl.next ? (lvl.next.pts - state.points) + ' P bis ' + lvl.next.name : 'Max-Level!') + '</span></div>' +
      '<div class="level-bar"><div style="width:0%"></div></div>' +
    '</div>' +

    '<div class="card">' +
      '<h2>Diese Woche · ' + thisWeekCount + ' / ' + goal + ' Trainings</h2>' +
      '<div class="week-strip">' + weekStripHtml() + '</div>' +
    '</div>' +

    '<div class="card">' +
      '<h2>Nächstes Training</h2>' +
      '<div class="workout-picker">' + picker + '</div>' +
      '<div class="workout-estimate">⏱ ca. ' + fmtDuration(estimateWorkoutSeconds(resolvedExercises(getWorkout(selectedWorkoutKey), state.variants))) + ' inkl. Aufwärmen</div>' +
      '<button class="btn" id="startBtn">▶︎ ' + esc(getWorkout(selectedWorkoutKey).name) + ' starten</button>' +
    '</div>' +

    (ouraGuidance(state)
      ? '<div class="card oura-card band-' + ouraGuidance(state).band.key + '">' +
        '<div class="cc-label">Oura heute</div>' +
        '<h2 class="cc-head">' + esc(ouraGuidance(state).headline) + '</h2>' +
        '<p class="cc-advice">' + esc(ouraGuidance(state).advice) + '</p></div>'
      : ouraDue(state)
        ? '<div class="card oura-card"><h2>💍 Oura-Morgencheck</h2>' +
          '<p class="muted small">Heute noch nichts eingetragen. Mit deiner Bereitschaft passt der Coach das Training an.</p>' +
          '<button class="btn secondary" id="ouraOpenBtn">Werte eintragen</button></div>'
        : '') +
    (checkinDue(state)
      ? '<div class="card checkin-hint"><h2>⚖️ Wochen-Check-in fällig</h2>' +
        '<p class="muted small">Einmal pro Woche wiegen hält dein Rekomp-Coaching scharf. Dauert 20 Sekunden, bringt ' + POINTS_CHECKIN + ' Punkte.</p>' +
        '<button class="btn secondary" id="homeCheckinBtn">Jetzt eintragen</button></div>'
      : '') +
    (mobilityDue(state)
      ? '<div class="card mobility-hint"><h2>🧘 Dehnen wäre dran</h2>' +
        '<p class="muted small">' + esc(mobilityCoach(state).headline) + ' – ' +
        fmtDuration(mobilityDuration(mobRoutine(mobilityCoach(state).key))) + '. Beweglichkeit hält sich nur mit Regelmäßigkeit.</p>' +
        '<button class="btn secondary" id="homeMobBtn">Zum Dehn-Coach</button></div>'
      : '') +
    (runningDue(state)
      ? '<div class="card running-hint"><h2>🏃 Lauftraining wäre dran</h2>' +
        '<p class="muted small">' + esc(runCoach(state).headline) + '. Die VO2max ist der stärkste Einzelwert für ein langes Leben – und sie hält sich nur mit Reiz.</p>' +
        '<button class="btn secondary" id="homeRunBtn">Zum Lauf-Coach</button></div>'
      : '') +
    backupHintHtml() +
    (badges ? '<div class="card"><h2>Letzte Abzeichen</h2><div>' + badges + '</div></div>' : '') +
    '<div class="app-version">GymCoach v' + appVersion() + ' · Daten bleiben auf diesem Gerät</div>';

  $$('[data-count]').forEach((el) => animateCount(el, +el.dataset.count));
  requestAnimationFrame(() => {
    const bar = $('.level-bar > div');
    if (bar) bar.style.width = Math.round(lvl.progress * 100) + '%';
  });

  $$('.workout-picker button').forEach((b) => b.addEventListener('click', () => {
    selectedWorkoutKey = b.dataset.key;
    renderHome();
  }));
  $('#startBtn').addEventListener('click', () => startWorkout(selectedWorkoutKey));
  const expBtn = $('#homeExportBtn');
  if (expBtn) expBtn.addEventListener('click', () => { exportData(state); renderHome(); toast('💾 Backup gespeichert'); });
  const ciBtn = $('#homeCheckinBtn');
  if (ciBtn) ciBtn.addEventListener('click', () => openCheckinSheet());
  const mbBtn = $('#homeMobBtn');
  if (mbBtn) mbBtn.addEventListener('click', () => switchTab('mobility'));
  const rnBtn = $('#homeRunBtn');
  if (rnBtn) rnBtn.addEventListener('click', () => switchTab('running'));
  wireOuraCard();
}

// ---------- Workout-Session ----------

// Baut den Session-Eintrag einer Übung inkl. Empfehlung und Vorbefüllung.
// Rechnet mit den Gewichtsschritten, die es am Gerät wirklich gibt.
function buildSessionExercise(planEx) {
  const ex = effectiveExercise(planEx, state.steps);
  const hist = exerciseHistory(state, ex.id);
  const rec = getRecommendation(ex, hist);
  const lastSets = hist[0] ? hist[0].sets : [];
  return {
    id: ex.id,
    prevBest: hist[0] ? bestOf(ex, hist[0].sets) : null,
    rec: { weight: rec.weight, increase: !!rec.increase, caution: !!rec.caution, message: rec.message },
    sets: Array.from({ length: ex.sets }, (_, i) => ({
      weight: rec.weight != null ? rec.weight : (lastSets[i] ? lastSets[i].weight : null),
      // Bei reps/time gibt der Coach die Zielvorgabe vor – sonst würde die Ansage
      // ("heute 45 Sekunden") nicht zum vorbefüllten Feld passen.
      reps: ex.metric === 'reps' ? (rec.target != null ? rec.target : ex.repsMax)
        : ex.metric === 'weight' ? (lastSets[i] && !rec.increase ? lastSets[i].reps : ex.repsMin)
        : null,
      value: ex.metric === 'time' ? (rec.target != null ? rec.target : ex.timeTarget)
        : ex.metric === 'distance' ? ex.distTarget : null,
      done: false,
    })),
    painLevel: 'none',
    rir: null,           // Reserve im Tank nach dem letzten Satz (Autoregulation)
  };
}

function startWorkout(key) {
  session = {
    workoutKey: key,
    startedAt: new Date().toISOString(),
    warmup: {},
    exercises: resolvedExercises(getWorkout(key), state.variants).map(buildSessionExercise),
  };
  saveSession(session);
  switchTab('home');
  toast(pickQuote(QUOTES.workoutStart));
}

function setInputsHtml(ex, sEx, i) {
  const s = sEx.sets[i];
  const w = s.weight != null ? s.weight : '';
  let inputs = '';
  if (ex.metric === 'weight' || ex.metric === 'distance') {
    inputs += '<input type="number" inputmode="decimal" step="' + stepOf(ex, state.steps) + '" data-f="weight" data-i="' + i + '" value="' + w + '" placeholder="kg">' +
      '<span class="unit' + (ex.perHand ? ' per-hand' : '') + '">' + weightUnit(ex) + '</span>';
  }
  if (ex.metric === 'weight' || ex.metric === 'reps') {
    inputs += '<input type="number" inputmode="numeric" data-f="reps" data-i="' + i + '" value="' + (s.reps != null ? s.reps : '') + '" placeholder="Wdh"><span class="unit">Wdh</span>';
  }
  if (ex.metric === 'time') {
    inputs += '<input type="number" inputmode="numeric" data-f="value" data-i="' + i + '" value="' + (s.value != null ? s.value : '') + '" placeholder="Sek"><span class="unit">Sek</span>' +
      '<button class="set-timer-btn" data-starttimer="' + i + '" aria-label="Timer starten">▶</button>';
  }
  if (ex.metric === 'distance') {
    inputs += '<input type="number" inputmode="numeric" data-f="value" data-i="' + i + '" value="' + (s.value != null ? s.value : '') + '" placeholder="m"><span class="unit">m</span>';
  }
  return inputs;
}

// Aufwärmsatz-Zeile für schwere Grundübungen (nicht abzuhaken – nur als Ansage)
function rampHtml(ex, sEx) {
  const exEff = effectiveExercise(ex, state.steps);
  if (!exEff.ramp) return '';
  const workWeight = sEx.sets[0] ? sEx.sets[0].weight : null;
  const ramps = rampSets(exEff, workWeight);
  if (!ramps.length) {
    return workWeight == null
      ? '<div class="ramp-row">🔥 Vorher aufwärmen: ~50 % × 10 und ~75 % × 5 deines Arbeitsgewichts</div>'
      : '';
  }
  const parts = ramps.map((r) => fmtW(r.weight) + ' kg × ' + r.reps).join(' → ');
  return '<div class="ramp-row">🔥 Aufwärmsätze: ' + parts + ' <span class="ramp-hint">· kurz pausieren, zählt nicht als Arbeitssatz</span></div>';
}

// Aufwärmsatz-Zeile einer Karte an das aktuelle Gewicht anpassen (ohne Voll-Render,
// damit der Nutzer beim Tippen nicht den Fokus verliert)
function updateRampRow(exIdx) {
  const sEx = session.exercises[exIdx];
  const ex = PLAN.exerciseById[sEx.id];
  const card = $('[data-excard="' + exIdx + '"]');
  if (!card) return;
  const html = rampHtml(ex, sEx);
  const existing = card.querySelector('.ramp-row');
  if (existing) {
    if (html) existing.outerHTML = html;
    else existing.remove();
  } else if (html) {
    const rec = card.querySelector('.rec');
    if (rec) rec.insertAdjacentHTML('afterend', html);
  }
}

function renderWorkout() {
  const w = getWorkout(session.workoutKey);

  const warmupHtml = PLAN.warmup.map((it) =>
    '<label><input type="checkbox" data-wu="' + it.id + '"' + (session.warmup[it.id] ? ' checked' : '') + '><span class="ok">' + esc(it.name) + '</span></label>'
  ).join('');

  const exHtml = session.exercises.map((sEx, exIdx) => {
    const ex = PLAN.exerciseById[sEx.id];
    const slot = PLAN.slotByExerciseId[sEx.id];
    const hasVariants = slot && (slot.alternatives || []).length > 0;
    const recClass = sEx.rec.caution ? ' caution' : sEx.rec.increase ? ' increase' : '';
    const target = ex.metric === 'time' ? ex.sets + '×' + ex.timeTarget + ' Sek'
      : ex.metric === 'distance' ? ex.sets + '×' + ex.distTarget + ' m'
      : ex.sets + '×' + (ex.repsMin === ex.repsMax ? ex.repsMax : ex.repsMin + '–' + ex.repsMax);

    const setsHtml = sEx.sets.map((s, i) =>
      '<div class="set-row" data-ex="' + exIdx + '">' +
        '<span class="set-num">' + (i + 1) + '</span>' +
        setInputsHtml(ex, sEx, i) +
        '<button class="set-check' + (s.done ? ' done' : '') + '" data-check="' + i + '">✓</button>' +
      '</div>'
    ).join('');

    const painHtml = ex.painCheck
      ? '<div class="check-row"><span class="cr-label">Schulter dabei?</span><div class="cr-chips">' +
        PLAN.painLevels.map((p) =>
          '<button class="chip-btn pain-' + p.key + ((sEx.painLevel || 'none') === p.key ? ' on' : '') + '" ' +
          'data-pain="' + exIdx + '" data-level="' + p.key + '" title="' + esc(p.desc) + '">' + esc(p.short) + '</button>'
        ).join('') + '</div></div>'
      : '';

    // Reserve im Tank – nur bei Grundübungen, hält den Aufwand im Studio klein
    const rirHtml = ex.group === 'main' && ex.metric === 'weight'
      ? '<div class="check-row"><span class="cr-label">Im Tank geblieben?</span><div class="cr-chips">' +
        RIR_OPTIONS.map((o) =>
          '<button class="chip-btn' + (sEx.rir === o.rir ? ' on' : '') + '" ' +
          'data-rir="' + exIdx + '" data-rirval="' + o.rir + '" title="' + esc(o.desc) + '">' + esc(o.short) + '</button>'
        ).join('') + '</div></div>'
      : '';

    const complete = sEx.sets.length > 0 && sEx.sets.every((s) => s.done);
    return '<div class="card exercise-card' + (complete ? ' complete' : '') + '" data-excard="' + exIdx + '">' +
      '<div class="exercise-head"><h3>' + esc(ex.name) + '</h3>' +
        '<button class="swap-btn" data-swap="' + exIdx + '" aria-label="Übung anpassen">' + (hasVariants ? '⇄' : '⚙') + '</button>' +
        '<span class="target">' + target + ' · ⏱ ' + fmtTime(ex.rest) + '</span></div>' +
      (ex.note ? '<div class="exercise-note">⚠️ ' + esc(ex.note) + '</div>' : '') +
      '<div class="rec' + recClass + '">🧠 ' + esc(sEx.rec.message) + '</div>' +
      rampHtml(ex, sEx) +
      setsHtml + rirHtml + painHtml +
    '</div>';
  }).join('');

  view.innerHTML =
    '<div class="session-progress">' +
    '<div class="sp-line"><span>' + esc(w.name) + '</span><span class="sp-clock" id="spClock">⏱ 0:00</span></div>' +
    '<div class="sp-bar"><div id="spBar"></div></div>' +
    '<div class="sp-sub"><span class="pct" id="spPct"></span><span id="spRemain"></span></div></div>' +
    '<details class="fold" ' + (Object.keys(session.warmup).length < PLAN.warmup.length ? 'open' : '') + '>' +
      '<summary>🔥 Aufwärmen (Pflicht bei Impingement!)</summary>' +
      '<div class="fold-body checklist">' + warmupHtml + '</div>' +
    '</details>' +
    '<div class="section-label">Übungen</div>' +
    exHtml +
    '<button class="btn" id="finishBtn">🏁 Training abschließen</button>' +
    '<button class="btn danger" id="cancelBtn">Training verwerfen</button>';

  updateSessionProgress();
  startSessionClock();

  // Events
  $$('input[data-wu]').forEach((cb) => cb.addEventListener('change', () => {
    if (cb.checked) session.warmup[cb.dataset.wu] = true;
    else delete session.warmup[cb.dataset.wu];
    saveSession(session);
  }));

  $$('.set-row input').forEach((inp) => inp.addEventListener('change', () => {
    const exIdx = +inp.closest('.set-row').dataset.ex;
    const i = +inp.dataset.i;
    const v = inp.value === '' ? null : parseFloat(inp.value.replace(',', '.'));
    session.exercises[exIdx].sets[i][inp.dataset.f] = isNaN(v) ? null : v;
    saveSession(session);
    // Aufwärmsätze hängen am Gewicht von Satz 1 – live nachziehen
    if (inp.dataset.f === 'weight' && i === 0) updateRampRow(exIdx);
  }));

  $$('.set-check').forEach((btn) => btn.addEventListener('click', () => {
    const row = btn.closest('.set-row');
    const exIdx = +row.dataset.ex;
    const i = +btn.dataset.check;
    const sEx = session.exercises[exIdx];
    const s = sEx.sets[i];
    // Werte aus den Inputs übernehmen
    $$('input', row).forEach((inp) => {
      const v = inp.value === '' ? null : parseFloat(inp.value.replace(',', '.'));
      s[inp.dataset.f] = isNaN(v) ? null : v;
    });
    s.done = !s.done;
    btn.classList.toggle('done', s.done);
    saveSession(session);

    const card = $('[data-excard="' + exIdx + '"]');
    if (card) card.classList.toggle('complete', sEx.sets.every((x) => x.done));
    updateSessionProgress();

    if (s.done) handleSetCompleted(exIdx, i);
  }));

  $$('.set-timer-btn').forEach((btn) => btn.addEventListener('click', () => {
    const row = btn.closest('.set-row');
    const exIdx = +row.dataset.ex;
    const i = +btn.dataset.starttimer;
    const inp = $('input[data-f="value"]', row);
    const wish = inp && inp.value !== '' ? parseInt(inp.value, 10) : null;
    startHoldTimer(exIdx, i, wish);
  }));

  $$('.swap-btn').forEach((btn) => btn.addEventListener('click', () => {
    const exIdx = +btn.dataset.swap;
    openExerciseSettings(PLAN.slotByExerciseId[session.exercises[exIdx].id].id, exIdx);
  }));

  $$('[data-pain]').forEach((btn) => btn.addEventListener('click', () => {
    const exIdx = +btn.dataset.pain;
    const sEx = session.exercises[exIdx];
    // Nochmal tippen hebt die Auswahl wieder auf
    sEx.painLevel = sEx.painLevel === btn.dataset.level ? 'none' : btn.dataset.level;
    saveSession(session);
    renderWorkout();
  }));

  $$('[data-rir]').forEach((btn) => btn.addEventListener('click', () => {
    const exIdx = +btn.dataset.rir;
    const sEx = session.exercises[exIdx];
    const val = parseFloat(btn.dataset.rirval);
    sEx.rir = sEx.rir === val ? null : val;
    saveSession(session);
    renderWorkout();
  }));

  $('#finishBtn').addEventListener('click', promptRehab);
  $('#cancelBtn').addEventListener('click', () => {
    if (confirm('Training wirklich verwerfen? Eingetragene Sätze gehen verloren.')) {
      stopRestTimer();
      closeHoldTimer();
      stopSessionClock();
      session = null;
      saveSession(null);
      applyPendingReloadIfSafe();
      render();
    }
  });
}

// ---------- Übung anpassen: Variante & Gewichtsschritt ----------

// exIdx nur setzen, wenn aus einem laufenden Training heraus geöffnet wird
function openExerciseSettings(slotId, exIdx) {
  const slot = findSlot(slotId);
  if (!slot) return;
  if (!state.variants) state.variants = {};
  if (!state.steps) state.steps = {};
  const currentId = state.variants[slotId] || slot.id;
  const current = PLAN.exerciseById[currentId];
  const hasVariants = (slot.alternatives || []).length > 0;

  const items = hasVariants ? variantsOf(slot).map((v) => {
    const reps = v.metric === 'time' ? v.sets + '×' + v.timeTarget + ' Sek'
      : v.sets + '×' + (v.repsMin === v.repsMax ? v.repsMax : v.repsMin + '–' + v.repsMax);
    return '<button class="variant-opt' + (v.id === currentId ? ' sel' : '') + '" data-variant="' + v.id + '">' +
      '<div class="vo-name">' + esc(v.name) + (v.id === currentId ? ' <span class="vo-cur">aktuell</span>' : '') + '</div>' +
      (v.variantNote ? '<div class="vo-desc">' + esc(v.variantNote) + '</div>' : '') +
      '<div class="vo-meta">' + reps + ' · ⏱ ' + fmtTime(v.rest) + ' Pause</div>' +
    '</button>';
  }).join('') : '';

  // Gewichtsschritt nur bei Übungen mit Gewicht
  const usesWeight = current.metric === 'weight' || current.metric === 'distance';
  const activeStep = stepOf(current, state.steps);
  const stepChips = usesWeight ? STEP_OPTIONS.map((s) =>
    '<button class="chip-btn' + (s === activeStep ? ' on' : '') + '" data-step="' + s + '">' + fmtW(s) + ' kg</button>'
  ).join('') : '';

  showOverlay(
    '<h2>⚙ ' + esc(current.name) + '</h2>' +
    (hasVariants
      ? '<div class="section-label" style="margin-top:12px">Variante</div>' +
        '<p class="muted small">Gilt auch für die nächsten Trainings. Jede Variante hat ihren eigenen Verlauf – die Gewichte werden nicht vermischt.</p>' +
        '<div class="variant-list">' + items + '</div>'
      : '') +
    (usesWeight
      ? '<div class="section-label">Gewichtsschritt im Studio</div>' +
        '<p class="muted small">Kleinster Sprung, den du an diesem Gerät einstellen kannst (' +
        esc(EQUIPMENT_LABELS[current.equipment] || 'Gerät') + '). Der Coach schlägt dann nur noch Gewichte vor, die es wirklich gibt – ' +
        'aktuell in ' + fmtW(incrementOf(current, activeStep)) + '-kg-Sprüngen.</p>' +
        '<div class="cr-chips step-chips">' + stepChips + '</div>'
      : '') +
    '<button class="btn secondary" id="closeVariant" style="margin-top:16px">Schließen</button>'
  );

  $('#closeVariant').addEventListener('click', hideOverlay);

  $$('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const newStep = parseFloat(b.dataset.step);
    state.steps[currentId] = newStep;
    saveState(state);
    // Läuft die Übung gerade und ist noch nichts eingetragen, Empfehlung neu rechnen
    if (exIdx != null && session && !session.exercises[exIdx].sets.some((s) => s.done)) {
      session.exercises[exIdx] = buildSessionExercise(PLAN.exerciseById[currentId]);
      saveSession(session);
    }
    hideOverlay();
    render();
    toast('⚙ Schritte à ' + fmtW(newStep) + ' kg');
  }));
  $$('.variant-opt').forEach((b) => b.addEventListener('click', () => {
    const newId = b.dataset.variant;
    if (newId === currentId) { hideOverlay(); return; }

    if (exIdx != null && session) {
      const sEx = session.exercises[exIdx];
      if (sEx.sets.some((s) => s.done) &&
          !confirm('Für diese Übung sind schon Sätze eingetragen. Beim Wechsel gehen sie verloren. Trotzdem wechseln?')) return;
    }

    state.variants[slotId] = newId;
    saveState(state);

    if (exIdx != null && session) {
      session.exercises[exIdx] = buildSessionExercise(PLAN.exerciseById[newId]);
      saveSession(session);
    }

    hideOverlay();
    render();
    toast('⇄ ' + PLAN.exerciseById[newId].name);
  }));
}

function updateSessionProgress() {
  const bar = $('#spBar'), pct = $('#spPct'), remain = $('#spRemain');
  if (!bar || !session) return;
  let total = 0, done = 0;
  for (const sEx of session.exercises) {
    total += sEx.sets.length;
    done += sEx.sets.filter((s) => s.done).length;
  }
  const p = total ? Math.round((done / total) * 100) : 0;
  bar.style.width = p + '%';
  pct.textContent = done + '/' + total + ' Sätze · ' + p + ' %';
  remain.textContent = done >= total ? '🏁 Bereit zum Abschließen' : 'noch ca. ' + fmtDuration(estimateRemainingSeconds(session));
}

// Gemeinsame Logik, nachdem ein Satz erledigt wurde – egal ob per Häkchen oder Halte-Timer
function handleSetCompleted(exIdx, i, fromTimer) {
  const sEx = session.exercises[exIdx];
  const ex = PLAN.exerciseById[sEx.id];
  const s = sEx.sets[i];

  // Neuer Bestwert? Sofort feiern!
  const now = bestOf(ex, [s]);
  if (!sEx.prCelebrated && sEx.prevBest != null && now != null && now > sEx.prevBest) {
    sEx.prCelebrated = true;
    saveSession(session);
    const unit = ex.metric === 'time' ? ' Sek' : ex.metric === 'reps' ? ' Wdh' : ' kg';
    toast('🎉 Neuer Rekord: ' + fmtW(now) + unit + ' bei ' + ex.name + '!');
    confetti(50);
  }

  const allDone = session.exercises.every((e) => e.sets.every((x) => x.done));
  if (allDone) {
    stopRestTimer();
    toast('🏁 Alle Sätze geschafft – Training abschließen!');
  } else if (sEx.sets.every((x) => x.done)) {
    // Übung fertig -> Übungswechsel: mindestens 2 Min Pause, nächste Übung ansagen
    const nextEx = session.exercises.find((e) => !e.sets.every((x) => x.done));
    const nextName = nextEx ? PLAN.exerciseById[nextEx.id].name : '';
    startRestTimer(Math.max(ex.rest, 120), pickQuote(QUOTES.exerciseDone), nextName ? 'Dann: ' + nextName : '', fromTimer);
  } else {
    const doneCount = sEx.sets.filter((x) => x.done).length;
    startRestTimer(ex.rest, 'Pause · ' + ex.name, 'Dann Satz ' + Math.min(doneCount + 1, sEx.sets.length) + ' von ' + sEx.sets.length, fromTimer);
  }
}

// ---------- Gesamtuhr (läuft ab Trainingsstart mit) ----------

let sessionClockInterval = null;

function startSessionClock() {
  if (sessionClockInterval) clearInterval(sessionClockInterval);
  const tick = () => {
    const el = $('#spClock');
    if (!el || !session) { stopSessionClock(); return; }
    const sec = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    el.textContent = '⏱ ' + (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  tick();
  sessionClockInterval = setInterval(tick, 1000);
}

function stopSessionClock() {
  if (sessionClockInterval) clearInterval(sessionClockInterval);
  sessionClockInterval = null;
}

// ---------- Rest-Timer (Kreis-Countdown) ----------
// Läuft über echte Uhrzeit (Endzeitpunkt) statt über einen Zähler: iOS friert
// Intervalle ein, sobald die App in den Hintergrund geht. Mit dem Endzeitpunkt
// stimmt die Restzeit sofort wieder, wenn du zurückkommst – und der Stand wird
// gespeichert, damit sogar ein App-Neustart die Pause nicht vergisst.

const RING_R = 24, RING_C = 2 * Math.PI * RING_R;
const REST_KEY = 'gymcoach.rest.v1';
let restState = null; // { endsAt, total, title, sub }

// Zwischen Satzende und Abhaken vergehen ein paar Sekunden – die zählen schon
// als Pause. Deshalb startet der Timer um diesen Ausgleich verkürzt (einstellbar).
function restOffsetOf() {
  return state.restOffset != null ? state.restOffset : 10;
}

// noOffset: nach Halte-Timer-Sätzen gibt es keine Antipp-Verzögerung – voller Pausenwert
function startRestTimer(seconds, title, sub, noOffset) {
  const secs = Math.max(20, seconds - (noOffset ? 0 : restOffsetOf()));
  restState = {
    endsAt: Date.now() + secs * 1000,
    total: secs,
    title: title || 'Pause läuft',
    sub: sub || pickQuote(QUOTES.rest),
  };
  localStorage.setItem(REST_KEY, JSON.stringify(restState));
  renderRestTimer();
}

function restRemaining() {
  return Math.max(0, Math.round((restState.endsAt - Date.now()) / 1000));
}

function renderRestTimer() {
  if (restInterval) clearInterval(restInterval);
  const el = $('#restTimer');
  el.classList.remove('hidden');

  el.innerHTML =
    '<div class="ring">' +
      '<svg width="56" height="56" viewBox="0 0 56 56">' +
        '<circle class="ring-bg" cx="28" cy="28" r="' + RING_R + '" fill="none" stroke-width="5"/>' +
        '<circle class="ring-fg" id="ringFg" cx="28" cy="28" r="' + RING_R + '" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + RING_C + '" stroke-dashoffset="0"/>' +
      '</svg>' +
      '<div class="ring-time" id="ringTime"></div>' +
    '</div>' +
    '<div class="rt-mid"><div class="rt-label">' + esc(restState.title) + '</div>' +
    '<div class="rt-sub">' + esc(restState.sub) + '</div></div>' +
    '<div class="rt-btns"><button id="addRest">+30s</button><button id="skipRest">Weiter ▶︎</button></div>';

  const draw = () => {
    const remaining = restRemaining();
    $('#ringTime').textContent = fmtTime(remaining);
    $('#ringFg').style.strokeDashoffset = String(RING_C * Math.min(1, Math.max(0, 1 - remaining / restState.total)));
  };
  draw();

  $('#skipRest').addEventListener('click', stopRestTimer);
  $('#addRest').addEventListener('click', () => {
    restState.endsAt += 30000;
    restState.total += 30;
    localStorage.setItem(REST_KEY, JSON.stringify(restState));
    draw();
  });

  restInterval = setInterval(() => {
    if (!restState) { stopRestTimer(); return; }
    if (restRemaining() <= 0) {
      stopRestTimer();
      playSound('rest');
      say('Pause vorbei');
      toast('⏱ Pause vorbei – nächster Satz!');
    } else draw();
  }, 500);
}

function stopRestTimer() {
  if (restInterval) clearInterval(restInterval);
  restInterval = null;
  restState = null;
  localStorage.removeItem(REST_KEY);
  $('#restTimer').classList.add('hidden');
}

// Nach App-Neustart oder Rückkehr aus dem Hintergrund die laufende Pause wiederherstellen
function restoreRestTimer() {
  if (restState) return; // läuft bereits
  try {
    const saved = JSON.parse(localStorage.getItem(REST_KEY));
    if (!saved) return;
    if (!session || typeof saved.endsAt !== 'number' || !(saved.total > 0)) {
      localStorage.removeItem(REST_KEY);
      return;
    }
    if (saved.endsAt > Date.now()) {
      restState = saved;
      renderRestTimer();
    } else {
      localStorage.removeItem(REST_KEY);
      if (Date.now() - saved.endsAt < 120000) toast('⏱ Pause ist um – weiter geht\'s!');
    }
  } catch (e) {
    localStorage.removeItem(REST_KEY); // beschädigter Stand darf nicht liegen bleiben
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { restoreRestTimer(); restoreMobility(); restoreRun(); }
});

// iOS erlaubt Ton nur aus einer Nutzer-Geste heraus. Deshalb einmal einen
// gemeinsamen AudioContext beim ersten Tippen anlegen und wiederverwenden –
// sonst bleiben Töne aus Timer-Intervallen heraus stumm.
let audioCtx = null;
let voicePrimed = false;

function soundMode() {
  return state.soundMode || 'voice';   // 'off' | 'beep' | 'voice'
}

function initAudio() {
  try {
    // Entscheidend fürs iPhone: Ohne diese Zeile schaltet der seitliche
    // Stummschalter jeden Web-Ton ab – im Studio hört man dann gar nichts.
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
      navigator.audioSession.type = 'playback';
    }
  } catch (e) { /* ältere Systeme kennen das noch nicht */ }
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* Ton nicht verfügbar */ }
}
document.addEventListener('touchend', initAudio, { passive: true });
document.addEventListener('click', initAudio, { passive: true });

// Klangfolgen: f = Tonhöhe, t = Startversatz in Sek., d = Dauer, v = Lautstärke
const SOUNDS = {
  tick:     { tones: [{ f: 920, t: 0, d: 0.06, v: 0.3 }], vib: false },
  go:       { tones: [{ f: 660, t: 0, d: 0.11, v: 0.5 }, { f: 990, t: 0.11, d: 0.2, v: 0.5 }], vib: [130] },
  // Übung zu Ende: absteigender Dreiklang, bewusst kräftig und unverwechselbar
  done:     { tones: [{ f: 1175, t: 0, d: 0.16, v: 0.75 }, { f: 880, t: 0.17, d: 0.16, v: 0.75 }, { f: 587, t: 0.34, d: 0.4, v: 0.8 }],
              vib: [200, 90, 200, 90, 320] },
  switch:   { tones: [{ f: 784, t: 0, d: 0.12, v: 0.6 }, { f: 784, t: 0.19, d: 0.14, v: 0.6 }], vib: [160, 100, 160] },
  finish:   { tones: [{ f: 523, t: 0, d: 0.13, v: 0.6 }, { f: 659, t: 0.13, d: 0.13, v: 0.6 },
                      { f: 784, t: 0.26, d: 0.13, v: 0.6 }, { f: 1047, t: 0.39, d: 0.5, v: 0.75 }],
              vib: [200, 80, 200, 80, 200, 80, 420] },
  rest:     { tones: [{ f: 880, t: 0, d: 0.16, v: 0.65 }, { f: 1175, t: 0.18, d: 0.34, v: 0.7 }], vib: [220, 110, 220] },
};

function playSound(name) {
  const s = SOUNDS[name];
  if (!s) return;
  try {
    if (navigator.vibrate && s.vib) navigator.vibrate(s.vib);
  } catch (e) { /* Vibration nicht verfügbar */ }
  if (soundMode() === 'off') return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    for (const t of s.tones) {
      // Zwei Oszillatoren pro Ton: die Oktave darüber macht ihn im Studio durchdringender
      [[t.f, 1], [t.f * 2, 0.35]].forEach(([freq, mix]) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'triangle';
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.value = freq;
        const start = now + t.t;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(Math.max(0.02, t.v * mix), start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, start + t.d);
        o.start(start); o.stop(start + t.d + 0.02);
      });
    }
  } catch (e) { /* Ton nicht verfügbar */ }
}

const SOUND_MODES = [
  { key: 'voice', icon: '🗣', label: 'Töne + Ansage', desc: 'Signale plus gesprochene Übungsnamen und Seitenwechsel' },
  { key: 'beep', icon: '🔔', label: 'Nur Töne', desc: 'Signaltöne ohne Sprachausgabe' },
  { key: 'off', icon: '🔇', label: 'Stumm', desc: 'Nur Vibration, kein Ton' },
];

function soundIcon() {
  const m = SOUND_MODES.find((x) => x.key === soundMode());
  return m ? m.icon : '🔔';
}

function setSoundMode(mode) {
  state.soundMode = mode;
  saveState(state);
  if (mode !== 'off') { initAudio(); playSound('go'); }
  if (mode === 'voice') say('Ansage aktiv');
}

function cycleSoundMode() {
  const i = SOUND_MODES.findIndex((x) => x.key === soundMode());
  setSoundMode(SOUND_MODES[(i + 1) % SOUND_MODES.length].key);
  toast(soundIcon() + ' ' + SOUND_MODES[(i + 1) % SOUND_MODES.length].label);
}

// Deutsche Sprachansage – gerade beim Dehnen am Boden hilfreich, wo man nicht aufs Handy schaut
function say(text) {
  if (soundMode() !== 'voice' || !text) return;
  try {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 1.05;
    u.volume = 1;
    speechSynthesis.speak(u);
    voicePrimed = true;
  } catch (e) { /* Sprachausgabe nicht verfügbar */ }
}

// Alte Aufrufe weiterhin bedienen: Frequenz grob auf die neuen Klänge abbilden
function beep(freq, dur, vibratePattern) {
  if (freq === 920 || (freq && freq < 700 && dur && dur <= 0.12)) return playSound('tick');
  if (freq && freq >= 1000) return playSound('finish');
  return playSound('rest');
}

// ---------- Halte-Timer für Plank & Co. (Vollbild, vom Boden aus lesbar) ----------

const HOLD_R = 92, HOLD_C = 2 * Math.PI * HOLD_R;
const PREP_SEC = 5;

let holdInterval = null;
let wakeLock = null;

// wakeLockWanted verhindert ein Rennen: Wird der Timer geschlossen, bevor die
// asynchrone Anfrage zurückkommt, bliebe der Bildschirm sonst dauerhaft an.
let wakeLockWanted = false;

async function requestWakeLock() {
  wakeLockWanted = true;
  try {
    if (!('wakeLock' in navigator)) return;
    const sentinel = await navigator.wakeLock.request('screen');
    if (!wakeLockWanted) { sentinel.release(); return; }
    wakeLock = sentinel;
  } catch (e) { /* Bildschirm-Sperre nicht beeinflussbar */ }
}

function releaseWakeLock() {
  wakeLockWanted = false;
  try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {}
}

function closeHoldTimer() {
  if (holdInterval) clearInterval(holdInterval);
  holdInterval = null;
  releaseWakeLock();
  const el = $('#holdTimer');
  if (el) el.remove();
}

function startHoldTimer(exIdx, setIdx, wishSeconds) {
  const sEx = session.exercises[exIdx];
  const ex = PLAN.exerciseById[sEx.id];
  const target = Math.max(5, wishSeconds || sEx.sets[setIdx].value || ex.timeTarget);

  closeHoldTimer();
  // Laufende Pause merken: bei Abbruch in der Vorbereitung kommt sie zurück
  // (versehentliches Antippen soll keine Pause vernichten)
  const savedRest = restState ? Object.assign({}, restState) : null;
  stopRestTimer();
  initAudio();
  requestWakeLock();

  const cancelPrep = () => {
    closeHoldTimer();
    if (savedRest && savedRest.endsAt > Date.now()) {
      restState = savedRest;
      localStorage.setItem(REST_KEY, JSON.stringify(restState));
      renderRestTimer();
    }
  };

  let phase = 'prep';        // 'prep' -> 'hold'
  let remaining = PREP_SEC;
  let paused = false;

  const el = document.createElement('div');
  el.id = 'holdTimer';
  el.className = 'hold-timer prep';
  el.innerHTML =
    '<div class="ht-inner">' +
      '<div class="ht-name">' + esc(ex.name) + ' · Satz ' + (setIdx + 1) + ' von ' + sEx.sets.length + '</div>' +
      '<div class="ht-ring">' +
        '<svg viewBox="0 0 200 200">' +
          '<circle class="ht-ring-bg" cx="100" cy="100" r="' + HOLD_R + '" fill="none" stroke-width="10"/>' +
          '<circle class="ht-ring-fg" id="htRing" cx="100" cy="100" r="' + HOLD_R + '" fill="none" stroke-width="10" stroke-linecap="round" ' +
            'stroke-dasharray="' + HOLD_C + '" stroke-dashoffset="0" transform="rotate(-90 100 100)"/>' +
        '</svg>' +
        '<div class="ht-time" id="htTime"></div>' +
      '</div>' +
      '<div class="ht-hint" id="htHint">Position einnehmen …</div>' +
      '<div class="ht-btns">' +
        '<button id="htPause">⏸ Pause</button>' +
        '<button id="htStop" class="primary">Fertig ✓</button>' +
      '</div>' +
      '<button id="htCancel" class="ht-cancel">Abbrechen</button>' +
    '</div>';
  document.body.appendChild(el);

  const draw = () => {
    const total = phase === 'prep' ? PREP_SEC : target;
    $('#htTime').textContent = phase === 'prep' ? String(remaining) : fmtTime(remaining);
    $('#htRing').style.strokeDashoffset = String(HOLD_C * (1 - remaining / total));
  };
  draw();

  const finish = (secondsHeld, geschafft) => {
    closeHoldTimer();
    const s = sEx.sets[setIdx];
    s.value = secondsHeld;
    s.done = true;
    saveSession(session);
    renderWorkout();
    if (geschafft) {
      playSound('done');
      say('Geschafft');
      toast('💪 ' + secondsHeld + ' Sekunden geschafft!');
    } else {
      playSound('switch');
      toast('✓ ' + secondsHeld + ' Sekunden eingetragen');
    }
    handleSetCompleted(exIdx, setIdx, true);
  };

  $('#htPause').addEventListener('click', () => {
    paused = !paused;
    $('#htPause').textContent = paused ? '▶︎ Weiter' : '⏸ Pause';
    $('#htHint').textContent = paused ? 'Pausiert' : (phase === 'prep' ? 'Position einnehmen …' : 'Halten – ruhig weiteratmen');
  });

  $('#htStop').addEventListener('click', () => {
    if (phase === 'prep') { cancelPrep(); return; }
    finish(Math.max(1, target - remaining), false);
  });

  $('#htCancel').addEventListener('click', () => {
    if (phase === 'prep') cancelPrep();
    else closeHoldTimer();
  });

  holdInterval = setInterval(() => {
    if (paused) return;
    remaining--;

    if (phase === 'prep') {
      if (remaining <= 0) {
        phase = 'hold';
        remaining = target;
        el.classList.remove('prep');
        $('#htHint').textContent = 'Halten – ruhig weiteratmen';
        playSound('go');
        say('Los');
      } else {
        playSound('tick');
      }
      draw();
      return;
    }

    if (remaining <= 0) { finish(target, true); return; }
    if (remaining <= 3) playSound('tick');
    draw();
  }, 1000);
}

// ---------- Abschluss / Reha / Zusammenfassung ----------

function promptRehab() {
  const anySet = session.exercises.some((e) => e.sets.some((s) => s.done));
  if (!anySet) { alert('Du hast noch keinen Satz abgehakt. Hake mindestens einen Satz ab (✓), bevor du abschließt.'); return; }
  stopRestTimer();
  closeHoldTimer();

  const items = PLAN.rehab.map((it) =>
    '<label><input type="checkbox" data-rh="' + it.id + '"><span class="ok">' + esc(it.name) + '</span></label>'
  ).join('');

  showOverlay(
    '<h2>🩹 Reha-Block noch dranhängen?</h2>' +
    '<p class="muted small">2–3× pro Woche nach dem Training – der wichtigste Baustein für deine Schulter. Bringt +' + POINTS.rehab + ' Punkte.</p>' +
    '<div class="checklist" style="margin-top:10px">' + items + '</div>' +
    '<div class="btn-row">' +
      '<button class="btn secondary" id="skipRehab">Heute nicht</button>' +
      '<button class="btn" id="doneRehab">Reha erledigt ✓</button>' +
    '</div>'
  );

  $('#skipRehab').addEventListener('click', () => finishWorkout(false));
  $('#doneRehab').addEventListener('click', () => {
    const checked = $$('input[data-rh]').filter((c) => c.checked).length;
    if (checked === 0 && !confirm('Keine Reha-Übung abgehakt – trotzdem als erledigt zählen?')) return;
    finishWorkout(true);
  });
}

function finishWorkout(rehabDone) {
  hideOverlay();
  const w = getWorkout(session.workoutKey);

  const log = {
    id: 'log_' + Date.now(),
    date: new Date().toISOString(),
    workoutKey: session.workoutKey,
    workoutName: w.name,
    durationMin: Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)),
    warmupDone: Object.keys(session.warmup).length >= PLAN.warmup.length - 1,
    rehabDone: !!rehabDone,
    exercises: session.exercises.map((sEx) => {
      const ex = PLAN.exerciseById[sEx.id];
      const doneSets = sEx.sets.filter((s) => s.done);
      const hist = exerciseHistory(state, sEx.id);
      const prevBest = hist[0] ? bestOf(ex, hist[0].sets) : null;
      const nowBest = doneSets.length ? bestOf(ex, doneSets) : null;
      return {
        id: sEx.id,
        name: ex.name,
        sets: sEx.sets,
        painLevel: sEx.painLevel || 'none',
        pain: (sEx.painLevel || 'none') === 'sharp',   // für Diagramm & alte Auswertungen
        rir: sEx.rir,
        increased: prevBest != null && nowBest != null && nowBest > prevBest,
      };
    }),
  };

  const gap = state.logs.length ? (Date.now() - new Date(state.logs[state.logs.length - 1].date).getTime()) / 86400000 : 0;
  const prevLevel = getLevel(state.points).level;

  const score = scoreWorkout(log, state.logs);
  log.points = score.pts;

  state.logs.push(log);
  state.points += score.pts;
  state.lastWorkoutKey = session.workoutKey;
  if (rehabDone) state.rehabCount++;
  const newBadges = checkBadges(state);
  saveState(state);

  stopSessionClock();
  session = null;
  saveSession(null);

  showSummary(log, score, newBadges, gap, prevLevel);
}

function bestOf(ex, sets) {
  if (ex.metric === 'weight' || ex.metric === 'distance') return maxWeight(sets);
  if (ex.metric === 'time') return Math.max(...sets.map((s) => s.value || 0));
  return Math.max(...sets.map((s) => s.reps || 0));
}

function showSummary(log, score, newBadges, gapDays, prevLevel) {
  const anyIncrease = log.exercises.some((e) => e.increased);
  const anyPain = log.exercises.some((e) => painLevelOf(e) !== 'none');
  let quote;
  if (anyPain) quote = pickQuote(QUOTES.finishPain);
  else if (anyIncrease) quote = pickQuote(QUOTES.finishIncrease);
  else if (gapDays > 10) quote = pickQuote(QUOTES.comeback);
  else quote = pickQuote(QUOTES.finishStrong);

  const lines = score.details.map((d) =>
    '<div class="pts-line"><span>' + esc(d.label) + '</span><span class="p">+' + d.pts + '</span></div>'
  ).join('');

  const badgesHtml = newBadges.map((b) =>
    '<div class="new-badge"><span class="b-icon">' + b.icon + '</span><div><div class="b-name">Neues Abzeichen: ' + esc(b.name) + '</div><div class="b-desc">' + esc(b.desc) + '</div></div></div>'
  ).join('');

  const lvl = getLevel(state.points);
  const levelUp = lvl.level > prevLevel
    ? '<div class="levelup-banner"><span class="lu-icon">' + lvl.icon + '</span><div>' +
      '<div class="lu-title">LEVEL UP! Du bist jetzt ' + esc(lvl.name) + '</div>' +
      '<div class="lu-sub">Level ' + lvl.level + ' erreicht – weiter geht\'s!</div></div></div>'
    : '';

  showOverlay(
    '<h2>🏁 ' + esc(log.workoutName) + ' geschafft!</h2>' +
    '<div class="summary-quote">' + esc(quote) + '</div>' +
    '<div class="summary-total"><div class="st-num" id="stNum">0</div><div class="st-lbl">Punkte verdient</div></div>' +
    levelUp +
    lines +
    '<div class="muted small" style="margin-top:10px">' + lvl.icon + ' ' + esc(lvl.name) + ' · ' + state.points + ' Punkte gesamt · ' + log.durationMin + ' Min Training</div>' +
    badgesHtml +
    '<button class="btn" id="closeSummary">Stark! Weiter 💪</button>'
  );
  setTimeout(() => animateCount($('#stNum'), score.pts, ''), 250);
  confetti((newBadges.length || lvl.level > prevLevel) ? 130 : 90);
  $('#closeSummary').addEventListener('click', () => { hideOverlay(); switchTab('home'); applyPendingReloadIfSafe(); });
}

// ---------- Overlay ----------

function showOverlay(html) {
  const ov = $('#overlay');
  ov.innerHTML = '<div class="sheet">' + html + '</div>';
  ov.classList.remove('hidden');
}
function hideOverlay() {
  $('#overlay').classList.add('hidden');
  $('#overlay').innerHTML = '';
}

// ---------- Verlauf ----------

function renderHistory() {
  if (!state.logs.length) {
    view.innerHTML = '<div class="empty"><div class="e-icon">📖</div>Noch keine Trainings.<br>Starte dein erstes – die Historie füllt sich von selbst!</div>';
    return;
  }
  const items = state.logs.slice().reverse().map((log) => {
    const setCount = log.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    const incr = log.exercises.filter((e) => e.increased).length;
    return '<div class="card log-item" data-log="' + log.id + '">' +
      '<div class="log-main"><div class="log-title">' + esc(log.workoutName) + '</div>' +
      '<div class="log-sub">' + fmtDate(log.date) + ' · ' + setCount + ' Sätze · ' + log.durationMin + ' Min' +
      (incr ? ' · 📈 ' + incr + '× gesteigert' : '') + (log.rehabDone ? ' · 🩹 Reha' : '') + '</div></div>' +
      '<div class="log-pts">+' + (log.points || 0) + '</div>' +
    '</div>';
  }).join('');
  view.innerHTML = items;

  $$('[data-log]').forEach((el) => el.addEventListener('click', () => showLogDetail(el.dataset.log)));
}

function showLogDetail(logId) {
  const log = state.logs.find((l) => l.id === logId);
  if (!log) return;
  const exHtml = log.exercises.map((e) => {
    const ex = PLAN.exerciseById[e.id];
    const sets = e.sets.filter((s) => s.done).map((s) => {
      if (!ex) return '';
      if (ex.metric === 'time') return (s.value || 0) + 's';
      if (ex.metric === 'distance') return fmtW(s.weight) + 'kg×' + (s.value || 0) + 'm';
      if (ex.metric === 'reps') return (s.reps || 0) + ' Wdh';
      return fmtW(s.weight) + 'kg×' + (s.reps || 0);
    }).join(' · ');
    if (!sets) return '';
    return '<div class="pts-line"><span>' + esc(e.name) + (e.increased ? ' 📈' : '') + (e.pain ? ' ⚠️' : '') + '</span>' +
      '<span class="muted small">' + sets + '</span></div>';
  }).join('');

  showOverlay(
    '<h2>' + esc(log.workoutName) + '</h2>' +
    '<div class="muted small" style="margin-bottom:10px">' + fmtDate(log.date) + ' · ' + log.durationMin + ' Min · +' + (log.points || 0) + ' Punkte' +
    (log.warmupDone ? ' · Aufwärmen ✓' : '') + (log.rehabDone ? ' · Reha ✓' : '') + '</div>' +
    exHtml +
    '<button class="btn secondary" id="closeDetail" style="margin-top:16px">Schließen</button>'
  );
  $('#closeDetail').addEventListener('click', hideOverlay);
}

// ---------- Fortschritt ----------

let progressExId = null;

function renderProgress() {
  const allEx = [];
  for (const w of PLAN.workouts) for (const slot of w.exercises) for (const v of variantsOf(slot)) allEx.push({ ex: v, wk: w.key });
  const withData = allEx.filter((e) => exerciseHistory(state, e.ex.id).length > 0);
  if (!progressExId && withData.length) progressExId = withData[0].ex.id;
  if (progressExId && !allEx.some((e) => e.ex.id === progressExId)) progressExId = null;

  const options = allEx.map((e) =>
    '<option value="' + e.ex.id + '"' + (e.ex.id === progressExId ? ' selected' : '') + '>' +
    e.wk + ' – ' + esc(e.ex.name) + (exerciseHistory(state, e.ex.id).length ? '' : ' (keine Daten)') + '</option>'
  ).join('');

  const earned = new Set(state.badges);
  const badgeGrid = BADGES.map((b) =>
    '<div class="badge-tile' + (earned.has(b.id) ? '' : ' locked') + '">' +
    '<div class="b-icon">' + b.icon + '</div><div class="b-name">' + esc(b.name) + '</div>' +
    '<div class="b-desc">' + esc(b.desc) + '</div></div>'
  ).join('');

  const totalVolume = Math.round(state.logs.reduce((sum, l) => sum + l.exercises.reduce((s2, e) =>
    s2 + e.sets.filter((s) => s.done).reduce((s3, s) => s3 + (s.weight || 0) * (s.reps || 0), 0), 0), 0));

  view.innerHTML =
    '<div class="card"><h2>📊 Übungs-Fortschritt</h2>' +
      '<select class="exercise-select" id="exSelect">' + options + '</select>' +
      '<div id="chartArea"></div>' +
    '</div>' +
    '<div class="stat-row">' +
      '<div class="stat-tile"><div class="val">' + state.logs.length + '</div><div class="lbl">Trainings</div></div>' +
      '<div class="stat-tile"><div class="val">' + (totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1).replace('.', ',') + ' t' : totalVolume + ' kg') + '</div><div class="lbl">Gesamtvolumen</div></div>' +
      '<div class="stat-tile"><div class="val">' + state.rehabCount + '</div><div class="lbl">Reha-Blöcke</div></div>' +
    '</div>' +
    '<div class="section-label">Abzeichen (' + state.badges.length + '/' + BADGES.length + ')</div>' +
    '<div class="badge-grid">' + badgeGrid + '</div>' +
    '<div class="section-label">Wochenziel</div>' +
    '<div class="card">' +
      '<p class="muted small">Wie viele Trainings schaffst du pro Woche? Danach richten sich Streak und Wochenanzeige. ' +
      'Die Reihenfolge A → B → C läuft unabhängig davon weiter – du machst immer das, was als Nächstes dran ist.</p>' +
      '<div class="workout-picker" style="margin-top:10px">' +
        '<button data-goal="2" class="' + (weeklyGoalOf(state) === 2 ? 'sel' : '') + '">2 pro Woche</button>' +
        '<button data-goal="3" class="' + (weeklyGoalOf(state) === 3 ? 'sel' : '') + '">3 pro Woche</button>' +
      '</div>' +
    '</div>' +
    '<div class="section-label">Ton & Ansage</div>' +
    '<div class="card">' +
      '<p class="muted small">Signale sagen dir, wann eine Übung oder Pause zu Ende ist – ohne aufs Handy zu schauen.</p>' +
      '<div class="sound-list">' +
        SOUND_MODES.map((m) =>
          '<button class="variant-opt' + (soundMode() === m.key ? ' sel' : '') + '" data-soundmode="' + m.key + '">' +
            '<div class="vo-name">' + m.icon + ' ' + esc(m.label) + (soundMode() === m.key ? ' <span class="vo-cur">aktiv</span>' : '') + '</div>' +
            '<div class="vo-desc">' + esc(m.desc) + '</div>' +
          '</button>'
        ).join('') +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn secondary" data-testsound="done">🔔 Signal „Übung fertig"</button>' +
        '<button class="btn secondary" data-testsound="voice">🗣 Ansage testen</button>' +
      '</div>' +
      '<p class="muted small" style="margin-top:10px">Hörst du am iPhone nichts, obwohl Töne aktiv sind: Der seitliche <b>Stummschalter</b> muss aus sein und die Lautstärke oben. ' +
      'Die App bittet das System zwar darum, den Ton trotzdem durchzulassen – ältere iOS-Versionen ignorieren das aber.</p>' +
    '</div>' +
    '<div class="section-label">Pausen-Timer</div>' +
    '<div class="card">' +
      '<p class="muted small">Zwischen Satzende und Abhaken vergehen ein paar Sekunden – die zählen schon als Pause. ' +
      'Um diesen Ausgleich startet jeder Timer verkürzt:</p>' +
      '<div class="cr-chips step-chips" style="margin-top:10px">' +
        [0, 5, 10, 15, 20].map((s) =>
          '<button class="chip-btn' + (restOffsetOf() === s ? ' on' : '') + '" data-restoffset="' + s + '">−' + s + ' s</button>'
        ).join('') +
      '</div>' +
    '</div>' +
    '<div class="section-label">Daten</div>' +
    '<div class="card">' +
      '<p class="muted small">Deine Daten liegen nur auf diesem Gerät. Mach regelmäßig ein Backup!</p>' +
      '<div class="btn-row">' +
        '<button class="btn secondary" id="exportBtn">⬇︎ Backup exportieren</button>' +
        '<button class="btn secondary" id="importBtn">⬆︎ Backup laden</button>' +
      '</div>' +
      '<input type="file" id="importFile" accept="application/json" class="hidden">' +
    '</div>';

  $$('[data-goal]').forEach((b) => b.addEventListener('click', () => {
    state.weeklyGoal = +b.dataset.goal;
    saveState(state);
    renderProgress();
    toast('🎯 Wochenziel: ' + state.weeklyGoal + " Trainings");
  }));

  $$('[data-soundmode]').forEach((b) => b.addEventListener('click', () => {
    setSoundMode(b.dataset.soundmode);
    renderProgress();
    toast(soundIcon() + ' ' + SOUND_MODES.find((m) => m.key === state.soundMode).label);
  }));

  $$('[data-testsound]').forEach((b) => b.addEventListener('click', () => {
    initAudio();
    if (b.dataset.testsound === 'voice') {
      if (soundMode() !== 'voice') { toast('🗣 Dafür „Töne + Ansage" wählen'); return; }
      say('Brustdehnung im Türrahmen, linke Seite');
    } else {
      playSound('done');
    }
  }));

  $$('[data-restoffset]').forEach((b) => b.addEventListener('click', () => {
    state.restOffset = +b.dataset.restoffset;
    saveState(state);
    renderProgress();
    toast('⏱ Timer startet ab jetzt ' + state.restOffset + ' s verkürzt');
  }));

  $('#exSelect').addEventListener('change', (e) => { progressExId = e.target.value; drawChart(); });
  $('#exportBtn').addEventListener('click', () => exportData(state));
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importData(f, (newState) => { state = newState; render(); alert('Backup geladen! ✓'); });
  });

  drawChart();
}

function drawChart() {
  const area = $('#chartArea');
  if (!progressExId) { area.innerHTML = '<div class="empty"><div class="e-icon">📈</div>Nach deinem ersten Training erscheint hier deine Kurve.</div>'; return; }
  const ex = PLAN.exerciseById[progressExId];
  const hist = exerciseHistory(state, progressExId).slice().reverse(); // alt -> neu
  if (!hist.length) { area.innerHTML = '<div class="empty"><div class="e-icon">📈</div>Noch keine Daten für diese Übung.</div>'; return; }

  const unit = ex.metric === 'time' ? 'Sek' : ex.metric === 'reps' ? 'Wdh' : 'kg';
  const points = hist.map((h) => ({ date: h.date, v: bestOf(ex, h.sets) || 0, pain: h.pain }));

  const W = 520, H = 240, padL = 42, padR = 18, padT = 18, padB = 30;
  const vMax = Math.max(...points.map((p) => p.v));
  const vMin = Math.min(...points.map((p) => p.v));
  const span = Math.max(vMax - vMin, 1);
  const yMax = vMax + span * 0.15, yMin = Math.max(0, vMin - span * 0.15);
  const x = (i) => points.length === 1 ? (padL + (W - padL - padR) / 2) : padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);

  // Gitterlinien (3 Stück, dezent)
  let grid = '';
  for (let g = 0; g < 3; g++) {
    const gv = yMin + ((g + 0.5) / 3) * (yMax - yMin);
    grid += '<line x1="' + padL + '" y1="' + y(gv) + '" x2="' + (W - padR) + '" y2="' + y(gv) + '" stroke="#2a3242" stroke-width="1"/>' +
      '<text x="' + (padL - 6) + '" y="' + (y(gv) + 4) + '" text-anchor="end" font-size="11" fill="#6b7687">' + (Math.round(gv * 2) / 2) + '</text>';
  }

  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');

  const dots = points.map((p, i) => {
    const label = (i === points.length - 1 || p.v === vMax)
      ? '<text x="' + x(i) + '" y="' + (y(p.v) - 12) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#eef1f6">' + fmtW(p.v) + '</text>'
      : '';
    return '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="5" fill="' + (p.pain ? '#ff6b6b' : '#26ab84') + '" stroke="#171c26" stroke-width="2">' +
      '<title>' + fmtDate(p.date) + ': ' + fmtW(p.v) + ' ' + unit + (p.pain ? ' (Schmerz)' : '') + '</title></circle>' + label;
  }).join('');

  const xLabels = points.length > 1
    ? '<text x="' + padL + '" y="' + (H - 8) + '" font-size="11" fill="#6b7687">' + fmtDate(points[0].date) + '</text>' +
      '<text x="' + (W - padR) + '" y="' + (H - 8) + '" text-anchor="end" font-size="11" fill="#6b7687">' + fmtDate(points[points.length - 1].date) + '</text>'
    : '<text x="' + (W / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#6b7687">' + fmtDate(points[0].date) + '</text>';

  const tableRows = hist.slice().reverse().slice(0, 8).map((h) => {
    const setsStr = h.sets.map((s) => {
      if (ex.metric === 'time') return (s.value || 0) + 's';
      if (ex.metric === 'distance') return fmtW(s.weight) + '×' + (s.value || 0) + 'm';
      if (ex.metric === 'reps') return String(s.reps || 0);
      return fmtW(s.weight) + '×' + (s.reps || 0);
    }).join('  ');
    return '<tr><td>' + fmtDate(h.date) + '</td><td>' + setsStr + '</td><td>' + (h.pain ? '⚠️' : '✓') + '</td></tr>';
  }).join('');

  area.innerHTML =
    '<div class="chart-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Verlauf ' + esc(ex.name) + ' in ' + unit + '">' +
      grid +
      '<path d="' + path + '" fill="none" stroke="#26ab84" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + xLabels +
    '</svg></div>' +
    '<div class="muted small" style="margin-top:2px">Bestwert pro Einheit (' + unit + '). Roter Punkt = Einheit mit Schmerz.</div>' +
    '<table class="data-table"><tr><th>Datum</th><th>Sätze</th><th></th></tr>' + tableRows + '</table>';
}

// ---------- Körper: Rekomposition, Tagesziele, Zeitleiste ----------

// Kompakte Einzelserien-Linie (gleicher Stil wie das Übungs-Diagramm)
function miniLineChart(points, unit) {
  if (!points.length) return '';
  const W = 520, H = 200, padL = 46, padR = 18, padT = 16, padB = 28;
  const vals = points.map((p) => p.v);
  const vMax = Math.max(...vals), vMin = Math.min(...vals);
  const span = Math.max(vMax - vMin, 0.5);
  const yMax = vMax + span * 0.15, yMin = vMin - span * 0.15;
  const x = (i) => points.length === 1 ? (padL + (W - padL - padR) / 2) : padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);

  let grid = '';
  for (let g = 0; g < 3; g++) {
    const gv = yMin + ((g + 0.5) / 3) * (yMax - yMin);
    grid += '<line x1="' + padL + '" y1="' + y(gv) + '" x2="' + (W - padR) + '" y2="' + y(gv) + '" stroke="#2a3242" stroke-width="1"/>' +
      '<text x="' + (padL - 6) + '" y="' + (y(gv) + 4) + '" text-anchor="end" font-size="11" fill="#6b7687">' + (Math.round(gv * 10) / 10) + '</text>';
  }
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
  const dots = points.map((p, i) => {
    const label = (i === points.length - 1 || i === 0)
      ? '<text x="' + x(i) + '" y="' + (y(p.v) - 11) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#eef1f6">' + fmtW(p.v) + '</text>' : '';
    return '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="4.5" fill="#26ab84" stroke="#151a24" stroke-width="2">' +
      '<title>' + fmtDate(p.date) + ': ' + fmtW(p.v) + ' ' + unit + '</title></circle>' + label;
  }).join('');
  const xl = points.length > 1
    ? '<text x="' + padL + '" y="' + (H - 6) + '" font-size="11" fill="#6b7687">' + fmtDate(points[0].date) + '</text>' +
      '<text x="' + (W - padR) + '" y="' + (H - 6) + '" text-anchor="end" font-size="11" fill="#6b7687">' + fmtDate(points[points.length - 1].date) + '</text>'
    : '';
  return '<div class="chart-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Verlauf in ' + unit + '">' +
    grid + '<path d="' + path + '" fill="none" stroke="#26ab84" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' + dots + xl + '</svg></div>';
}

function renderBody() {
  const body = state.body;
  const entries = body.entries || [];
  const last = latestBodyEntry(state);

  // Einstieg, solange noch nichts erfasst ist
  if (!entries.length) {
    view.innerHTML =
      '<div class="card hero">' +
        '<div class="date-line">Körper & Rekomposition</div>' +
        '<div class="greeting">Muskeln rauf, Fett runter 🎯</div>' +
        '<div class="quote">Die Waage allein lügt dabei: Wer Muskeln aufbaut und Fett verliert, wiegt oft gleich viel. Deshalb schauen wir auf drei Dinge zusammen – Gewicht, Taille und deine Kraft im Training.</div>' +
      '</div>' +
      '<div class="card"><h2>So funktioniert es</h2>' +
        '<div class="plan-ex"><div>⚖️ Einmal pro Woche wiegen (morgens, nüchtern) und optional die Taille messen</div></div>' +
        '<div class="plan-ex"><div>💪 Deine Trainingsgewichte liefern den Kraft-Index – der ehrlichste Muskel-Anzeiger</div></div>' +
        '<div class="plan-ex"><div>🧠 Der Coach liest alle drei Signale zusammen und sagt dir, ob du auf Kurs bist</div></div>' +
        '<div class="plan-ex"><div>🥩 Dazu bekommst du dein tägliches Protein- und Kalorienziel</div></div>' +
      '</div>' +
      '<button class="btn" id="firstCheckin">⚖️ Ersten Check-in eintragen</button>';
    $('#firstCheckin').addEventListener('click', () => openCheckinSheet());
    return;
  }

  // Tagesziele
  const protein = proteinTarget(last.weightKg);
  const kcal = calorieTarget(body, last.weightKg);
  const goals =
    '<div class="card"><h2>🥩 Deine Tagesziele</h2>' +
      '<div class="stat-row" style="margin-bottom:0">' +
        '<div class="stat-tile"><div class="val gold">' + protein + ' g</div><div class="lbl">Eiweiß / Tag</div></div>' +
        (kcal ? '<div class="stat-tile"><div class="val">' + kcal + '</div><div class="lbl">kcal / Tag</div></div>' : '<div class="stat-tile"><div class="val">?</div><div class="lbl">kcal – Daten fehlen</div></div>') +
        '<div class="stat-tile"><div class="val">' + fmtW(last.weightKg) + '</div><div class="lbl">kg aktuell</div></div>' +
      '</div>' +
      '<p class="muted small" style="margin-top:10px">2 g Eiweiß pro kg Körpergewicht schützt deine Muskeln im Defizit. Praktisch: 250 g Magerquark ≈ 30 g · Hähnchenbrust (200 g) ≈ 45 g · 1 Shake ≈ 25 g · 3 Eier ≈ 19 g.' +
      (kcal ? ' Das Kalorienziel enthält bereits ein moderates Defizit von 400 kcal – mehr würde Muskeln kosten.' : ' Für ein Kalorienziel trage unter „Profil" Größe, Alter und Geschlecht ein.') + '</p>' +
    '</div>';

  // Rekomp-Status
  const ana = bodyAnalysis(state);
  const status = ana
    ? '<div class="card status-card"><h2>' + ana.icon + ' ' + esc(ana.title) + '</h2>' +
      '<div class="status-facts">' + ana.facts.map((f) => '<span class="chip">' + esc(f) + '</span>').join(' ') + '</div>' +
      '<p class="muted small" style="margin-top:8px">' + esc(ana.advice) + '</p></div>'
    : '<div class="card"><h2>📊 Rekomp-Status</h2><p class="muted small">Nach dem zweiten Check-in (nächste Woche) beginnt hier die Auswertung von Gewicht, Taille und Kraft zusammen.</p></div>';

  // Diagramme
  const wPoints = entries.map((e) => ({ date: e.date, v: e.weightKg }));
  const waistPoints = entries.filter((e) => e.waistCm != null).map((e) => ({ date: e.date, v: e.waistCm }));
  const sSeries = strengthIndexSeries(state);
  const sNow = sSeries.length ? sSeries[sSeries.length - 1].v : null;

  const charts =
    '<div class="card"><h2>⚖️ Gewicht (kg)</h2>' + miniLineChart(wPoints, 'kg') + '</div>' +
    (waistPoints.length >= 2 ? '<div class="card"><h2>📏 Taille (cm)</h2>' + miniLineChart(waistPoints, 'cm') + '</div>' : '') +
    (sSeries.length >= 2
      ? '<div class="card"><h2>💪 Kraft-Index' + (sNow != null ? ' · ' + fmtW(sNow) + '' : '') + '</h2>' +
        miniLineChart(sSeries, 'Punkte') +
        '<p class="muted small" style="margin-top:6px">100 = dein Startniveau über alle Übungen. Steigt diese Kurve, wächst nachweislich Kraft – und mit ihr Muskulatur. Das sieht keine Waage.</p></div>'
      : '');

  // Zeitleiste
  const tl = buildTimeline(state);
  const timeline = tl.length
    ? '<div class="section-label">Deine Veränderungs-Zeitleiste</div>' +
      '<div class="card timeline">' + tl.map((e) =>
        '<div class="tl-item"><span class="tl-icon">' + e.icon + '</span>' +
        '<div class="tl-body"><div class="tl-text">' + esc(e.text) + '</div>' +
        '<div class="tl-date">' + fmtDate(e.date) + '</div></div></div>'
      ).join('') + '</div>'
    : '';

  // HRV und Ruhepuls sind starke Langlebigkeits-Marker – hier gehören sie hin
  const oe = ouraEntries(state);
  const hrvPts = oe.filter((e) => e.hrv != null).map((e) => ({ date: e.date, v: e.hrv }));
  const rhrPts = oe.filter((e) => e.restingHr != null).map((e) => ({ date: e.date, v: e.restingHr }));
  const hrvTrend = ouraTrend(state, 'hrv'), rhrTrend = ouraTrend(state, 'restingHr');
  const ouraCharts =
    (hrvPts.length >= 2 ? '<div class="card"><h2>💗 HRV (ms)' +
      (hrvTrend ? ' · ' + (hrvTrend.diff >= 0 ? '+' : '') + fmtW(hrvTrend.diff) + ' zum Vormonat' : '') + '</h2>' +
      miniLineChart(hrvPts, 'ms') +
      '<p class="muted small" style="margin-top:6px">Steigende Herzratenvariabilität heißt meist: bessere Erholung und wachsende Fitness.</p></div>' : '') +
    (rhrPts.length >= 2 ? '<div class="card"><h2>🫀 Ruhepuls (bpm)' +
      (rhrTrend ? ' · ' + (rhrTrend.diff >= 0 ? '+' : '') + fmtW(rhrTrend.diff) : '') + '</h2>' +
      miniLineChart(rhrPts, 'bpm') +
      '<p class="muted small" style="margin-top:6px">Ein sinkender Ruhepuls ist eines der deutlichsten Zeichen, dass dein Ausdauertraining wirkt.</p></div>' : '');

  view.innerHTML =
    ouraCardHtml() + status + goals + charts + ouraCharts + timeline +
    '<button class="btn" id="checkinBtn">⚖️ Check-in eintragen (+' + POINTS_CHECKIN + ' P)</button>' +
    '<button class="btn secondary" id="profileBtn" style="margin-top:10px">⚙ Profil (Größe, Alter, Aktivität)</button>';

  wireOuraCard();
  $('#checkinBtn').addEventListener('click', () => openCheckinSheet());
  $('#profileBtn').addEventListener('click', openProfileSheet);
}

function openCheckinSheet() {
  const last = latestBodyEntry(state);
  showOverlay(
    '<h2>⚖️ Wochen-Check-in</h2>' +
    '<p class="muted small">Am besten immer gleich: morgens, nüchtern, nach dem Aufstehen. Taille auf Bauchnabelhöhe, entspannt ausgeatmet.</p>' +
    '<div class="set-row" style="margin-top:12px"><span class="set-num" style="width:70px">Gewicht</span>' +
      '<input type="number" inputmode="decimal" step="0.1" id="ciWeight" value="' + (last ? last.weightKg : '') + '" placeholder="kg"><span class="unit">kg</span></div>' +
    '<div class="set-row"><span class="set-num" style="width:70px">Taille</span>' +
      '<input type="number" inputmode="decimal" step="0.5" id="ciWaist" value="' + (last && last.waistCm != null ? last.waistCm : '') + '" placeholder="optional"><span class="unit">cm</span></div>' +
    '<div class="btn-row">' +
      '<button class="btn secondary" id="ciCancel">Abbrechen</button>' +
      '<button class="btn" id="ciSave">Speichern ✓</button>' +
    '</div>'
  );
  $('#ciCancel').addEventListener('click', hideOverlay);
  $('#ciSave').addEventListener('click', () => {
    const w = parseFloat(($('#ciWeight').value || '').replace(',', '.'));
    if (isNaN(w) || w < 30 || w > 300) { alert('Bitte ein gültiges Gewicht eintragen.'); return; }
    const waistRaw = ($('#ciWaist').value || '').replace(',', '.');
    const waist = waistRaw === '' ? null : parseFloat(waistRaw);

    const prev = latestBodyEntry(state);
    const givePoints = !prev || (Date.now() - new Date(prev.date).getTime()) / 86400000 >= 3;
    state.body.entries.push({ date: new Date().toISOString(), weightKg: Math.round(w * 10) / 10, waistCm: waist != null && !isNaN(waist) ? Math.round(waist * 10) / 10 : null });
    if (givePoints) state.points += POINTS_CHECKIN;
    saveState(state);
    hideOverlay();
    if (currentTab !== 'body') switchTab('body'); else render();
    toast(givePoints ? '⚖️ Gespeichert · +' + POINTS_CHECKIN + ' Punkte!' : '⚖️ Gespeichert');
    if (givePoints) confetti(40);
  });
}

function openProfileSheet() {
  const b = state.body;
  const sexBtn = (key, label) =>
    '<button class="chip-btn' + (b.sex === key ? ' on' : '') + '" data-sex="' + key + '">' + label + '</button>';
  const actBtn = (a) =>
    '<button class="chip-btn' + ((b.activity || 1.6) === a.key ? ' on' : '') + '" data-act="' + a.key + '" title="' + esc(a.desc) + '">' + esc(a.label) + '</button>';

  showOverlay(
    '<h2>⚙ Profil</h2>' +
    '<p class="muted small">Nur für die Kalorienschätzung – bleibt wie alles andere ausschließlich auf deinem Gerät.</p>' +
    '<div class="set-row" style="margin-top:12px"><span class="set-num" style="width:70px">Größe</span>' +
      '<input type="number" inputmode="numeric" id="pfHeight" value="' + (b.heightCm || '') + '" placeholder="z.B. 180"><span class="unit">cm</span></div>' +
    '<div class="set-row"><span class="set-num" style="width:70px">Alter</span>' +
      '<input type="number" inputmode="numeric" id="pfAge" value="' + (b.age || '') + '" placeholder="Jahre"><span class="unit"></span></div>' +
    '<div class="check-row" style="border:none;padding-top:4px"><span class="cr-label">Geschlecht</span><div class="cr-chips">' + sexBtn('m', 'Mann') + sexBtn('w', 'Frau') + '</div></div>' +
    '<div class="check-row" style="border:none"><span class="cr-label">Aktivität</span><div class="cr-chips">' + ACTIVITY_LEVELS.map(actBtn).join('') + '</div></div>' +
    '<div class="btn-row">' +
      '<button class="btn secondary" id="pfCancel">Abbrechen</button>' +
      '<button class="btn" id="pfSave">Speichern ✓</button>' +
    '</div>'
  );

  let sex = b.sex, activity = b.activity || 1.6;
  $$('[data-sex]').forEach((btn) => btn.addEventListener('click', () => {
    sex = btn.dataset.sex;
    $$('[data-sex]').forEach((x) => x.classList.toggle('on', x === btn));
  }));
  $$('[data-act]').forEach((btn) => btn.addEventListener('click', () => {
    activity = parseFloat(btn.dataset.act);
    $$('[data-act]').forEach((x) => x.classList.toggle('on', x === btn));
  }));
  $('#pfCancel').addEventListener('click', hideOverlay);
  $('#pfSave').addEventListener('click', () => {
    const h = parseInt($('#pfHeight').value, 10);
    const a = parseInt($('#pfAge').value, 10);
    state.body.heightCm = !isNaN(h) && h > 100 && h < 250 ? h : null;
    state.body.age = !isNaN(a) && a > 10 && a < 100 ? a : null;
    state.body.sex = sex;
    state.body.activity = activity;
    saveState(state);
    hideOverlay();
    render();
    toast('⚙ Profil gespeichert');
  });
}

// ---------- Dehnen & Mobility ----------

// Wochenstreifen für Dehneinheiten (Mo–So)
function mobWeekStripHtml() {
  const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = new Set((state.mobilityLogs || []).map((l) => new Date(l.date).toDateString()));
  return names.map((n, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const did = days.has(d.toDateString());
    const isToday = d.toDateString() === now.toDateString();
    return '<div class="wday' + (did ? ' trained' : '') + (isToday ? ' today' : '') + '">' +
      '<div class="d-label">' + n + '</div>' +
      '<div class="d-dot">' + (did ? '🧘' : d.getDate()) + '</div></div>';
  }).join('');
}

function renderMobility() {
  const logs = state.mobilityLogs || [];
  const last = logs.length ? logs[logs.length - 1] : null;
  const daysSince = last ? Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000) : null;

  const coach = mobilityCoach(state);
  const goal = mobilityGoalOf(state);
  const week = mobilityWeekCount(state);
  const streak = mobilityStreak(state);
  const ages = mobilityFocusAges(state);
  const recRoutine = mobRoutine(coach.key);

  const cards = MOB_ROUTINES.map((r) => {
    const secs = mobilityDuration(r);
    const isRec = r.key === coach.key;
    return '<button class="mob-card' + (isRec ? ' recommended' : '') + '" data-routine="' + r.key + '">' +
      '<div class="mc-head"><span class="mc-icon">' + r.icon + '</span>' +
        '<span class="mc-name">' + esc(r.name) + '</span>' +
        '<span class="mc-dur">' + fmtDuration(secs) + '</span></div>' +
      '<div class="mc-desc">' + esc(r.desc) + '</div>' +
      '<div class="mc-meta">' + r.exercises.length + ' Übungen · ' + mobilityPoints(secs) + ' Punkte' +
        (isRec ? ' <span class="mc-rec">· heute empfohlen</span>' : '') + '</div>' +
    '</button>';
  }).join('');

  // Wie frisch ist jeder Schwerpunkt?
  const focusTiles = ['shoulder', 'hips', 'longevity'].map((f) => {
    const a = ages[f];
    const limit = f === 'longevity' ? 12 : 7;
    const cls = a == null ? 'stale' : a >= limit ? 'stale' : a >= limit - 2 ? 'soon' : 'fresh';
    const txt = a == null ? 'nie' : a === 0 ? 'heute' : a === 1 ? 'gestern' : 'vor ' + a + ' T.';
    return '<div class="focus-tile ' + cls + '"><div class="ft-name">' + esc(MOB_FOCUS_LABELS[f]) + '</div>' +
      '<div class="ft-age">' + txt + '</div></div>';
  }).join('');

  const statusText = last
    ? (daysSince === 0 ? 'Heute schon gedehnt – stark! 🌿'
      : daysSince === 1 ? 'Gestern zuletzt gedehnt.'
      : 'Zuletzt vor ' + daysSince + ' Tagen: ' + esc(last.routineName) + '.')
    : 'Noch keine Einheit – ein guter Tag, um anzufangen.';

  view.innerHTML =
    '<div class="card hero">' +
      '<div class="date-line">Beweglichkeit & Haltung</div>' +
      '<div class="greeting">Dehnen mit Anleitung 🧘</div>' +
      '<div class="quote">Ein Tipp drücken, den Rest übernimmt der Timer: Er führt dich Übung für Übung durch, sagt die Seiten an und zählt die Haltezeit.</div>' +
    '</div>' +

    // Coach-Empfehlung
    '<div class="card coach-card ' + coach.tone + '">' +
      '<div class="cc-label">Dein Dehn-Coach</div>' +
      '<h2 class="cc-head">' + esc(coach.headline) + '</h2>' +
      '<p class="cc-advice">' + esc(coach.advice) + '</p>' +
      '<button class="btn" id="coachStart">▶︎ ' + recRoutine.icon + ' ' + esc(recRoutine.name) +
        ' · ' + fmtDuration(mobilityDuration(recRoutine)) + '</button>' +
    '</div>' +

    // Wochenziel
    '<div class="card">' +
      '<h2>Diese Woche · ' + week + ' / ' + goal + ' Einheiten' + (streak > 0 ? ' · 🔥 ' + streak + ' Wo.' : '') + '</h2>' +
      '<div class="week-strip">' + mobWeekStripHtml() + '</div>' +
      '<div class="cr-chips step-chips" style="margin-top:12px;justify-content:center">' +
        [2, 3, 4, 5].map((g) => '<button class="chip-btn' + (goal === g ? ' on' : '') + '" data-mobgoal="' + g + '">' + g + '×</button>').join('') +
      '</div>' +
      '<p class="muted small" style="margin-top:10px">Für echte Beweglichkeitsgewinne braucht jede Muskelgruppe rund 5 Minuten Dehnzeit pro Woche – ' +
      'verteilt wirkt das besser als alles an einem Tag. Unter 2× die Woche bewegt sich kaum etwas, über 4× wird der Zugewinn deutlich kleiner. ' +
      '<b>3× ist der beste Kompromiss.</b></p>' +
    '</div>' +

    // Abdeckung der Schwerpunkte
    '<div class="card">' +
      '<h2>Zuletzt trainiert</h2>' +
      '<div class="focus-row">' + focusTiles + '</div>' +
      '<p class="muted small" style="margin-top:10px">' + statusText + '</p>' +
    '</div>' +

    '<div class="stat-row">' +
      '<div class="stat-tile"><div class="val">' + logs.length + '</div><div class="lbl">Einheiten</div></div>' +
      '<div class="stat-tile"><div class="val gold">' + Math.round(logs.reduce((s, l) => s + (l.seconds || 0), 0) / 60) + '</div><div class="lbl">Minuten gesamt</div></div>' +
      '<div class="stat-tile"><div class="val flame">' + streak + '</div><div class="lbl">Wochen-Streak</div></div>' +
    '</div>' +

    '<div class="section-label">Programm wählen</div>' + cards +

    '<details class="fold"><summary>Worauf das Programm zielt</summary><div class="fold-body">' +
      '<div class="plan-ex"><div><b>Schulter-Impingement.</b> Mehr Platz unter dem Schulterdach entsteht vor allem durch eine bewegliche Brustwirbelsäule und ein Schulterblatt, das beim Armheben mitdreht. Dazu Brust und Latissimus lösen, die die Schulter nach vorne ziehen.</div></div>' +
      '<div class="plan-ex"><div><b>Vorgezogene Schultern.</b> Typisches Sitzmuster: Brust und Nacken fest, Schulterblatt- und tiefe Halsmuskeln schwach. Deshalb beides – dehnen UND ansteuern.</div></div>' +
      '<div class="plan-ex"><div><b>Hohlkreuz.</b> Vorne ziehen die verkürzten Hüftbeuger das Becken nach unten, hinten fehlt die Haltearbeit von Gesäß und tiefer Bauchmuskulatur. Wichtig: Ein leichtes Hohlkreuz ist normal – es geht um Kontrolle, nicht ums Wegmachen.</div></div>' +
      '<div class="plan-ex"><div><b>Auswärtsgang.</b> Angehbar ist der Weichteil-Anteil: feste Außenrotatoren, fehlende Innenrotation der Hüfte, steifes Sprunggelenk und ein schwacher mittlerer Gesäßmuskel. Ehrlich dazu: Liegt es an der Knochenform von Ober- oder Unterschenkel, ändert Dehnen daran nichts – schaden tut die Arbeit trotzdem nie.</div></div>' +
      '<div class="plan-ex"><div><b>Longevity.</b> Hüfte, Brustwirbelsäule, Sprunggelenk und Gleichgewicht verlieren als Erstes an Qualität. Genau die stehen hier im Mittelpunkt.</div></div>' +
      '<div class="plan-ex"><div class="px-muscle">Am besten nach dem Training oder an trainingsfreien Tagen. Vor schwerem Krafttraining lieber nur kurz mobilisieren statt lange statisch dehnen. Bei anhaltenden Schmerzen gehört die Schulter zu Ärztin oder Physiotherapie – das hier ersetzt keine Behandlung.</div></div>' +
    '</div></details>';

  $$('[data-routine]').forEach((b) => b.addEventListener('click', () => startMobility(b.dataset.routine)));
  $('#coachStart').addEventListener('click', () => startMobility(coach.key));
  $$('[data-mobgoal]').forEach((b) => b.addEventListener('click', () => {
    state.mobilityGoal = +b.dataset.mobgoal;
    saveState(state);
    renderMobility();
    toast('🎯 Dehnziel: ' + state.mobilityGoal + '× pro Woche');
  }));
}

// ---------- Geführter Ablauf (Wanduhr-basiert, übersteht Hintergrund & Neustart) ----------

const MOB_KEY = 'gymcoach.mobsession.v1';
const MOB_R = 78, MOB_C = 2 * Math.PI * MOB_R;
let mobSession = null;   // { routineKey, idx, phase, endsAt, paused, leftWhenPaused, startedAt }
let mobInterval = null;
let mobLastTickSec = null;

// Sagt an, was jetzt kommt – beim Dehnen am Boden schaut man nicht aufs Handy
function mobAnnounceStep() {
  const steps = mobCurrentSteps();
  const step = steps[mobSession.idx];
  const ex = MOB_EXERCISES[step.exId];
  const letzte = mobSession.idx === steps.length - 1 ? 'Letzte Übung. ' : '';
  // Gleiche Übung, andere Seite -> nur den Seitenwechsel ansagen
  const prev = steps[mobSession.idx - 1];
  if (prev && prev.exId === step.exId && step.side) return say('Seite wechseln. ' + step.side);
  say(letzte + ex.name + (step.side ? ', ' + step.side : ''));
}

function mobCurrentSteps() {
  const r = mobRoutine(mobSession.routineKey);
  return r ? mobilitySteps(r) : [];
}

function mobSave() {
  if (mobSession) localStorage.setItem(MOB_KEY, JSON.stringify(mobSession));
  else localStorage.removeItem(MOB_KEY);
}

function mobLeft() {
  if (!mobSession) return 0;
  if (mobSession.paused) return mobSession.leftWhenPaused;
  return Math.max(0, Math.round((mobSession.endsAt - Date.now()) / 1000));
}

function startMobility(routineKey) {
  const r = mobRoutine(routineKey);
  if (!r) return;
  stopRestTimer();   // sonst piept mitten im Dehnen die Trainingspause
  initAudio();
  requestWakeLock();
  const steps = mobilitySteps(r);
  mobSession = {
    routineKey,
    idx: 0,
    phase: 'prep',
    endsAt: Date.now() + steps[0].prep * 1000,
    paused: false,
    leftWhenPaused: 0,
    startedAt: new Date().toISOString(),
  };
  mobSave();
  renderMobPlayer();
  mobStartTicking();
  mobAnnounceStep();
}

function mobStartTicking() {
  if (mobInterval) clearInterval(mobInterval);
  mobInterval = setInterval(mobTick, 250);
}

function mobTick() {
  if (!mobSession) { clearInterval(mobInterval); mobInterval = null; return; }
  if (mobSession.paused) return;
  const left = mobLeft();
  mobDrawTime(left);
  if (left <= 0) { mobAdvance(); return; }
  // mobTick läuft viermal pro Sekunde – der Tick darf nur einmal je Sekunde kommen
  if (left <= 3 && left !== mobLastTickSec) {
    mobLastTickSec = left;
    playSound('tick');
  }
}

function mobAdvance() {
  const steps = mobCurrentSteps();
  mobLastTickSec = null;
  if (mobSession.phase === 'prep') {
    mobSession.phase = 'work';
    mobSession.endsAt = Date.now() + steps[mobSession.idx].seconds * 1000;
    playSound('go');
    mobSave();
    renderMobPlayer();
    return;
  }
  // Haltezeit vorbei -> deutliches Signal, dann die nächste Übung ansagen
  const wasLast = mobSession.idx >= steps.length - 1;
  playSound(wasLast ? 'finish' : 'done');
  if (wasLast) { finishMobility(); return; }
  mobSession.idx++;
  mobSession.phase = 'prep';
  mobSession.endsAt = Date.now() + steps[mobSession.idx].prep * 1000;
  mobSave();
  renderMobPlayer();
  mobAnnounceStep();
}

function mobJump(delta) {
  const steps = mobCurrentSteps();
  const next = mobSession.idx + delta;
  if (next < 0) return;
  if (next >= steps.length) { finishMobility(); return; }
  mobSession.idx = next;
  mobSession.phase = 'prep';
  mobSession.paused = false;
  mobSession.endsAt = Date.now() + steps[next].prep * 1000;
  mobLastTickSec = null;
  mobSave();
  renderMobPlayer();
  mobAnnounceStep();
}

function mobTogglePause() {
  if (mobSession.paused) {
    mobSession.paused = false;
    mobSession.endsAt = Date.now() + mobSession.leftWhenPaused * 1000;
  } else {
    mobSession.leftWhenPaused = mobLeft();
    mobSession.paused = true;
  }
  mobSave();
  renderMobPlayer();
}

function mobQuit() {
  if (!confirm('Programm beenden? Der Fortschritt dieser Einheit wird nicht gespeichert.')) return;
  closeMobPlayer();
  mobSession = null;
  mobSave();
  render();
}

function closeMobPlayer() {
  if (mobInterval) clearInterval(mobInterval);
  mobInterval = null;
  releaseWakeLock();
  const el = $('#mobPlayer');
  if (el) el.remove();
}

function mobDrawTime(left) {
  const t = $('#mobTime'), ring = $('#mobRing');
  if (!t || !mobSession) return;
  const steps = mobCurrentSteps();
  const step = steps[mobSession.idx];
  const total = mobSession.phase === 'prep' ? step.prep : step.seconds;
  t.textContent = mobSession.phase === 'prep' ? String(Math.max(0, left)) : fmtTime(left);
  if (ring) ring.style.strokeDashoffset = String(MOB_C * Math.min(1, Math.max(0, 1 - left / total)));
}

function renderMobPlayer() {
  if (!mobSession) return;
  const steps = mobCurrentSteps();
  const step = steps[mobSession.idx];
  const ex = MOB_EXERCISES[step.exId];
  const routine = mobRoutine(mobSession.routineKey);
  const isPrep = mobSession.phase === 'prep';

  // Restzeit des gesamten Programms
  let restSec = mobLeft();
  for (let i = mobSession.idx + 1; i < steps.length; i++) restSec += steps[i].seconds + steps[i].prep;
  if (isPrep) restSec += step.seconds;

  const nextStep = steps[mobSession.idx + 1];
  const nextEx = nextStep ? MOB_EXERCISES[nextStep.exId] : null;
  const nextLabel = nextEx
    ? esc(nextEx.name) + (nextStep.side ? ' · ' + esc(nextStep.side) : '')
    : 'Letzte Übung – gleich geschafft!';

  const cues = ex.cues.map((c) => '<li>' + esc(c) + '</li>').join('');
  const progress = Math.round((mobSession.idx / steps.length) * 100);

  let el = $('#mobPlayer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mobPlayer';
    el.className = 'mob-player';
    document.body.appendChild(el);
  }

  el.innerHTML =
    '<div class="mp-top">' +
      '<button id="mobQuitBtn" class="mp-quit" aria-label="Beenden">✕</button>' +
      '<div class="mp-count">Übung ' + (mobSession.idx + 1) + ' / ' + steps.length + ' · ' + esc(routine.name) + '</div>' +
      '<button id="mobSoundBtn" class="mp-quit" aria-label="Ton umschalten">' + soundIcon() + '</button>' +
    '</div>' +
    '<div class="mp-bar"><div style="width:' + progress + '%"></div></div>' +

    '<div class="mp-scroll">' +
      '<div class="mp-figwrap">' + mobilityFigure(step.exId) + '</div>' +
      '<h2 class="mp-name">' + esc(ex.name) + '</h2>' +
      '<div class="mp-sub">' + esc(ex.target) +
        (step.side ? ' · <span class="mp-side">' + esc(step.side) + '</span>' : '') + '</div>' +

      '<div class="mp-ringwrap' + (isPrep ? ' prep' : '') + (mobSession.paused ? ' paused' : '') + '">' +
        '<svg viewBox="0 0 180 180">' +
          '<circle cx="90" cy="90" r="' + MOB_R + '" fill="none" stroke="#2a3242" stroke-width="9"/>' +
          '<circle id="mobRing" cx="90" cy="90" r="' + MOB_R + '" fill="none" stroke-width="9" stroke-linecap="round" ' +
            'stroke-dasharray="' + MOB_C + '" stroke-dashoffset="0" transform="rotate(-90 90 90)"/>' +
        '</svg>' +
        '<div class="mp-timebox"><div class="mp-phase">' +
          (mobSession.paused ? 'Pausiert' : isPrep ? 'Bereit machen' : 'Halten') +
        '</div><div class="mp-time" id="mobTime">–</div></div>' +
      '</div>' +

      '<div class="mp-why">💡 ' + esc(ex.why) + '</div>' +
      '<ul class="mp-cues">' + cues + '</ul>' +
      (ex.caution ? '<div class="mp-caution">⚠️ ' + esc(ex.caution) + '</div>' : '') +
      '<div class="mp-next">Als Nächstes: ' + nextLabel + '</div>' +
      '<div class="mp-remain">Noch ca. ' + fmtDuration(restSec) + '</div>' +
    '</div>' +

    '<div class="mp-controls">' +
      '<button id="mobPrev" class="mp-btn"' + (mobSession.idx === 0 ? ' disabled' : '') + '>↩︎</button>' +
      '<button id="mobPause" class="mp-btn wide">' + (mobSession.paused ? '▶︎ Weiter' : '⏸ Pause') + '</button>' +
      '<button id="mobNext" class="mp-btn">↪︎</button>' +
    '</div>';

  mobDrawTime(mobLeft());

  $('#mobQuitBtn').addEventListener('click', mobQuit);
  $('#mobSoundBtn').addEventListener('click', () => {
    cycleSoundMode();
    $('#mobSoundBtn').textContent = soundIcon();
  });
  $('#mobPause').addEventListener('click', mobTogglePause);
  $('#mobPrev').addEventListener('click', () => mobJump(-1));
  $('#mobNext').addEventListener('click', () => mobJump(1));
}

function finishMobility() {
  const routine = mobRoutine(mobSession.routineKey);
  const steps = mobilitySteps(routine);
  const seconds = steps.reduce((s, x) => s + x.seconds, 0);
  const pts = mobilityPoints(mobilityDuration(routine));

  closeMobPlayer();
  const startedAt = mobSession.startedAt;
  mobSession = null;
  mobSave();

  if (!state.mobilityLogs) state.mobilityLogs = [];
  state.mobilityLogs.push({
    id: 'mob_' + Date.now(),
    date: new Date().toISOString(),
    routineKey: routine.key,
    routineName: routine.name,
    exercises: routine.exercises.length,
    seconds,
    points: pts,
    durationMin: Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)),
  });
  state.points += pts;
  const newBadges = checkBadges(state);
  saveState(state);

  const badgesHtml = newBadges.map((b) =>
    '<div class="new-badge"><span class="b-icon">' + b.icon + '</span><div><div class="b-name">Neues Abzeichen: ' + esc(b.name) + '</div>' +
    '<div class="b-desc">' + esc(b.desc) + '</div></div></div>'
  ).join('');

  showOverlay(
    '<h2>🧘 ' + esc(routine.name) + ' geschafft!</h2>' +
    '<div class="summary-quote">' + esc(pickQuote(MOB_QUOTES)) + '</div>' +
    '<div class="summary-total"><div class="st-num" id="stNum">0</div><div class="st-lbl">Punkte verdient</div></div>' +
    '<div class="muted small">' + routine.exercises.length + ' Übungen · ' + fmtDuration(seconds) + ' reine Haltezeit · ' +
      (state.mobilityLogs.length) + '. Dehneinheit insgesamt</div>' +
    badgesHtml +
    '<button class="btn" id="closeMobSummary">Fertig 💪</button>'
  );
  setTimeout(() => animateCount($('#stNum'), pts, ''), 250);
  say('Geschafft! ' + routine.name + ' abgeschlossen.');
  confetti(newBadges.length ? 120 : 80);
  $('#closeMobSummary').addEventListener('click', () => { hideOverlay(); switchTab('mobility'); applyPendingReloadIfSafe(); });
}

// Nach Hintergrund/Neustart die laufende Einheit wieder aufnehmen
function restoreMobility() {
  if (mobSession) return;
  try {
    const saved = JSON.parse(localStorage.getItem(MOB_KEY));
    if (!saved || !mobRoutine(saved.routineKey) || typeof saved.idx !== 'number') {
      localStorage.removeItem(MOB_KEY);
      return;
    }
    const steps = mobilitySteps(mobRoutine(saved.routineKey));
    if (saved.idx < 0 || saved.idx >= steps.length) { localStorage.removeItem(MOB_KEY); return; }
    // Zu lange her? Dann nicht mehr fortsetzen.
    if (!saved.paused && Date.now() - saved.endsAt > 30 * 60000) { localStorage.removeItem(MOB_KEY); return; }
    mobSession = saved;
    // War der Bildschirm aus, sind womöglich mehrere Schritte "verfallen" –
    // dann an der aktuellen Stelle sauber neu anhalten statt blind durchzuspringen.
    if (!mobSession.paused && mobLeft() <= 0) {
      mobSession.paused = true;
      mobSession.leftWhenPaused = mobSession.phase === 'prep' ? steps[mobSession.idx].prep : steps[mobSession.idx].seconds;
      mobSave();
    }
    initAudio();
    requestWakeLock();
    renderMobPlayer();
    mobStartTicking();
  } catch (e) {
    localStorage.removeItem(MOB_KEY);
  }
}

// ---------- Oura: Morgencheck ----------

function openOuraSheet() {
  const last = latestOura(state);
  const rows = OURA_FIELDS.map((f) =>
    '<div class="set-row"><span class="set-num" style="width:96px">' + esc(f.label) + '</span>' +
      '<input type="number" inputmode="numeric" data-oura="' + f.key + '" ' +
      'value="' + (last && last[f.key] != null ? last[f.key] : '') + '" placeholder="' + (f.required ? 'nötig' : 'optional') + '">' +
      '<span class="unit">' + f.unit + '</span></div>' +
    '<div class="oura-hint">' + esc(f.hint) + '</div>'
  ).join('');

  showOverlay(
    '<h2>💍 Oura-Morgencheck</h2>' +
    '<p class="muted small">Die Werte aus deiner Oura-App abtippen – zwanzig Sekunden. Danach steuert deine Bereitschaft, ' +
    'wie hart heute trainiert wird. Alles bleibt auf diesem Gerät.</p>' +
    '<div style="margin-top:12px">' + rows + '</div>' +
    '<div class="btn-row">' +
      '<button class="btn secondary" id="ouraCancel">Abbrechen</button>' +
      '<button class="btn" id="ouraSave">Speichern ✓</button>' +
    '</div>'
  );
  $('#ouraCancel').addEventListener('click', hideOverlay);
  $('#ouraSave').addEventListener('click', () => {
    const entry = { date: new Date().toISOString() };
    for (const f of OURA_FIELDS) {
      const raw = ($('[data-oura="' + f.key + '"]').value || '').trim();
      if (raw === '') { entry[f.key] = null; continue; }
      const v = parseFloat(raw.replace(',', '.'));
      if (isNaN(v) || v < f.min || v > f.max) {
        alert(f.label + ': bitte einen Wert zwischen ' + f.min + ' und ' + f.max + ' eintragen.');
        entry.invalid = true; return;
      }
      entry[f.key] = Math.round(v * 10) / 10;
    }
    if (entry.readiness == null) { alert('Die Bereitschaft brauche ich mindestens.'); return; }

    if (!state.oura) state.oura = { entries: [] };
    // Pro Tag nur ein Eintrag – ein zweiter ersetzt den ersten
    const heute = new Date().toDateString();
    state.oura.entries = state.oura.entries.filter((e) => new Date(e.date).toDateString() !== heute);
    state.oura.entries.push(entry);
    const neu = ouraEntries(state).length === 1 || !ouraToday(state);
    state.points += OURA_POINTS;
    saveState(state);
    hideOverlay();
    render();
    const band = readinessBand(entry.readiness);
    toast(band.icon + ' Bereitschaft ' + entry.readiness + ' · +' + OURA_POINTS + ' P');
    say('Bereitschaft ' + entry.readiness + '. ' + band.label);
  });
}

function ouraCardHtml() {
  const g = ouraGuidance(state);
  if (!g) {
    const last = latestOura(state);
    return '<div class="card oura-card"><h2>💍 Oura-Morgencheck</h2>' +
      '<p class="muted small">' + (last
        ? 'Der letzte Eintrag ist von ' + fmtDate(last.date) + '. Für die Steuerung von heute brauche ich die Werte von heute Früh.'
        : 'Trag deine Bereitschaft aus der Oura-App ein – dann passt der Coach das Training daran an.') + '</p>' +
      '<button class="btn secondary" id="ouraOpenBtn">💍 Werte eintragen</button></div>';
  }
  const extras = [
    g.sleep != null ? 'Schlaf ' + g.sleep : null,
    g.hrv != null ? 'HRV ' + fmtW(g.hrv) + ' ms' : null,
    g.restingHr != null ? 'Ruhepuls ' + fmtW(g.restingHr) : null,
  ].filter(Boolean).map((t) => '<span class="chip">' + esc(t) + '</span>').join(' ');

  return '<div class="card oura-card band-' + g.band.key + '">' +
    '<div class="cc-label">Oura heute</div>' +
    '<h2 class="cc-head">' + esc(g.headline) + '</h2>' +
    '<p class="cc-advice">' + esc(g.advice) + '</p>' +
    (extras ? '<div class="status-facts">' + extras + '</div>' : '') +
    '<button class="btn secondary" id="ouraOpenBtn">Werte ändern</button></div>';
}

function wireOuraCard() {
  const b = $('#ouraOpenBtn');
  if (b) b.addEventListener('click', openOuraSheet);
}

// ---------- Laufen: Intervallprogramm ----------

function renderRunning() {
  const logs = state.runLogs || [];
  const coach = runCoach(state);
  const level = runLevelOf(state);
  const def = runLevelDef(level);
  const atLevel = runSessionsAtLevel(state);
  const zones = hrZones(state);
  const test = lastVo2Test(state);
  const rating = test ? vo2Rating(test.vo2max, state) : null;
  const recSecs = runSessionSeconds(coach.type, coach.level, 40);

  const ladder = RUN_LEVELS.map((l) => {
    const done = l.level < level;
    const cur = l.level === level;
    return '<button class="lvl-step' + (cur ? ' current' : done ? ' done' : '') + '" data-runlevel="' + l.level + '">' +
      '<span class="ls-num">' + (done ? '✓' : l.level) + '</span>' +
      '<span class="ls-name">' + esc(l.name) + '</span>' +
      (l.target ? '<span class="ls-target">Ziel</span>' : '') +
      (cur ? '<span class="ls-prog">' + atLevel + '/' + RUN_LEVEL_SESSIONS + '</span>' : '') +
    '</button>';
  }).join('');

  const zoneCard = zones
    ? '<div class="card"><h2>Deine Pulsbereiche</h2>' +
      '<div class="focus-row">' +
        '<div class="focus-tile stale"><div class="ft-name">Intervall</div><div class="ft-age">' + zones.work + '</div></div>' +
        '<div class="focus-tile fresh"><div class="ft-name">Erholung</div><div class="ft-age">' + zones.recover + '</div></div>' +
        '<div class="focus-tile fresh"><div class="ft-name">Ruhiger Lauf</div><div class="ft-age">' + zones.easy + '</div></div>' +
      '</div>' +
      '<p class="muted small" style="margin-top:10px">Geschätzte maximale Herzfrequenz: <b>' + zones.hrMax + '</b> ' +
      (state.runHrMax ? '(von dir eingetragen)' : '(Tanaka-Formel nach deinem Alter – über 40 treffsicherer als „220 minus Alter")') +
      '. Das bleibt eine Schätzung mit rund ±10 Schlägen. Ohne Pulsgurt gilt der Sprechtest: <b>' + esc(RUN_TALK.work) + '</b>.</p>' +
      '<button class="btn secondary" id="hrMaxBtn">❤️ Maximalpuls selbst eintragen</button></div>'
    : '<div class="card"><h2>Pulsbereiche</h2>' +
      '<p class="muted small">Trage im Körper-Tab dein Alter ein, dann rechnet die App deine Pulsbereiche aus. ' +
      'Auch ohne Pulsuhr geht es gut über den Sprechtest: <b>' + esc(RUN_TALK.work) + '</b>.</p></div>';

  const testCard = test
    ? '<div class="card"><h2>🫀 Deine VO2max</h2>' +
      '<div class="stat-row" style="margin-bottom:0">' +
        '<div class="stat-tile"><div class="val gold">' + fmtW(test.vo2max) + '</div><div class="lbl">ml/kg/min</div></div>' +
        '<div class="stat-tile"><div class="val">' + (test.distanceM ? (test.distanceM / 1000).toFixed(2).replace('.', ',') : '–') + '</div><div class="lbl">km in 12 Min</div></div>' +
        '<div class="stat-tile"><div class="val">' + (rating ? esc(rating.text) : '–') + '</div><div class="lbl">Einstufung</div></div>' +
      '</div>' +
      '<p class="muted small" style="margin-top:10px">Gemessen am ' + fmtDate(test.date) + ' · ' +
      'Pro zusätzlichem Punkt von etwa 3,5 ml/kg/min sinkt das statistische Sterberisiko um rund 13–15 %.</p></div>'
    : '';

  view.innerHTML =
    '<div class="card hero">' +
      '<div class="date-line">Ausdauer & VO2max</div>' +
      '<div class="greeting">Intervall-Laufen 🏃</div>' +
      '<div class="quote">Ziel ist das norwegische 4×4: vier Minuten hart, drei locker, viermal. Kein Training verbessert die VO2max zuverlässiger – und die ist einer der stärksten bekannten Vorhersagewerte für ein langes Leben.</div>' +
    '</div>' +

    ouraCardHtml() +
    '<div class="card coach-card ' + coach.tone + '">' +
      '<div class="cc-label">Dein Lauf-Coach</div>' +
      '<h2 class="cc-head">' + esc(coach.headline) + '</h2>' +
      '<p class="cc-advice">' + esc(coach.advice) + '</p>' +
      '<button class="btn" id="runCoachStart">▶︎ ' +
        (coach.type === 'easy' ? '🌿 Ruhiger Dauerlauf' : coach.type === 'test' ? '⏱ Cooper-Test' : '🔥 ' + esc(runLevelDef(coach.level).name)) +
        ' · ' + fmtDuration(recSecs) + '</button>' +
    '</div>' +

    '<div class="section-label">Dein Weg zum 4×4</div>' +
    '<div class="card"><div class="lvl-ladder">' + ladder + '</div>' +
      '<p class="muted small" style="margin-top:10px">Nach ' + RUN_LEVEL_SESSIONS + ' sauberen Einheiten geht es automatisch eine Stufe hoch – ' +
      'in etwa sechs Wochen bist du beim vollen Protokoll. Du kannst jede Stufe auch selbst antippen.</p></div>' +

    testCard + zoneCard +

    '<div class="section-label">Einheit wählen</div>' +
    '<button class="mob-card' + (coach.type === 'interval' ? ' recommended' : '') + '" data-run="interval">' +
      '<div class="mc-head"><span class="mc-icon">🔥</span><span class="mc-name">Intervalle · ' + esc(def.name) + '</span>' +
      '<span class="mc-dur">' + fmtDuration(runSessionSeconds('interval', level)) + '</span></div>' +
      '<div class="mc-desc">' + esc(def.note) + ' Dazwischen je 3 Minuten locker, mit Ein- und Auslaufen.</div>' +
      '<div class="mc-meta">' + runPoints('interval', runSessionSeconds('interval', level)) + ' Punkte' +
      (coach.type === 'interval' ? ' <span class="mc-rec">· heute empfohlen</span>' : '') + '</div></button>' +

    '<button class="mob-card' + (coach.type === 'easy' ? ' recommended' : '') + '" data-run="easy">' +
      '<div class="mc-head"><span class="mc-icon">🌿</span><span class="mc-name">Ruhiger Dauerlauf</span>' +
      '<span class="mc-dur">40 Min</span></div>' +
      '<div class="mc-desc">Gemütliches Tempo, ganze Sätze sprechen können. Baut die Grundlage, auf der die Intervalle erst wirken.</div>' +
      '<div class="mc-meta">' + runPoints('easy', runSessionSeconds('easy', 1, 40)) + ' Punkte' +
      (coach.type === 'easy' ? ' <span class="mc-rec">· heute empfohlen</span>' : '') + '</div></button>' +

    '<button class="mob-card' + (coach.type === 'test' ? ' recommended' : '') + '" data-run="test">' +
      '<div class="mc-head"><span class="mc-icon">⏱</span><span class="mc-name">Cooper-Test (VO2max)</span>' +
      '<span class="mc-dur">' + fmtDuration(runSessionSeconds('test')) + '</span></div>' +
      '<div class="mc-desc">12 Minuten so weit wie möglich. Daraus schätzt die App deine VO2max – deine Standortbestimmung alle 8 Wochen.</div>' +
      '<div class="mc-meta">' + runPoints('test', runSessionSeconds('test')) + ' Punkte' +
      (coach.type === 'test' ? ' <span class="mc-rec">· heute empfohlen</span>' : '') + '</div></button>' +

    '<div class="stat-row" style="margin-top:14px">' +
      '<div class="stat-tile"><div class="val">' + logs.length + '</div><div class="lbl">Läufe</div></div>' +
      '<div class="stat-tile"><div class="val">' + logs.filter((l) => l.type === 'interval').length + '</div><div class="lbl">Intervalle</div></div>' +
      '<div class="stat-tile"><div class="val">' + (daysSinceRun(state) == null ? '–' : daysSinceRun(state)) + '</div><div class="lbl">Tage her</div></div>' +
    '</div>' +

    '<details class="fold"><summary>Warum 4×4 – und warum das fürs Altern zählt</summary><div class="fold-body">' +
      '<div class="plan-ex"><div>Das Protokoll stammt von Ulrik Wisløffs Arbeitsgruppe an der NTNU Trondheim. In der Originalstudie steigerte es die VO2max um rund <b>46 % stärker</b> als ein gleich langes ruhiges Dauertraining – bei nur 16 Minuten harter Arbeit pro Einheit.</div></div>' +
      '<div class="plan-ex"><div>Die Ausdauerleistung ist einer der <b>stärksten bekannten Vorhersagewerte für die Gesamtsterblichkeit</b> – stärker als Rauchen, Diabetes oder Bluthochdruck. Pro zusätzlichem MET (etwa 3,5 ml/kg/min) sinkt das Risiko um rund 13–15 %.</div></div>' +
      '<div class="plan-ex"><div>In der <b>Generation-100-Studie</b> (1567 Personen, 70–77 Jahre, über 5 Jahre) starben in der Intervallgruppe 3 %, im moderaten Arm 6 %. Der Unterschied war statistisch nicht gesichert, zeigt aber die Richtung – und die Intervallgruppe hatte klar die bessere Fitness.</div></div>' +
      '<div class="plan-ex"><div><b>Aufbau statt Vollgas:</b> Die Literatur empfiehlt 4–6 Wochen Anlauf und zwei Einheiten pro Woche mit mindestens 48 Stunden Abstand. Drei Intervalle in guter Qualität schlagen vier, bei denen das letzte nur noch Quälerei ist.</div></div>' +
      '<div class="plan-ex"><div><b>Kombination mit deinem Krafttraining:</b> Am besten an trainingsfreien Tagen oder mit ein paar Stunden Abstand. Intervalle nie direkt vor dem Beintraining – und umgekehrt.</div></div>' +
      '<div class="plan-ex"><div class="px-muscle">Die Pulsbereiche sind Schätzwerte. Wenn du Herz-Kreislauf-Vorerkrankungen hast oder lange nicht intensiv trainiert hast, klär hochintensives Intervalltraining vorher ärztlich ab.</div></div>' +
    '</div></details>';

  wireOuraCard();
  $('#runCoachStart').addEventListener('click', () => startRun(coach.type, coach.level));
  $$('[data-run]').forEach((b) => b.addEventListener('click', () => startRun(b.dataset.run, level)));
  $$('[data-runlevel]').forEach((b) => b.addEventListener('click', () => {
    state.runLevel = +b.dataset.runlevel;
    saveState(state);
    renderRunning();
    toast('🏃 Stufe ' + state.runLevel + ': ' + runLevelDef(state.runLevel).name);
  }));
  const hrBtn = $('#hrMaxBtn');
  if (hrBtn) hrBtn.addEventListener('click', openHrMaxSheet);
}

function openHrMaxSheet() {
  showOverlay(
    '<h2>❤️ Maximalpuls</h2>' +
    '<p class="muted small">Kennst du deinen echten Maximalpuls (z. B. aus einem Ausbelastungstest oder dem höchsten je gemessenen Wert), trag ihn hier ein – ' +
    'das ist genauer als jede Formel. Leer lassen heißt: Schätzung nach Alter.</p>' +
    '<div class="set-row" style="margin-top:12px"><span class="set-num" style="width:80px">Max-Puls</span>' +
      '<input type="number" inputmode="numeric" id="hrInput" value="' + (state.runHrMax || '') + '" placeholder="z.B. 186"><span class="unit">bpm</span></div>' +
    '<div class="btn-row">' +
      '<button class="btn secondary" id="hrClear">Zurücksetzen</button>' +
      '<button class="btn" id="hrSave">Speichern ✓</button>' +
    '</div>'
  );
  $('#hrClear').addEventListener('click', () => {
    state.runHrMax = null; saveState(state); hideOverlay(); renderRunning(); toast('❤️ Zurück auf Schätzung');
  });
  $('#hrSave').addEventListener('click', () => {
    const v = parseInt($('#hrInput').value, 10);
    if (isNaN(v) || v < 120 || v > 220) { alert('Bitte einen Wert zwischen 120 und 220 eintragen.'); return; }
    state.runHrMax = v; saveState(state); hideOverlay(); renderRunning(); toast('❤️ Maximalpuls: ' + v);
  });
}

// ---------- Geführter Lauf-Player (gleiche Wanduhr-Technik wie beim Dehnen) ----------

// ---------- Brustgurt (Web Bluetooth) ----------
let hrDevice = null, hrChar = null, hrCurrent = null;
let hrSamples = [];   // für Durchschnitt und Maximum der Einheit

async function connectHeartStrap() {
  if (!bluetoothSupported()) {
    alert('Dieser Browser unterstützt keine Bluetooth-Verbindung zu Webseiten. '
      + 'Am iPhone geht das in Safari grundsätzlich nicht – nur über Spezialbrowser wie Bluefy. '
      + 'In Chrome am Rechner oder unter Android funktioniert es direkt. '
      + 'Alternative: Trag Durchschnitts- und Maximalpuls nach dem Lauf von Hand ein.');
    return;
  }
  try {
    const dev = await navigator.bluetooth.requestDevice({ filters: [{ services: [HR_SERVICE] }] });
    const server = await dev.gatt.connect();
    const service = await server.getPrimaryService(HR_SERVICE);
    const ch = await service.getCharacteristic(HR_CHARACTERISTIC);
    await ch.startNotifications();
    ch.addEventListener('characteristicvaluechanged', (e) => {
      hrCurrent = parseHeartRate(e.target.value);
      if (hrCurrent > 0) hrSamples.push(hrCurrent);
      drawHeartRate();
    });
    dev.addEventListener('gattserverdisconnected', () => {
      hrChar = null; hrCurrent = null; drawHeartRate();
      toast('❤️ Brustgurt getrennt');
    });
    hrDevice = dev; hrChar = ch;
    toast('❤️ ' + (dev.name || 'Brustgurt') + ' verbunden');
    drawHeartRate();
  } catch (e) {
    if (e && e.name !== 'NotFoundError') alert('Verbindung fehlgeschlagen: ' + (e.message || e.name));
  }
}

function disconnectHeartStrap() {
  try { if (hrDevice && hrDevice.gatt.connected) hrDevice.gatt.disconnect(); } catch (e) {}
  hrDevice = null; hrChar = null; hrCurrent = null;
}

// Live-Puls einfärben: liegt er im Zielbereich der aktuellen Phase?
function drawHeartRate() {
  const el = $('#hrLive');
  if (!el) return;
  if (hrCurrent == null) { el.className = 'hr-live off'; el.innerHTML = '❤️ Brustgurt verbinden'; return; }
  const zones = hrZones(state);
  let cls = 'hr-live';
  if (zones && runSession) {
    const kind = runSteps()[runSession.idx].kind;
    const zone = RUN_PHASE_INFO[kind].zone;
    const [lo, hi] = zones[zone].split('–').map(Number);
    cls += hrCurrent >= lo && hrCurrent <= hi ? ' in' : hrCurrent > hi ? ' over' : ' under';
  }
  el.className = cls;
  el.innerHTML = '❤️ <b>' + hrCurrent + '</b> bpm';
}

const RUN_KEY = 'gymcoach.runsession.v1';
let runSession = null;   // { type, level, minutes, idx, endsAt, paused, leftWhenPaused, startedAt }
let runInterval = null;
let runLastTickSec = null;

function runSteps() {
  return runSessionSteps(runSession.type, runSession.level, runSession.minutes);
}

function runSave() {
  if (runSession) localStorage.setItem(RUN_KEY, JSON.stringify(runSession));
  else localStorage.removeItem(RUN_KEY);
}

function runLeft() {
  if (!runSession) return 0;
  if (runSession.paused) return runSession.leftWhenPaused;
  return Math.max(0, Math.round((runSession.endsAt - Date.now()) / 1000));
}

function startRun(type, level, minutes) {
  stopRestTimer();
  initAudio();
  requestWakeLock();
  const steps = runSessionSteps(type, level, minutes || 40);
  runSession = {
    type, level: level || runLevelOf(state), minutes: minutes || 40,
    idx: 0, endsAt: Date.now() + steps[0].seconds * 1000,
    paused: false, leftWhenPaused: 0, startedAt: new Date().toISOString(),
  };
  hrSamples = [];
  runSave();
  renderRunPlayer();
  if (runInterval) clearInterval(runInterval);
  runInterval = setInterval(runTick, 250);
  runAnnouncePhase();
}

function runTick() {
  if (!runSession) { clearInterval(runInterval); runInterval = null; return; }
  if (runSession.paused) return;
  const left = runLeft();
  runDrawTime(left);
  if (left <= 0) { runAdvance(); return; }
  if (left <= 3 && left !== runLastTickSec) { runLastTickSec = left; playSound('tick'); }
}

function runAdvance() {
  const steps = runSteps();
  runLastTickSec = null;
  if (runSession.idx >= steps.length - 1) { playSound('finish'); finishRun(); return; }
  runSession.idx++;
  runSession.endsAt = Date.now() + steps[runSession.idx].seconds * 1000;
  // Ins Intervall hinein deutlich anders klingen als in die Erholung
  playSound(steps[runSession.idx].kind === 'work' || steps[runSession.idx].kind === 'test' ? 'go' : 'done');
  runSave();
  renderRunPlayer();
  runAnnouncePhase();
}

function runAnnouncePhase() {
  const steps = runSteps();
  const st = steps[runSession.idx];
  const texte = {
    warmup: 'Einlaufen. Ruhiges Tempo.',
    work: st.label + '. Vollgas!',
    recover: 'Erholung. Locker weiterlaufen.',
    easy: 'Ruhiger Dauerlauf. Du solltest ganze Sätze sprechen können.',
    test: 'Zwölf Minuten Test. Gleichmäßig schnell.',
    cooldown: 'Auslaufen. Gut gemacht.',
  };
  say(texte[st.kind] || st.label);
}

function runJump(delta) {
  const steps = runSteps();
  const next = runSession.idx + delta;
  if (next < 0) return;
  if (next >= steps.length) { finishRun(); return; }
  runSession.idx = next;
  runSession.paused = false;
  runLastTickSec = null;
  runSession.endsAt = Date.now() + steps[next].seconds * 1000;
  runSave();
  renderRunPlayer();
  runAnnouncePhase();
}

function runTogglePause() {
  if (runSession.paused) {
    runSession.paused = false;
    runSession.endsAt = Date.now() + runSession.leftWhenPaused * 1000;
  } else {
    runSession.leftWhenPaused = runLeft();
    runSession.paused = true;
  }
  runSave();
  renderRunPlayer();
}

function closeRunPlayer() {
  if (runInterval) clearInterval(runInterval);
  runInterval = null;
  disconnectHeartStrap();
  releaseWakeLock();
  const el = $('#runPlayer');
  if (el) el.remove();
}

function runQuit() {
  if (!confirm('Lauf beenden? Diese Einheit wird nicht gespeichert.')) return;
  closeRunPlayer();
  runSession = null;
  runSave();
  render();
}

function runDrawTime(left) {
  const t = $('#runTime'), ring = $('#runRing');
  if (!t || !runSession) return;
  const st = runSteps()[runSession.idx];
  t.textContent = fmtTime(left);
  if (ring) ring.style.strokeDashoffset = String(MOB_C * Math.min(1, Math.max(0, 1 - left / st.seconds)));
}

function renderRunPlayer() {
  if (!runSession) return;
  const steps = runSteps();
  const st = steps[runSession.idx];
  const info = RUN_PHASE_INFO[st.kind];
  const zones = hrZones(state);
  const next = steps[runSession.idx + 1];

  let restSec = runLeft();
  for (let i = runSession.idx + 1; i < steps.length; i++) restSec += steps[i].seconds;

  const zoneLine = zones
    ? '<div class="rp-zone">🫀 ' + zones[info.zone] + ' Schläge/Min</div>'
    : '';

  let el = $('#runPlayer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'runPlayer';
    el.className = 'mob-player run-player';
    document.body.appendChild(el);
  }

  el.innerHTML =
    '<div class="mp-top">' +
      '<button id="runQuitBtn" class="mp-quit" aria-label="Beenden">✕</button>' +
      '<div class="mp-count">Abschnitt ' + (runSession.idx + 1) + ' / ' + steps.length + '</div>' +
      '<button id="runSoundBtn" class="mp-quit" aria-label="Ton umschalten">' + soundIcon() + '</button>' +
    '</div>' +
    '<div class="mp-bar"><div style="width:' + Math.round((runSession.idx / steps.length) * 100) + '%"></div></div>' +

    '<div class="mp-scroll">' +
      '<div class="rp-phase ' + info.color + '">' +
        '<div class="rp-icon">' + info.icon + '</div>' +
        '<h2 class="mp-name">' + esc(st.label) + '</h2>' +
      '</div>' +

      '<div class="mp-ringwrap ' + (runSession.paused ? 'paused' : info.color === 'work' ? 'prep' : '') + '">' +
        '<svg viewBox="0 0 180 180">' +
          '<circle cx="90" cy="90" r="' + MOB_R + '" fill="none" stroke="#2a3242" stroke-width="9"/>' +
          '<circle id="runRing" cx="90" cy="90" r="' + MOB_R + '" fill="none" stroke-width="9" stroke-linecap="round" ' +
            'stroke-dasharray="' + MOB_C + '" stroke-dashoffset="0" transform="rotate(-90 90 90)"/>' +
        '</svg>' +
        '<div class="mp-timebox"><div class="mp-phase">' +
          (runSession.paused ? 'Pausiert' : info.color === 'work' ? 'Hart' : 'Locker') +
        '</div><div class="mp-time" id="runTime">–</div></div>' +
      '</div>' +

      zoneLine +
      '<button id="hrLive" class="hr-live off">❤️ Brustgurt verbinden</button>' +
      '<div class="mp-why">' + info.icon + ' ' + esc(info.hint) + '</div>' +
      '<div class="rp-talk">🗣 ' + esc(RUN_TALK[info.zone]) + '</div>' +
      '<div class="mp-next">Als Nächstes: ' + (next ? esc(next.label) : 'Fertig!') + '</div>' +
      '<div class="mp-remain">Noch ca. ' + fmtDuration(restSec) + '</div>' +
    '</div>' +

    '<div class="mp-controls">' +
      '<button id="runPrev" class="mp-btn"' + (runSession.idx === 0 ? ' disabled' : '') + '>↩︎</button>' +
      '<button id="runPause" class="mp-btn wide">' + (runSession.paused ? '▶︎ Weiter' : '⏸ Pause') + '</button>' +
      '<button id="runNext" class="mp-btn">↪︎</button>' +
    '</div>';

  runDrawTime(runLeft());
  $('#runQuitBtn').addEventListener('click', runQuit);
  $('#runSoundBtn').addEventListener('click', () => { cycleSoundMode(); $('#runSoundBtn').textContent = soundIcon(); });
  $('#hrLive').addEventListener('click', () => { if (!hrChar) connectHeartStrap(); });
  drawHeartRate();
  $('#runPause').addEventListener('click', runTogglePause);
  $('#runPrev').addEventListener('click', () => runJump(-1));
  $('#runNext').addEventListener('click', () => runJump(1));
}

function finishRun() {
  const type = runSession.type, level = runSession.level;
  const seconds = runSteps().reduce((s, x) => s + x.seconds, 0);
  const startedAt = runSession.startedAt;
  closeRunPlayer();
  runSession = null;
  runSave();

  if (type === 'test') return askCooperDistance(seconds, startedAt);
  if (type === 'interval') return askIntervalFeedback(level, seconds, startedAt);
  saveRunLog({ type, level, seconds, startedAt });
}

function saveRunLog(o) {
  if (!state.runLogs) state.runLogs = [];
  if (hrSamples.length) {
    o.hrAvg = Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length);
    o.hrMax = Math.max.apply(null, hrSamples);
    hrSamples = [];
  }
  const pts = runPoints(o.type, o.seconds);
  const log = {
    id: 'run_' + Date.now(), date: new Date().toISOString(),
    type: o.type, level: o.level, seconds: o.seconds, points: pts,
    feedback: o.feedback || null, distanceM: o.distanceM || null, vo2max: o.vo2max || null,
    hrAvg: o.hrAvg || null, hrMax: o.hrMax || null,
    durationMin: Math.max(1, Math.round((Date.now() - new Date(o.startedAt).getTime()) / 60000)),
  };
  state.runLogs.push(log);
  state.points += pts;

  // Stufenaufstieg nach genug sauberen Einheiten
  let levelUp = null;
  if (o.type === 'interval' && o.feedback !== 'hard') {
    const lvl = runLevelOf(state);
    if (runSessionsAtLevel(state) >= RUN_LEVEL_SESSIONS && lvl < RUN_LEVELS.length) {
      state.runLevel = lvl + 1;
      levelUp = runLevelDef(state.runLevel);
    }
  }
  const newBadges = checkBadges(state);
  saveState(state);

  const badgesHtml = newBadges.map((b) =>
    '<div class="new-badge"><span class="b-icon">' + b.icon + '</span><div><div class="b-name">Neues Abzeichen: ' + esc(b.name) + '</div>' +
    '<div class="b-desc">' + esc(b.desc) + '</div></div></div>').join('');

  const title = o.type === 'test' ? '⏱ Cooper-Test geschafft!'
    : o.type === 'easy' ? '🌿 Dauerlauf erledigt!'
    : '🔥 ' + runLevelDef(o.level).name + ' geschafft!';

  showOverlay(
    '<h2>' + title + '</h2>' +
    '<div class="summary-quote">' + esc(pickQuote(RUN_QUOTES)) + '</div>' +
    (o.vo2max
      ? '<div class="summary-total"><div class="st-num">' + fmtW(o.vo2max) + '</div><div class="st-lbl">ml/kg/min VO2max</div></div>' +
        '<p class="muted small">' + (o.distanceM / 1000).toFixed(2).replace('.', ',') + ' km in 12 Minuten' +
        (vo2Rating(o.vo2max, state) ? ' · Einstufung: ' + esc(vo2Rating(o.vo2max, state).text) : '') + '</p>'
      : '<div class="summary-total"><div class="st-num" id="stNum">0</div><div class="st-lbl">Punkte verdient</div></div>') +
    (levelUp
      ? '<div class="levelup-banner"><span class="lu-icon">🚀</span><div><div class="lu-title">Stufe geschafft!</div>' +
        '<div class="lu-sub">Nächste Einheit: ' + esc(levelUp.name) + '</div></div></div>'
      : '') +
    '<div class="muted small" style="margin-top:10px">' + log.durationMin + ' Min unterwegs · +' + pts + ' Punkte · ' +
      state.runLogs.length + '. Lauf insgesamt' +
      (log.hrAvg ? ' · ❤️ ø ' + log.hrAvg + ' / max ' + log.hrMax + ' bpm' : '') + '</div>' +
    badgesHtml +
    '<button class="btn" id="closeRunSummary">Fertig 💪</button>'
  );
  if (!o.vo2max) setTimeout(() => animateCount($('#stNum'), pts, ''), 250);
  say(levelUp ? 'Geschafft! Stufe aufgestiegen.' : 'Geschafft!');
  confetti(levelUp || newBadges.length ? 130 : 85);
  $('#closeRunSummary').addEventListener('click', () => { hideOverlay(); switchTab('running'); applyPendingReloadIfSafe(); });
}

function askIntervalFeedback(level, seconds, startedAt) {
  showOverlay(
    '<h2>🔥 ' + esc(runLevelDef(level).name) + ' geschafft!</h2>' +
    '<p class="muted small">Wie haben sich die Intervalle angefühlt? Davon hängt ab, wann es eine Stufe hochgeht.</p>' +
    '<div class="variant-list">' +
      '<button class="variant-opt" data-fb="easy"><div class="vo-name">😀 Gut machbar</div>' +
        '<div class="vo-desc">Alle Intervalle sauber durchgezogen, danach noch Luft</div></button>' +
      '<button class="variant-opt" data-fb="ok"><div class="vo-name">😤 Passend fordernd</div>' +
        '<div class="vo-desc">Hart, aber alle Intervalle in guter Qualität – genau richtig</div></button>' +
      '<button class="variant-opt" data-fb="hard"><div class="vo-name">🥵 Zu hart</div>' +
        '<div class="vo-desc">Das Tempo brach ein oder ich musste abbrechen – Stufe bleibt</div></button>' +
    '</div>'
  );
  $$('[data-fb]').forEach((b) => b.addEventListener('click', () => {
    hideOverlay();
    saveRunLog({ type: 'interval', level, seconds, startedAt, feedback: b.dataset.fb });
  }));
}

function askCooperDistance(seconds, startedAt) {
  showOverlay(
    '<h2>⏱ Wie weit bist du gekommen?</h2>' +
    '<p class="muted small">Die in den 12 Minuten zurückgelegte Strecke – ablesbar auf Laufuhr, Handy-App oder an der Bahn ' +
    '(eine Runde = 400 m). Daraus schätzt die App deine VO2max.</p>' +
    '<div class="set-row" style="margin-top:12px"><span class="set-num" style="width:70px">Strecke</span>' +
      '<input type="number" inputmode="decimal" step="10" id="cooperM" placeholder="z.B. 2400"><span class="unit">m</span></div>' +
    '<div class="btn-row">' +
      '<button class="btn secondary" id="cooperSkip">Ohne Wert</button>' +
      '<button class="btn" id="cooperSave">Auswerten ✓</button>' +
    '</div>'
  );
  $('#cooperSkip').addEventListener('click', () => {
    hideOverlay(); saveRunLog({ type: 'test', seconds, startedAt });
  });
  $('#cooperSave').addEventListener('click', () => {
    const m = parseInt(($('#cooperM').value || '').replace(',', '.'), 10);
    if (isNaN(m) || m < 500 || m > 6000) { alert('Bitte eine Strecke zwischen 500 und 6000 Metern eintragen.'); return; }
    hideOverlay();
    saveRunLog({ type: 'test', seconds, startedAt, distanceM: m, vo2max: cooperVo2max(m) });
  });
}

function restoreRun() {
  if (runSession) return;
  try {
    const saved = JSON.parse(localStorage.getItem(RUN_KEY));
    if (!saved || typeof saved.idx !== 'number' || !saved.type) { localStorage.removeItem(RUN_KEY); return; }
    const steps = runSessionSteps(saved.type, saved.level, saved.minutes);
    if (saved.idx < 0 || saved.idx >= steps.length) { localStorage.removeItem(RUN_KEY); return; }
    if (!saved.paused && Date.now() - saved.endsAt > 45 * 60000) { localStorage.removeItem(RUN_KEY); return; }
    runSession = saved;
    // Bildschirm war lange aus: am aktuellen Abschnitt anhalten statt durchzurasen
    if (!runSession.paused && runLeft() <= 0) {
      runSession.paused = true;
      runSession.leftWhenPaused = steps[runSession.idx].seconds;
      runSave();
    }
    initAudio();
    requestWakeLock();
    renderRunPlayer();
    if (runInterval) clearInterval(runInterval);
    runInterval = setInterval(runTick, 250);
  } catch (e) {
    localStorage.removeItem(RUN_KEY);
  }
}

// ---------- Plan-Ansicht ----------

function renderPlanView() {
  const workouts = PLAN.workouts.map((w) => {
    const rows = w.exercises.map((slot) => {
      const ex = resolveExercise(slot, state.variants);
      const hasVariants = (slot.alternatives || []).length > 0;
      const target = ex.metric === 'time' ? ex.sets + '×' + ex.timeTarget + 's'
        : ex.metric === 'distance' ? ex.sets + '×' + ex.distTarget + 'm'
        : ex.sets + '×' + (ex.repsMin === ex.repsMax ? ex.repsMax : ex.repsMin + '–' + ex.repsMax);
      return '<div class="plan-ex"><div>' + esc(ex.name) +
        ' <button class="swap-btn small" data-swapslot="' + slot.id + '" aria-label="Übung anpassen">' + (hasVariants ? '⇄' : '⚙') + '</button>' +
        '<div class="px-muscle">' + esc(ex.muscle) +
        ' · ⏱ ' + fmtTime(ex.rest) + ' Pause' + (ex.note ? ' · ' + esc(ex.note) : '') + '</div></div>' +
        '<div class="px-sets">' + target + '</div></div>';
    }).join('');
    return '<details class="fold"><summary><span>' + esc(w.name) +
      '<span class="fold-duration"> · ⏱ ca. ' + fmtDuration(estimateWorkoutSeconds(resolvedExercises(w, state.variants))) + '</span></span></summary>' +
      '<div class="fold-body">' + rows + '</div></details>';
  }).join('');

  const forbidden = PLAN.forbidden.map((f) =>
    '<div class="forbidden-item"><div class="f-name">❌ ' + esc(f.name) + '</div><div class="f-reason">' + esc(f.reason) + '</div></div>'
  ).join('');

  const rehab = PLAN.rehab.map((r) => '<div class="plan-ex"><div>' + esc(r.name) + '</div></div>').join('');
  const rules = PLAN.intensityRules.map((r) => '<div class="plan-ex"><div>• ' + esc(r) + '</div></div>').join('');
  const restRules = PLAN.restRules.map((r) => '<div class="plan-ex"><div>• ' + esc(r) + '</div></div>').join('');

  view.innerHTML =
    '<div class="section-label">Dein Plan (Rotation A → B → C, 3×/Woche)</div>' +
    workouts +
    '<details class="fold"><summary>🩹 Reha-Block (2–3×/Woche)</summary><div class="fold-body">' + rehab + '</div></details>' +
    '<details class="fold"><summary>❌ Verbotene Übungen</summary><div class="fold-body">' + forbidden + '</div></details>' +
    '<details class="fold"><summary>📏 Intensitäts-Regeln</summary><div class="fold-body">' + rules + '</div></details>' +
    '<details class="fold"><summary>⏱ Pausenzeiten</summary><div class="fold-body">' + restRules + '</div></details>' +
    '<div class="card"><p class="muted small">Mit konsequentem Training verbessern sich Impingement-Beschwerden meist in 8–12 Wochen. ' +
    'Der Schlüssel: schrittweiser Kraftaufbau von Rotatorenmanschette und Schulterblattmuskulatur – nicht das Vermeiden jeder Belastung.</p></div>';

  $$('[data-swapslot]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openExerciseSettings(btn.dataset.swapslot, null);
  }));
}

// ---------- Service Worker (mit robustem Auto-Update fürs iPhone) ----------
// iOS hält als App installierte Seiten oft im Hintergrund am Leben statt sie zu beenden –
// dadurch findet nie eine echte Neuladung statt und Updates kommen nie an. Deshalb hier:
// 1) updateViaCache:'none' – sw.js selbst wird nie aus dem HTTP-Cache bedient
// 2) Bei jedem Sichtbarwerden der App aktiv auf ein Update prüfen
// 3) Sobald ein neuer Service Worker übernimmt, die Seite neu laden –
//    außer mitten in einem Training, dann erst danach (kein Datenverlust bei Live-Eingaben)

let pendingReload = false;

function applyPendingReloadIfSafe() {
  if (pendingReload && !session) location.reload();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      reg.update();

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (session) {
          pendingReload = true;
          toast('🔄 Update geladen – wird nach dem Training aktiv');
        } else {
          location.reload();
        }
      });

      const checkForUpdate = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') { checkForUpdate(); applyPendingReloadIfSafe(); }
      });
      window.addEventListener('pageshow', () => { checkForUpdate(); applyPendingReloadIfSafe(); });
      window.addEventListener('focus', checkForUpdate);
    } catch (e) { /* Service Worker nicht verfügbar */ }
  });
}

// ---------- Start ----------

render();
restoreRestTimer();
restoreMobility();
restoreRun();
