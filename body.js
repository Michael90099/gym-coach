// GymCoach – Körper & Rekomposition
// Ziel: Muskeln aufbauen UND Fett verlieren. Die Waage allein lügt dabei –
// deshalb werden drei Signale kombiniert: Gewicht, Taille und Kraft.

const POINTS_CHECKIN = 15;

// Aktivitätsfaktoren für die Kalorienschätzung (Mifflin-St-Jeor-Grundumsatz × Faktor)
const ACTIVITY_LEVELS = [
  { key: 1.4, label: 'Wenig', desc: 'Sitzender Alltag, nur die Trainings' },
  { key: 1.6, label: 'Normal', desc: 'Etwas Bewegung im Alltag + Training' },
  { key: 1.8, label: 'Aktiv', desc: 'Körperliche Arbeit oder viel Bewegung' },
];

function latestBodyEntry(state) {
  const es = (state.body && state.body.entries) || [];
  return es.length ? es[es.length - 1] : null;
}

// ---------- Tagesziele: Protein & Kalorien ----------

// Proteinbedarf für Rekomposition: 2,0 g/kg – im Defizit schützt viel Eiweiß die Muskeln.
function proteinTarget(weightKg) {
  return Math.round(weightKg * 2);
}

// Kalorienziel: Grundumsatz (Mifflin-St Jeor) × Aktivität − moderates Defizit von 400 kcal.
// Mehr Defizit kostet Muskeln, weniger bringt kaum Fettabbau.
function calorieTarget(body, weightKg) {
  if (!body.heightCm || !body.age || !body.sex) return null;
  const bmr = 10 * weightKg + 6.25 * body.heightCm - 5 * body.age + (body.sex === 'm' ? 5 : -161);
  const maintenance = bmr * (body.activity || 1.6);
  return Math.round((maintenance - 400) / 50) * 50;
}

// ---------- Kraft-Index: der ehrlichste Muskelaufbau-Anzeiger ohne Labor ----------
// Mittelwert über alle Gewichtsübungen: aktuelles Arbeitsgewicht ÷ erstes Arbeitsgewicht.
// 100 = Startniveau. Steigt der Index, wird Muskulatur aufgebaut oder besser angesteuert –
// beides ist ein Fortschritt, den die Waage nicht zeigt.

function strengthIndexAt(state, uptoDate) {
  const ratios = [];
  const seen = {};
  for (const log of state.logs) {
    if (uptoDate && new Date(log.date) > new Date(uptoDate)) break;
    for (const ex of log.exercises) {
      const planEx = PLAN.exerciseById[ex.id];
      if (!planEx || planEx.metric !== 'weight') continue;
      const done = ex.sets.filter((s) => s.done && typeof s.weight === 'number');
      if (!done.length) continue;
      const best = Math.max(...done.map((s) => s.weight));
      if (!seen[ex.id]) seen[ex.id] = { first: best };
      seen[ex.id].last = best;
    }
  }
  for (const id in seen) {
    if (seen[id].first > 0) ratios.push(seen[id].last / seen[id].first);
  }
  if (!ratios.length) return null;
  return Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 1000) / 10;
}

// Index-Verlauf: ein Punkt pro Trainingstag
function strengthIndexSeries(state) {
  return state.logs.map((log) => ({ date: log.date, v: strengthIndexAt(state, log.date) }))
    .filter((p) => p.v != null);
}

// ---------- Rekomp-Analyse: Was sagen Waage, Maßband und Hantel zusammen? ----------

function bodyAnalysis(state) {
  const es = ((state.body && state.body.entries) || []).slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (es.length < 2) return null;

  // Betrachtungsfenster: die letzten ~5 Wochen
  const cutoff = Date.now() - 35 * 86400000;
  let win = es.filter((e) => new Date(e.date).getTime() >= cutoff);
  if (win.length < 2) win = es.slice(-2);

  const first = win[0], last = win[win.length - 1];
  const weeks = Math.max(0.5, (new Date(last.date) - new Date(first.date)) / (7 * 86400000));
  const weightRate = ((last.weightKg - first.weightKg) / first.weightKg) * 100 / weeks; // %/Woche

  const waists = win.filter((e) => e.waistCm != null);
  const waistDelta = waists.length >= 2 ? waists[waists.length - 1].waistCm - waists[0].waistCm : null;

  const sSeries = strengthIndexSeries(state);
  const sWin = sSeries.filter((p) => new Date(p.date).getTime() >= new Date(first.date).getTime() - 86400000);
  const strengthDelta = sWin.length >= 2 ? sWin[sWin.length - 1].v - sWin[0].v : null;

  const kg = last.weightKg - first.weightKg;
  const f = (n, u) => (n > 0 ? '+' : '') + (Math.round(n * 10) / 10).toString().replace('.', ',') + u;
  const facts = ['Gewicht ' + f(kg, ' kg')];
  if (waistDelta != null) facts.push('Taille ' + f(waistDelta, ' cm'));
  if (strengthDelta != null) facts.push('Kraft ' + f(strengthDelta, ' %'));

  let icon, title, advice;
  const strengthUp = strengthDelta != null && strengthDelta > 1;
  const strengthDown = strengthDelta != null && strengthDelta < -1;
  const waistDown = waistDelta != null && waistDelta <= -0.5;
  const waistUp = waistDelta != null && waistDelta >= 0.5;

  if (weightRate <= -1.1) {
    icon = '⚠️'; title = 'Du verlierst zu schnell';
    advice = 'Mehr als 1 % Körpergewicht pro Woche kostet fast sicher Muskeln. Iss etwas mehr (vor allem Eiweiß) und halte die Trainingsgewichte – Abnehmen gewinnt man über Monate, nicht Wochen.';
  } else if (strengthUp && kg <= -0.2) {
    icon = '🏆'; title = 'Perfekte Rekomposition!';
    advice = 'Gewicht runter UND Kraft rauf – genau das wollten wir sehen. Muskeln kommen, Fett geht. Ändere nichts, das läuft besser als bei den allermeisten.';
  } else if (waistDown && Math.abs(kg) < 0.6) {
    icon = '🔍'; title = 'Die Waage lügt – die Taille nicht';
    advice = 'Gewicht steht, aber der Bauchumfang schrumpft: Du tauschst gerade Fett gegen Muskeln, fast 1:1. Das ist verstecktes Vorankommen – unbedingt weitermachen und nicht von der Waage entmutigen lassen.';
  } else if (strengthDown && kg < 0) {
    icon = '🛟'; title = 'Kraft fällt – Muskeln schützen!';
    advice = 'Du nimmst ab, aber die Gewichte fallen mit. Das riecht nach Muskelverlust: Protein hoch (Richtung Tagesziel), Defizit etwas verkleinern, schlafen. Die Trainingsgewichte sind jetzt deine wichtigste Messgröße.';
  } else if (kg > 0.4 && waistUp) {
    icon = '📉'; title = 'Etwas zu viel Überschuss';
    advice = 'Gewicht und Taille steigen zusammen – da kommt gerade mehr Fett als Muskel dazu. Portionen leicht verkleinern oder mehr Alltagsbewegung, das Training passt.';
  } else if (kg <= 0 && !strengthDown) {
    icon = '✅'; title = 'Auf Kurs';
    advice = 'Gewicht bewegt sich in die richtige Richtung und die Kraft hält. Genau dieses Tempo (~0,5 % pro Woche) baut Fett ab, ohne Muskeln zu opfern.';
  } else {
    icon = '📊'; title = 'Stabil – Feintuning möglich';
    advice = 'Keine großen Ausschläge. Wenn du schneller Fett verlieren willst: 200 kcal weniger pro Tag, Eiweiß beibehalten, weitertrainieren.';
  }

  return { icon, title, advice, facts, weightRate };
}

// ---------- Veränderungs-Zeitleiste ----------

function buildTimeline(state) {
  const events = [];
  const es = (state.body && state.body.entries) || [];

  es.forEach((e, i) => {
    const prev = i > 0 ? es[i - 1] : null;
    let txt = fmtW(e.weightKg) + ' kg';
    if (prev) {
      const d = Math.round((e.weightKg - prev.weightKg) * 10) / 10;
      if (d !== 0) txt += ' (' + (d > 0 ? '+' : '') + String(d).replace('.', ',') + ')';
    }
    if (e.waistCm != null) txt += ' · Taille ' + fmtW(e.waistCm) + ' cm';
    events.push({ date: e.date, icon: '⚖️', text: txt });
  });

  // Trainings-Meilensteine
  [1, 10, 25, 50, 75, 100].forEach((n) => {
    if (state.logs.length >= n) {
      events.push({ date: state.logs[n - 1].date, icon: '🏋️', text: n === 1 ? 'Erstes Training!' : n + '. Training' });
    }
  });

  // Kraft-Meilensteine: +5 %, +10 %, ...
  const series = strengthIndexSeries(state);
  [105, 110, 115, 120, 130, 140, 150].forEach((mark) => {
    const hit = series.find((p) => p.v >= mark);
    if (hit) events.push({ date: hit.date, icon: '💪', text: 'Kraft +' + (mark - 100) + ' % seit Start' });
  });

  // Abzeichen (Datum wird seit v13 gespeichert)
  const bd = state.badgeDates || {};
  for (const id in bd) {
    const b = BADGES.find((x) => x.id === id);
    if (b) events.push({ date: bd[id], icon: b.icon, text: 'Abzeichen: ' + b.name });
  }

  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  return events.slice(0, 30);
}

// Check-in fällig? (7 Tage Rhythmus – öfter wiegen bringt nur Rauschen)
function checkinDue(state) {
  const last = latestBodyEntry(state);
  if (!last) return state.logs.length >= 1;
  return (Date.now() - new Date(last.date).getTime()) / 86400000 >= 7;
}
