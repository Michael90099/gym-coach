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
  $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}

function render() {
  renderTopbar();
  if (session && currentTab === 'home') return renderWorkout();
  if (currentTab === 'home') return renderHome();
  if (currentTab === 'history') return renderHistory();
  if (currentTab === 'progress') return renderProgress();
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
      '<div class="workout-estimate">⏱ ca. ' + fmtDuration(estimateWorkoutSeconds(getWorkout(selectedWorkoutKey))) + ' inkl. Aufwärmen</div>' +
      '<button class="btn" id="startBtn">▶︎ ' + esc(getWorkout(selectedWorkoutKey).name) + ' starten</button>' +
    '</div>' +

    (badges ? '<div class="card"><h2>Letzte Abzeichen</h2><div>' + badges + '</div></div>' : '');

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
}

// ---------- Workout-Session ----------

function startWorkout(key) {
  const w = getWorkout(key);
  session = {
    workoutKey: key,
    startedAt: new Date().toISOString(),
    warmup: {},
    exercises: w.exercises.map((ex) => {
      const hist = exerciseHistory(state, ex.id);
      const rec = getRecommendation(ex, hist);
      const lastSets = hist[0] ? hist[0].sets : [];
      return {
        id: ex.id,
        prevBest: hist[0] ? bestOf(ex, hist[0].sets) : null,
        rec: { weight: rec.weight, increase: !!rec.increase, caution: !!rec.caution, message: rec.message },
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          weight: rec.weight != null ? rec.weight : (lastSets[i] ? lastSets[i].weight : null),
          reps: ex.metric === 'weight' || ex.metric === 'reps' ? (lastSets[i] && !rec.increase ? lastSets[i].reps : ex.repsMin) : null,
          value: ex.metric === 'time' ? ex.timeTarget : ex.metric === 'distance' ? ex.distTarget : null,
          done: false,
        })),
        pain: false,
      };
    }),
  };
  saveSession(session);
  switchTab('home');
}

function setInputsHtml(ex, sEx, i) {
  const s = sEx.sets[i];
  const w = s.weight != null ? s.weight : '';
  let inputs = '';
  if (ex.metric === 'weight' || ex.metric === 'distance') {
    inputs += '<input type="number" inputmode="decimal" step="0.5" data-f="weight" data-i="' + i + '" value="' + w + '" placeholder="kg"><span class="unit">kg</span>';
  }
  if (ex.metric === 'weight' || ex.metric === 'reps') {
    inputs += '<input type="number" inputmode="numeric" data-f="reps" data-i="' + i + '" value="' + (s.reps != null ? s.reps : '') + '" placeholder="Wdh"><span class="unit">Wdh</span>';
  }
  if (ex.metric === 'time') {
    inputs += '<input type="number" inputmode="numeric" data-f="value" data-i="' + i + '" value="' + (s.value != null ? s.value : '') + '" placeholder="Sek"><span class="unit">Sek</span>';
  }
  if (ex.metric === 'distance') {
    inputs += '<input type="number" inputmode="numeric" data-f="value" data-i="' + i + '" value="' + (s.value != null ? s.value : '') + '" placeholder="m"><span class="unit">m</span>';
  }
  return inputs;
}

function renderWorkout() {
  const w = getWorkout(session.workoutKey);

  const warmupHtml = PLAN.warmup.map((it) =>
    '<label><input type="checkbox" data-wu="' + it.id + '"' + (session.warmup[it.id] ? ' checked' : '') + '><span class="ok">' + esc(it.name) + '</span></label>'
  ).join('');

  const exHtml = w.exercises.map((ex, exIdx) => {
    const sEx = session.exercises[exIdx];
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
      ? '<div class="pain-row"><span>Stechender Schmerz in der Schulter?</span>' +
        '<button class="pain-toggle' + (sEx.pain ? ' on' : '') + '" data-pain="' + exIdx + '">' + (sEx.pain ? '⚠️ Ja' : 'Nein') + '</button></div>'
      : '';

    const complete = sEx.sets.length > 0 && sEx.sets.every((s) => s.done);
    return '<div class="card exercise-card' + (complete ? ' complete' : '') + '" data-excard="' + exIdx + '">' +
      '<div class="exercise-head"><h3>' + esc(ex.name) + '</h3><span class="target">' + target + ' · ⏱ ' + fmtTime(ex.rest) + '</span></div>' +
      (ex.note ? '<div class="exercise-note">⚠️ ' + esc(ex.note) + '</div>' : '') +
      '<div class="rec' + recClass + '">🧠 ' + esc(sEx.rec.message) + '</div>' +
      setsHtml + painHtml +
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

    const ex = getWorkout(session.workoutKey).exercises[exIdx];
    const card = $('[data-excard="' + exIdx + '"]');
    if (card) card.classList.toggle('complete', sEx.sets.every((x) => x.done));
    updateSessionProgress();

    if (s.done) {
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
        startRestTimer(Math.max(ex.rest, 120), 'Übung geschafft ✓', nextName ? 'Dann: ' + nextName : '');
      } else {
        const doneCount = sEx.sets.filter((x) => x.done).length;
        startRestTimer(ex.rest, 'Pause · ' + ex.name, 'Dann Satz ' + Math.min(doneCount + 1, sEx.sets.length) + ' von ' + sEx.sets.length);
      }
    }
  }));

  $$('.pain-toggle').forEach((btn) => btn.addEventListener('click', () => {
    const exIdx = +btn.dataset.pain;
    session.exercises[exIdx].pain = !session.exercises[exIdx].pain;
    saveSession(session);
    renderWorkout();
  }));

  $('#finishBtn').addEventListener('click', promptRehab);
  $('#cancelBtn').addEventListener('click', () => {
    if (confirm('Training wirklich verwerfen? Eingetragene Sätze gehen verloren.')) {
      stopRestTimer();
      stopSessionClock();
      session = null;
      saveSession(null);
      render();
    }
  });
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

const RING_R = 24, RING_C = 2 * Math.PI * RING_R;

function startRestTimer(seconds, title, sub) {
  stopRestTimer();
  const el = $('#restTimer');
  let total = seconds, remaining = seconds;
  el.classList.remove('hidden');

  el.innerHTML =
    '<div class="ring">' +
      '<svg width="56" height="56" viewBox="0 0 56 56">' +
        '<circle class="ring-bg" cx="28" cy="28" r="' + RING_R + '" fill="none" stroke-width="5"/>' +
        '<circle class="ring-fg" id="ringFg" cx="28" cy="28" r="' + RING_R + '" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + RING_C + '" stroke-dashoffset="0"/>' +
      '</svg>' +
      '<div class="ring-time" id="ringTime"></div>' +
    '</div>' +
    '<div class="rt-mid"><div class="rt-label">' + esc(title || 'Pause läuft') + '</div>' +
    '<div class="rt-sub">' + esc(sub || 'Durchatmen, Schultern locker') + '</div></div>' +
    '<div class="rt-btns"><button id="addRest">+30s</button><button id="skipRest">Weiter ▶︎</button></div>';

  const draw = () => {
    $('#ringTime').textContent = fmtTime(remaining);
    $('#ringFg').style.strokeDashoffset = String(RING_C * (1 - remaining / total));
  };
  draw();

  $('#skipRest').addEventListener('click', stopRestTimer);
  $('#addRest').addEventListener('click', () => { remaining += 30; total += 30; draw(); });

  restInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      stopRestTimer();
      beep();
      toast('⏱ Pause vorbei – nächster Satz!');
    } else draw();
  }, 1000);
}

function stopRestTimer() {
  if (restInterval) clearInterval(restInterval);
  restInterval = null;
  $('#restTimer').classList.add('hidden');
}

function beep() {
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.6);
  } catch (e) { /* Ton nicht verfügbar */ }
}

// ---------- Abschluss / Reha / Zusammenfassung ----------

function promptRehab() {
  const anySet = session.exercises.some((e) => e.sets.some((s) => s.done));
  if (!anySet) { alert('Du hast noch keinen Satz abgehakt. Hake mindestens einen Satz ab (✓), bevor du abschließt.'); return; }
  stopRestTimer();

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
        pain: sEx.pain,
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
  const anyPain = log.exercises.some((e) => e.pain);
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
  $('#closeSummary').addEventListener('click', () => { hideOverlay(); switchTab('home'); });
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
  for (const w of PLAN.workouts) for (const ex of w.exercises) allEx.push({ ex, wk: w.key });
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
    '<div class="section-label">Daten</div>' +
    '<div class="card">' +
      '<p class="muted small">Deine Daten liegen nur auf diesem Gerät. Mach regelmäßig ein Backup!</p>' +
      '<div class="btn-row">' +
        '<button class="btn secondary" id="exportBtn">⬇︎ Backup exportieren</button>' +
        '<button class="btn secondary" id="importBtn">⬆︎ Backup laden</button>' +
      '</div>' +
      '<input type="file" id="importFile" accept="application/json" class="hidden">' +
    '</div>';

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

// ---------- Plan-Ansicht ----------

function renderPlanView() {
  const workouts = PLAN.workouts.map((w) => {
    const rows = w.exercises.map((ex) => {
      const target = ex.metric === 'time' ? ex.sets + '×' + ex.timeTarget + 's'
        : ex.metric === 'distance' ? ex.sets + '×' + ex.distTarget + 'm'
        : ex.sets + '×' + (ex.repsMin === ex.repsMax ? ex.repsMax : ex.repsMin + '–' + ex.repsMax);
      return '<div class="plan-ex"><div>' + esc(ex.name) + '<div class="px-muscle">' + esc(ex.muscle) +
        ' · ⏱ ' + fmtTime(ex.rest) + ' Pause' + (ex.note ? ' · ' + esc(ex.note) : '') + '</div></div><div class="px-sets">' + target + '</div></div>';
    }).join('');
    return '<details class="fold"><summary><span>' + esc(w.name) +
      '<span class="fold-duration"> · ⏱ ca. ' + fmtDuration(estimateWorkoutSeconds(w)) + '</span></span></summary>' +
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
}

// ---------- Service Worker ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ---------- Start ----------

render();
