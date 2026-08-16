// GymCoach – Datenhaltung (localStorage) + Export/Import

const STORE_KEY = 'gymcoach.v1';
const SESSION_KEY = 'gymcoach.session.v1';

function defaultState() {
  return {
    logs: [],            // abgeschlossene Trainings, chronologisch
    points: 0,
    badges: [],          // Badge-IDs
    variants: {},        // gewählte Übungs-Variante je Slot: { slotId: exerciseId }
    steps: {},           // Gewichtsschritt je Übung im eigenen Studio: { exerciseId: kg }
    body: { heightCm: null, age: null, sex: null, activity: 1.6, entries: [] }, // Körperdaten & Check-ins
    badgeDates: {},      // wann welches Abzeichen freigeschaltet wurde (für die Zeitleiste)
    weeklyGoal: 3,       // Trainings pro Woche (2 oder 3)
    restOffset: 10,      // Sekunden Bedien-Ausgleich, um die der Pausen-Timer verkürzt startet
    lastExportAt: null,  // letztes Backup – iOS kann localStorage löschen
    rehabCount: 0,
    lastWorkoutKey: null,
    createdAt: new Date().toISOString(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const state = Object.assign(defaultState(), JSON.parse(raw));
    // Ältere Speicherstände kennen die Körperdaten noch nicht
    state.body = Object.assign(defaultState().body, state.body || {});
    return state;
  } catch (e) {
    console.error('Konnte Daten nicht laden', e);
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

// Laufendes Training – übersteht App-Neustart im Studio
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function exportData(state) {
  state.lastExportAt = new Date().toISOString();
  saveState(state);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymcoach-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.logs)) throw new Error('Kein gültiges GymCoach-Backup');
      const state = Object.assign(defaultState(), data);
      saveState(state);
      onDone(state);
    } catch (e) {
      alert('Import fehlgeschlagen: ' + e.message);
    }
  };
  reader.readAsText(file);
}

// Schmerz-Stufe eines Log-Eintrags. Alte Logs kannten nur ja/nein.
function painLevelOf(loggedEx) {
  if (loggedEx.painLevel) return loggedEx.painLevel;
  return loggedEx.pain ? 'sharp' : 'none';
}

// Historie einer Übung: neueste zuerst, nur Einträge mit mindestens einem erledigten Satz
function exerciseHistory(state, exerciseId) {
  const out = [];
  for (let i = state.logs.length - 1; i >= 0; i--) {
    const log = state.logs[i];
    const ex = log.exercises.find((e) => e.id === exerciseId);
    if (ex && ex.sets.some((s) => s.done)) {
      const painLevel = painLevelOf(ex);
      out.push({
        date: log.date,
        painLevel,
        pain: painLevel === 'sharp',
        rir: typeof ex.rir === 'number' ? ex.rir : null,
        sets: ex.sets.filter((s) => s.done),
      });
    }
  }
  return out;
}
