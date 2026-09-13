// GymCoach – Intervall-Laufprogramm (Norwegisches 4×4)
//
// Warum ausgerechnet 4×4:
// Das Protokoll stammt von Ulrik Wisløffs Gruppe an der NTNU Trondheim. In der
// Originalstudie (2007) steigerte es die VO2max um rund 46 % stärker als ein
// gleich langes ruhiges Dauertraining. Vier Minuten bei 90–95 % der maximalen
// Herzfrequenz, dazwischen drei Minuten locker – nur 16 Minuten harte Arbeit.
//
// Warum das für Langlebigkeit zählt:
// Die Ausdauerleistung (VO2max) ist einer der stärksten bekannten Vorhersagewerte
// für die Gesamtsterblichkeit – stärker als Rauchen, Diabetes oder Bluthochdruck.
// Pro zusätzlichem MET (≈ 3,5 ml/kg/min) sinkt das Sterberisiko um etwa 13–15 %.
// In der Generation-100-Studie (1567 Personen, 70–77 Jahre, 5 Jahre) lag die
// Sterblichkeit in der Intervallgruppe bei 3 % gegenüber 6 % im moderaten Arm –
// der Unterschied war statistisch nicht gesichert, zeigt aber die Richtung.
//
// Aufbau statt Vollgas von Tag eins: Die Literatur empfiehlt 4–6 Wochen Anlauf,
// 2 Einheiten pro Woche mit mindestens 48 Stunden Abstand, und lieber eine
// Wiederholung weniger in guter Qualität als vier schlechte.

const RUN_WARMUP = 600;     // 10 Min einlaufen (60–70 % HFmax)
const RUN_COOLDOWN = 300;   // 5 Min auslaufen
const RUN_RECOVER = 180;    // 3 Min lockere Erholung – im Protokoll konstant
const RUN_LEVEL_SESSIONS = 2;  // saubere Einheiten je Stufe, dann geht es hoch

const RUN_LEVELS = [
  { level: 1, reps: 2, workSec: 120, name: '2 × 2 Min', note: 'Einstieg: Gefühl für das Tempo bekommen.' },
  { level: 2, reps: 3, workSec: 120, name: '3 × 2 Min', note: 'Eine Wiederholung mehr, gleiche Länge.' },
  { level: 3, reps: 3, workSec: 180, name: '3 × 3 Min', note: 'Erstmals drei Minuten am Stück.' },
  { level: 4, reps: 4, workSec: 180, name: '4 × 3 Min', note: 'Volle Anzahl, noch verkürzte Dauer.' },
  { level: 5, reps: 3, workSec: 240, name: '3 × 4 Min', note: 'Die Ziel-Länge – noch dreimal.' },
  { level: 6, reps: 4, workSec: 240, name: '4 × 4 Min', note: 'Das norwegische Protokoll in voller Form.', target: true },
];

function runLevelDef(level) {
  return RUN_LEVELS[Math.max(0, Math.min(RUN_LEVELS.length - 1, level - 1))];
}

// ---------- Herzfrequenz-Bereiche ----------
// Tanaka-Formel (208 − 0,7 × Alter): über 40 deutlich treffsicherer als 220 minus Alter.
// Bleibt eine Schätzung mit etwa ±10 Schlägen Streuung – der Sprechtest schlägt
// im Zweifel immer die Rechnung.

function maxHeartRate(state) {
  if (state.runHrMax) return state.runHrMax;             // selbst gemessen schlägt Formel
  const age = state.body && state.body.age;
  if (!age) return null;
  return Math.round(208 - 0.7 * age);
}

function hrZones(state) {
  const hrMax = maxHeartRate(state);
  if (!hrMax) return null;
  const p = (lo, hi) => Math.round(hrMax * lo) + '–' + Math.round(hrMax * hi);
  return { hrMax, work: p(0.9, 0.95), recover: p(0.6, 0.7), easy: p(0.6, 0.7) };
}

// Ohne Pulsgurt: der Sprechtest ist erstaunlich zuverlässig
const RUN_TALK = {
  work: 'Nur noch 2–3 Wörter am Stück möglich, Atmung sehr schwer',
  recover: 'Locker traben oder zügig gehen – Sprechen wieder möglich',
  easy: 'Ganze Sätze am Stück sprechen können',
};

// ---------- Einheiten ----------

function runIntervalSession(level) {
  const def = runLevelDef(level);
  const steps = [{ kind: 'warmup', label: 'Einlaufen', seconds: RUN_WARMUP }];
  for (let i = 0; i < def.reps; i++) {
    steps.push({ kind: 'work', label: 'Intervall ' + (i + 1) + ' von ' + def.reps, seconds: def.workSec });
    if (i < def.reps - 1) steps.push({ kind: 'recover', label: 'Erholung', seconds: RUN_RECOVER });
  }
  steps.push({ kind: 'cooldown', label: 'Auslaufen', seconds: RUN_COOLDOWN });
  return steps;
}

function runEasySession(minutes) {
  return [
    { kind: 'warmup', label: 'Locker antraben', seconds: 300 },
    { kind: 'easy', label: 'Ruhiger Dauerlauf', seconds: Math.max(600, (minutes - 10) * 60) },
    { kind: 'cooldown', label: 'Auslaufen', seconds: 300 },
  ];
}

// Cooper-Test: 12 Minuten so weit wie möglich laufen
function runTestSession() {
  return [
    { kind: 'warmup', label: 'Einlaufen', seconds: RUN_WARMUP },
    { kind: 'test', label: 'Cooper-Test: 12 Minuten', seconds: 720 },
    { kind: 'cooldown', label: 'Auslaufen', seconds: RUN_COOLDOWN },
  ];
}

function runSessionSteps(type, level, minutes) {
  if (type === 'easy') return runEasySession(minutes || 40);
  if (type === 'test') return runTestSession();
  return runIntervalSession(level);
}

function runSessionSeconds(type, level, minutes) {
  return runSessionSteps(type, level, minutes).reduce((s, x) => s + x.seconds, 0);
}

const RUN_PHASE_INFO = {
  warmup: { icon: '🚶', color: 'easy', hint: 'Ruhig einlaufen – der Körper braucht den Vorlauf, damit die Intervalle etwas bringen.', zone: 'recover' },
  work: { icon: '🔥', color: 'work', hint: 'Jetzt hart! Ab hier zählt jede Sekunde für deine VO2max.', zone: 'work' },
  recover: { icon: '💨', color: 'easy', hint: 'Weiterbewegen, nicht stehen bleiben. Der Puls soll sinken, aber nicht auf null.', zone: 'recover' },
  easy: { icon: '🌿', color: 'easy', hint: 'Gemütliches Tempo. Diese Einheiten bauen die Grundlage, auf der die Intervalle wirken.', zone: 'easy' },
  test: { icon: '⏱', color: 'work', hint: 'Gleichmäßig schnell laufen – am Ende zählt die Strecke. Nicht zu schnell starten!', zone: 'work' },
  cooldown: { icon: '🧊', color: 'easy', hint: 'Locker austraben, Puls runterfahren.', zone: 'recover' },
};

// ---------- VO2max aus dem Cooper-Test ----------

function cooperVo2max(meters) {
  if (!meters || meters < 500) return null;
  return Math.round(((meters - 504.9) / 44.73) * 10) / 10;
}

// Einordnung für Männer/Frauen nach Alter (grobe, gebräuchliche Richtwerte)
function vo2Rating(v, state) {
  if (v == null) return null;
  const age = (state.body && state.body.age) || 35;
  const w = state.body && state.body.sex === 'w';
  const base = w ? 38 : 44;                      // guter Wert um die 30
  const mid = base - Math.max(0, (age - 30)) * 0.25;
  if (v >= mid + 8) return { text: 'ausgezeichnet', cls: 'good' };
  if (v >= mid) return { text: 'gut', cls: 'good' };
  if (v >= mid - 6) return { text: 'durchschnittlich', cls: 'mid' };
  return { text: 'ausbaufähig', cls: 'low' };
}

function lastVo2Test(state) {
  const tests = (state.runLogs || []).filter((l) => l.type === 'test' && l.vo2max);
  return tests.length ? tests[tests.length - 1] : null;
}

// ---------- Stufen-Fortschritt ----------

function runLevelOf(state) {
  return Math.max(1, Math.min(RUN_LEVELS.length, state.runLevel || 1));
}

// Wie viele saubere Einheiten stehen auf der aktuellen Stufe schon?
function runSessionsAtLevel(state) {
  const lvl = runLevelOf(state);
  return (state.runLogs || []).filter((l) => l.type === 'interval' && l.level === lvl && l.feedback !== 'hard').length;
}

function runPoints(type, seconds) {
  const min = seconds / 60;
  const factor = type === 'easy' ? 1.8 : 3;
  return Math.max(30, Math.round((min * factor) / 5) * 5);
}

function daysSinceRun(state, type) {
  const logs = (state.runLogs || []).filter((l) => !type || l.type === type);
  if (!logs.length) return null;
  return Math.floor((Date.now() - new Date(logs[logs.length - 1].date).getTime()) / 86400000);
}

// ---------- Lauf-Coach ----------

function runCoach(state) {
  const logs = state.runLogs || [];
  const level = runLevelOf(state);
  const def = runLevelDef(level);
  const atLevel = runSessionsAtLevel(state);
  const sinceInterval = daysSinceRun(state, 'interval');
  const sinceAny = daysSinceRun(state);
  const test = lastVo2Test(state);

  if (!logs.length) {
    return {
      type: 'interval', level, tone: 'neutral',
      headline: 'Start auf Stufe 1: 2 × 2 Minuten',
      advice: 'Wir bauen dich in etwa sechs Wochen auf das volle 4×4 auf. Heute nur zwei harte Abschnitte à zwei Minuten – ' +
        'wichtiger als das Tempo ist, dass du danach denkst „das war machbar".',
    };
  }

  // Zwei harte Einheiten hintereinander gehen nach hinten los
  if (sinceInterval != null && sinceInterval < 2) {
    return {
      type: 'easy', level, tone: 'warn',
      headline: 'Heute locker laufen',
      advice: 'Dein letztes Intervalltraining ist erst ' + (sinceInterval === 0 ? 'von heute' : 'einen Tag her') +
        '. Zwischen zwei harten Einheiten sollten mindestens 48 Stunden liegen – ein ruhiger Dauerlauf bringt dich heute weiter.',
    };
  }

  // Standortbestimmung: am Anfang und dann etwa alle 8 Wochen
  const testAge = test ? Math.floor((Date.now() - new Date(test.date).getTime()) / 86400000) : null;
  const intervalCount = logs.filter((l) => l.type === 'interval').length;
  if ((!test && intervalCount >= 2) || (testAge != null && testAge >= 56)) {
    return {
      type: 'test', level, tone: 'neutral',
      headline: test ? 'Zeit für eine neue Standortbestimmung' : 'Miss deinen Ausgangswert',
      advice: '12 Minuten so weit laufen wie möglich – daraus schätzt die App deine VO2max. ' +
        (test ? 'Der letzte Test ist ' + testAge + ' Tage her; alle 8 Wochen zeigt sich der Fortschritt gut.'
              : 'So siehst du schwarz auf weiß, was das Training bringt.'),
    };
  }

  // Stufe geschafft?
  if (atLevel >= RUN_LEVEL_SESSIONS && level < RUN_LEVELS.length) {
    const next = runLevelDef(level + 1);
    return {
      type: 'interval', level: level + 1, levelUp: true, tone: 'good',
      headline: 'Stufe geschafft – hoch auf ' + next.name,
      advice: def.name + ' sitzt (' + atLevel + ' saubere Einheiten). ' + next.note +
        ' Wenn sich das zu früh anfühlt, bleib per Stufenwahl noch eine Einheit unten.',
    };
  }

  if (level === RUN_LEVELS.length && atLevel >= RUN_LEVEL_SESSIONS) {
    return {
      type: 'interval', level, tone: 'good',
      headline: 'Du bist beim vollen 4×4 angekommen 🏆',
      advice: 'Jetzt geht es nur noch ums Dranbleiben: zweimal pro Woche 4×4, dazwischen ruhige Läufe. ' +
        'Die VO2max-Gewinne zeigen sich nach etwa 8 Wochen deutlich.',
    };
  }

  if (sinceAny != null && sinceAny >= 14) {
    return {
      type: 'easy', level, tone: 'warn',
      headline: 'Erst mal wieder reinkommen',
      advice: 'Seit ' + sinceAny + ' Tagen kein Lauf. Steig mit einem ruhigen Dauerlauf ein, ' +
        'die Intervalle kommen bei der nächsten Einheit wieder dran.',
    };
  }

  return {
    type: 'interval', level, tone: 'neutral',
    headline: def.name + ' steht an',
    advice: def.note + ' Noch ' + Math.max(1, RUN_LEVEL_SESSIONS - atLevel) + ' saubere Einheit' +
      (RUN_LEVEL_SESSIONS - atLevel > 1 ? 'en' : '') + ' auf dieser Stufe, dann geht es eine Stufe höher.',
  };
}

// Erinnerung auf der Startseite
function runningDue(state) {
  const logs = state.runLogs || [];
  if (!logs.length) return (state.logs || []).length >= 3;
  return daysSinceRun(state) >= 6;
}

const RUN_QUOTES = [
  'Sechzehn harte Minuten, die dein Herz jahrelang stärker machen. 🫀',
  'VO2max ist der ehrlichste Langlebigkeits-Messwert – und du hast heute daran gearbeitet.',
  'Das war unangenehm. Genau deshalb wirkt es.',
  'Jedes Intervall ist eine Einzahlung auf ein Konto, von dem du mit 70 abhebst.',
  'Geschafft! Kein Training bringt fürs Herz mehr pro Minute als das hier.',
];
