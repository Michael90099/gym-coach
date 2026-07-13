// GymCoach – Datenhaltung (localStorage) + Export/Import

const STORE_KEY = 'gymcoach.v1';
const SESSION_KEY = 'gymcoach.session.v1';

function defaultState() {
  return {
    logs: [],            // abgeschlossene Trainings, chronologisch
    points: 0,
    badges: [],          // Badge-IDs
    rehabCount: 0,
    lastWorkoutKey: null,
    createdAt: new Date().toISOString(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return Object.assign(defaultState(), JSON.parse(raw));
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

// Historie einer Übung: neueste zuerst, nur Einträge mit mindestens einem erledigten Satz
function exerciseHistory(state, exerciseId) {
  const out = [];
  for (let i = state.logs.length - 1; i >= 0; i--) {
    const log = state.logs[i];
    const ex = log.exercises.find((e) => e.id === exerciseId);
    if (ex && ex.sets.some((s) => s.done)) out.push({ date: log.date, pain: !!ex.pain, sets: ex.sets.filter((s) => s.done) });
  }
  return out;
}
