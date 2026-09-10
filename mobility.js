// GymCoach – Mobility & Dehnen
// Geführtes Programm mit Timer. Vier Schwerpunkte, die anatomisch zusammenhängen:
//   1. Longevity: Hüfte, Brustwirbelsäule, Sprunggelenk, Gleichgewicht – die
//      Bereiche, deren Beweglichkeit im Alter zuerst verloren geht.
//   2. Schulter-Impingement: mehr Platz unter dem Schulterdach durch bessere
//      BWS-Streckung und Schulterblatt-Ansteuerung, dazu Brust/Lat lösen.
//   3. Hohlkreuz (vermehrte Beckenkippung): vorne lösen (Hüftbeuger), hinten/unten
//      kräftigen (Gesäß, tiefe Bauchmuskeln) – das klassische Muster.
//   4. Auswärtsgang: Innenrotation der Hüfte und Sprunggelenk-Beweglichkeit.
//      Ehrlich bleibt: ist die Fußstellung knöchern angelegt, ändert Dehnen daran
//      nichts – schaden tut die Arbeit trotzdem nie.
//
// Haltezeiten folgen dem Forschungsstand: statisch 30–60 Sek. pro Seite,
// Mobilisation eher 45 Sek. in Bewegung, Ansteuerungsübungen 40 Sek.

const MOB_PREP = 8;        // Sekunden zum Positionieren
const MOB_PREP_SIDE = 5;   // beim Seitenwechsel reicht weniger

// ---------- Zeichnungen ----------

const FIG_BODY = '#c3ccda';
const FIG_DIM = '#3a4356';
const FIG_HL = '#ffa657';
const FIG_ARROW = '#4dd4ac';

function mobArrow(x1, y1, x2, y2, color) {
  const c = color || FIG_ARROW;
  const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
  const p1x = (x2 - h * Math.cos(a - 0.45)).toFixed(1), p1y = (y2 - h * Math.sin(a - 0.45)).toFixed(1);
  const p2x = (x2 - h * Math.cos(a + 0.45)).toFixed(1), p2y = (y2 - h * Math.sin(a + 0.45)).toFixed(1);
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="2.6"/>' +
    '<polygon points="' + x2 + ',' + y2 + ' ' + p1x + ',' + p1y + ' ' + p2x + ',' + p2y + '" fill="' + c + '"/>';
}

// Gebogener Pfeil (für Rotation/Kippbewegungen)
function mobCurve(d, ex, ey, ax, ay) {
  return '<path d="' + d + '" stroke="' + FIG_ARROW + '" stroke-width="2.6" fill="none"/>' + mobArrow(ax, ay, ex, ey);
}

// Markiert den Bereich, um den es geht. Gestrichelter Ring statt Farbfleck –
// eine flächige Füllung wirkt hinter dem Körper wie ein Schmutzfleck.
function hl(cx, cy, r) {
  const rr = r || 10;
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="' + FIG_HL + '" opacity="0.13"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="none" stroke="' + FIG_HL + '" ' +
    'stroke-width="1.8" opacity="0.75" stroke-dasharray="4 3.5"/>';
}
function head(cx, cy, r) {
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r || 7) + '" fill="' + FIG_BODY + '"/>';
}
const GROUND = '<line x1="8" y1="102" x2="132" y2="102" stroke="' + FIG_DIM + '" stroke-width="2.5"/>';

const MOB_FIGURES = {
  catcow:
    GROUND + hl(65, 40, 13) +
    '<path d="M35,56 Q65,32 95,56" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="35" y1="56" x2="35" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="95" y1="56" x2="97" y2="80" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="97" y1="80" x2="116" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(28, 66) + mobArrow(65, 26, 65, 14),

  child_lat:
    GROUND + hl(76, 66, 12) +
    '<line x1="102" y1="78" x2="112" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<path d="M102,78 Q80,66 56,70" stroke="' + FIG_BODY + '" stroke-width="4.5" fill="none"/>' +
    '<line x1="56" y1="70" x2="20" y2="90" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(50, 80) + mobArrow(40, 62, 22, 72),

  tspine_ext:
    GROUND + hl(60, 66, 12) +
    '<circle cx="68" cy="86" r="10" fill="' + FIG_DIM + '"/>' +
    '<path d="M96,90 Q70,66 52,70" stroke="' + FIG_BODY + '" stroke-width="4.5" fill="none"/>' +
    '<line x1="96" y1="90" x2="114" y2="76" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="114" y1="76" x2="118" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="52" y1="70" x2="24" y2="82" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(44, 62) + mobArrow(34, 66, 20, 72),

  open_book:
    GROUND + hl(56, 58, 11) +
    '<line x1="46" y1="72" x2="92" y2="74" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="92" y1="74" x2="96" y2="96" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="96" y1="96" x2="122" y2="98" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="46" y1="72" x2="48" y2="98" stroke="' + FIG_BODY + '" stroke-width="4" opacity="0.5"/>' +
    '<line x1="46" y1="72" x2="42" y2="38" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(36, 68) +
    mobCurve('M56,96 Q76,60 52,34', 52, 34, 62, 44),

  pec_door:
    GROUND +
    '<line x1="114" y1="8" x2="114" y2="102" stroke="' + FIG_DIM + '" stroke-width="4"/>' +
    hl(72, 42, 12) +
    '<line x1="56" y1="30" x2="56" y2="64" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="56" y1="64" x2="44" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="56" y1="64" x2="68" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="57" y1="36" x2="90" y2="46" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="90" y1="46" x2="106" y2="22" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(56, 22) + mobArrow(46, 54, 30, 60),

  lat_stretch:
    GROUND + hl(78, 62, 12) +
    '<line x1="12" y1="58" x2="58" y2="58" stroke="' + FIG_DIM + '" stroke-width="3.5"/>' +
    '<line x1="18" y1="58" x2="18" y2="100" stroke="' + FIG_DIM + '" stroke-width="3"/>' +
    '<line x1="26" y1="57" x2="58" y2="64" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<path d="M58,64 Q84,60 104,72" stroke="' + FIG_BODY + '" stroke-width="4.5" fill="none"/>' +
    '<line x1="104" y1="72" x2="110" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(52, 74) + mobArrow(96, 84, 116, 90),

  neck_lev:
    hl(74, 44, 10) +
    '<line x1="64" y1="46" x2="64" y2="78" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="64" y1="78" x2="98" y2="82" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="98" y1="82" x2="100" y2="102" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="64" y1="46" x2="60" y2="36" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="58" y1="52" x2="38" y2="36" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="38" y1="36" x2="52" y2="22" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(56, 26) + mobArrow(44, 18, 34, 28),

  chin_tuck:
    '<circle cx="86" cy="34" r="15" fill="none" stroke="' + FIG_BODY + '" stroke-width="3" opacity="0.28"/>' +
    '<circle cx="70" cy="34" r="15" fill="' + FIG_BODY + '"/>' +
    '<polygon points="55,34 44,38 55,42" fill="' + FIG_BODY + '"/>' +
    '<line x1="72" y1="49" x2="74" y2="70" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="52" y1="72" x2="98" y2="72" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    hl(76, 52, 9) + mobArrow(100, 34, 84, 34),

  wall_angel:
    '<rect x="24" y="6" width="92" height="96" fill="' + FIG_DIM + '" opacity="0.4"/>' +
    hl(70, 44, 13) +
    '<line x1="70" y1="30" x2="70" y2="64" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="70" y1="64" x2="58" y2="98" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="70" y1="64" x2="82" y2="98" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="59" y1="38" x2="40" y2="48" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="40" y1="48" x2="44" y2="24" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="81" y1="38" x2="100" y2="48" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="100" y1="48" x2="96" y2="24" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(70, 22) + mobArrow(30, 40, 30, 18) + mobArrow(110, 40, 110, 18),

  serratus_wall:
    GROUND +
    '<line x1="112" y1="8" x2="112" y2="102" stroke="' + FIG_DIM + '" stroke-width="4"/>' +
    hl(52, 46, 11) +
    '<line x1="60" y1="34" x2="62" y2="66" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="62" y1="66" x2="52" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="62" y1="66" x2="74" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="61" y1="40" x2="94" y2="46" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="94" y1="46" x2="106" y2="28" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(59, 26) + mobArrow(36, 48, 52, 48),

  hipflexor:
    GROUND + hl(46, 68, 12) +
    '<line x1="86" y1="98" x2="86" y2="66" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="86" y1="66" x2="58" y2="52" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="58" y1="52" x2="34" y2="90" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="34" y1="90" x2="16" y2="98" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="58" y1="52" x2="61" y2="22" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="60" y1="28" x2="82" y2="60" stroke="' + FIG_BODY + '" stroke-width="4"/>' +
    head(62, 14) +
    mobCurve('M40,44 Q56,34 70,44', 70, 44, 62, 37),

  hamstring:
    GROUND +
    '<line x1="94" y1="78" x2="128" y2="78" stroke="' + FIG_DIM + '" stroke-width="3.5"/>' +
    '<line x1="98" y1="78" x2="98" y2="100" stroke="' + FIG_DIM + '" stroke-width="3"/>' +
    hl(76, 66, 11) +
    '<line x1="58" y1="58" x2="82" y2="70" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="82" y1="70" x2="100" y2="76" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="58" y1="58" x2="54" y2="80" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="54" y1="80" x2="52" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="58" y1="58" x2="76" y2="40" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="76" y1="42" x2="90" y2="58" stroke="' + FIG_BODY + '" stroke-width="4"/>' +
    head(84, 34) + mobCurve('M46,50 Q58,38 72,32', 72, 32, 62, 36),

  glute_bridge:
    GROUND + hl(80, 70, 12) +
    '<line x1="34" y1="96" x2="78" y2="70" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="78" y1="70" x2="102" y2="82" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="102" y1="82" x2="102" y2="99" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="38" y1="96" x2="64" y2="99" stroke="' + FIG_BODY + '" stroke-width="4" opacity="0.6"/>' +
    head(26, 94) + mobArrow(80, 54, 80, 40),

  deadbug_ppt:
    GROUND + hl(66, 92, 11) +
    '<line x1="40" y1="94" x2="88" y2="94" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="48" y1="94" x2="42" y2="62" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="48" y1="94" x2="20" y2="86" stroke="' + FIG_BODY + '" stroke-width="4" opacity="0.6"/>' +
    '<line x1="88" y1="94" x2="94" y2="64" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="94" y1="64" x2="116" y2="62" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="88" y1="94" x2="124" y2="96" stroke="' + FIG_BODY + '" stroke-width="4" opacity="0.6"/>' +
    head(32, 92) + mobArrow(66, 78, 66, 90),

  pelvic_tilt:
    GROUND + hl(66, 90, 11) +
    '<line x1="34" y1="94" x2="80" y2="94" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="80" y1="94" x2="102" y2="74" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="102" y1="74" x2="104" y2="99" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(26, 92) +
    mobCurve('M64,74 Q80,66 92,76', 92, 76, 84, 69),

  piriformis:
    GROUND + hl(74, 62, 12) +
    '<line x1="30" y1="94" x2="70" y2="92" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="70" y1="92" x2="90" y2="62" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="90" y1="62" x2="98" y2="88" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="84" y1="58" x2="60" y2="52" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="60" y1="52" x2="56" y2="76" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="40" y1="92" x2="66" y2="74" stroke="' + FIG_BODY + '" stroke-width="4" opacity="0.6"/>' +
    head(22, 94) + mobArrow(104, 52, 88, 46),

  hip_ir:
    GROUND +
    '<line x1="44" y1="72" x2="98" y2="72" stroke="' + FIG_DIM + '" stroke-width="3.5"/>' +
    '<line x1="96" y1="72" x2="96" y2="34" stroke="' + FIG_DIM + '" stroke-width="3"/>' +
    '<line x1="50" y1="72" x2="50" y2="100" stroke="' + FIG_DIM + '" stroke-width="2.5"/>' +
    '<line x1="92" y1="72" x2="92" y2="100" stroke="' + FIG_DIM + '" stroke-width="2.5"/>' +
    hl(72, 68, 11) +
    '<line x1="72" y1="42" x2="72" y2="68" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="72" y1="68" x2="66" y2="88" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="66" y1="88" x2="42" y2="98" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    head(72, 32) + mobArrow(60, 100, 34, 100),

  adductor:
    GROUND + hl(94, 82, 12) +
    '<line x1="70" y1="30" x2="70" y2="58" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="70" y1="58" x2="42" y2="76" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="42" y1="76" x2="30" y2="100" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="70" y1="58" x2="114" y2="98" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="66" y1="38" x2="46" y2="52" stroke="' + FIG_BODY + '" stroke-width="4"/>' +
    head(70, 22) + mobArrow(70, 70, 70, 86),

  calf_wall:
    GROUND +
    '<line x1="118" y1="8" x2="118" y2="102" stroke="' + FIG_DIM + '" stroke-width="4"/>' +
    hl(94, 84, 11) +
    '<line x1="96" y1="99" x2="110" y2="70" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="110" y1="70" x2="84" y2="54" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="84" y1="54" x2="60" y2="78" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="60" y1="78" x2="46" y2="99" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="84" y1="54" x2="78" y2="28" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="79" y1="32" x2="112" y2="40" stroke="' + FIG_BODY + '" stroke-width="4"/>' +
    head(76, 19) + mobArrow(104, 66, 116, 62),

  short_foot:
    GROUND + hl(70, 88, 11) +
    '<line x1="44" y1="98" x2="46" y2="52" stroke="' + FIG_BODY + '" stroke-width="5"/>' +
    '<path d="M34,98 L48,98 Q68,84 92,98 L108,98" stroke="' + FIG_BODY + '" stroke-width="4.5" fill="none"/>' +
    '<line x1="100" y1="98" x2="104" y2="93" stroke="' + FIG_BODY + '" stroke-width="3"/>' +
    '<line x1="106" y1="98" x2="110" y2="94" stroke="' + FIG_BODY + '" stroke-width="3"/>' +
    mobArrow(70, 82, 70, 66),

  single_leg:
    GROUND + hl(68, 96, 10) +
    '<line x1="70" y1="26" x2="70" y2="58" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="70" y1="58" x2="68" y2="80" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="68" y1="80" x2="68" y2="99" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="70" y1="58" x2="92" y2="70" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="92" y1="70" x2="88" y2="88" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="62" y1="34" x2="34" y2="46" stroke="' + FIG_BODY + '" stroke-width="4"/>' +
    '<line x1="78" y1="34" x2="106" y2="46" stroke="' + FIG_BODY + '" stroke-width="4"/>' +
    head(70, 18),

  deep_squat:
    GROUND + hl(70, 82, 13) +
    '<line x1="46" y1="99" x2="38" y2="74" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="38" y1="74" x2="70" y2="82" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="94" y1="99" x2="102" y2="74" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="102" y1="74" x2="70" y2="82" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="70" y1="82" x2="72" y2="48" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="72" y1="52" x2="98" y2="56" stroke="' + FIG_BODY + '" stroke-width="4"/>' +
    head(73, 40),

  breathing:
    GROUND +
    '<line x1="86" y1="70" x2="128" y2="70" stroke="' + FIG_DIM + '" stroke-width="3.5"/>' +
    '<line x1="90" y1="70" x2="90" y2="100" stroke="' + FIG_DIM + '" stroke-width="3"/>' +
    '<line x1="124" y1="70" x2="124" y2="100" stroke="' + FIG_DIM + '" stroke-width="3"/>' +
    hl(56, 90, 12) +
    '<line x1="30" y1="95" x2="74" y2="95" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="74" y1="95" x2="88" y2="70" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="88" y1="70" x2="118" y2="68" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<circle cx="54" cy="86" r="4.5" fill="' + FIG_BODY + '"/>' +
    head(22, 93) + mobArrow(56, 78, 56, 64),

  glute_med:
    GROUND + hl(84, 80, 11) +
    '<line x1="42" y1="90" x2="86" y2="88" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="86" y1="88" x2="106" y2="92" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="106" y1="92" x2="122" y2="94" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="86" y1="86" x2="106" y2="70" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="106" y1="70" x2="122" y2="62" stroke="' + FIG_BODY + '" stroke-width="4.5"/>' +
    '<line x1="46" y1="90" x2="38" y2="74" stroke="' + FIG_BODY + '" stroke-width="4"/>' +
    head(32, 88) + mobArrow(112, 52, 122, 44),
};

function mobilityFigure(id) {
  const body = MOB_FIGURES[id] || '';
  return '<svg class="mob-fig" viewBox="0 0 140 110" role="img" aria-label="Übungsdarstellung">' +
    '<g stroke-linecap="round" stroke-linejoin="round" fill="none">' + body + '</g></svg>';
}

// ---------- Übungsbibliothek ----------
// type: stretch (statisch halten) | mobility (in Bewegung) | activation (ansteuern) | balance

const MOB_EXERCISES = {
  catcow: {
    name: 'Katze–Kuh', target: 'Ganze Wirbelsäule', seconds: 45, sides: 1, type: 'mobility',
    why: 'Weckt die Wirbelsäule auf und bringt dir das Gefühl dafür, das Becken bewusst zu kippen – genau die Kontrolle, die dir beim Hohlkreuz fehlt.',
    cues: ['Vierfüßler: Hände unter Schultern, Knie unter Hüfte',
      'Ausatmen: Rücken rund, Steißbein einrollen, Kinn zur Brust',
      'Einatmen: Brustkorb öffnen, Blick leicht nach vorne',
      'Langsam, etwa 4 Sekunden pro Richtung'],
  },
  child_lat: {
    name: 'Kindhaltung mit Seitdehnung', target: 'Latissimus, unterer Rücken', seconds: 40, sides: 2, type: 'stretch',
    why: 'Der Latissimus zieht die Schulter nach vorne-innen. Ist er verkürzt, verengt das den Raum unter dem Schulterdach – und er zieht zusätzlich am Becken.',
    cues: ['Fersensitz, Arme lang nach vorne',
      'Beide Hände zur Seite wandern lassen, Po bleibt auf den Fersen',
      'Dehnung entlang der Flanke bis in die Achsel spüren',
      'Ruhig in die gedehnte Seite atmen'],
  },
  tspine_ext: {
    name: 'Brustwirbelsäule strecken', target: 'Obere Wirbelsäule', seconds: 45, sides: 1, type: 'mobility',
    why: 'Die wichtigste Übung für deine Schulter: Eine bewegliche Brustwirbelsäule schafft messbar mehr Platz unter dem Schulterdach. Ein runder Oberkörper klemmt die Sehne ein.',
    cues: ['Rolle oder zusammengerolltes Handtuch quer unter die Brustwirbelsäule',
      'Hände hinter den Kopf, Ellbogen locker',
      'Oberkörper langsam über die Rolle zurücksinken lassen',
      'Ohne Rolle: an der Stuhllehne strecken – Lendenwirbelsäule bleibt ruhig'],
    caution: 'Die Streckung kommt aus der Brust, nicht aus dem unteren Rücken.',
  },
  open_book: {
    name: 'Open Book (Rotation)', target: 'Brustwirbelsäule, Brustmuskel', seconds: 40, sides: 2, type: 'mobility',
    why: 'Rotation hält die Brustwirbelsäule geschmeidig und öffnet die Vorderseite – Drehfähigkeit gehört zu den ersten Dingen, die im Sitzalltag verloren gehen.',
    cues: ['Seitlage, Knie angewinkelt übereinander, unten liegender Arm vor dir',
      'Oberen Arm im großen Bogen zur anderen Seite öffnen',
      'Blick folgt der Hand, Knie bleiben liegen',
      'In der Endposition ruhig weiteratmen'],
  },
  pec_door: {
    name: 'Brustdehnung im Türrahmen', target: 'Brustmuskel, vordere Schulter', seconds: 40, sides: 2, type: 'stretch',
    why: 'Der vom Sitzen verkürzte Brustmuskel zieht deine Schultern nach vorne. Ihn zu lösen ist der direkteste Hebel gegen die vorgezogene Schulterhaltung.',
    cues: ['Unterarm am Türrahmen, Ellbogen etwa auf Brusthöhe – bewusst tiefer als die Schulter',
      'Kleiner Schritt nach vorne, Brustkorb öffnen',
      'Schulterblatt nach hinten-unten ziehen',
      'Ziehen im Brustmuskel spüren, nicht vorne in der Schulter'],
    caution: 'Ellbogen nie über Schulterhöhe – das reizt das Impingement direkt.',
  },
  lat_stretch: {
    name: 'Latissimus-Dehnung', target: 'Latissimus, Achsel', seconds: 40, sides: 2, type: 'stretch',
    why: 'Ein verkürzter Latissimus verhindert, dass der Arm sauber nach oben geht – der Körper weicht dann ins Hohlkreuz aus. Zwei deiner Baustellen auf einmal.',
    cues: ['Knien, Unterarme auf Bank, Stuhl oder Sofakante',
      'Po Richtung Fersen schieben, Brustkorb sinken lassen',
      'Rippen bewusst geschlossen halten – nicht ins Hohlkreuz fallen',
      'Dehnung seitlich am Rücken bis zur Achsel'],
  },
  neck_lev: {
    name: 'Nacken-Dehnung', target: 'Schulterheber, Kapuzenmuskel', seconds: 35, sides: 2, type: 'stretch',
    why: 'Diese Muskeln übernehmen bei vorgezogenen Schultern die Arbeit und werden dauerhaft hart – typischer Bürositz-Nacken.',
    cues: ['Aufrecht sitzen, eine Hand greift unter den Stuhl (fixiert die Schulter)',
      'Kopf zur Gegenseite neigen, dann Blick zur Achsel drehen',
      'Freie Hand legt sich locker auf den Kopf – ohne zu ziehen',
      'Nur das Eigengewicht der Hand arbeiten lassen'],
  },
  chin_tuck: {
    name: 'Kinn-Nicken', target: 'Tiefe Nackenmuskeln', seconds: 40, sides: 1, type: 'activation',
    why: 'Kräftigt die tiefen Halsmuskeln, die den Kopf über dem Rumpf halten. Ein vorgeschobener Kopf zieht die Schultern automatisch mit nach vorne.',
    cues: ['Aufrecht sitzen oder mit dem Rücken an der Wand',
      'Kinn gerade nach hinten schieben – als würdest du ein Doppelkinn machen',
      'Blick bleibt waagrecht, kein Nicken nach unten',
      '5 Sekunden halten, lösen, wiederholen'],
  },
  wall_angel: {
    name: 'Wall Angels', target: 'Schulterblätter, obere Wirbelsäule', seconds: 45, sides: 1, type: 'mobility',
    why: 'Trainiert genau die Bewegung, die beim Impingement fehlt: das Schulterblatt dreht mit nach oben, statt dass der Oberarmkopf allein hochwandert.',
    cues: ['Rücken, Kopf und Po an der Wand, Füße etwas vor der Wand',
      'Arme in W-Position, Handrücken möglichst an der Wand',
      'Langsam nach oben schieben, so weit es ohne Hohlkreuz geht',
      'Unterer Rücken bleibt flach – lieber kleiner Weg als Ausweichen'],
    caution: 'Nur so hoch, wie es schmerzfrei bleibt. Weniger Weg ist besser als ausweichen.',
  },
  serratus_wall: {
    name: 'Serratus-Schub an der Wand', target: 'Vorderer Sägemuskel', seconds: 40, sides: 1, type: 'activation',
    why: 'Der Sägemuskel hält das Schulterblatt an der Rippe und dreht es beim Armheben mit. Ist er schwach, klemmt es – ein Kernstück der Impingement-Reha.',
    cues: ['Unterarme an die Wand, Ellbogen unter Schulterhöhe',
      'Aktiv gegen die Wand schieben – oberer Rücken wird leicht rund',
      'Dann Schulterblätter wieder zusammen sinken lassen',
      'Langsam, die Bewegung ist klein'],
  },
  hipflexor: {
    name: 'Hüftbeuger-Dehnung', target: 'Hüftbeuger, vorderer Oberschenkel', seconds: 45, sides: 2, type: 'stretch',
    why: 'DIE Übung gegen dein Hohlkreuz. Vom Sitzen verkürzte Hüftbeuger ziehen dein Becken nach vorne-unten – der untere Rücken wird ins Hohlkreuz gezwungen.',
    cues: ['Halbkniestand, hinteres Knie auf einer Unterlage',
      'ZUERST Steißbein einrollen (Becken aufrichten) – das ist der ganze Trick',
      'Erst dann leicht nach vorne schieben, Gesäß der hinteren Seite anspannen',
      'Dehnung vorne in der Hüfte, nicht im unteren Rücken'],
    caution: 'Spürst du es im Kreuz statt in der Hüfte: Becken stärker aufrichten, weniger weit nach vorne.',
  },
  hamstring: {
    name: 'Beinrückseite dehnen', target: 'Ischiocrurale Muskulatur', seconds: 40, sides: 2, type: 'stretch',
    why: 'Hält die Hüfte rundum beweglich und verbessert das Vorbeugen aus der Hüfte statt aus dem Rücken – Rückenschutz für jeden Alltagsgriff.',
    cues: ['Ferse auf eine niedrige Stufe oder Bank, Bein fast gestreckt',
      'Aus der Hüfte nach vorne kippen, Rücken bleibt LANG',
      'Brustbein Richtung Fuß, nicht die Nase zum Knie',
      'Zehenspitze leicht anziehen verstärkt die Dehnung'],
  },
  glute_bridge: {
    name: 'Glute Bridge', target: 'Gesäßmuskulatur', seconds: 40, sides: 1, type: 'activation',
    why: 'Starkes Gesäß zieht das Becken hinten nach unten und richtet es auf – der aktive Gegenspieler zum Hohlkreuz. Außerdem stabilisiert es dein Becken beim Gehen.',
    cues: ['Rückenlage, Füße hüftbreit, Fersen nah am Po',
      'Erst Steißbein einrollen, DANN Hüfte heben',
      'Oben Gesäß fest anspannen, Rippen unten lassen',
      'Der Schub kommt aus dem Gesäß, nicht aus dem unteren Rücken'],
  },
  deadbug_ppt: {
    name: 'Dead Bug', target: 'Tiefe Bauchmuskulatur', seconds: 45, sides: 1, type: 'activation',
    why: 'Bringt der Rumpfmuskulatur bei, das Becken zu halten, während die Gliedmaßen arbeiten. Genau das fehlt beim Hohlkreuz im Alltag.',
    cues: ['Rückenlage, Arme senkrecht, Beine im rechten Winkel angehoben',
      'Unteren Rücken flach in den Boden drücken – bleibt die ganze Zeit so',
      'Gegengleich Arm und Bein langsam ausstrecken',
      'Hebt sich das Kreuz: kleinerer Bewegungsweg'],
  },
  pelvic_tilt: {
    name: 'Beckenkippen', target: 'Beckensteuerung', seconds: 40, sides: 1, type: 'activation',
    why: 'Die Grundübung: Du lernst zu spüren, wo neutral ist. Ohne dieses Gefühl bringt jede andere Hohlkreuz-Übung wenig.',
    cues: ['Rückenlage, Knie angewinkelt, Füße am Boden',
      'Becken langsam kippen: Kreuz flach drücken, dann wieder Hohlkreuz',
      'Ganz langsam zwischen beiden Extremen wandern',
      'Zum Schluss die Mitte suchen und dort ruhig atmen'],
  },
  piriformis: {
    name: 'Piriformis (Vierer-Dehnung)', target: 'Tiefe Hüft-Außenrotatoren', seconds: 40, sides: 2, type: 'stretch',
    why: 'Direkt gegen deinen Auswärtsgang: Diese Muskeln drehen das Bein nach außen. Sind sie fest, stellt sich der Fuß dauerhaft nach außen.',
    cues: ['Rückenlage, Fußknöchel auf das gegenüberliegende Knie legen (Vierer)',
      'Mit beiden Händen hinter dem unteren Oberschenkel greifen und heranziehen',
      'Kopf und Schultern bleiben entspannt am Boden',
      'Dehnung tief im Gesäß der oben liegenden Seite'],
  },
  hip_ir: {
    name: 'Hüft-Innenrotation', target: 'Hüftkapsel, Innenrotation', seconds: 45, sides: 2, type: 'mobility',
    why: 'Der zweite Schlüssel gegen den Entengang: Fehlt die Innenrotation, kann die Hüfte beim Gehen nicht nach vorne abrollen und weicht nach außen aus.',
    cues: ['Auf einem Stuhl sitzen, Knie hüftbreit',
      'Einen Unterschenkel nach AUSSEN schwenken – das dreht die Hüfte nach innen',
      'Knie bleibt an Ort und Stelle, Becken bleibt gerade',
      'Langsam pendeln und die Endposition kurz halten'],
  },
  adductor: {
    name: 'Adduktoren-Dehnung', target: 'Innenseite Oberschenkel', seconds: 40, sides: 2, type: 'stretch',
    why: 'Die Innenseite arbeitet beim Gehen mit an der Beinführung. Beweglich gehalten, unterstützt sie eine gerade Schrittspur.',
    cues: ['Breiter Stand, Gewicht auf eine Seite verlagern',
      'Ein Knie beugen, das andere Bein bleibt gestreckt',
      'Fußspitze des gestreckten Beins zeigt nach vorne',
      'Rücken lang, Gesäß nach hinten schieben'],
  },
  calf_wall: {
    name: 'Sprunggelenk / Wade', target: 'Wade, Sprunggelenk', seconds: 40, sides: 2, type: 'stretch',
    why: 'Unterschätzter Grund für Auswärtsgang: Kommt das Sprunggelenk nicht weit genug nach vorne, dreht der Fuß beim Abrollen zum Ausweichen nach außen.',
    cues: ['Fuß etwa eine Handbreit vor der Wand, Zehen gerade nach vorne',
      'Knie geradeaus Richtung Wand schieben – Ferse bleibt am Boden',
      'Knie zieht über den zweiten Zeh, nicht nach innen',
      'Gelingt es leicht: Fuß weiter weg stellen'],
  },
  short_foot: {
    name: 'Fußgewölbe aktivieren', target: 'Kurze Fußmuskeln', seconds: 40, sides: 1, type: 'activation',
    why: 'Ein aktives Fußgewölbe stabilisiert die ganze Kette von unten und verbessert die Schrittspur. Nebenbei einer der besten Beiträge zur Standsicherheit im Alter.',
    cues: ['Barfuß stehen, Gewicht gleichmäßig auf Ferse, Groß- und Kleinzehenballen',
      'Fußgewölbe anheben, ohne die Zehen zu krallen',
      'Zehen dabei entspannt und gespreizt lassen',
      '5 Sekunden halten, lösen, wiederholen'],
  },
  single_leg: {
    name: 'Einbeinstand', target: 'Gleichgewicht, Hüftstabilität', seconds: 30, sides: 2, type: 'balance',
    why: 'Einer der stärksten Marker für gesundes Altern überhaupt – die Fähigkeit, sicher auf einem Bein zu stehen, sagt viel über Sturzrisiko und Selbstständigkeit aus.',
    cues: ['Auf ein Bein stellen, anderes Knie locker anheben',
      'Becken waagrecht halten – die Hüfte darf nicht abkippen',
      'Blick auf einen festen Punkt',
      'Zu leicht? Augen schließen oder auf ein Kissen stellen'],
  },
  deep_squat: {
    name: 'Tiefe Hocke halten', target: 'Hüfte, Knie, Sprunggelenk', seconds: 60, sides: 1, type: 'mobility',
    why: 'Die vielleicht ehrlichste Beweglichkeitsprüfung: Wer sich mit ganzen Füßen tief hinhocken kann, hat Hüfte, Knie und Sprunggelenke im Griff. Genau diese Position geht im Sitzalltag verloren.',
    cues: ['Füße etwa schulterbreit, Zehen leicht nach außen',
      'So tief hocken wie möglich, Fersen bleiben am Boden',
      'Ellbogen innen an den Knien, Brust aufrichten',
      'Fersen heben ab? An einer Türklinke festhalten oder Ferse leicht erhöhen'],
  },
  breathing: {
    name: 'Ruhige Bauchatmung', target: 'Zwerchfell, Rippenstellung', seconds: 60, sides: 1, type: 'activation',
    why: 'Bei Hohlkreuz steht der Brustkorb oft nach vorne-oben gekippt. Ruhige Ausatmung bringt die Rippen zurück nach unten – und schaltet nach dem Training auf Erholung um.',
    cues: ['Rückenlage, Unterschenkel auf einem Stuhl oder Sofa',
      'Eine Hand auf die unteren Rippen, eine auf den Bauch',
      '4 Sekunden durch die Nase ein – Rippen weiten sich seitlich',
      '6–8 Sekunden lang durch den Mund aus, Rippen sinken nach unten'],
  },
  glute_med: {
    name: 'Seitliches Beinheben', target: 'Mittlerer Gesäßmuskel', seconds: 40, sides: 2, type: 'activation',
    why: 'Der mittlere Gesäßmuskel hält beim Gehen das Becken waagrecht. Ist er schwach, weichen Fuß und Bein nach außen aus – ein direkter Beitrag zum Entengang.',
    cues: ['Seitlage, Beine gestreckt übereinander, Körper in einer Linie',
      'Oberes Bein leicht nach hinten und nach oben heben',
      'Fußspitze zeigt nach vorne oder minimal nach unten – nicht nach oben drehen',
      'Langsam heben und senken, Becken bleibt ruhig'],
  },
};

// ---------- Programme ----------

const MOB_ROUTINES = [
  {
    key: 'express', name: 'Express', icon: '⚡', focus: ['shoulder', 'hips'],
    desc: 'Die fünf wirksamsten Übungen für deine Baustellen – wenn wenig Zeit ist.',
    exercises: ['tspine_ext', 'pec_door', 'hipflexor', 'piriformis', 'calf_wall'],
  },
  {
    key: 'shoulder', name: 'Schulter & Haltung', icon: '🎯', focus: ['shoulder'],
    desc: 'Gegen Impingement und vorgezogene Schultern: Brust und Latissimus lösen, Brustwirbelsäule strecken, Schulterblatt ansteuern.',
    exercises: ['tspine_ext', 'open_book', 'pec_door', 'lat_stretch', 'neck_lev', 'chin_tuck', 'serratus_wall', 'wall_angel'],
  },
  {
    key: 'hips', name: 'Hüfte, Rücken & Gang', icon: '🦵', focus: ['hips'],
    desc: 'Gegen Hohlkreuz und Auswärtsgang: Hüftbeuger lösen, Gesäß und Rumpf aktivieren, Innenrotation und Sprunggelenk öffnen.',
    exercises: ['pelvic_tilt', 'hipflexor', 'glute_bridge', 'deadbug_ppt', 'hamstring', 'piriformis', 'hip_ir', 'adductor', 'calf_wall', 'glute_med', 'short_foot'],
  },
  {
    key: 'full', name: 'Longevity komplett', icon: '🌿', focus: ['shoulder', 'hips', 'longevity'],
    desc: 'Das ganze Programm: alle vier Baustellen plus Gleichgewicht, tiefe Hocke und Atmung. Einmal pro Woche ideal.',
    exercises: ['catcow', 'tspine_ext', 'open_book', 'pec_door', 'lat_stretch', 'chin_tuck', 'serratus_wall',
      'hipflexor', 'glute_bridge', 'deadbug_ppt', 'hamstring', 'piriformis', 'hip_ir', 'adductor',
      'calf_wall', 'short_foot', 'deep_squat', 'single_leg', 'child_lat', 'breathing'],
  },
];

function mobRoutine(key) {
  return MOB_ROUTINES.find((r) => r.key === key);
}

// Flache Schrittliste: beidseitige Übungen ergeben zwei Schritte
function mobilitySteps(routine) {
  const steps = [];
  routine.exercises.forEach((id) => {
    const ex = MOB_EXERCISES[id];
    if (!ex) return;
    if (ex.sides === 2) {
      steps.push({ exId: id, side: 'Linke Seite', seconds: ex.seconds, prep: MOB_PREP });
      steps.push({ exId: id, side: 'Rechte Seite', seconds: ex.seconds, prep: MOB_PREP_SIDE });
    } else {
      steps.push({ exId: id, side: null, seconds: ex.seconds, prep: MOB_PREP });
    }
  });
  return steps;
}

function mobilityDuration(routine) {
  return mobilitySteps(routine).reduce((sum, s) => sum + s.seconds + s.prep, 0);
}

// Punkte: 5 pro angefangener Minute, mindestens 20
function mobilityPoints(totalSeconds) {
  return Math.max(20, Math.round(totalSeconds / 60) * 5);
}

// ---------- Dehn-Coach: wie oft und was heute ----------
// Wissenschaftlicher Hintergrund für die Empfehlung von 3× pro Woche:
// Für echte Beweglichkeitsgewinne braucht eine Muskelgruppe etwa 5 Minuten
// Dehnzeit pro Woche – verteilt auf mehrere Einheiten wirkt das besser als
// alles an einem Tag. Unter 2× pro Woche geht kaum etwas voran, über 4× wird
// der Zugewinn spürbar kleiner. Haltungsveränderung braucht zusätzlich
// Kräftigung und Monate an Konstanz – deshalb zählt Regelmäßigkeit mehr als Länge.

const MOB_GOAL_DEFAULT = 3;
const MOB_FOCUS_LABELS = { shoulder: 'Schulter', hips: 'Hüfte & Gang', longevity: 'Longevity' };

function mobilityGoalOf(state) {
  return state.mobilityGoal || MOB_GOAL_DEFAULT;
}

function mobilityWeekCount(state) {
  const wk = isoWeek(new Date().toISOString());
  return (state.mobilityLogs || []).filter((l) => isoWeek(l.date) === wk).length;
}

// Wochen in Folge, in denen das Dehnziel erreicht wurde
function mobilityStreak(state) {
  const counts = {};
  for (const l of state.mobilityLogs || []) {
    const wk = isoWeek(l.date);
    counts[wk] = (counts[wk] || 0) + 1;
  }
  const goal = mobilityGoalOf(state);
  let streak = (counts[isoWeek(new Date().toISOString())] || 0) >= goal ? 1 : 0;
  const d = new Date();
  for (let i = 1; i < 300; i++) {
    d.setDate(d.getDate() - 7);
    if ((counts[isoWeek(d.toISOString())] || 0) >= goal) streak++;
    else break;
  }
  return streak;
}

// Wie viele Tage ist jeder Schwerpunkt her? null = noch nie
function mobilityFocusAges(state) {
  const ages = { shoulder: null, hips: null, longevity: null };
  for (const log of state.mobilityLogs || []) {
    const r = mobRoutine(log.routineKey);
    if (!r) continue;
    const days = Math.floor((Date.now() - new Date(log.date).getTime()) / 86400000);
    for (const f of r.focus || []) {
      if (ages[f] == null || days < ages[f]) ages[f] = days;
    }
  }
  return ages;
}

// Welches Programm ist heute dran – und warum?
function mobilityCoach(state) {
  const goal = mobilityGoalOf(state);
  const week = mobilityWeekCount(state);
  const ages = mobilityFocusAges(state);
  const total = (state.mobilityLogs || []).length;
  const age = (f) => (ages[f] == null ? 999 : ages[f]);

  if (!total) {
    return {
      key: 'express', tone: 'neutral', headline: 'Fang mit dem Express-Programm an',
      advice: 'Sieben Minuten genügen für den Einstieg. Entscheidend ist nicht die Länge, sondern dass du wiederkommst – ' +
        goal + '× pro Woche ist dein Ziel.',
    };
  }

  const oldest = Math.min(age('shoulder'), age('hips'));
  if (oldest >= 14) {
    return {
      key: 'express', tone: 'warn', headline: 'Zeit für einen Neustart',
      advice: 'Die letzte Einheit ist ' + oldest + ' Tage her. Steig niederschwellig wieder ein – ' +
        'sieben Minuten heute sind mehr wert als ein perfektes Programm irgendwann.',
    };
  }

  if (age('shoulder') >= 7 && age('hips') >= 7) {
    return {
      key: 'full', tone: 'warn', headline: 'Beide Bereiche sind fällig',
      advice: 'Schulter und Hüfte waren länger als eine Woche nicht dran. Das komplette Programm deckt beides ab – ' +
        'und nimmt Gleichgewicht und tiefe Hocke gleich mit.',
    };
  }
  if (age('shoulder') >= 7) {
    return {
      key: 'shoulder', tone: 'warn', headline: 'Deine Schulter ist dran',
      advice: 'Seit ' + age('shoulder') + ' Tagen keine Schulterarbeit. Genau die Brustwirbelsäulen-Streckung und die ' +
        'Schulterblatt-Ansteuerung schaffen den Platz unter dem Schulterdach – das verliert sich schnell wieder.',
    };
  }
  if (age('hips') >= 7) {
    return {
      key: 'hips', tone: 'warn', headline: 'Hüfte und Gang sind dran',
      advice: 'Seit ' + age('hips') + ' Tagen keine Hüftarbeit. Gegen Hohlkreuz und Auswärtsgang zählt vor allem ' +
        'Regelmäßigkeit – die Hüftbeuger verkürzen beim Sitzen jeden Tag aufs Neue.',
    };
  }
  if (age('longevity') >= 12) {
    return {
      key: 'full', tone: 'neutral', headline: 'Einmal das große Programm',
      advice: 'Schulter und Hüfte sind frisch – aber Gleichgewicht, tiefe Hocke und Atmung waren ' +
        (age('longevity') === 999 ? 'noch nie' : 'seit ' + age('longevity') + ' Tagen nicht') + ' dran. ' +
        'Einmal pro Woche komplett hält alles beisammen.',
    };
  }

  if (week < goal) {
    const key = age('shoulder') >= age('hips') ? 'shoulder' : 'hips';
    return {
      key, tone: 'neutral', headline: 'Noch ' + (goal - week) + ' Einheit' + (goal - week > 1 ? 'en' : '') + ' diese Woche',
      advice: 'Du liegst bei ' + week + ' von ' + goal + '. Am längsten her ist ' +
        (key === 'shoulder' ? 'die Schulterarbeit' : 'die Hüftarbeit') + ' – die nehmen wir als Nächstes.',
    };
  }

  return {
    key: 'express', tone: 'good', headline: 'Wochenziel geschafft! 🌿',
    advice: week + ' von ' + goal + ' Einheiten erledigt und beide Bereiche frisch. Alles Weitere ist Bonus – ' +
      'öfter dehnen schadet nie, bringt aber ab hier weniger Zugewinn als Schlaf und Konstanz.',
  };
}

// Soll auf der Startseite an eine Einheit erinnert werden?
function mobilityDue(state) {
  const logs = state.mobilityLogs || [];
  if (!logs.length) return state.logs.length >= 2;
  const days = (Date.now() - new Date(logs[logs.length - 1].date).getTime()) / 86400000;
  return days >= 7;
}

const MOB_QUOTES = [
  'Beweglichkeit ist die Freiheit, die du im Alter am meisten vermisst. Heute investiert. 🌿',
  'Zehn Minuten Dehnen schlagen jede Ausrede. Erledigt!',
  'Deine Schulter dankt dir – Platz unter dem Schulterdach entsteht genau hier.',
  'Genau diese Einheiten machen den Unterschied zwischen beweglich bleiben und steif werden.',
  'Nicht spektakulär, aber wirksam. Das ist der Stoff, aus dem Langlebigkeit gemacht ist.',
  'Gut gemacht! Haltung verändert sich nicht in einer Woche – aber in vielen davon.',
];
