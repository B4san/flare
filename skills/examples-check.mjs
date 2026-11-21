// Flare — validación de ejemplos.
// Uso: node skills/examples-check.mjs [slug ...]
// Valida el contrato de escenas, duraciones, captions, CTA y calcula
// el score de retención (0-100, objetivo >=75) de cada ejemplo.
// Sale con código 1 si algún ejemplo falla una validación estructural
// o queda por debajo de 75/100. Sin dependencias npm (solo importa los
// helpers de posición de renderer/lib/score.js, para que el chequeo de
// safe zones sea EL MISMO que el del CLI `flare score`).
//
// MOTOR DE RETENCIÓN UNIFICADO (2026-11-21, Ronda 1). Las mismas reglas,
// con los mismos números, viven en renderer/lib/score.js y en
// web/app.js (computeRetention). Si cambias una regla aquí, cámbiala en
// los tres sitios y re-verifica con los probes del Juez 3
// (captions 60% -> 79/100; safe zones 0% -> 75/100).
//   Hook (30):     primera escena empieza en 0, tiene texto de hook
//                  (clase "hook" o headline <h1>/<h2>) y dura <= 2.5s
//                  y hay motion (GSAP o animación CSS) -> 30.
//                  Hook presente pero duración > 2.5s o sin motion -> 15.
//                  Sin hook -> 0.
//   Captions (25): cobertura = UNIÓN de intervalos / duración total.
//                  score = min(25, 25 * cobertura / 0.8).
//   Cortes (20):   20 * (clips de 2-4s incl. / clips totales).
//   CTA (15):      CTA en los últimos 3s y visible >= 2s -> 15;
//                  si visible < 2s -> 15 * visible / 2; sin CTA -> 0.
//   Safe zones (10): 10 si todos los captions y el CTA están dentro de
//                  las safe zones (margen 10% arriba/abajo); si no,
//                  10 * (elementos dentro / elementos totales).
//   Etiquetas: >= 75 "Sólido · listo para publicar", 50-74
//                  "Necesita trabajo", < 50 "Débil".
// Safe zones se verifica por POSICIÓN REAL (top/bottom declarado en el
// estilo inline o en la regla CSS .caption/.cta), nunca por un substring
// "10%" en el archivo: un gradiente decorativo con "10%" ya engañó una
// vez a este chequeo. Un elemento sin anclaje vertical declarado se
// cuenta como FUERA (criterio conservador documentado).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreSafeZones, verdictLabel } from "../renderer/lib/score.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = join(root, "examples");
const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(examplesDir).filter((d) => existsSync(join(examplesDir, d, "meta.json")));

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/data-([a-z-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  for (const m of tag.matchAll(/\b(id|class|style)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}
function unionCoverage(intervals) {
  const sorted = intervals.map(([s, e]) => [s, e]).sort((a, b) => a[0] - b[0]);
  let total = 0, cur = null;
  for (const [s, e] of sorted) {
    if (!cur) { cur = [s, e]; continue; }
    if (s <= cur[1]) cur[1] = Math.max(cur[1], e);
    else { total += cur[1] - cur[0]; cur = [s, e]; }
  }
  if (cur) total += cur[1] - cur[0];
  return total;
}
// Reglas CSS .caption / .cta del <style> (declaraciones concatenadas;
// las últimas mandan al parsear, igual que en el renderer).
function cssRules(html) {
  const rules = { caption: "", cta: "" };
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const r of m[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/(^|[^\w-])\.caption([^\w-]|$)/.test(r[1])) rules.caption += `${r[2]};`;
      if (/(^|[^\w-])\.cta([^\w-]|$)/.test(r[1])) rules.cta += `${r[2]};`;
    }
  }
  return rules;
}

let failed = false;

for (const slug of slugs) {
  const dir = join(examplesDir, slug);
  const errors = [];
  const notes = [];
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  const html = readFileSync(join(dir, "scenes.html"), "utf8");
  const rules = cssRules(html);

  // --- Contrato: stage ---
  const stageTag = html.match(/<div[^>]*id="stage"[^>]*>/);
  if (!stageTag) errors.push("falta <div id=\"stage\">");
  const stage = stageTag ? attrs(stageTag[0]) : {};
  if (stage["composition-id"] !== meta.slug) errors.push(`stage data-composition-id="${stage["composition-id"]}" != meta.slug "${meta.slug}"`);
  if (Number(stage.width) !== meta.width || Number(stage.height) !== meta.height)
    errors.push(`stage ${stage.width}x${stage.height} != meta ${meta.width}x${meta.height}`);
  const duration = Number(stage.duration);
  if (duration !== meta.duration) errors.push(`stage data-duration=${duration} != meta.duration=${meta.duration}`);

  // --- Clips ---
  const clipSections = [...html.matchAll(/<section[^>]*class="clip"[^>]*>([\s\S]*?)<\/section>/g)];
  const clips = [...html.matchAll(/<section[^>]*class="clip"[^>]*>/g)].map((m) => attrs(m[0]));
  if (!clips.length) errors.push("no hay clips (.clip)");
  const clipSum = clips.reduce((a, c) => a + Number(c.duration || 0), 0);
  if (Math.abs(clipSum - duration) > 0.001) errors.push(`suma de clips=${clipSum}s != duration=${duration}s`);
  let cursor = 0;
  clips.forEach((c, i) => {
    if (Number(c.start) !== cursor) errors.push(`clip ${i}: start=${c.start}, esperado ${cursor} (hueco/solape)`);
    cursor += Number(c.duration || 0);
  });
  // meta.scenes debe coincidir con los clips
  if ((meta.scenes || []).length !== clips.length) errors.push(`meta.scenes=${(meta.scenes || []).length} != clips=${clips.length}`);
  (meta.scenes || []).forEach((s, i) => {
    const c = clips[i];
    if (!c) return;
    if (Number(s.start) !== Number(c.start) || Number(s.duration) !== Number(c.duration))
      errors.push(`meta.scenes[${i}] (${s.start}+${s.duration}) != clip ${i} (${c.start}+${c.duration})`);
  });

  // --- Captions ---
  const captionTags = [...html.matchAll(/<[^>]*class="[^"]*\bcaption\b[^"]*"[^>]*>/g)].map((m) => attrs(m[0]));
  const captions = captionTags
    .filter((a) => a.start !== undefined && a.duration !== undefined)
    .map((a) => [Number(a.start), Number(a.start) + Number(a.duration)]);
  const covered = unionCoverage(captions);
  const coverage = duration ? covered / duration : 0;

  // --- CTA ---
  const ctaTag = html.match(/<[^>]*class="cta"[^>]*>/);
  const cta = ctaTag ? attrs(ctaTag[0]) : null;
  if (!cta) errors.push("falta elemento .cta");

  // --- Seek / GSAP ---
  if (!html.includes("web/vendor/gsap.min.js") && !html.includes("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js")) errors.push("falta GSAP 3.12.5 (local web/vendor/gsap.min.js o CDN)");
  if (!html.includes("paused:true") && !html.includes("paused: true")) errors.push("no hay timelines GSAP con paused:true");
  if (!html.includes("__flareSeek")) errors.push("falta window.__flareSeek");
  if (!html.includes("__flareDuration")) errors.push("falta window.__flareDuration");
  if (!html.includes("URLSearchParams") || !html.includes("get('t')")) errors.push("no lee ?t= de la URL al cargar");

  // --- Score de retención (motor unificado) ---
  // R1 Hook (30): primera escena en 0 + texto de hook + duración <= 2.5s
  // + motion (GSAP o animación CSS) -> 30; hook presente pero duración
  // > 2.5s o sin motion -> 15; sin hook -> 0.
  const firstClip = clips[0] || null;
  const firstInner = clipSections[0] ? clipSections[0][1] : "";
  const hookPresent = !!firstClip && Number(firstClip.start) === 0 &&
    (/class="[^"]*\bhook\b/.test(firstInner) || /<h[12]\b/i.test(firstInner));
  const motion = /gsap\.|@keyframes|animation\s*:/i.test(html);
  const hookShort = !!firstClip && Number(firstClip.duration) <= 2.5;
  const hookScore = hookPresent && hookShort && motion ? 30 : hookPresent ? 15 : 0;
  if (hookScore === 15) notes.push(`hook parcial (primera escena ${firstClip ? firstClip.duration : "?"}s${hookShort ? "" : " > 2.5s"}${motion ? "" : ", sin motion"})`);
  if (hookScore === 0) notes.push("sin hook en la primera escena");
  // R2 Captions (25): unión de intervalos; min(25, 25 * cobertura / 0.8)
  const capScore = Math.min(25, Math.round(25 * (coverage / 0.8)));
  // R3 Cortes (20): proporción de clips con duración entre 2s y 4s incl.
  const inRange = clips.filter((c) => Number(c.duration) >= 2 && Number(c.duration) <= 4).length;
  const cutScore = clips.length ? Math.round(20 * (inRange / clips.length)) : 0;
  // R4 CTA (15): solape con los últimos 3s; >= 2s -> 15, si no 15 * visible/2
  let ctaScore = 0;
  let ctaVisible = 0;
  if (cta && duration) {
    ctaVisible = Math.max(0, Math.min(Number(cta.start) + Number(cta.duration), duration) - Math.max(Number(cta.start), duration - 3));
    ctaScore = ctaVisible >= 2 ? 15 : ctaVisible > 0 ? Math.round(15 * (ctaVisible / 2)) : 0;
  }
  // R5 Safe zones (10): posición REAL de cada caption y del CTA
  // (estilo inline fusionado sobre la regla CSS .caption/.cta).
  // Sin anclaje vertical declarado -> fuera (conservador, ver score.js).
  const safeElements = [
    ...captionTags.map((a, i) => ({ id: `caption-${i + 1}`, posStyle: `${rules.caption};${a.style || ""}` })),
    ...(cta ? [{ id: "cta", posStyle: `${rules.cta};${cta.style || ""}` }] : []),
  ];
  const safe = scoreSafeZones(safeElements, meta.height);
  const safeScore = safe.points;
  if (safeScore < 10) notes.push(`safe zones: ${safe.inside}/${safe.total} dentro (${safe.outsideIds.join(", ")})`);

  const score = hookScore + capScore + cutScore + ctaScore + safeScore;
  const verdict = verdictLabel(score);
  if (score < 75) errors.push(`score de retención ${score}/100 < 75`);
  if (coverage < 0.8) errors.push(`captions cubren ${(coverage * 100).toFixed(0)}% < 80%`);

  const status = errors.length ? "FAIL" : "PASS";
  if (errors.length) failed = true;
  console.log(`\n[${status}] ${slug} — ${meta.title} (${meta.format} ${meta.width}x${meta.height}, ${meta.duration}s, ${clips.length} escenas)`);
  console.log(`  score retención: ${score}/100 (${verdict})  (hook ${hookScore}/30, captions ${capScore}/25, cortes ${cutScore}/20, CTA ${ctaScore}/15, safe ${safeScore}/10)`);
  console.log(`  captions: ${(coverage * 100).toFixed(0)}% de cobertura (${covered.toFixed(1)}s/${duration}s) · clips suman ${clipSum}s · CTA ${cta ? `${cta.start}+${cta.duration}s (visible ${ctaVisible}s en últimos 3s)` : "ausente"}`);
  for (const n of notes) console.log(`  nota: ${n}`);
  for (const e of errors) console.log(`  ERROR: ${e}`);
}

console.log(failed ? "\nResultado: FAIL — corrige los errores de arriba." : "\nResultado: PASS — todos los ejemplos validan y puntúan >=75/100.");
process.exit(failed ? 1 : 0);
