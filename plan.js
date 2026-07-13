// GymCoach – Trainingsplan-Daten
// Ganzkörperplan mit Fokus Schulter-Impingement (3x/Woche, Rotation A -> B -> C)

const PLAN = {
  weeklyGoal: 3,

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
  // painCheck: nach der Übung nach stechendem Schmerz fragen
  workouts: [
    {
      key: 'A',
      name: 'Ganzkörper A',
      exercises: [
        { id: 'a_beinpresse', name: 'Beinpresse', muscle: 'Beine', sets: 3, repsMin: 10, repsMax: 12, metric: 'weight', group: 'main', increment: 5 },
        { id: 'a_rdl', name: 'Rumänisches Kreuzheben', muscle: 'Beine', sets: 3, repsMin: 8, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'a_waden', name: 'Wadenheben', muscle: 'Beine', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'main', increment: 5 },
        { id: 'a_rudern', name: 'Brustgestütztes Rudern', muscle: 'Rücken', sets: 3, repsMin: 10, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'a_latzug', name: 'Latziehen neutraler Griff', muscle: 'Rücken', sets: 3, repsMin: 10, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'a_facepulls', name: 'Face Pulls', muscle: 'Rücken', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'shoulder', increment: 2.5, painCheck: true },
        { id: 'a_brustpresse', name: 'Maschinen-Brustpresse', muscle: 'Brust', sets: 3, repsMin: 10, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5, painCheck: true, note: 'Ellbogen ca. 45° – nicht weit ausfahren' },
        { id: 'a_seitheben', name: 'Seitheben', muscle: 'Schulter', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'shoulder', increment: 1, painCheck: true, note: 'Nur bis Schulterhöhe, kontrolliert' },
        { id: 'a_extrot', name: 'Außenrotation Kabel', muscle: 'Schulter', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'shoulder', increment: 1, painCheck: true },
        { id: 'a_hammercurls', name: 'Hammer Curls', muscle: 'Arme', sets: 2, repsMin: 12, repsMax: 12, metric: 'weight', group: 'main', increment: 2 },
        { id: 'a_trizeps', name: 'Trizeps Seil', muscle: 'Arme', sets: 2, repsMin: 12, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'a_plank', name: 'Plank', muscle: 'Core', sets: 3, timeTarget: 40, metric: 'time', group: 'core', increment: 5 },
        { id: 'a_deadbug', name: 'Dead Bug', muscle: 'Core', sets: 3, repsMin: 10, repsMax: 10, metric: 'reps', group: 'core', increment: 2 },
      ],
    },
    {
      key: 'B',
      name: 'Ganzkörper B',
      exercises: [
        { id: 'b_splitsquat', name: 'Bulgarian Split Squat', muscle: 'Beine', sets: 3, repsMin: 10, repsMax: 10, metric: 'weight', group: 'main', increment: 2 },
        { id: 'b_beinbeuger', name: 'Beinbeuger Maschine', muscle: 'Beine', sets: 3, repsMin: 12, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'b_beinstrecker', name: 'Beinstrecker', muscle: 'Beine', sets: 2, repsMin: 15, repsMax: 15, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'b_kabelrudern', name: 'Kabelrudern', muscle: 'Rücken', sets: 3, repsMin: 10, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'b_revbutterfly', name: 'Reverse Butterfly', muscle: 'Rücken', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'shoulder', increment: 2.5, painCheck: true },
        { id: 'b_liegestuetze', name: 'Liegestütze (Multipresse/erhöht)', muscle: 'Brust', sets: 3, repsMin: 10, repsMax: 15, metric: 'reps', group: 'main', increment: 1, painCheck: true },
        { id: 'b_yraises', name: 'Y-Raises', muscle: 'Schulter', sets: 3, repsMin: 12, repsMax: 12, metric: 'weight', group: 'shoulder', increment: 1, painCheck: true },
        { id: 'b_scaption', name: 'Scaption Raises (30° vor)', muscle: 'Schulter', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'shoulder', increment: 1, painCheck: true },
        { id: 'b_szcurls', name: 'SZ-Curls', muscle: 'Arme', sets: 2, repsMin: 12, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'b_trizeps', name: 'Trizeps Seildrücken', muscle: 'Arme', sets: 2, repsMin: 12, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5, note: 'Overhead nur wenn komplett schmerzfrei' },
        { id: 'b_pallof', name: 'Pallof Press', muscle: 'Core', sets: 3, repsMin: 12, repsMax: 12, metric: 'weight', group: 'core', increment: 2.5 },
        { id: 'b_kneeraises', name: 'Hanging Knee Raises', muscle: 'Core', sets: 3, repsMin: 12, repsMax: 12, metric: 'reps', group: 'core', increment: 2 },
      ],
    },
    {
      key: 'C',
      name: 'Ganzkörper C',
      exercises: [
        { id: 'c_kniebeuge', name: 'Kniebeugen / Hackenschmidt', muscle: 'Beine', sets: 3, repsMin: 8, repsMax: 8, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'c_hipthrust', name: 'Hip Thrust', muscle: 'Beine', sets: 3, repsMin: 10, repsMax: 10, metric: 'weight', group: 'main', increment: 5 },
        { id: 'c_latzug_eng', name: 'Latziehen eng', muscle: 'Rücken', sets: 3, repsMin: 10, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'c_einarm_rudern', name: 'Einarmiges Rudern Kabel', muscle: 'Rücken', sets: 3, repsMin: 12, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5, painCheck: true },
        { id: 'c_facepulls', name: 'Face Pulls', muscle: 'Rücken', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'shoulder', increment: 2.5, painCheck: true },
        { id: 'c_schraegbank', name: 'Schrägbank Maschine (leicht)', muscle: 'Brust', sets: 3, repsMin: 10, repsMax: 10, metric: 'weight', group: 'main', increment: 2.5, painCheck: true, note: 'Bewusst leicht halten' },
        { id: 'c_extrot', name: 'Außenrotation Kabel', muscle: 'Schulter', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'shoulder', increment: 1, painCheck: true },
        { id: 'c_seitheben', name: 'Seitheben leicht', muscle: 'Schulter', sets: 3, repsMin: 15, repsMax: 15, metric: 'weight', group: 'shoulder', increment: 1, painCheck: true },
        { id: 'c_bizeps', name: 'Kabel Bizeps', muscle: 'Arme', sets: 2, repsMin: 12, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'c_trizeps', name: 'Trizeps Seil', muscle: 'Arme', sets: 2, repsMin: 12, repsMax: 12, metric: 'weight', group: 'main', increment: 2.5 },
        { id: 'c_farmerwalk', name: 'Farmer Walk', muscle: 'Core', sets: 3, distTarget: 40, metric: 'distance', group: 'core', increment: 2 },
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
    'Leichter Muskelzug ist okay. Stechender Schmerz = Gewicht runter oder Übung tauschen.',
  ],

  // Wissenschaftlich fundierte Pausenzeiten: längere Pausen (2–3 Min) bringen bei
  // Grundübungen nachweislich mehr Kraft- und Muskelaufbau als 60–90 Sekunden.
  restRules: [
    'Schwere Beinübungen (Beinpresse, Kreuzheben, Kniebeugen): 2:30 Min',
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
  a_waden: 90, a_hammercurls: 90, a_trizeps: 90,              // Isolation
  b_beinbeuger: 90, b_beinstrecker: 90, b_liegestuetze: 90,
  b_szcurls: 90, b_trizeps: 90,
  c_einarm_rudern: 90, c_bizeps: 90, c_trizeps: 90,
  c_farmerwalk: 90,                                           // hohe Ganzkörper-Last
};
for (const w of PLAN.workouts) {
  for (const ex of w.exercises) ex.rest = REST_OVERRIDES[ex.id] || REST_DEFAULTS[ex.group];
}

PLAN.exerciseById = {};
for (const w of PLAN.workouts) {
  for (const ex of w.exercises) PLAN.exerciseById[ex.id] = ex;
}

function getWorkout(key) {
  return PLAN.workouts.find((w) => w.key === key);
}
