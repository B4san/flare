// Flare — AuditStage: la auditoría en vivo de rects.
//
// Renderiza TODAS las escenas de la plantilla+formato actual como clips
// estáticos (sin animación GSAP, estado final) en un contenedor fuera de
// pantalla, espera a que las fuentes carguen y mide cada stage con
// getBoundingClientRect. El resultado alimenta el Safe en vivo del panel de
// Retención y se expone en window.__flareAudit para jueces y verificación.
//
// Los clips de auditoría usan EL MISMO componente (PreviewClip, staticMode)
// y los MISMOS tamaños que el preview visible: la medición es del layout
// real, no de una réplica. Si la medición falla, el estado es 'error' y el
// Studio muestra "—/10 · sin verificar" (nunca un 0/10 inventado).

import { useEffect, useRef } from 'react';
import { auditScene, measureStage, safePointsFromAudit } from '../../lib/audit';
import type { TemplateAudit } from '../../lib/audit';
import type { FormatId, Scene } from '../../lib/types';
import { PreviewClip } from '../preview/PreviewClip';

declare global {
  interface Window {
    __flareAudit?: TemplateAudit | null;
  }
}

interface AuditStageProps {
  /** Escenas de sesión (con ediciones del usuario): la auditoría las sigue. */
  scenes: Scene[];
  templateSlug: string;
  format: FormatId;
  onAudit: (audit: TemplateAudit) => void;
}

export function AuditStage({ scenes, templateSlug, format, onAudit }: AuditStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuditRef = useRef(onAudit);
  onAuditRef.current = onAudit;

  useEffect(() => {
    let cancelled = false;
    const measuring: TemplateAudit = {
      status: 'measuring',
      templateSlug,
      format,
      scenes: [],
      safePoints: null,
      measuredAt: Date.now(),
    };
    onAuditRef.current(measuring);
    window.__flareAudit = measuring;

    // Pequeño debounce: las ediciones de caption crean un scenes nuevo por
    // tecla; medir 250 ms después del último cambio es suficiente.
    const timer = setTimeout(() => {
      run();
    }, 250);

    const run = async () => {
      try {
        try {
          await document.fonts.ready;
        } catch {
          /* sin fuentes: se mide con el fallback */
        }
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (cancelled || !containerRef.current) return;
        const stages = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>('[data-preview-stage="audit"]'),
        );
        if (stages.length !== scenes.length) {
          throw new Error(
            `auditoría incompleta: ${stages.length}/${scenes.length} stages renderizados`,
          );
        }
        const sceneAudits = stages.map((stageEl, i) => {
          const { stage, elements } = measureStage(stageEl);
          return auditScene(stage, elements, scenes[i]);
        });
        const done: TemplateAudit = {
          status: 'done',
          templateSlug,
          format,
          scenes: sceneAudits,
          safePoints: safePointsFromAudit(sceneAudits),
          measuredAt: Date.now(),
        };
        if (cancelled) return;
        window.__flareAudit = done;
        onAuditRef.current(done);
      } catch (e) {
        const err: TemplateAudit = {
          status: 'error',
          templateSlug,
          format,
          scenes: [],
          safePoints: null,
          measuredAt: Date.now(),
          error: e instanceof Error ? e.message : String(e),
        };
        if (cancelled) return;
        window.__flareAudit = err;
        onAuditRef.current(err);
      }
    };
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scenes, templateSlug, format]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-audit-stage-container
      style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
    >
      {scenes.map((scene) => (
        <PreviewClip
          key={scene.id}
          scene={scene}
          format={format}
          showSafeGuides={false}
          staticMode
        />
      ))}
    </div>
  );
}
