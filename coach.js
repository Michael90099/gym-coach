// GymCoach – Progressions-Engine, Punkte, Level, Badges, Motivation

// ---------- Zeitschätzung ----------

const WARMUP_SEC = 8 * 60; // Aufwärmblock lt. Plan (Ergometer + Band-/Rotationsübungen)

function estimateSetWorkSeconds(ex) {
  if (ex.metric === 'time') return ex.timeTarget;
  if (ex.metric === 'distance') return ex.distTarget; // ~1 m/Sek. unter Last
  const reps = ex.repsMax || ex.repsMin || 10;
  return Math.round(reps * 3 + 8); // ~3 Sek./Wdh. kontrolliert + Rüstzeit
}

// Gesamtzeit für ein komplettes Training (inkl. Aufwärmen, Satz- und Übungswechsel-Pausen)
function estimateWorkoutSeconds(workout) {
  let total = WARMUP_SEC;
  const exs = workout.exercises;
  exs.forEach((ex, i) => {
    const setSec = estimateSetWorkSeconds(ex);
    total += setSec * ex.sets;
    total += (ex.sets - 1) * ex.rest; // Pausen zwischen den Sätzen derselben Übung
    if (i < exs.length - 1) total += Math.max(ex.rest, 120); // Übungswechsel-Pause
  });
  return total;
}

// Restzeit für ein laufendes Training, basierend auf noch offenen Sätzen
function estimateRemainingSeconds(session) {
  let total = 0;
  session.exercises.forEach((sEx, i) => {
    const ex = PLAN.exerciseById[sEx.id];
    const remaining = sEx.sets.filter((s) => !s.done).length;
    if (remaining === 0) return;
    total += estimateSetWorkSeconds(ex) * remaining;
    total += Math.max(0, remaining - 1) * ex.rest;
    if (i < session.exercises.length - 1) total += Math.max(ex.rest, 120);
  });
  return total;
}

function fmtDuration(totalSec) {
  const m = Math.max(1, Math.round(totalSec / 60));
  if (m < 60) return m + ' Min';
  const h = Math.floor(m / 60), rm = m % 60;
  return h + ' Std' + (rm ? ' ' + rm + ' Min' : '');
}

// ---------- Progression ----------

function roundToIncrement(value) {
  return Math.max(0, Math.round(value * 2) / 2); // auf 0,5 kg runden
}

// Empfehlung für die nächste Einheit einer Übung.
// Double Progression: erst Wiederholungen ans obere Ende bringen, dann Gewicht rauf.
// Schulterübungen: Steigerung erst nach 2 Einheiten in Folge am oberen Ende, jeweils schmerzfrei.
function getRecommendation(ex, history) {
  const last = history[0];

  if (!last) {
    return {
      weight: null,
      firstTime: true,
      increase: false,
      message: ex.metric === 'weight'
        ? 'Erstes Mal – wähle ein Gewicht, mit dem du das obere Wiederholungsende sauber schaffst (1–2 Wdh im Tank).'
        : 'Erstes Mal – Technik zuerst, Zielvorgabe entspannt angehen.',
    };
  }

  const lastWeight = maxWeight(last.sets);

  // Schmerz beim letzten Mal -> deutlich zurück, keine Steigerung
  if (last.pain) {
    if (ex.metric === 'weight' && lastWeight != null) {
      const reduced = roundToIncrement(lastWeight * 0.85, ex.increment);
      return {
        weight: reduced,
        increase: false,
        caution: true,
        message: `Letztes Mal stechender Schmerz. Heute mit ca. ${fmtW(reduced)} kg (−15 %) sauber und kontrolliert. Wird es wieder stechend: Übung heute auslassen.`,
      };
    }
    return { weight: null, increase: false, caution: true, message: 'Letztes Mal Schmerzen – heute bewusst leicht und kontrolliert. Bei stechendem Schmerz sofort abbrechen.' };
  }

  const topReached = hitTopOfRange(ex, last.sets, last.sets.length >= ex.sets);

  if (ex.metric === 'time') {
    const best = Math.max(...last.sets.map((s) => s.value || 0));
    const target = topReached ? best + ex.increment : Math.max(best, ex.timeTarget);
    return { weight: null, increase: topReached, message: topReached ? `Stark! Heute Ziel: ${target} Sekunden pro Satz.` : `Ziel heute: ${target} Sekunden halten – letzte Bestzeit ${best}s.` };
  }

  if (ex.metric === 'distance') {
    const w = lastWeight;
    if (topReached && w != null) {
      const next = roundToIncrement(w + ex.increment, ex.increment);
      return { weight: next, increase: true, message: `Alle ${ex.sets}×${ex.distTarget} m geschafft – heute ${fmtW(next)} kg pro Hand! 💪` };
    }
    return { weight: w, increase: false, message: `Heute wieder ${fmtW(w)} kg – Ziel: ${ex.sets}×${ex.distTarget} m mit stabilem Rumpf.` };
  }

  if (ex.metric === 'reps') {
    const best = Math.max(...last.sets.map((s) => s.reps || 0));
    if (topReached) {
      return { weight: null, increase: true, message: `Obergrenze erreicht – heute ${best + ex.increment} Wiederholungen pro Satz anpeilen!` };
    }
    return { weight: null, increase: false, message: `Ziel heute: alle Sätze auf ${ex.repsMax} Wiederholungen bringen (zuletzt max. ${best}).` };
  }

  // metric === 'weight'
  if (lastWeight == null) return { weight: null, increase: false, message: 'Trage heute dein Gewicht ein, dann kann ich dich beim nächsten Mal coachen.' };

  const isShoulder = ex.group === 'shoulder';
  let readyToIncrease = topReached;

  if (isShoulder && topReached) {
    // Konservativ: auch die vorletzte Einheit muss oben und schmerzfrei gewesen sein
    const prev = history[1];
    readyToIncrease = !!prev && !prev.pain && hitTopOfRange(ex, prev.sets, prev.sets.length >= ex.sets) && maxWeight(prev.sets) >= lastWeight;
  }

  if (readyToIncrease) {
    const next = roundToIncrement(lastWeight + ex.increment, ex.increment);
    return {
      weight: next,
      increase: true,
      message: isShoulder
        ? `Zwei saubere, schmerzfreie Einheiten – heute vorsichtig auf ${fmtW(next)} kg. Kontrolle vor Gewicht!`
        : `Letztes Mal alle Sätze am oberen Ende – heute ${fmtW(next)} kg! 💪`,
    };
  }

  if (topReached && isShoulder) {
    return { weight: lastWeight, increase: false, message: `Stark! Noch einmal ${fmtW(lastWeight)} kg schmerzfrei bestätigen, dann geht's beim nächsten Mal hoch.` };
  }

  const worst = Math.min(...last.sets.map((s) => s.reps || 0));
  return {
    weight: lastWeight,
    increase: false,
    message: `Heute ${fmtW(lastWeight)} kg – bring alle ${ex.sets} Sätze auf ${ex.repsMax} Wiederholungen (zuletzt min. ${worst}).`,
  };
}

function hitTopOfRange(ex, doneSets, allSetsDone) {
  if (!allSetsDone || doneSets.length === 0) return false;
  if (ex.metric === 'time') return doneSets.every((s) => (s.value || 0) >= ex.timeTarget);
  if (ex.metric === 'distance') return doneSets.every((s) => (s.value || 0) >= ex.distTarget);
  return doneSets.every((s) => (s.reps || 0) >= ex.repsMax);
}

function maxWeight(sets) {
  const ws = sets.map((s) => s.weight).filter((w) => typeof w === 'number' && !isNaN(w));
  return ws.length ? Math.max(...ws) : null;
}

function fmtW(w) {
  return w == null ? '–' : (Math.round(w * 2) / 2).toString().replace('.', ',');
}

// ---------- Punkte ----------

const POINTS = {
  set: 10,
  workoutComplete: 50,
  warmup: 20,
  rehab: 30,
  increase: 25,   // pro Übung, bei der gesteigert wurde
  painFree: 15,
};

function scoreWorkout(log, prevLogsForPR) {
  let pts = 0;
  const details = [];
  let setCount = 0;
  let increases = 0;

  for (const ex of log.exercises) {
    const done = ex.sets.filter((s) => s.done);
    setCount += done.length;
    if (ex.increased) increases++;
  }
  pts += setCount * POINTS.set;
  details.push({ label: `${setCount} Sätze geloggt`, pts: setCount * POINTS.set });

  const allDone = log.exercises.every((ex) => ex.sets.filter((s) => s.done).length >= (PLAN.exerciseById[ex.id]?.sets || 0));
  if (allDone && setCount > 0) { pts += POINTS.workoutComplete; details.push({ label: 'Training komplett', pts: POINTS.workoutComplete }); }

  if (log.warmupDone) { pts += POINTS.warmup; details.push({ label: 'Aufwärmen erledigt', pts: POINTS.warmup }); }
  if (log.rehabDone) { pts += POINTS.rehab; details.push({ label: 'Reha-Block erledigt', pts: POINTS.rehab }); }

  if (increases > 0) { pts += increases * POINTS.increase; details.push({ label: `${increases}× gesteigert 🔥`, pts: increases * POINTS.increase }); }

  const anyPain = log.exercises.some((ex) => ex.pain);
  if (!anyPain && setCount > 0) { pts += POINTS.painFree; details.push({ label: 'Komplett schmerzfrei', pts: POINTS.painFree }); }

  return { pts, details };
}

// ---------- Level ----------

const LEVELS = [
  { pts: 0, name: 'Rookie', icon: '🌱' },
  { pts: 400, name: 'Aufsteiger', icon: '📈' },
  { pts: 1000, name: 'Eisenbieger', icon: '🔩' },
  { pts: 2000, name: 'Kraftpaket', icon: '💪' },
  { pts: 3500, name: 'Maschine', icon: '⚙️' },
  { pts: 5500, name: 'Beast', icon: '🦍' },
  { pts: 8500, name: 'Titan', icon: '⚡' },
  { pts: 13000, name: 'Legende', icon: '👑' },
];

function getLevel(points) {
  let lvl = LEVELS[0], next = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].pts) { lvl = LEVELS[i]; next = LEVELS[i + 1] || null; }
  }
  const progress = next ? (points - lvl.pts) / (next.pts - lvl.pts) : 1;
  return { ...lvl, level: LEVELS.indexOf(lvl) + 1, next, progress };
}

// ---------- Streak (Wochen mit >= weeklyGoal Trainings) ----------

function isoWeek(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const wk = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

function weekCounts(logs) {
  const counts = {};
  for (const log of logs) {
    const wk = isoWeek(log.date);
    counts[wk] = (counts[wk] || 0) + 1;
  }
  return counts;
}

function getStreak(state) {
  const counts = weekCounts(state.logs);
  const goal = PLAN.weeklyGoal;
  const thisWeek = isoWeek(new Date().toISOString());
  const thisWeekCount = counts[thisWeek] || 0;

  // Rückwärts über die Vorwochen zählen; die laufende Woche zählt, sobald das Ziel erreicht ist,
  // bricht den Streak aber noch nicht (sie ist ja noch nicht vorbei).
  let streak = thisWeekCount >= goal ? 1 : 0;
  const d = new Date();
  for (let i = 1; i < 500; i++) {
    d.setDate(d.getDate() - 7);
    const wk = isoWeek(d.toISOString());
    if ((counts[wk] || 0) >= goal) streak++;
    else break;
  }
  return { streak, thisWeekCount, goal };
}

// ---------- Badges ----------

const BADGES = [
  { id: 'first_workout', name: 'Erster Schritt', icon: '🎬', desc: 'Erstes Training abgeschlossen' },
  { id: 'first_increase', name: 'Erste Steigerung', icon: '📈', desc: 'Zum ersten Mal Gewicht erhöht' },
  { id: 'workouts_10', name: 'Zehnkämpfer', icon: '🔟', desc: '10 Trainings abgeschlossen' },
  { id: 'workouts_25', name: 'Dauerbrenner', icon: '🔥', desc: '25 Trainings abgeschlossen' },
  { id: 'workouts_50', name: 'Halbes Hundert', icon: '🏆', desc: '50 Trainings abgeschlossen' },
  { id: 'streak_4', name: '4-Wochen-Streak', icon: '⚡', desc: '4 Wochen in Folge das Wochenziel erreicht' },
  { id: 'streak_8', name: '8-Wochen-Streak', icon: '🌋', desc: '8 Wochen in Folge – Impingement-Zeitfenster geknackt!' },
  { id: 'streak_12', name: 'Quartals-König', icon: '👑', desc: '12 Wochen in Folge dran geblieben' },
  { id: 'rehab_10', name: 'Reha-Profi', icon: '🩹', desc: '10× den Reha-Block absolviert' },
  { id: 'painfree_5', name: 'Schmerzfrei-Serie', icon: '😌', desc: '5 schmerzfreie Trainings in Folge' },
  { id: 'increases_10', name: 'Progressions-Maschine', icon: '🚀', desc: '10 Gewichtssteigerungen gesammelt' },
  { id: 'abc_complete', name: 'A-B-C komplett', icon: '🔤', desc: 'Alle drei Trainings mindestens einmal absolviert' },
];

function checkBadges(state) {
  const earned = [];
  const has = (id) => state.badges.includes(id);
  const grant = (id) => { if (!has(id)) { state.badges.push(id); earned.push(BADGES.find((b) => b.id === id)); } };

  const n = state.logs.length;
  if (n >= 1) grant('first_workout');
  if (n >= 10) grant('workouts_10');
  if (n >= 25) grant('workouts_25');
  if (n >= 50) grant('workouts_50');

  const totalIncreases = state.logs.reduce((sum, l) => sum + l.exercises.filter((e) => e.increased).length, 0);
  if (totalIncreases >= 1) grant('first_increase');
  if (totalIncreases >= 10) grant('increases_10');

  const { streak } = getStreak(state);
  if (streak >= 4) grant('streak_4');
  if (streak >= 8) grant('streak_8');
  if (streak >= 12) grant('streak_12');

  if (state.rehabCount >= 10) grant('rehab_10');

  let painFreeRun = 0;
  for (let i = state.logs.length - 1; i >= 0; i--) {
    if (state.logs[i].exercises.some((e) => e.pain)) break;
    painFreeRun++;
  }
  if (painFreeRun >= 5) grant('painfree_5');

  const keys = new Set(state.logs.map((l) => l.workoutKey));
  if (keys.has('A') && keys.has('B') && keys.has('C')) grant('abc_complete');

  return earned;
}

// ---------- Motivation ----------

const QUOTES = {
  start: [
    'Zeit, Eisen zu biegen. Deine Schulter wird es dir danken! 💪',
    'Jede Einheit bringt dich näher an die schmerzfreie Schulter.',
    'Der schwerste Satz ist der erste Schritt durch die Tür – und den hast du geschafft.',
    'Heute wieder ein Stück stärker als gestern.',
    'Konstanz schlägt Intensität. Los geht\'s!',
  ],
  finishStrong: [
    'BOOM! Training im Kasten. So baut man eine unzerstörbare Schulter! 🔥',
    'Stark durchgezogen! Dein zukünftiges Ich klatscht gerade Beifall.',
    'Wieder ein Baustein mehr für die schmerzfreie Schulter. Weiter so!',
    'Sauber! Genau diese Konstanz macht in 8–12 Wochen den Unterschied.',
  ],
  finishIncrease: [
    'GEWICHT GESTEIGERT! Das ist Progression, wie sie im Buche steht! 🚀',
    'Stärker als letzte Woche – mehr kann man an einem Tag nicht gewinnen.',
    'Die Rotatorenmanschette sagt danke: stärker UND kontrolliert. 💪',
  ],
  finishPain: [
    'Gut, dass du auf deinen Körper gehört hast. Schmerz managen ist auch Training.',
    'Kluges Training! Zurückschrauben heute = schneller schmerzfrei morgen.',
  ],
  comeback: [
    'Willkommen zurück! Wiedereinstieg ist der härteste Satz – erledigt. 💪',
    'Zurück am Eisen! Genau richtig: dranbleiben statt perfekt sein.',
  ],
  streak: [
    'Deine Streak brennt! 🔥 Konstanz ist deine Superkraft.',
    'Woche für Woche – so sehen 8–12 Wochen Erfolg aus!',
  ],
};

function pickQuote(list) {
  return list[Math.floor(Math.random() * list.length)];
}
