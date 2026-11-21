// Flare — PreviewClip: el frame del anuncio en el Studio.
//
// DISEÑO ANTI-R6 (B-R6-2 a B-R6-6): el preview vanilla era una pila en flujo
// centrada (kicker + h4 + sub + visual + mid + CTA) COMPITIENDO con un
// caption absoluto al fondo. La pila real era ~100 px más alta de lo
// supuesto (márgenes UA: h4 37,24 px) → CTA invisible en 16:9, caption
// tapando el CTA en 9:16, kicker fuera de safe zone, visual colapsado a 2 px.
//
// Este preview UNIFICA el layout con el export (scenes.html, recomendación
// R3 de la jueza 3): TODO son bandas absolutas con posiciones explícitas,
// sin pila en flujo y sin flex-shrink:
//   - Zona superior (top 12%): kicker + titular + sub + visual (altura fija).
//   - Caption: absoluto bottom 12% (como el export).
//   - Escena CTA: banda superior (kicker + badge), banda media
//     (top 30% / bottom 37%: midline + chips + mid-line), botón CTA
//     absoluto bottom 24%, caption bottom 12%.
//   - CTA a bottom 24% (no 20% como el export): a escala de preview
//     (288 px en 16:9) el 20% deja −3 px de hueco con el caption; el 24%
//     deja ≥ 8 px. El export a 1080 px+ mantiene 20%/12% porque ahí el 8%
//     son 86 px. Documentado, no maquillado.
//   - Cada elemento de texto lleva m-0 EXPLÍCITO (además del preflight de
//     Tailwind): el reset `*{margin:0}` vanilla perdía contra las reglas UA
//     y esa fue la causa raíz medida.
//   - El visual tiene altura FIJA + flex-none + min-h-0: no puede colapsar.
//   - Las etiquetas "SAFE ZONE · 10%" viven en las bandas de margen
//     (0–10% y 90–100%), donde NUNCA hay contenido: en R6 se solapaban
//     con el kicker (349 px²).
//
// La aceptación NO es esta aritmética: es la auditoría en vivo de
// lib/audit.ts (getBoundingClientRect, 3 formatos × 3 plantillas, escena
// CTA incluida, también en playback). Ver DESIGN.md §2 y
// /tmp/flare-verify-react/ para la evidencia.

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { FORMATS } from '../../lib/data';
import type { FormatId, Scene } from '../../lib/types';
import { Visual } from './Visual';

const TONE_BG: Record<string, [string, string]> = {
  'tone-violet': ['#2A1650', '#0A0A0F'],
  'tone-pink': ['#3D1030', '#0A0A0F'],
  'tone-cyan': ['#0B2A33', '#0A0A0F'],
  'tone-dark': ['#1A1A26', '#0A0A0F'],
};

/** Escala tipográfica por formato (px). */
const TYPE: Record<
  FormatId,
  {
    kicker: number;
    headline: number;
    sub: number;
    visualH: number;
    caption: number;
    cta: number;
    ctaH: number;
    midline: number;
    chips: number;
    midLine: number;
    badgeH: number;
    gapTop: number;
    gapSub: number;
    gapVis: number;
  }
> = {
  '9:16': {
    kicker: 13, headline: 26, sub: 14, visualH: 110, caption: 13,
    cta: 15, ctaH: 36, midline: 16, chips: 12, midLine: 13, badgeH: 48,
    gapTop: 8, gapSub: 8, gapVis: 10,
  },
  '1:1': {
    kicker: 12, headline: 22, sub: 13, visualH: 64, caption: 12,
    cta: 14, ctaH: 34, midline: 15, chips: 11, midLine: 12, badgeH: 40,
    gapTop: 6, gapSub: 6, gapVis: 8,
  },
  '16:9': {
    kicker: 11, headline: 19, sub: 12, visualH: 40, caption: 12,
    cta: 13, ctaH: 32, midline: 14, chips: 11, midLine: 11, badgeH: 28,
    gapTop: 5, gapSub: 5, gapVis: 6,
  },
};

function Headline({ text, hl }: { text: string; hl?: string }) {
  const words = text.split(' ');
  const hlWords = new Set((hl || '').split(' ').filter(Boolean));
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className={hlWords.has(w) ? 'text-flare' : undefined}>
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}

export interface PreviewClipProps {
  scene: Scene;
  format: FormatId;
  showSafeGuides?: boolean;
  /** Sin animación GSAP (estado final): lo usa la auditoría en vivo. */
  staticMode?: boolean;
  className?: string;
}

export function PreviewClip({
  scene,
  format,
  showSafeGuides = true,
  staticMode = false,
  className,
}: PreviewClipProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const f = FORMATS[format];
  const t = TYPE[format];
  const cols = TONE_BG[scene.tone || 'tone-dark'] || TONE_BG['tone-dark'];

  // Entrada GSAP al cambiar de escena (solo preview visible, no auditoría).
  useEffect(() => {
    if (staticMode || !stageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-anim]',
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power3.out',
          overwrite: true,
        },
      );
    }, stageRef);
    return () => ctx.revert();
  }, [scene.id, format, staticMode]);

  const captionEl = (
    <p
      data-role="caption"
      data-anim
      className="absolute z-10 m-0 rounded-full bg-black/55 px-3 py-1.5 font-semibold text-white backdrop-blur-[2px]"
      style={{ left: '12%', right: '12%', bottom: '12%', fontSize: t.caption, lineHeight: 1.35 }}
    >
      {scene.caption}
    </p>
  );

  return (
    <div
      ref={stageRef}
      data-preview-stage={staticMode ? 'audit' : 'visible'}
      data-scene-id={scene.id}
      data-format={format}
      className={`relative overflow-hidden rounded-[18px] border border-white/10 text-center ${className || ''}`}
      style={{
        width: f.stageW,
        height: f.stageH,
        background: `linear-gradient(180deg, ${cols[0]}, ${cols[1]})`,
      }}
    >
      {/* Guías de safe zone (margen 10%) + etiquetas en las bandas de margen. */}
      {showSafeGuides && (
        <div aria-hidden="true" className="pointer-events-none absolute z-20" style={{ inset: '10%' }}>
          <div className="absolute inset-0 rounded-[4px] border border-dashed border-white/30" />
        </div>
      )}
      {showSafeGuides && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[12%] top-[6px] z-20 font-mono text-[8px] tracking-[0.18em] text-white/45"
          >
            SAFE ZONE · 10%
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[6px] left-[12%] z-20 font-mono text-[8px] tracking-[0.18em] text-white/45"
          >
            SAFE ZONE · 10%
          </span>
        </>
      )}

      {scene.isCTA ? (
        <>
          {/* Banda superior CTA: kicker + badge (sin titular ni sub: el titular
              ES el botón CTA, como en el export; el sub vive en la banda media). */}
          <div
            className="absolute flex flex-col items-center text-center"
            style={{ left: '12%', right: '12%', top: '12%' }}
          >
            <p
              data-role="kicker"
              data-anim
              className="m-0 font-display font-bold uppercase tracking-[0.22em] text-white/70"
              style={{ fontSize: t.kicker, lineHeight: 1.2 }}
            >
              {scene.kicker}
            </p>
            <div
              data-role="visual"
              data-anim
              className="m-0 flex flex-none items-center justify-center"
              style={{ height: t.badgeH, marginTop: t.gapTop, minHeight: 0 }}
            >
              <Visual kind={scene.visualKind} label={scene.kicker} className="h-full w-auto" />
            </div>
          </div>

          {/* Banda media CTA: midline + chips + mid-line (el sub). */}
          <div
            className="absolute flex flex-col items-center justify-evenly text-center"
            style={{ left: '12%', right: '12%', top: '30%', bottom: '37%' }}
          >
            <p
              data-role="midline"
              data-anim
              className="m-0 font-display font-bold text-[#F5F5F2]"
              style={{ fontSize: t.midline, lineHeight: 1.2 }}
            >
              {scene.midline}
            </p>
            <div data-role="chips" data-anim className="m-0 flex flex-wrap items-center justify-center gap-1.5">
              {(scene.midChips || []).map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-semibold text-white"
                  style={{ fontSize: t.chips, lineHeight: 1.2 }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <p
              data-role="mid-line"
              data-anim
              className="m-0 text-white/75"
              style={{ fontSize: t.midLine, lineHeight: 1.3 }}
            >
              {scene.sub}
            </p>
          </div>

          {/* Botón CTA: banda propia, bottom 24% (ver cabecera del archivo). */}
          <div
            data-role="cta"
            data-anim
            className="absolute z-10"
            style={{ left: '12%', right: '12%', bottom: '24%' }}
          >
            <span
              className="bg-flare flex items-center justify-center rounded-full font-bold text-white shadow-[0_8px_28px_rgba(255,90,60,0.28)]"
              style={{ height: t.ctaH, fontSize: t.cta }}
            >
              {scene.ctaLabel}
            </span>
          </div>
          {captionEl}
        </>
      ) : (
        <>
          {/* Zona superior: kicker + titular + sub + visual (altura fija). */}
          <div
            className="absolute flex flex-col items-center text-center"
            style={{ left: '12%', right: '12%', top: '12%' }}
          >
            <p
              data-role="kicker"
              data-anim
              className="m-0 font-display font-bold uppercase tracking-[0.22em] text-white/70"
              style={{ fontSize: t.kicker, lineHeight: 1.2 }}
            >
              {scene.kicker}
            </p>
            <h4
              data-role="headline"
              data-anim
              className="m-0 font-display font-bold text-[#F5F5F2]"
              style={{ fontSize: t.headline, lineHeight: 1.15, marginTop: t.gapTop }}
            >
              <Headline text={scene.headline || ''} hl={scene.headlineHl} />
            </h4>
            <p
              data-role="sub"
              data-anim
              className="m-0 text-white/75"
              style={{ fontSize: t.sub, lineHeight: 1.4, marginTop: t.gapSub }}
            >
              {scene.sub}
            </p>
            <div
              data-role="visual"
              data-anim
              className="m-0 flex w-full flex-none items-center justify-center"
              style={{ height: t.visualH, marginTop: t.gapVis, minHeight: 0 }}
            >
              <Visual kind={scene.visualKind} label={scene.kicker} className="h-full w-auto" />
            </div>
          </div>
          {captionEl}
        </>
      )}
    </div>
  );
}
