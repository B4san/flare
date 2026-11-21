// Flare — auditoría en vivo de rects (criterio de aceptación R6).
//
// La aritmética estática NO es evidencia (R6: la pila real era ~100 px más
// alta de lo supuesto por los márgenes UA). Esta auditoría mide con
// getBoundingClientRect en el navegador real, escena por escena:
//   - cada texto dentro de la safe zone del 10% (kicker, headline, sub,
//     midline, chips, mid-line, CTA, caption),
//   - cada texto dentro del stage (un CTA fuera del stage es invisible),
//   - cero solapes entre textos (caption↔CTA, caption↔visual, …),
//   - visual de producto no colapsado (altura >= 20 px).
// Un 0/10 de Safe solo existe si se MIDIO y salió fuera. Si no se ha medido,
// safePoints es null → la UI muestra "—/10".

import type { FormatId, Scene } from './types';

export interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface Overlap {
  a: string;
  b: string;
  area: number;
}

export interface SceneAudit {
  sceneId: string;
  sceneName: string;
  isCTA: boolean;
  /** Rects relativos al stage (top-left del stage = 0,0). */
  elements: Record<string, Rect>;
  violations: string[];
  overlaps: Overlap[];
  insideSafe: boolean;
}

export interface TemplateAudit {
  status: 'measuring' | 'done' | 'error';
  templateSlug: string;
  format: FormatId;
  scenes: SceneAudit[];
  /** null mientras no se ha medido o si la medición falló. */
  safePoints: number | null;
  measuredAt: number;
  error?: string;
}

const TOL = 0.5; // tolerancia de subpíxel al comparar rects
const MIN_OVERLAP = 0.5; // px²: por debajo es redondeo, no solape
const MIN_VISUAL_H = 20; // px: por debajo, el visual está colapsado (R6 B6)

const TEXT_ROLES = [
  'kicker',
  'headline',
  'sub',
  'midline',
  'chips',
  'mid-line',
  'cta',
  'caption',
] as const;

const ROLE_LABEL: Record<string, string> = {
  kicker: 'kicker',
  headline: 'titular',
  sub: 'subtítulo',
  visual: 'visual',
  midline: 'midline',
  chips: 'chips',
  'mid-line': 'mid-line',
  cta: 'botón CTA',
  caption: 'caption',
};

function fmtPx(n: number): string {
  return n.toFixed(1).replace('.', ',') + ' px';
}

function fmtArea(n: number): string {
  return Math.round(n).toLocaleString('es-CR') + ' px²';
}

function intersectArea(a: Rect, b: Rect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

/** Mide el stage y todos sus [data-role] hijos, en coords relativas al stage. */
export function measureStage(stageEl: HTMLElement): {
  stage: Rect;
  elements: Record<string, Rect>;
} {
  const s = stageEl.getBoundingClientRect();
  const stage: Rect = {
    top: 0, left: 0, bottom: s.height, right: s.width, width: s.width, height: s.height,
  };
  const elements: Record<string, Rect> = {};
  stageEl.querySelectorAll<HTMLElement>('[data-role]').forEach((el) => {
    const r = el.getBoundingClientRect();
    const role = el.dataset.role as string;
    // Si un rol aparece dos veces, quedarse con el primero (no debería pasar).
    if (!elements[role]) {
      elements[role] = {
        top: r.top - s.top,
        left: r.left - s.left,
        bottom: r.bottom - s.top,
        right: r.right - s.left,
        width: r.width,
        height: r.height,
      };
    }
  });
  return { stage, elements };
}

export function auditScene(
  stage: Rect,
  elements: Record<string, Rect>,
  scene: Scene,
): SceneAudit {
  const violations: string[] = [];
  const overlaps: Overlap[] = [];
  const safeTop = stage.height * 0.1;
  const safeBottom = stage.height * 0.9;
  const safeLeft = stage.width * 0.1;
  const safeRight = stage.width * 0.9;

  // 1. Textos dentro de la safe zone del 10% y dentro del stage.
  for (const role of TEXT_ROLES) {
    const r = elements[role];
    if (!r) continue;
    const label = ROLE_LABEL[role] || role;
    if (r.top < safeTop - TOL) {
      violations.push(
        `«${label}» fuera de la safe zone superior por ${fmtPx(safeTop - r.top)}`,
      );
    }
    if (r.bottom > safeBottom + TOL) {
      violations.push(
        `«${label}» fuera de la safe zone inferior por ${fmtPx(r.bottom - safeBottom)}`,
      );
    }
    if (r.left < safeLeft - TOL) {
      violations.push(
        `«${label}» fuera de la safe zone izquierda por ${fmtPx(safeLeft - r.left)}`,
      );
    }
    if (r.right > safeRight + TOL) {
      violations.push(
        `«${label}» fuera de la safe zone derecha por ${fmtPx(r.right - safeRight)}`,
      );
    }
    if (r.top < -TOL || r.bottom > stage.height + TOL) {
      violations.push(
        `«${label}» fuera del stage (${r.top < 0 ? fmtPx(-r.top) + ' por arriba' : fmtPx(r.bottom - stage.height) + ' por abajo'}) — invisible o recortado`,
      );
    }
  }

  // 2. Visual no colapsado (R6 B6: 0–2 px en 16:9).
  const vis = elements['visual'];
  if (vis) {
    if (vis.height < MIN_VISUAL_H) {
      violations.push(`visual de producto colapsado a ${fmtPx(vis.height)}`);
    }
  }

  // 3. Solapes entre textos, y caption/CTA sobre el visual.
  const present = TEXT_ROLES.filter((r) => elements[r]);
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = present[i];
      const b = present[j];
      const area = intersectArea(elements[a], elements[b]);
      if (area > MIN_OVERLAP) {
        overlaps.push({ a, b, area });
        violations.push(
          `«${ROLE_LABEL[a]}» tapa «${ROLE_LABEL[b]}» en ${fmtArea(area)}`,
        );
      }
    }
  }
  if (vis) {
    for (const role of ['caption', 'cta'] as const) {
      const r = elements[role];
      if (!r) continue;
      const area = intersectArea(vis, r);
      if (area > MIN_OVERLAP) {
        overlaps.push({ a: 'visual', b: role, area });
        violations.push(
          `«${ROLE_LABEL[role]}» tapa el visual en ${fmtArea(area)}`,
        );
      }
    }
  }

  return {
    sceneId: scene.id,
    sceneName: scene.name,
    isCTA: !!scene.isCTA,
    elements,
    violations,
    overlaps,
    insideSafe: violations.length === 0,
  };
}

/** Safe en vivo: 10 × escenas sin violaciones / escenas totales. */
export function safePointsFromAudit(scenes: SceneAudit[]): number {
  if (!scenes.length) return 10;
  const ok = scenes.filter((s) => s.insideSafe).length;
  return Math.round((10 * ok) / scenes.length);
}

/** Margen mínimo a la safe zone superior del kicker (px, + = dentro). */
export function kickerSafeMargin(audit: SceneAudit, stageH: number): number | null {
  const k = audit.elements['kicker'];
  if (!k) return null;
  return k.top - stageH * 0.1;
}
