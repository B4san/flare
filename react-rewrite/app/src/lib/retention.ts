// Flare — motor de retención (port de web/app.js computeRetention +
// renderer/lib/score.js, mismas reglas y mismos números).
//
// REGLAS (idénticas en los tres sitios):
//   Hook 30 · Captions 25 · Cortes 20 · CTA 15 · Safe zones 10 = 100.
//   Umbral de "listo": >= 75.
//
// DOS FUENTES DE "SAFE", SIN MEZCLARLAS (lección R6):
//   1. SAFE DEL EXPORT: se deriva del scenes.html empaquetado (?raw) con
//      las reglas .caption/.cta — es la misma medición que hace el checker
//      local (skills/examples-check.mjs). Sirve para las tarjetas de la
//      landing y como referencia. Nunca es un default: si el HTML no trae
//      reglas, el resultado es null (sin verificar), no 0.
//   2. SAFE EN VIVO: lo mide la auditoría de rects (lib/audit.ts) sobre el
//      preview real renderizado: TODOS los textos (kicker, headline, sub,
//      mid, chips, CTA, caption) dentro del margen 10%. Es el número que
//      manda en el panel de Retención del Studio. Mientras no se ha medido,
//      safe = null → se muestra "—/10" + banner, NUNCA 0/10 (R6 B2).
//
// VEREDICTO HONESTO (R6 B9): "Listo para publicar" SOLO si todas las reglas
// pasan. Un 75/100 o 90/100 con reglas en rojo es "Casi listo · revisa los
// puntos en rojo", nunca "listo para publicar".

import type { FormatId, Scene } from './types';

export const SAFE_MARGIN_PCT = 10;

export interface RetentionItem {
  key: string;
  label: string;
  pts: number | null;
  max: number;
  pass: boolean;
  fix: string;
}

export interface RetentionResult {
  hook: number;
  captions: number;
  cuts: number;
  cta: number;
  /** null = sin medir / sin verificar (mostrar "—/10", nunca 0/10). */
  safe: number | null;
  coverage: number;
  /** null mientras safe sea null: el total no está verificado. */
  total: number | null;
  items: RetentionItem[];
  verdict: string;
  allPass: boolean;
}

export function retentionVerdict(total: number | null, allPass: boolean): string {
  if (total === null) return 'Sin verificar';
  if (allPass) return 'Listo para publicar';
  if (total >= 75) return 'Casi listo · revisa los puntos en rojo';
  if (total >= 50) return 'Necesita trabajo';
  return 'Débil';
}

/* ---------- Safe del export: parseo de posiciones CSS ---------- */

// Parsea la ÚLTIMA ocurrencia de top/bottom (last wins, como en CSS).
export function parsePosition(styleText = ''): {
  top: { value: number; unit: string } | null;
  bottom: { value: number; unit: string } | null;
} {
  const out: {
    top: { value: number; unit: string } | null;
    bottom: { value: number; unit: string } | null;
  } = { top: null, bottom: null };
  for (const prop of ['top', 'bottom'] as const) {
    const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([\\d.]+)\\s*(%|px)?`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(styleText)) !== null) {
      out[prop] = {
        value: Number(m[1]),
        unit: m[2] || (Number(m[1]) === 0 ? '%' : 'px'),
      };
    }
  }
  return out;
}

export function assessElementSafe(
  styleText = '',
  height: number | null,
): 'inside' | 'outside' | 'unknown' {
  const pos = parsePosition(styleText);
  if (!pos.top && !pos.bottom) return 'unknown';
  for (const anchor of [pos.top, pos.bottom]) {
    if (!anchor) continue;
    const pct =
      anchor.unit === '%'
        ? anchor.value
        : height
          ? (anchor.value / height) * 100
          : null;
    if (pct === null) return 'unknown';
    if (pct < SAFE_MARGIN_PCT) return 'outside';
  }
  return 'inside';
}

function cssRuleBody(html: string, selector: string): string | null {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return null;
  const css = styleMatch[1];
  const re = new RegExp(
    selector.replace('.', '\\.') + '\\s*\\{([^}]*)\\}',
    'i',
  );
  const m = css.match(re);
  return m ? m[1] : null;
}

export interface ExportSafe {
  /** Puntos 0-10 derivados del scenes.html, o null si no se puede derivar. */
  points: number | null;
  inside: number;
  total: number;
  unknown: number;
  outsideIds: string[];
}

/**
 * Safe del export: captions + CTA según las reglas .caption/.cta del
 * scenes.html empaquetado. Misma regla que el checker local.
 * Devuelve null en points si el HTML no trae reglas (sin verificar).
 */
export function deriveExportSafe(
  scenesHtml: string,
  scenes: Scene[],
  height: number,
): ExportSafe {
  if (!scenesHtml || !scenesHtml.includes('.caption')) {
    return { points: null, inside: 0, total: 0, unknown: 0, outsideIds: [] };
  }
  const capRule = cssRuleBody(scenesHtml, '.caption');
  const ctaRule = cssRuleBody(scenesHtml, '.cta');
  const ctaScene = scenes.find((s) => s.isCTA);
  let inside = 0;
  let unknown = 0;
  const outsideIds: string[] = [];
  let total = 0;
  for (const s of scenes) {
    if (!s.caption || !(s.captionDuration || 0)) continue;
    total += 1;
    const v = capRule ? assessElementSafe(capRule, height) : 'unknown';
    if (v === 'inside') inside += 1;
    else {
      if (v === 'unknown') unknown += 1;
      outsideIds.push(s.id + ':caption');
    }
  }
  if (ctaScene) {
    total += 1;
    const v = ctaRule ? assessElementSafe(ctaRule, height) : 'unknown';
    if (v === 'inside') inside += 1;
    else {
      if (v === 'unknown') unknown += 1;
      outsideIds.push(ctaScene.id + ':cta');
    }
  }
  const points = total === 0 ? 10 : Math.round(10 * (inside / total));
  return { points, inside, total, unknown, outsideIds };
}

/* ---------- Motor de retención ---------- */

function unionCoverage(intervals: [number, number][], total: number): number {
  const sorted = intervals
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  let covered = 0;
  let cur: [number, number] | null = null;
  for (const [s, e] of sorted) {
    if (!cur) {
      cur = [s, e];
      continue;
    }
    if (s <= cur[1]) cur[1] = Math.max(cur[1], e);
    else {
      covered += cur[1] - cur[0];
      cur = [s, e];
    }
  }
  if (cur) covered += cur[1] - cur[0];
  return total ? covered / total : 0;
}

export interface ComputeRetentionOptions {
  /** Puntos de safe en vivo (auditoría) o del export. null = sin verificar. */
  safePoints: number | null;
  /** Texto del arreglo de safe cuando hay violaciones medidas. */
  safeFix?: string;
  /** Formato, solo para el texto del arreglo de safe. */
  format?: FormatId;
}

export function computeRetention(
  scenes: Scene[],
  opts: ComputeRetentionOptions,
): RetentionResult {
  const total = scenes.reduce((a, s) => a + s.duration, 0);
  const empty = (fix: string): RetentionItem[] => [
    { key: 'hook', label: 'Hook en los primeros 2 s', pts: 0, max: 30, pass: false, fix },
    { key: 'captions', label: 'Captions ≥ 80% de la duración', pts: 0, max: 25, pass: false, fix },
    { key: 'cuts', label: 'Ritmo de cortes (escenas de 2–4 s)', pts: 0, max: 20, pass: false, fix },
    { key: 'cta', label: 'CTA en los últimos 3 s, visible ≥ 2 s', pts: 0, max: 15, pass: false, fix },
    { key: 'safe', label: 'Safe zones (texto dentro del margen 10%)', pts: null, max: 10, pass: false, fix },
  ];
  if (!scenes.length || !total) {
    return {
      hook: 0, captions: 0, cuts: 0, cta: 0, safe: null, coverage: 0,
      total: null, items: empty('Carga una plantilla para empezar.'),
      verdict: 'Sin verificar', allPass: false,
    };
  }

  // 1. Hook (30): primera escena en 0, con headline, <= 2.5s, con motion.
  const first = scenes[0];
  const hasHookText = !!(first.headline && first.headline.trim());
  const hookPresent = hasHookText && first.start === 0;
  let hook = 0;
  if (hookPresent) {
    const motionOK = first.motion !== false;
    hook = first.duration <= 2.5 && motionOK ? 30 : 15;
  }

  // 2. Captions (25): unión de intervalos.
  const intervals: [number, number][] = scenes
    .filter((s) => s.caption && (s.captionDuration || 0) > 0)
    .map((s) => [s.start, s.start + Math.min(s.captionDuration, s.duration)] as [number, number]);
  const coverage = unionCoverage(intervals, total);
  const captions = Math.round(Math.min(25, (25 * coverage) / 0.8));

  // 3. Cortes (20): escenas de 2-4 s.
  const inRange = scenes.filter((s) => s.duration >= 2 && s.duration <= 4).length;
  const cuts = Math.round((20 * inRange) / scenes.length);

  // 4. CTA (15): solape del CTA con los últimos 3 s.
  const ctaScene = scenes.find((s) => s.isCTA);
  let cta = 0;
  let ctaVisible = 0;
  if (ctaScene) {
    ctaVisible = Math.max(
      0,
      Math.min(ctaScene.start + ctaScene.duration, total) -
        Math.max(ctaScene.start, total - 3),
    );
    cta = ctaVisible >= 2 ? 15 : Math.round((15 * ctaVisible) / 2);
  }

  // 5. Safe zones (10): viene de fuera (auditoría en vivo o export).
  const safe = opts.safePoints;
  const longScene = scenes.find((s) => s.duration > 4 && !s.isCTA);

  const items: RetentionItem[] = [
    {
      key: 'hook', label: 'Hook en los primeros 2 s', pts: hook, max: 30, pass: hook === 30,
      fix: hookPresent
        ? first.duration > 2.5
          ? `Acorta la primera escena de ${first.duration} s a ≤ 2,5 s para el hook completo (30 pts).`
          : 'Añade motion a la primera escena (GSAP o animación CSS).'
        : 'Abre con una pregunta o un contraste en la primera escena (empieza en 0 s).',
    },
    {
      key: 'captions', label: 'Captions ≥ 80% de la duración', pts: captions, max: 25, pass: coverage >= 0.8,
      fix: `Extiende los captions: ahora cubren el ${Math.round(coverage * 100)}%. Haz click en una escena y aplica un caption completo.`,
    },
    {
      key: 'cuts', label: 'Ritmo de cortes (escenas de 2–4 s)', pts: cuts, max: 20, pass: cuts === 20,
      fix: longScene
        ? `Recorta «${longScene.name}» de ${longScene.duration} s a 4 s o menos.`
        : 'Ajusta las duraciones a 2–4 s por escena.',
    },
    {
      key: 'cta', label: 'CTA en los últimos 3 s, visible ≥ 2 s', pts: cta, max: 15, pass: cta === 15,
      fix: ctaScene
        ? `El CTA solo es visible ${ctaVisible.toFixed(1)} s en los últimos 3 s: alarga el último clip a 3 s.`
        : 'Añade una escena CTA final en los últimos 3 s.',
    },
    {
      key: 'safe', label: 'Safe zones (texto dentro del margen 10%)', pts: safe, max: 10, pass: safe === 10,
      fix:
        safe === null
          ? 'Safe zones sin verificar: la medición en vivo aún no termina. No es un 0/10: es un dato que falta.'
          : safe === 10
            ? 'Todo el texto está dentro del margen 10%.'
            : opts.safeFix ||
              `Revisa los márgenes del 10% en formato ${opts.format || ''}.`,
    },
  ];

  const allPass = items.every((i) => i.pass);
  const totalScore = safe === null ? null : hook + captions + cuts + cta + safe;
  return {
    hook, captions, cuts, cta, safe, coverage,
    total: totalScore,
    items,
    verdict: retentionVerdict(totalScore, allPass),
    allPass,
  };
}
