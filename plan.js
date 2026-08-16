// GymCoach – Trainingsplan-Daten
// Ganzkörperplan mit Fokus Schulter-Impingement (2–3x/Woche, Rotation A -> B -> C)

const PLAN = {
  weeklyGoal: 3,       // Standard; über die Einstellungen auf 2 änderbar

  warmup: [
    { id: 'wu_cardio', name: '5 Min Ergometer oder Laufband' },
    { id: 'wu_circles', name: 'Schulterkreisen' },
    { id: 'wu_pullapart', name: 'Band Pull Aparts – 2×20' },
    { id: 'wu_facepull', name: 'Face Pulls leicht – 2×15' },
    { id: 'wu_extrot', name: 'Außenrotation Gummiband – 2×15' },
  ],

  rehab: [
    { id: 'rh_facepulls', name: 'Face Pulls – 3×15' },
    { id: 'rh_extrot', name: 'Außenrotation am Kabel – 3×15' },
    { id: 'rh_pullapart', name: 'Band Pull Apart – 3×20' },
    { id: 'rh_wallslides', name: 'Wall Slides – 3×15' },
    { id: 'rh_serratus', name: 'Serratus Push-ups – 3×12' },
    { id: 'rh_stretch_chest', name: 'Dehnung Brustmuskel – 2×30 Sek' },
    { id: 'rh_stretch_lat', name: 'Dehnung Latissimus – 2×30 Sek' },
  ],

  // metric: 'weight' (Gewicht+Wdh) | 'reps' (nur Wdh) | 'time' (Sekunden) | 'distance' (Meter, mit Gewicht)
  // group: 'main' (Grundübung) | 'shoulder' (Schulter/Reha -> konservative Steigerung) | 'core'
  // painCheck: nach der Übung nach Schulterschmerz fragen
  // perHand: Gewicht wird pro Hand/Arm eingetragen, nicht als Gesamtgewicht
  // Wiederholungs-Spannen folgen den Intensitätsregeln: 8–12 bei Grundübungen,
  // 12–20 bei Schulter-/Rehaübungen. Erst Wdh. bis ans obere Ende, dann Gewicht rauf.
  workouts: [
    {
      key: 'A',
      name: 'Ganzkörper A',
      exercises: [
        { id: 'a_beinpresse', ramp: true, name: 'Beinpresse', muscle: 'Beine', sets: 3, repsMin: 10, repsMax: 12, metric: 'weight', group: 'main', increment: 5 },
        { id: 'a_rdl', ramp: true, name: 'Rumänisches Kreuzheben', muscle: 'Beine', sets: 3, repsMin: 8, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'a_waden', name: 'Wadenheben', muscle: 'Beine', sets: 3, repsMin: 15, repsMax: 20, metric: 'weight', group: 'main', increment: 5 },
        { id: 'a_rudern', ramp: true, name: 'Brustgestütztes Rudern', muscle: 'Rücken', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'a_latzug', ramp: true, name: 'Latziehen neutraler Griff', muscle: 'Rücken', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'a_facepulls', name: 'Face Pulls', muscle: 'Rücken', sets: 3, repsMin: 15, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 2.5, painCheck: true },
        { id: 'a_brustpresse', ramp: true, name: 'Maschinen-Brustpresse', muscle: 'Brust', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5, painCheck: true, note: 'Ellbogen ca. 45° – nicht weit ausfahren' },
        { id: 'a_seitheben', name: 'Seitheben', muscle: 'Schulter', sets: 3, repsMin: 12, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 1, perHand: true, painCheck: true, note: 'Nur bis Schulterhöhe, kontrolliert' },
        { id: 'a_extrot', name: 'Außenrotation Kabel', muscle: 'Schulter', sets: 3, repsMin: 12, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 1, painCheck: true },
        { id: 'a_hammercurls', name: 'Hammer Curls', muscle: 'Arme', sets: 2, repsMin: 10, repsMax: 15, metric: 'weight', group: 'main', increment: 2, perHand: true },
        { id: 'a_trizeps', name: 'Trizeps Seil', muscle: 'Arme', sets: 2, repsMin: 10, repsMax: 15, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'a_plank', name: 'Plank', muscle: 'Core', sets: 3, timeTarget: 40, metric: 'time', group: 'core', increment: 5 },
        { id: 'a_deadbug', name: 'Dead Bug', muscle: 'Core', sets: 3, repsMin: 10, repsMax: 15, metric: 'reps', group: 'core', increment: 2 },
      ],
    },
    {
      key: 'B',
      name: 'Ganzkörper B',
      exercises: [
        { id: 'b_splitsquat', ramp: true, name: 'Bulgarian Split Squat', muscle: 'Beine', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2, perHand: true,
          variantNote: 'Original – am anspruchsvollsten, viel Gleichgewicht nötig',
          alternatives: [
            { id: 'b_walking_lunges', ramp: true, name: 'Ausfallschritte im Gehen', muscle: 'Beine', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2, perHand: true,
              note: 'Wiederholungen pro Bein · Oberkörper aufrecht',
              variantNote: 'Kommt dem Split Squat am nächsten, aber leichter zu stabilisieren' },
            { id: 'b_reverse_lunges', ramp: true, name: 'Rückwärts-Ausfallschritte', muscle: 'Beine', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2, perHand: true,
              note: 'Am Stand · Wiederholungen pro Bein',
              variantNote: 'Knieschonend und braucht kaum Platz' },
          ] },
        { id: 'b_beinbeuger', name: 'Beinbeuger Maschine', muscle: 'Beine', sets: 3, repsMin: 10, repsMax: 15, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'b_beinstrecker', name: 'Beinstrecker', muscle: 'Beine', sets: 2, repsMin: 12, repsMax: 20, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'b_kabelrudern', ramp: true, name: 'Kabelrudern', muscle: 'Rücken', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'b_revbutterfly', name: 'Reverse Butterfly', muscle: 'Rücken', sets: 3, repsMin: 12, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 2.5, painCheck: true },
        { id: 'b_liegestuetze', name: 'Liegestütze (Multipresse/erhöht)', muscle: 'Brust', sets: 3, repsMin: 10, repsMax: 15, metric: 'reps', group: 'main', increment: 1, painCheck: true },
        { id: 'b_yraises', name: 'Y-Raises', muscle: 'Schulter', sets: 3, repsMin: 12, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 1, perHand: true, painCheck: true },
        { id: 'b_scaption', name: 'Scaption Raises (30° vor)', muscle: 'Schulter', sets: 3, repsMin: 12, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 1, perHand: true, painCheck: true },
        { id: 'b_szcurls', name: 'SZ-Curls', muscle: 'Arme', sets: 2, repsMin: 10, repsMax: 15, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'b_trizeps', name: 'Trizeps Seildrücken', muscle: 'Arme', sets: 2, repsMin: 10, repsMax: 15, metric: 'weight', group: 'main', increment: 2.5, note: 'Overhead nur wenn komplett schmerzfrei' },
        { id: 'b_pallof', name: 'Pallof Press', muscle: 'Core', sets: 3, repsMin: 10, repsMax: 15, metric: 'weight', group: 'core', increment: 2.5 },
        { id: 'b_kneeraises', name: 'Hanging Knee Raises', muscle: 'Core', sets: 3, repsMin: 8, repsMax: 15, metric: 'reps', group: 'core', increment: 2 },
      ],
    },
    {
      key: 'C',
      name: 'Ganzkörper C',
      exercises: [
        { id: 'c_kniebeuge', ramp: true, name: 'Kniebeugen / Hackenschmidt', muscle: 'Beine', sets: 3, repsMin: 6, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'c_hipthrust', ramp: true, name: 'Hip Thrust', muscle: 'Beine', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 5 },
        { id: 'c_latzug_eng', ramp: true, name: 'Latziehen eng', muscle: 'Rücken', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'c_einarm_rudern', name: 'Einarmiges Rudern Kabel', muscle: 'Rücken', sets: 3, repsMin: 10, repsMax: 15, metric: 'weight', group: 'main', increment: 2.5, perHand: true, painCheck: true },
        { id: 'c_facepulls', name: 'Face Pulls', muscle: 'Rücken', sets: 3, repsMin: 15, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 2.5, painCheck: true },
        { id: 'c_schraegbank', ramp: true, name: 'Schrägbank Maschine (leicht)', muscle: 'Brust', sets: 3, repsMin: 8, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5, painCheck: true, note: 'Bewusst leicht halten' },
        { id: 'c_extrot', name: 'Außenrotation Kabel', muscle: 'Schulter', sets: 3, repsMin: 12, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 1, painCheck: true },
        { id: 'c_seitheben', name: 'Seitheben leicht', muscle: 'Schulter', sets: 3, repsMin: 12, repsMax: 20, metric: 'weight', group: 'shoulder', increment: 1, perHand: true, painCheck: true },
        { id: 'c_bizeps', name: 'Kabel Bizeps', muscle: 'Arme', sets: 2, repsMin: 10, repsMax: 15, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'c_trizeps', name: 'Trizeps Seil', muscle: 'Arme', sets: 2, repsMin: 10, repsMax: 15, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'c_farmerwalk', name: 'Farmer Walk', muscle: 'Core', sets: 3, distTarget: 40, metric: 'distance', group: 'core', increment: 2, perHand: true },
        { id: 'c_plank', name: 'Plank', muscle: 'Core', sets: 3, timeTarget: 45, metric: 'time', group: 'core', increment: 5 },
      ],
    },
  ],

  forbidden: [
    { name: 'Schulterdrücken über Kopf', reason: 'Engt den Raum unter dem Schulterdach maximal ein' },
    { name: 'Military Press', reason: 'Überkopfdruck – gleiche Problematik' },
    { name: 'Dips', reason: 'Extreme Belastung der vorderen Schulter in tiefer Position' },
    { name: 'Upright Rows', reason: 'Innenrotation + Abduktion = klassische Impingement-Position' },
    { name: 'Frontheben', reason: 'Reizt die lange Bizepssehne und die Supraspinatussehne' },
    { name: 'Nackendrücken', reason: 'Zwingt die Schulter in Außenrotation unter Last über Kopf' },
    { name: 'Butterfly mit Ellbogen weit hinten', reason: 'Überdehnt die vordere Schulterkapsel' },
    { name: 'Sehr breiter Latzug hinter den Kopf', reason: 'Ungünstige Position fürs Schulterdach' },
  ],

  intensityRules: [
    '8–12 Wiederholungen bei den Grundübungen',
    '12–20 Wiederholungen bei Schulter- und Rehaübungen',
    '1–2 Wiederholungen im Tank lassen – nicht bis zum Muskelversagen',
    'Doppelte Progression: erst Wiederholungen bis ans obere Ende der Spanne, dann Gewicht rauf und wieder unten anfangen',
    'Nahe am Muskelversagen (0–3 Wdh. Reserve) zählt mehr als die genaue Wiederholungszahl',
    'Leichter Muskelzug ist okay. Stechender Schmerz = Gewicht runter oder Übung tauschen.',
  ],

  // Schmerz-Monitoring nach dem Standard aus der Sehnen-Reha:
  // Schmerz bis 3/10 während der Übung ist unbedenklich, solange er sich
  // innerhalb von 24 Stunden wieder legt. Ab 4/10 wird die Last reduziert.
  painLevels: [
    { key: 'none', label: 'Schmerzfrei', short: 'Kein', desc: 'Alles ruhig – weiter aufbauen' },
    { key: 'mild', label: 'Leicht (1–3)', short: 'Leicht', desc: 'Spürbar, aber erträglich – Gewicht halten, nicht steigern' },
    { key: 'sharp', label: 'Stechend (4+)', short: 'Stechend', desc: 'Zu viel – nächstes Mal deutlich leichter' },
  ],

  // Wissenschaftlich fundierte Pausenzeiten: längere Pausen (2–3 Min) bringen bei
  // Grundübungen nachweislich mehr Kraft- und Muskelaufbau als 60–90 Sekunden.
  restRules: [
    'Schwere Bein-/Hüftübungen (Beinpresse, Kreuzheben, Kniebeugen, Hip Thrust): 2:30 Min',
    'Einbeinige Übungen (Split Squat, Ausfallschritte): 2:30 Min – zählt pro Bein',
    'Grundübungen Oberkörper (Rudern, Latzug, Brustpresse): 2:00 Min',
    'Isolationsübungen (Arme, Waden, Beinmaschinen): 1:30 Min',
    'Schulter- & Rehaübungen: 1:00 Min – hier zählt Qualität, nicht Erschöpfung',
    'Core: 1:00 Min',
    'Zwischen zwei Übungen: 2–3 Min (Geräte-Umbau zählt als Pause mit)',
    'Faustregel: Vor dem nächsten Satz sollst du wieder ruhig durchatmen können',
  ],
};

// Pausenzeit pro Übung (Sekunden): Gruppen-Standard + Ausnahmen
const REST_DEFAULTS = { main: 120, shoulder: 60, core: 60 };
const REST_OVERRIDES = {
  a_beinpresse: 150, a_rdl: 150, c_kniebeuge: 150,            // schwere Beinübungen
  c_hipthrust: 150,                                           // schwere Hüftstreckung
  b_splitsquat: 150, b_walking_lunges: 150, b_reverse_lunges: 150, // einbeinig = doppelte Arbeit pro Satz
  a_waden: 90, a_hammercurls: 90, a_trizeps: 90,              // Isolation
  b_beinbeuger: 90, b_beinstrecker: 90, b_liegestuetze: 90,
  b_szcurls: 90, b_trizeps: 90,
  c_einarm_rudern: 90, c_bizeps: 90, c_trizeps: 90,
  c_farmerwalk: 120,                                          // Griffkraft & Atmung brauchen länger
};

// Gewichtsschritte, die am Gerät tatsächlich einstellbar sind.
// Steckgewicht-Maschinen springen meist in 5-kg-Stufen, Kabelzüge in 2,5,
// Langhanteln in 2,5 (2× 1,25 kg) und Kurzhanteln in 2-kg-Sprüngen.
// Studios unterscheiden sich – deshalb pro Übung in der App änderbar.
const STEP_OPTIONS = [1, 1.25, 2, 2.5, 5, 10];
const STEP_DEFAULTS = { machine: 5, cable: 2.5, barbell: 2.5, dumbbell: 2 };
const EQUIPMENT_LABELS = { machine: 'Maschine', cable: 'Kabelzug', barbell: 'Langhantel', dumbbell: 'Kurzhantel' };
const EQUIPMENT = {
  a_beinpresse: 'machine', a_rdl: 'barbell', a_waden: 'machine',
  a_rudern: 'machine', a_latzug: 'machine', a_facepulls: 'cable',
  a_brustpresse: 'machine', a_seitheben: 'dumbbell', a_extrot: 'cable',
  a_hammercurls: 'dumbbell', a_trizeps: 'cable',
  b_splitsquat: 'dumbbell', b_walking_lunges: 'dumbbell', b_reverse_lunges: 'dumbbell',
  b_beinbeuger: 'machine', b_beinstrecker: 'machine', b_kabelrudern: 'cable',
  b_revbutterfly: 'machine', b_yraises: 'dumbbell', b_scaption: 'dumbbell',
  b_szcurls: 'barbell', b_trizeps: 'cable', b_pallof: 'cable',
  c_kniebeuge: 'barbell', c_hipthrust: 'barbell', c_latzug_eng: 'machine',
  c_einarm_rudern: 'cable', c_facepulls: 'cable', c_schraegbank: 'machine',
  c_extrot: 'cable', c_seitheben: 'dumbbell', c_bizeps: 'cable', c_trizeps: 'cable',
  c_farmerwalk: 'dumbbell',
};

// Ein Platz im Plan ("Slot") kann mehrere gleichwertige Varianten haben.
// Die Basis-Übung plus ihre Alternativen als flache Liste.
function variantsOf(slot) {
  return [slot].concat(slot.alternatives || []);
}

for (const w of PLAN.workouts) {
  for (const slot of w.exercises) {
    for (const v of variantsOf(slot)) {
      v.rest = REST_OVERRIDES[v.id] || REST_DEFAULTS[v.group];
      v.equipment = EQUIPMENT[v.id] || 'machine';
      v.step = STEP_DEFAULTS[v.equipment];
    }
  }
}

PLAN.exerciseById = {};
PLAN.slotByExerciseId = {};
for (const w of PLAN.workouts) {
  for (const slot of w.exercises) {
    for (const v of variantsOf(slot)) {
      PLAN.exerciseById[v.id] = v;
      PLAN.slotByExerciseId[v.id] = slot;
    }
  }
}

function getWorkout(key) {
  return PLAN.workouts.find((w) => w.key === key);
}

function findSlot(slotId) {
  for (const w of PLAN.workouts) {
    const slot = w.exercises.find((s) => s.id === slotId);
    if (slot) return slot;
  }
  return null;
}

// Welche Variante eines Slots ist gerade gewählt? (Standard: die Basis-Übung)
function resolveExercise(slot, variants) {
  const chosen = variants && variants[slot.id];
  if (!chosen || chosen === slot.id) return slot;
  return (slot.alternatives || []).find((a) => a.id === chosen) || slot;
}

function resolvedExercises(workout, variants) {
  return workout.exercises.map((slot) => resolveExercise(slot, variants));
}

// Einheit fürs Eingabefeld – macht sichtbar, ob pro Hand oder gesamt gezählt wird
function weightUnit(ex) {
  return ex.perHand ? 'kg/Hand' : 'kg';
}

// Kleinster Gewichtsschritt dieser Übung – Studio-Einstellung schlägt Standard
function stepOf(ex, steps) {
  const custom = steps && steps[ex.id];
  return custom || ex.step || 2.5;
}

// Steigerungsschritt: mindestens ein Geräteschritt und immer ein Vielfaches davon,
// damit nie ein Gewicht vorgeschlagen wird, das es am Gerät nicht gibt.
function incrementOf(ex, step) {
  const wish = ex.increment || step;
  return Math.round(Math.max(1, Math.ceil(wish / step - 1e-9)) * step * 100) / 100;
}

// Übung mit den tatsächlich gültigen Gewichtsschritten
function effectiveExercise(ex, steps) {
  const step = stepOf(ex, steps);
  return Object.assign({}, ex, { step, increment: incrementOf(ex, step) });
}
