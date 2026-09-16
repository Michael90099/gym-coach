// GymCoach – Der Coach über allem: was heute dran ist und wie die Woche aufgeht
//
// Zwei Fragen beantwortet dieses Modul, beide mit belegten Zahlen:
//
// 1. Wie oft Intervalle?
//    Zwei bis drei 4×4-Einheiten pro Woche bringen die deutlichsten VO2max-Gewinne;
//    von zwei auf drei kommt kaum noch etwas dazu (zweimal: rund +11 %, dreimal:
//    rund +14 % – bei deutlich mehr Belastung). Einmal pro Woche verbessert wenig,
//    hält ein erreichtes Niveau aber. Zwischen zwei harten Einheiten mindestens 48 Stunden.
//    → Ziel: 2× pro Woche. Minimum, damit es überhaupt etwas bringt: 1×.
//
// 2. Wie kombiniert man Kraft und Ausdauer?
//    Der gefürchtete "Interferenzeffekt" ist nach neueren Übersichtsarbeiten deutlich
//    kleiner als lange angenommen: Ob gleiche Einheit, gleicher Tag oder getrennte Tage
//    machte für Kraftzuwachs und Muskelaufbau kaum einen Unterschied. Zwei Dinge gelten
//    trotzdem:
//      – In derselben Einheit zuerst Kraft, dann Ausdauer (Ermüdung senkt sonst die
//        neuromuskuläre Ansteuerung).
//      – Für die Ausdauer selbst sind getrennte Einheiten am besten.
//    Der praktisch wichtigste Punkt ist gar nicht die Interferenz, sondern die QUALITÄT:
//    Mit müden Beinen vom Vortag erreichst du die 90–95 % der maximalen Herzfrequenz
//    nicht mehr – und genau die sind der ganze Wirkstoff des 4×4.

const WEEK_TARGETS_DEFAULT = { strength: 3, interval: 2, mobility: 3 };

function weekTargets(state) {
  return {
    strength: state.weeklyGoal || WEEK_TARGETS_DEFAULT.strength,
    interval: state.runGoal || WEEK_TARGETS_DEFAULT.interval,
    mobility: mobilityGoalOf(state),
  };
}

const KIND_INFO = {
  strength: { label: 'Krafttraining', icon: '🏋️', tab: 'home', hard: true },
  interval: { label: 'Intervalle', icon: '🔥', tab: 'running', hard: true },
  easy: { label: 'Ruhiger Lauf', icon: '🌿', tab: 'running', hard: false },
  mobility: { label: 'Dehnen', icon: '🧘', tab: 'mobility', hard: false },
  rest: { label: 'Ruhetag', icon: '😴', tab: null, hard: false },
};

// Alle Trainingsarten eines bestimmten Tages (0 = heute, -1 = gestern)
function trainingOn(state, dayOffset) {
  const t = new Date();
  t.setDate(t.getDate() + dayOffset);
  const d = t.toDateString();
  const kinds = [];
  if ((state.logs || []).some((l) => new Date(l.date).toDateString() === d)) kinds.push('strength');
  for (const r of state.runLogs || []) {
    if (new Date(r.date).toDateString() === d) kinds.push(r.type === 'easy' ? 'easy' : 'interval');
  }
  if ((state.mobilityLogs || []).some((l) => new Date(l.date).toDateString() === d)) kinds.push('mobility');
  return kinds;
}

function hadHardOn(state, dayOffset) {
  return trainingOn(state, dayOffset).some((k) => KIND_INFO[k] && KIND_INFO[k].hard);
}

// Zählt, was diese Woche (ab Montag) schon erledigt ist
function weekTally(state) {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const inWeek = (d) => new Date(d) >= monday;
  const t = { strength: 0, interval: 0, easy: 0, mobility: 0 };
  for (const l of state.logs || []) if (inWeek(l.date)) t.strength++;
  for (const r of state.runLogs || []) if (inWeek(r.date)) t[r.type === 'easy' ? 'easy' : 'interval']++;
  for (const m of state.mobilityLogs || []) if (inWeek(m.date)) t.mobility++;
  return t;
}

function daysSinceKind(state, kind) {
  for (let i = 0; i < 30; i++) {
    if (trainingOn(state, -i).includes(kind)) return i;
  }
  return null;
}

// ---------- Die Empfehlung für heute ----------

function overallCoach(state) {
  const targets = weekTargets(state);
  const tally = weekTally(state);
  const today = trainingOn(state, 0);
  const yesterday = trainingOn(state, -1);
  const oura = typeof ouraGuidance === 'function' ? ouraGuidance(state) : null;
  const warnings = [];

  const sinceInterval = daysSinceKind(state, 'interval');
  const sinceStrength = daysSinceKind(state, 'strength');
  const offen = {
    strength: Math.max(0, targets.strength - tally.strength),
    interval: Math.max(0, targets.interval - tally.interval),
    mobility: Math.max(0, targets.mobility - tally.mobility),
  };

  const rec = (kind, headline, advice, tone) => ({
    kind, headline, advice, tone: tone || 'neutral',
    action: KIND_INFO[kind], targets, tally, offen, warnings,
  });

  // 1. Erholung geht vor – der Ring hat das letzte Wort
  if (oura && !oura.allowHard) {
    return rec('mobility', oura.band.icon + ' Bereitschaft ' + oura.score + ' – heute nichts Hartes',
      oura.advice + ' Dehnen hält dich im Rhythmus, ohne Erholung zu kosten.',
      oura.score < 60 ? 'warn' : 'neutral');
  }

  // 2. Heute schon hart trainiert?
  if (today.some((k) => KIND_INFO[k].hard)) {
    const gemacht = today.map((k) => KIND_INFO[k].label).join(' und ');
    if (!today.includes('mobility')) {
      return rec('mobility', '✅ ' + gemacht + ' erledigt',
        'Für heute reicht die harte Arbeit. Wenn noch Luft ist: zehn Minuten dehnen – direkt nach dem Training ist der beste Zeitpunkt dafür.', 'good');
    }
    return rec('rest', '✅ Alles erledigt für heute',
      gemacht + ' und gedehnt. Jetzt zählt Essen und Schlafen – da passiert der eigentliche Aufbau.', 'good');
  }

  // 3. Nichts mehr offen? Dann ist das die Nachricht – Warnungen wären hier sinnlos
  if (!offen.strength && !offen.interval && !offen.mobility) {
    return rec('rest', '🏆 Wochenziel komplett erfüllt',
      'Kraft ' + tally.strength + '/' + targets.strength + ', Intervalle ' + tally.interval + '/' + targets.interval +
      ', Dehnen ' + tally.mobility + '/' + targets.mobility + '. Alles Weitere ist Bonus – ' +
      'Erholung ist ab hier wertvoller als noch eine Einheit.', 'good');
  }

  // 4. Zwei harte Tage in Folge liegen schon hinter dir
  if (hadHardOn(state, -1) && hadHardOn(state, -2)) {
    warnings.push('Zwei harte Tage hintereinander – heute ist Erholung dran.');
    return rec(offen.mobility > 0 ? 'mobility' : 'easy', '🛟 Heute bewusst locker',
      'Gestern und vorgestern hart trainiert. Ein dritter harter Tag in Folge bringt nichts mehr – ' +
      'der Aufbau passiert in der Erholung. Dehnen oder ein ruhiger Dauerlauf.', 'warn');
  }

  // 5. Der Kernpunkt: Intervalle nach Krafttraining vom Vortag
  //    Nicht wegen "Interferenz" – sondern weil müde Beine die nötigen 90–95 % HFmax
  //    nicht mehr hergeben und die Einheit damit ihren Wirkstoff verliert.
  const gesternKraft = yesterday.includes('strength');
  if (gesternKraft && offen.interval > 0) {
    warnings.push('Gestern Krafttraining – Intervalle heute nur in halber Qualität.');
    return rec(offen.mobility > 0 ? 'mobility' : 'easy', '🦵 Heute keine Intervalle',
      'Gestern hast du Beine trainiert. Mit müden Beinen erreichst du die 90–95 % der maximalen Herzfrequenz ' +
      'nicht mehr – und genau die sind der ganze Wirkstoff des 4×4. Heute ruhig laufen oder dehnen, ' +
      'morgen sind die Intervalle richtig stark.', 'warn');
  }

  // 6. Mindestabstand zwischen zwei Intervalleinheiten
  if (sinceInterval != null && sinceInterval < 2 && offen.interval > 0) {
    return rec('easy', '⏳ Noch zu früh für die nächsten Intervalle',
      'Zwischen zwei harten Laufeinheiten sollten mindestens 48 Stunden liegen. Heute ein ruhiger Dauerlauf – ' +
      'der ist keine Notlösung, sondern die Grundlage, auf der die Intervalle überhaupt wirken.', 'neutral');
  }

  // 7. Was liegt am weitesten zurück? Kraft hat bei Rekomposition leichten Vorrang
  const intervalDringend = offen.interval > 0 && (sinceInterval == null || sinceInterval >= 4);
  if (intervalDringend) {
    return rec('interval', '🔥 Heute sind die Intervalle dran',
      (sinceInterval == null ? 'Noch keine Intervalleinheit.' : 'Letzte Intervalle vor ' + sinceInterval + ' Tagen.') +
      ' Zwei pro Woche bringen die deutlichsten VO2max-Gewinne – das ist der stärkste Einzelhebel für ein langes Leben.');
  }

  if (offen.strength > 0 && (sinceStrength == null || sinceStrength >= 1)) {
    const w = typeof suggestedWorkoutKey === 'function' ? suggestedWorkoutKey() : null;
    return rec('strength', '🏋️ Krafttraining' + (w ? ' ' + w : '') + ' steht an',
      'Diese Woche ' + tally.strength + ' von ' + targets.strength + ' Einheiten. ' +
      'Muskeln sind dein Schutz gegen Alterung – und die Basis deiner Rekomposition.');
  }

  if (offen.interval > 0) {
    return rec('interval', '🔥 Intervalle offen',
      'Diese Woche ' + tally.interval + ' von ' + targets.interval + '. Zwei Einheiten pro Woche sind das Ziel; ' +
      'ab der zweiten wird der Zugewinn deutlich kleiner.');
  }

  if (offen.mobility > 0) {
    return rec('mobility', '🧘 Dehnen ist dran',
      'Kraft und Ausdauer sitzen diese Woche. Jetzt die Beweglichkeit – ' +
      'genau der Teil, der bei dir Schulter und Hohlkreuz betrifft.');
  }

  // Fällt nichts davon zu – ruhiger Lauf als sinnvolle Grundlage
  return rec('easy', '🌿 Heute ein ruhiger Dauerlauf',
    'Nichts Dringendes offen. Ruhige Läufe sind kein Lückenfüller: Sie bauen die Grundlage, ' +
    'auf der die harten Einheiten überhaupt wirken.');
}

// ---------- Wochenvorschlag ----------
// Kein starrer Plan, sondern ein Muster: harte Tage verteilt, nie drei am Stück,
// 48 Stunden zwischen den Intervallen.

function weekTemplate(state) {
  const t = weekTargets(state);
  const tage = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  let plan;
  if (t.strength >= 3 && t.interval >= 2) {
    plan = ['strength', 'easy', 'interval', 'strength', 'mobility', 'strength', 'interval'];
  } else if (t.strength >= 3) {
    plan = ['strength', 'mobility', 'interval', 'strength', 'mobility', 'strength', 'rest'];
  } else if (t.interval >= 2) {
    plan = ['strength', 'easy', 'interval', 'mobility', 'strength', 'interval', 'rest'];
  } else {
    plan = ['strength', 'mobility', 'interval', 'rest', 'strength', 'mobility', 'rest'];
  }
  return tage.map((tag, i) => ({ tag, kind: plan[i] }));
}

// Antwort auf "wie oft bringt was" – als Text für die App
const FREQUENCY_FACTS = [
  { titel: 'Intervalle: 2× pro Woche ist das Ziel',
    text: 'Zwei bis drei 4×4-Einheiten pro Woche bringen die deutlichsten VO2max-Gewinne. Von zwei auf drei kommt kaum noch etwas dazu – ' +
      'zweimal wöchentlich rund +11 %, dreimal rund +14 %, bei deutlich mehr Belastung und Verletzungsrisiko.' },
  { titel: 'Minimum: 1× pro Woche',
    text: 'Einmal wöchentlich verbessert die VO2max kaum noch, hält ein erreichtes Niveau aber zuverlässig. ' +
      'In Wochen mit wenig Zeit ist eine Einheit also klar besser als keine.' },
  { titel: 'Immer mindestens 48 Stunden Abstand',
    text: 'Zwischen zwei Intervalleinheiten brauchst du zwei Tage. Dazwischen passen ruhige Dauerläufe – ' +
      'die sind kein Lückenfüller, sondern die Grundlage, auf der die harten Einheiten wirken.' },
  { titel: 'Kraft und Ausdauer stören sich weniger als gedacht',
    text: 'Neuere Übersichtsarbeiten zeigen: Ob gleiche Einheit, gleicher Tag oder getrennte Tage – für Kraftzuwachs und ' +
      'Muskelaufbau machte es kaum einen Unterschied. Die alte Angst vor dem "Interferenzeffekt" war übertrieben.' },
  { titel: 'Worauf es wirklich ankommt: Qualität',
    text: 'Das eigentliche Problem ist nicht Interferenz, sondern Müdigkeit. Mit schweren Beinen vom Vortag erreichst du die ' +
      '90–95 % der maximalen Herzfrequenz nicht mehr – und genau die sind der Wirkstoff. Deshalb: nach Beintraining keine Intervalle am Folgetag.' },
  { titel: 'In einer Einheit: zuerst Kraft, dann Ausdauer',
    text: 'Wenn beides an einem Tag zusammenfällt, zuerst die Gewichte. Ausdauer davor ermüdet die Ansteuerung und kostet dich Kraftzuwachs. ' +
      'Besser noch: sechs Stunden Abstand oder getrennte Tage.' },
];
