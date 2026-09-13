// GymCoach – Oura-Morgencheck & Bereitschafts-Steuerung
//
// Warum kein automatischer Abruf:
// Oura hat die einfachen Zugangstoken im Dezember 2025 abgeschafft. Übrig bleibt
// OAuth2 mit einem Client-Geheimnis, das in einer reinen Browser-App nicht sicher
// unterzubringen ist – und die Schnittstelle blockiert Browser-Anfragen ohnehin
// (CORS, direkt nachgemessen). Ein automatischer Abruf bräuchte also einen eigenen
// Server, über den sämtliche Gesundheitsdaten liefen.
//
// Die vier Zahlen abzutippen dauert zwanzig Sekunden – und alles bleibt auf dem Gerät.
// Entscheidend ist ohnehin nicht der Abruf, sondern was mit den Werten passiert:
// Die Bereitschaft steuert, wie hart heute trainiert wird.

const OURA_FIELDS = [
  { key: 'readiness', label: 'Bereitschaft', unit: '', min: 1, max: 100, required: true,
    hint: 'Der Readiness-Score ganz oben in der Oura-App' },
  { key: 'sleep', label: 'Schlafscore', unit: '', min: 1, max: 100,
    hint: 'Optional – zeigt, woher eine niedrige Bereitschaft kommt' },
  { key: 'hrv', label: 'HRV', unit: 'ms', min: 5, max: 250,
    hint: 'Herzratenvariabilität im Schlaf – guter Langzeit-Erholungsmarker' },
  { key: 'restingHr', label: 'Ruhepuls', unit: 'bpm', min: 30, max: 110,
    hint: 'Niedriger Ruhepuls = besseres Herz-Kreislauf-System' },
];

// Oura-eigene Einteilung der Bereitschaft
const READINESS_BANDS = [
  { min: 85, key: 'optimal', label: 'Optimal', icon: '🟢',
    train: 'Grünes Licht. Heute ist der Tag für die harten Sachen: Intervalle oder schweres Training mit Steigerung.',
    allowHard: true },
  { min: 70, key: 'good', label: 'Gut', icon: '🟢',
    train: 'Normal trainieren wie geplant. Alles im grünen Bereich.',
    allowHard: true },
  { min: 60, key: 'watch', label: 'Aufpassen', icon: '🟡',
    train: 'Heute lieber die lockere Variante: ruhiger Dauerlauf statt Intervalle, im Studio Gewicht halten statt steigern.',
    allowHard: false },
  { min: 0, key: 'low', label: 'Erholung nötig', icon: '🔴',
    train: 'Dein Körper meldet Erschöpfung. Heute Dehnen oder ein Spaziergang – hartes Training bringt jetzt nichts und kostet nur weitere Erholung.',
    allowHard: false },
];

function readinessBand(score) {
  if (score == null) return null;
  return READINESS_BANDS.find((b) => score >= b.min) || READINESS_BANDS[READINESS_BANDS.length - 1];
}

function ouraEntries(state) {
  return (state.oura && state.oura.entries) || [];
}

function latestOura(state) {
  const e = ouraEntries(state);
  return e.length ? e[e.length - 1] : null;
}

// Nur der heutige Wert darf das Training steuern – gestern ist nicht mehr aussagekräftig
function ouraToday(state) {
  const last = latestOura(state);
  if (!last) return null;
  return new Date(last.date).toDateString() === new Date().toDateString() ? last : null;
}

function ouraDue(state) {
  if (ouraToday(state)) return false;
  const h = new Date().getHours();
  return h >= 6 && ouraEntries(state).length > 0;  // erst anbieten, wenn schon mal genutzt
}

// Was sagt die heutige Bereitschaft zum geplanten Training?
function ouraGuidance(state) {
  const today = ouraToday(state);
  if (!today || today.readiness == null) return null;
  const band = readinessBand(today.readiness);
  return {
    score: today.readiness, band,
    headline: band.icon + ' Bereitschaft ' + today.readiness + ' – ' + band.label,
    advice: band.train,
    allowHard: band.allowHard,
    sleep: today.sleep, hrv: today.hrv, restingHr: today.restingHr,
  };
}

// Trend über die letzten Einträge: steigt oder fällt die Erholung?
function ouraTrend(state, field) {
  const vals = ouraEntries(state).filter((e) => e[field] != null);
  if (vals.length < 4) return null;
  const recent = vals.slice(-3).reduce((s, e) => s + e[field], 0) / 3;
  const before = vals.slice(-10, -3);
  if (!before.length) return null;
  const prev = before.reduce((s, e) => s + e[field], 0) / before.length;
  const diff = recent - prev;
  return { recent: Math.round(recent * 10) / 10, diff: Math.round(diff * 10) / 10 };
}

const OURA_POINTS = 10;
