// score.js — Retention score 0-100 for a parsed Flare timeline.
//
// MOTOR DE RETENCIÓN UNIFICADO (2026-11-21, Ronda 1). Las mismas reglas,
// con los mismos números, viven en skills/examples-check.mjs y en
// web/app.js (computeRetention). Si cambias una regla aquí, cámbiala en
// los tres sitios y re-verifica con los probes de /tmp/flare-j3
// (captions 60% -> 79/100; safe zones 0% -> 75/100).
//
//   Hook (30):     primera escena empieza en 0, tiene texto de hook
//                  (clase "hook" o headline <h1>/<h2>) y dura <= 2.5s
//                  y hay motion (GSAP o animación CSS) -> 30.
//                  Hook presente pero duración > 2.5s o sin motion -> 15.
//                  Sin hook -> 0.
//   Captions (25): cobertura = UNIÓN de intervalos de captions /
//                  duración total. score = min(25, 25 * cobertura / 0.8).
//   Cortes (20):   20 * (clips con duración entre 2s y 4s incl. / clips).
//   CTA (15):      CTA presente en los últimos 3s y visible >= 2s -> 15;
//                  si visible < 2s -> 15 * visible / 2; sin CTA -> 0.
//   Safe zones (10): 10 si todos los captions y el CTA están dentro de
//                  las safe zones (margen 10% arriba/abajo según formato);
//                  si no, 10 * (elementos dentro / elementos totales).
//   Etiquetas: >= 75 "Sólido · listo para publicar", 50-74
//                  "Necesita trabajo", < 50 "Débil".
//   Los scores fraccionarios se redondean al entero más cercano.
//
// Safe zones — chequeo de POSICIÓN REAL (no de substrings): se lee la
// posición vertical declarada (top/bottom, en % o px) del estilo inline
// del elemento, y si no la declara, de su regla CSS .caption/.cta
// (parse.js ya fusiona ambas en `posStyle`, inline manda). Un elemento
// está DENTRO si todos sus anclajes verticales declarados están a >= 10%
// del borde; está FUERA si algún anclaje está a < 10%. Si un elemento NO
// declara ningún anclaje vertical (ni top ni bottom), su posición NO se
// puede determinar y se cuenta como FUERA (criterio conservador
// documentado: el scorer nunca regala el 10 por no poder verificarlo).
// Limitación conocida: se comprueba el borde anclado declarado, no la
// caja renderizada (p. ej. un top:45% con un texto muy alto podría
// desbordar hacia arriba sin que el scorer lo vea; eso se verifica en
// el preview visual).
//
// Scoring is deterministic and purely structural: it reads the parsed
// timeline (data-* attributes + inline/class styles), never a rendered frame.

export const SAFE_MARGIN_PCT = 10;

export function verdictLabel(score) {
  if (score >= 75) return 'Sólido · listo para publicar';
  if (score >= 50) return 'Necesita trabajo';
  return 'Débil';
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

// Parse the LAST occurrence of top/bottom in a declaration string
// (last wins, as in CSS when a class rule and an inline style merge).
// The property must start the string or follow a ';' — otherwise
// `margin-top:20px` or `padding-bottom:…` would fake a `top`/`bottom`
// anchor (that exact bug flagged real CTAs as unsafe in Ronda 1).
// Returns { top: {value, unit} | null, bottom: {...} | null }.
export function parsePosition(styleText = '') {
  const out = { top: null, bottom: null };
  for (const prop of ['top', 'bottom']) {
    // Unit may be omitted for zero (`bottom:0` is valid CSS = 0%).
    const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([\\d.]+)\\s*(%|px)?`, 'gi');
    let m;
    while ((m = re.exec(styleText)) !== null) {
      out[prop] = { value: Number(m[1]), unit: m[2] || (Number(m[1]) === 0 ? '%' : 'px') };
    }
  }
  return out;
}

// 'inside' | 'outside' | 'unknown' for one element, given the frame height.
// Unknown = no vertical anchor declared at all.
export function assessElementSafe(styleText = '', height = null) {
  const pos = parsePosition(styleText);
  if (!pos.top && !pos.bottom) return 'unknown';
  for (const anchor of [pos.top, pos.bottom]) {
    if (!anchor) continue;
    const pct = anchor.unit === '%'
      ? anchor.value
      : (height ? (anchor.value / height) * 100 : null);
    if (pct === null) return 'unknown';
    if (pct < SAFE_MARGIN_PCT) return 'outside';
  }
  return 'inside';
}

// Safe-zones rule for a list of elements ({id, posStyle|style}).
// Unknown counts as outside (conservative, see header).
export function scoreSafeZones(elements, height) {
  let inside = 0;
  let unknown = 0;
  const outsideIds = [];
  for (const el of elements) {
    const verdict = assessElementSafe(el.posStyle ?? el.style ?? '', height);
    if (verdict === 'inside') inside += 1;
    else {
      if (verdict === 'unknown') unknown += 1;
      outsideIds.push(el.id || '(sin id)');
    }
  }
  const total = elements.length;
  const points = total === 0 ? 10 : Math.round(10 * (inside / total));
  return { points, inside, total, unknown, outsideIds };
}

function hasMovement(scene, timeline) {
  const hay = `${scene.text} ${timeline.source}`.toLowerCase();
  // Motion = GSAP (gsap./timeline) o animación CSS (@keyframes/animation).
  // El fixture de test no tiene GSAP: su único motion es el @keyframes
  // `pulse` en CSS, y su score fijado es 80/100, así que la animación CSS
  // cuenta como motion; un "solo GSAP" rompería ese fixture.
  if (/animation|@keyframes|gsap\.|data-animate|data-motion/.test(hay)) return true;
  return false;
}

export function scoreTimeline(t) {
  const checks = [];
  const duration = t.duration || 0;

  // --- 1. Hook: primera escena en 0, con hook, <= 2.5s, con motion, 30 pts
  let hookPoints = 0;
  let hookDetail = 'Sin hook: la primera escena no empieza en 0 o no tiene texto de hook (clase "hook" o headline).';
  if (duration > 0 && t.scenes.length > 0) {
    const first = [...t.scenes].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))[0];
    const startsAtZero = (first.start ?? null) === 0;
    const hookPresent = startsAtZero && !!first.hasHookText;
    const shortEnough = first.duration !== null && first.duration <= 2.5;
    const motion = hasMovement(first, t);
    if (hookPresent && shortEnough && motion) {
      hookPoints = 30;
      hookDetail = `Hook en la primera escena (empieza en 0, dura ${first.duration}s <= 2.5s) con motion.`;
    } else if (hookPresent) {
      hookPoints = 15;
      const why = [];
      if (!shortEnough) why.push(`la primera escena dura ${first.duration ?? '?'}s (> 2.5s)`);
      if (!motion) why.push('sin motion (ni GSAP ni animación CSS)');
      hookDetail = `Hook presente pero parcial: ${why.join(' y ')}.`;
    }
  }
  checks.push({ id: 'hook', label: 'Hook (primera escena en 0, <= 2.5s, con motion)', max: 30, points: hookPoints, pass: hookPoints === 30, detail: hookDetail });

  // --- 2. Captions: unión de intervalos, 25 pts ------------------------
  let captionCoverage = 0;
  if (duration > 0) {
    const intervals = t.captions
      .filter((c) => c.start !== null && c.duration !== null)
      .map((c) => [c.start, c.start + c.duration])
      .sort((a, b) => a[0] - b[0]);
    let covered = 0;
    let cur = null;
    for (const [s, e] of intervals) {
      if (!cur) { cur = [s, e]; continue; }
      if (s <= cur[1]) cur[1] = Math.max(cur[1], e);
      else { covered += cur[1] - cur[0]; cur = [s, e]; }
    }
    if (cur) covered += cur[1] - cur[0];
    captionCoverage = Math.min(1, covered / duration);
  }
  const captionPoints = Math.min(25, Math.round(25 * (captionCoverage / 0.8)));
  checks.push({
    id: 'captions', label: 'Captions cubren >= 80% de la duración (unión)', max: 25, points: captionPoints,
    pass: captionCoverage >= 0.8,
    detail: `Captions cubren ${(captionCoverage * 100).toFixed(0)}% de ${duration}s (${t.captions.length} caption(s)); score = min(25, 25 * cobertura / 0.8).`,
  });

  // --- 3. Cortes 2-4s, 20 pts --------------------------------------------
  const clips = t.clips.filter((c) => c.duration !== null);
  let cutsPoints = 0;
  let cutsDetail = 'No clips/scenes with a duration to evaluate.';
  if (clips.length > 0) {
    const inRange = clips.filter((c) => c.duration >= 2 && c.duration <= 4).length;
    cutsPoints = Math.round(20 * (inRange / clips.length));
    cutsDetail = `${inRange}/${clips.length} cut(s) last 2-4s (durations: ${clips.map((c) => `${c.duration}s`).join(', ')}).`;
  }
  checks.push({ id: 'cuts', label: 'Cortes de 2-4s', max: 20, points: cutsPoints, pass: cutsPoints === 20, detail: cutsDetail });

  // --- 4. CTA en los últimos 3s, visible >= 2s, 15 pts ------------------
  let ctaPoints = 0;
  let ctaDetail = 'No CTA element found.';
  if (duration > 0 && t.ctas.length > 0) {
    const best = Math.max(...t.ctas.map((c) => {
      if (c.start === null || c.duration === null) return 0;
      return overlap(c.start, c.start + c.duration, duration - 3, duration);
    }));
    if (best >= 2) { ctaPoints = 15; ctaDetail = `CTA visible ${best}s dentro de los últimos 3s.`; }
    else if (best > 0) { ctaPoints = Math.round(15 * (best / 2)); ctaDetail = `CTA visible solo ${best}s dentro de los últimos 3s (necesita >= 2s).`; }
    else { ctaDetail = 'CTA exists but is never visible in the last 3s.'; }
  }
  checks.push({ id: 'cta', label: 'CTA en los últimos 3s, visible >= 2s', max: 15, points: ctaPoints, pass: ctaPoints === 15, detail: ctaDetail });

  // --- 5. Safe zones (posición real, margen 10%), 10 pts ----------------
  const elements = [...t.captions, ...t.ctas];
  const safe = scoreSafeZones(elements, t.height);
  const safeDetail = safe.total === 0
    ? 'No hay captions ni CTA que comprobar (se puntúa 10 por vacío).'
    : safe.outsideIds.length === 0
      ? `Los ${safe.total} elemento(s) (captions + CTA) están dentro de las safe zones (margen 10% arriba/abajo).`
      : `${safe.inside}/${safe.total} dentro de safe zones; fuera o sin posición determinable: ${safe.outsideIds.join(', ')}${safe.unknown ? ` (${safe.unknown} sin anclaje vertical declarado: se cuenta como fuera, criterio conservador).` : ''}`;
  checks.push({
    id: 'safe-zones', label: 'Safe zones (posición real, margen 10%)', max: 10, points: safe.points,
    pass: safe.points === 10,
    detail: safeDetail,
  });

  const total = checks.reduce((acc, c) => acc + c.points, 0);
  return { score: total, max: 100, checks, duration, compositionId: t.compositionId, verdict: verdictLabel(total) };
}
