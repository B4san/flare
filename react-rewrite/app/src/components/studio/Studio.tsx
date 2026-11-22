// Flare — Studio: preview + timeline + retención + agente.
//
// Ventanas flotantes (arrastrables en escritorio, apiladas en móvil), con
// TODA la funcionalidad vanilla: play/pausa/seek, 3 formatos, 3 ejemplos,
// 6 agentes CLI, 13 proveedores BYO (keys solo en localStorage) + Flare
// Cloud: el agente real del Studio, con modelo Qwen Cloud incluido vía
// proxy del servidor (/api/agent). Sin key del usuario; la key vive solo
// en variables de entorno de Vercel.
//
// DIFERENCIAS CLAVE vs vanilla (lecciones R6):
//  - Datos empaquetados en build (sin fetch, sin fallback silencioso).
//  - Safe en vivo = auditoría de rects (AuditStage); mientras no se mide,
//    "—/10" + banner. Nunca un 0/10 presentado como real.
//  - La selección de agente PERSISTE (B2): flare.studio.state incluye agentId.
//  - Duraciones desde los datos ("17,5 s", nunca "18 s") (B3).
//  - Veredicto honesto: "Listo para publicar" solo si todas las reglas
//    pasan (B9).
//  - La simulación del agente APLICA arreglos reales en la sesión
//    (acortar 1ª escena, extender captions) y el score sube de verdad (B4).
//  - El agente REAL (Flare Cloud) usa las mismas herramientas contra el
//    estado vivo del Studio; la simulación queda solo como respaldo si el
//    modelo no responde.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChatStatus, UIMessage } from 'ai';
import { AnimatedCircularProgressBar } from '../vendor/magicui/animated-circular-progress-bar';
import { SpiralLoader } from '../vendor/agent-elements/components/spiral-loader';
import {
  AGENT_ORDER,
  AGENTS,
  PROVIDER_ORDER,
  PROVIDERS,
  TEMPLATES,
  TEMPLATE_ORDER,
  formatDuration,
  sceneAt,
  totalDuration,
} from '../../lib/data';
import type { AgentId, FormatId, ProviderId, Scene } from '../../lib/types';
import { computeRetention, deriveExportSafe } from '../../lib/retention';
import type { RetentionResult } from '../../lib/retention';
import { auditScene, measureStage } from '../../lib/audit';
import type { TemplateAudit } from '../../lib/audit';
import { buildBrief } from '../../lib/brief';
import { buildStoryboardHtml, exportWebM } from '../../lib/exportVideo';
import {
  assistantTextMessage,
  bashMessage,
  editMessage,
  thinkingMessage,
  todoMessage,
  userTextMessage,
} from '../../lib/agentMessages';
import type { TodoItem } from '../../lib/agentMessages';
import {
  AGENT_TOOLS,
  buildSystemPrompt,
  historyToModelMessages,
} from '../../lib/realAgent';
import type { AgentSnapshot, AgentToolName } from '../../lib/realAgent';
import { PreviewClip } from '../preview/PreviewClip';
import { AuditStage } from './AuditStage';
import { AgentOrb } from './AgentOrb';
import type { AgentStatus } from './AgentOrb';
import { AgentPanel } from './AgentPanel';

declare global {
  interface Window {
    __flareSeek?: (t: number) => void;
    __flareDuration?: number;
    __flareMeasureCurrent?: () => unknown;
  }
}

const LS_STATE = 'flare.studio.state';
const LS_CONFIG = 'flare.provider.config';
const LS_KEYS = 'flare.provider.keys';

interface SavedStudioState {
  templateId?: string;
  format?: FormatId;
  agentId?: AgentId;
  selectedScene?: number;
}

interface LogLine {
  kind: 'info' | 'ok' | 'warn' | 'edit';
  text: string;
  tag: string;
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage no disponible: solo memoria */
  }
}

function cloneScenes(scenes: Scene[]): Scene[] {
  return scenes.map((s) => ({ ...s, midChips: s.midChips ? [...s.midChips] : undefined }));
}

/** Arreglos del agente (port de web/app.js applyAgentFixes, inmutable). */
function applyAgentFixes(
  scenes: Scene[],
  retention: RetentionResult,
  unsafeNames: string[],
): { scenes: Scene[]; fixes: string[]; notes: string[] } {
  const next = cloneScenes(scenes);
  const fixes: string[] = [];
  const notes: string[] = [];
  const first = next[0];
  if (first && retention.hook < 30 && first.duration > 2.5) {
    const old = first.duration;
    first.duration = 2;
    first.captionDuration = Math.min(first.captionDuration, first.duration);
    fixes.push(
      `Acorté la primera escena de ${old} s a 2 s para el hook completo (Hook 15 → 30). Solo en el Studio: el archivo del ejemplo no cambia.`,
    );
  }
  next.forEach((s) => {
    if (s.caption && s.captionDuration < s.duration) {
      s.captionDuration = s.duration;
      fixes.push(`Extendí el caption de «${s.name}» a ${s.duration} s (cobertura completa).`);
    }
  });
  next.forEach((s) => {
    if (s.duration > 4 && !s.isCTA) {
      const old = s.duration;
      s.duration = Math.max(4, s.duration - 1);
      s.captionDuration = Math.min(s.captionDuration, s.duration);
      fixes.push(`Acorté «${s.name}» de ${old} s a ${s.duration} s para mejorar el ritmo.`);
    }
  });
  next.forEach((s) => {
    if (!s.caption && s.captionDuration === 0) {
      notes.push(`«${s.name}» no tiene caption: la cobertura baja. Escribe uno en la Timeline para recuperarla.`);
    }
  });
  if (retention.safe !== null && retention.safe < 10 && unsafeNames.length) {
    notes.push(
      `Safe zones en ${retention.safe}/10 (${unsafeNames.join(', ')} fuera del margen 10%): hay que mover el texto en el preview, no se arregla con un flag.`,
    );
  }
  let t = 0;
  next.forEach((s) => {
    s.start = t;
    t += s.duration;
  });
  return { scenes: next, fixes, notes };
}

type WinId = 'preview' | 'timeline' | 'retention' | 'agent';

type WinPos = Record<WinId, { x: number; y: number; w: number }>;

// B9 (R7): los defaults antiguos asumían un lienzo de 1224 px (560 + 24 + 640),
// pero el contenedor real mide 1192 px a 1280 de viewport (sección max-w 1240
// con px-6) y menos aún entre 1100 y 1240. La columna derecha (timeline y
// retención) sobresalía 32 px y el 6º chip de captions quedaba cortado por el
// borde de la ventana. El layout se deriva ahora del ancho real del
// contenedor (ver layoutFor + ResizeObserver en Studio).
const WIN_DEFAULTS: WinPos = {
  preview: { x: 0, y: 0, w: 560 },
  timeline: { x: 584, y: 0, w: 608 },
  retention: { x: 584, y: 396, w: 608 },
  agent: { x: 0, y: 780, w: 1192 },
};

// Layout flotante derivado del ancho real del contenedor: la columna derecha
// ocupa exactamente lo que queda tras preview + gap, y la ventana del agente
// ocupa todo el ancho. Así ninguna ventana sobresale del contenedor.
// NOTA (R7b B1–B3): las `y` de aquí son provisionales — retention (396) y
// agent (780) se re-derivan de las alturas REALES en measureLayout; con
// valores fijos el Agente tapaba la cola de Retención y el Brief.
function layoutFor(w: number): WinPos {
  const gap = 24;
  const previewW = Math.min(560, Math.max(320, Math.floor(w * 0.47)));
  const rightW = Math.max(320, w - previewW - gap);
  const rightX = previewW + gap;
  return {
    preview: { x: 0, y: 0, w: previewW },
    timeline: { x: rightX, y: 0, w: rightW },
    retention: { x: rightX, y: 396, w: rightW },
    agent: { x: 0, y: 780, w },
  };
}

const WIN_TITLES: Record<WinId, { title: string; sub: string }> = {
  preview: { title: 'Preview', sub: 'El anuncio, en vivo' },
  timeline: { title: 'Timeline', sub: 'Escenas y captions' },
  retention: { title: 'Retención', sub: 'Score medido en vivo' },
  agent: { title: 'Agente', sub: 'Agente real · Qwen Cloud incluido' },
};

interface FloatWindowProps {
  winId: WinId;
  floating: boolean;
  pos: { x: number; y: number; w: number };
  z: number;
  minimized: boolean;
  onFocus: (id: WinId) => void;
  onMove: (id: WinId, x: number, y: number) => void;
  onToggleMin: (id: WinId) => void;
  children: React.ReactNode;
}

function FloatWindow({
  winId,
  floating,
  pos,
  z,
  minimized,
  onFocus,
  onMove,
  onToggleMin,
  children,
}: FloatWindowProps) {
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const meta = WIN_TITLES[winId];

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!floating) return;
    onFocus(winId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    onMove(winId, Math.max(0, e.clientX - d.px + d.ox), Math.max(0, e.clientY - d.py + d.oy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      id={`win-${winId}`}
      data-window={winId}
      onPointerDown={() => onFocus(winId)}
      className="rounded-[20px] border border-white/10 bg-[#12121A]/95 shadow-[0_18px_44px_rgba(0,0,0,0.45)] backdrop-blur"
      style={
        floating
          ? { position: 'absolute', left: pos.x, top: pos.y, width: pos.w, zIndex: z }
          : { position: 'relative', width: '100%' }
      }
    >
      <div
        className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3"
        style={floating ? { cursor: 'grab', touchAction: 'none', userSelect: 'none' } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5A3C]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFB020]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]/70" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-none">{meta.title}</p>
          <p className="mt-1 text-[11px] leading-none text-[#9A9AA8]">{meta.sub}</p>
        </div>
        <button
          type="button"
          aria-label={minimized ? 'Expandir ventana' : 'Minimizar ventana'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMin(winId);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-sm text-[#9A9AA8] hover:bg-white/5 hover:text-white"
        >
          {minimized ? '+' : '–'}
        </button>
      </div>
      {!minimized && <div className="p-4">{children}</div>}
    </div>
  );
}

export interface StudioProps {
  /** Plantilla que la landing pide abrir (cambia con cada click). */
  openTemplate?: { slug: string; nonce: number } | null;
}

export function Studio({ openTemplate }: StudioProps) {
  const savedState = useRef<SavedStudioState>(readJSON<SavedStudioState>(LS_STATE) || {});
  const [templateId, setTemplateId] = useState<string>(
    () => savedState.current.templateId || 'colchon-descanso-total',
  );
  const [format, setFormat] = useState<FormatId>(() => savedState.current.format || '9:16');
  // B2: el agente persiste (antes volvía a Claude Code al recargar).
  const [agentId, setAgentId] = useState<AgentId>(() => savedState.current.agentId || 'claude-code');
  const [selectedScene, setSelectedScene] = useState<number>(() => savedState.current.selectedScene || 0);

  const bundle = TEMPLATES[templateId] || TEMPLATES['colchon-descanso-total'];
  const template = bundle.meta;

  const [scenes, setScenes] = useState<Scene[]>(() => cloneScenes(template.scenes));
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showSafeGuides, setShowSafeGuides] = useState(true);
  const [audit, setAudit] = useState<TemplateAudit | null>(null);

  const total = totalDuration(scenes);
  const currentSceneIdx = sceneAt(scenes, time);
  const currentScene = scenes[currentSceneIdx] || scenes[0];

  // Proveedor (BYO key): config + mapa de keys por proveedor, solo localStorage.
  // Default: Flare Cloud (agente real con Qwen Cloud incluido, sin key).
  const savedProvider = useRef(readJSON<{ provider?: ProviderId; baseUrl?: string; model?: string }>(LS_CONFIG));
  const savedKeys = useRef<Record<string, string>>(readJSON<Record<string, string>>(LS_KEYS) || {});
  const [providerId, setProviderId] = useState<ProviderId>(() => savedProvider.current?.provider || 'flare-cloud');
  const [providerBaseUrl, setProviderBaseUrl] = useState<string>(
    () => savedProvider.current?.baseUrl || PROVIDERS['flare-cloud'].baseUrl,
  );
  const [providerModel, setProviderModel] = useState<string>(
    () => savedProvider.current?.model || PROVIDERS['flare-cloud'].models[0],
  );
  const [providerKey, setProviderKey] = useState<string>(() => savedKeys.current[providerId] || '');
  const [providerSavedLabel, setProviderSavedLabel] = useState<string>('');

  const [agentStatus, setAgentStatus] = useState<AgentStatus>('inactivo');
  const [messages, setMessages] = useState<UIMessage[]>(() => [
    assistantTextMessage(
      'Soy el agente de Flare, con modelo real (Qwen Cloud, incluido: no necesitas key). Puedo leer el anuncio, analizar el score de retención y aplicar arreglos de verdad en el Studio. Escríbeme o pulsa «Agente: mejora el anuncio».',
    ),
  ]);
  const [chatStatus, setChatStatus] = useState<ChatStatus>('ready');
  const [simulating, setSimulating] = useState(false);
  // Espejos para el bucle asíncrono del agente real (el closure del
  // useCallback vería el estado viejo a mitad de turno).
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  // Guarda síncrona de "agente ocupado" (el estado es asíncrono y el
  // fallback a la simulación no puede fiarse del closure).
  const agentBusyRef = useRef(false);
  const agentAbortRef = useRef<AbortController | null>(null);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [brief, setBrief] = useState<{ brief: string; command: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  // Ventanas flotantes.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1100,
  );
  const [winPos, setWinPos] = useState<WinPos>(WIN_DEFAULTS);
  // B9: el usuario puede arrastrar las ventanas; una vez arrastrada alguna,
  // el ResizeObserver deja de recolocar el layout para no pelear con él.
  const userMovedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // B1–B3 (R7b): el layout flotante NO puede usar alturas fijas. La ventana
  // de Retención (5 reglas + estado del export) es más alta que 780-396 y la
  // del Agente (~730 px) más alta que 1240-780, así que con y fijas (780) y
  // contenedor fijo (1240) el Agente tapaba la 5ª regla, la línea de export
  // y toda la ventana Brief (que fluye tras el contenedor). layoutFor solo
  // reparte ANCHOS (fase 1); esta fase 2 mide las alturas REALES del DOM y
  // deriva retention.y, agent.y y la altura del contenedor. Sin medir,
  // cualquier cambio de contenido (plantilla, formato, estado de la
  // auditoría, minimizar) vuelve a solapar.
  const [containerH, setContainerH] = useState(1240);
  const measureLayout = useCallback(() => {
    const root = containerRef.current;
    if (!root || !isDesktop || userMovedRef.current) return;
    const h = (id: WinId) => root.querySelector<HTMLElement>(`#win-${id}`)?.offsetHeight ?? 0;
    const previewH = h('preview');
    const timelineH = h('timeline');
    const retentionH = h('retention');
    const agentH = h('agent');
    if (!previewH || !timelineH || !retentionH || !agentH) return;
    const gap = 24;
    const retentionY = timelineH + gap;
    const agentY = Math.max(previewH, retentionY + retentionH) + gap;
    const totalH = agentY + agentH;
    setWinPos((prev) => {
      if (Math.abs(prev.retention.y - retentionY) <= 1 && Math.abs(prev.agent.y - agentY) <= 1)
        return prev;
      return {
        ...prev,
        retention: { ...prev.retention, y: retentionY },
        agent: { ...prev.agent, y: agentY },
      };
    });
    setContainerH((prev) => (Math.abs(prev - totalH) <= 1 ? prev : totalH));
  }, [isDesktop]);
  // Fase 2 tras cada render que puede cambiar alturas (plantilla, formato,
  // auditoría, ancho). Corre antes del pintado: no hay flash de solape.
  // Converge en un render extra: las alturas no dependen de y. (Minimizar
  // no está en las deps — se declara más abajo — pero el ResizeObserver de
  // las ventanas dispara measureLayout cuando su altura cambia.)
  useLayoutEffect(measureLayout, [measureLayout, templateId, format, audit?.status, winPos]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      if (userMovedRef.current) return;
      const w = el.clientWidth;
      if (!w) return;
      setWinPos(layoutFor(w));
    };
    apply();
    // Las alturas de las ventanas cambian sin que cambie el ancho (auditoría,
    // plantilla, formato, minimizar, carga de fuentes): observarlas dispara
    // la fase 2 (measureLayout) además del re-reparto de anchos.
    const ro = new ResizeObserver(() => {
      apply();
      measureLayout();
    });
    ro.observe(el);
    (['preview', 'timeline', 'retention', 'agent'] as WinId[]).forEach((id) => {
      const node = el.querySelector(`#win-${id}`);
      if (node) ro.observe(node);
    });
    return () => ro.disconnect();
  }, [isDesktop, measureLayout]);
  const topZRef = useRef(40);
  const [winZ, setWinZ] = useState<Record<WinId, number>>({
    preview: 10,
    timeline: 11,
    retention: 12,
    agent: 13,
  });
  const [minimized, setMinimized] = useState<Record<WinId, boolean>>({
    preview: false,
    timeline: false,
    retention: false,
    agent: false,
  });
  const logRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const simTimers = useRef<number[]>([]);

  const floating = isDesktop;

  /* ---------- Safe del export (referencia) ---------- */
  const exportSafe = useMemo(
    () => deriveExportSafe(bundle.scenesHtml, template.scenes, template.height),
    [bundle, template],
  );
  const exportRetention = useMemo(
    () => computeRetention(template.scenes, { safePoints: exportSafe.points, format: template.format }),
    [template, exportSafe],
  );

  /* ---------- Retención en vivo (auditoría) ---------- */
  const auditViolations = useMemo(
    () =>
      audit?.status === 'done'
        ? audit.scenes.flatMap((s) => s.violations.map((v) => `«${s.sceneName}»: ${v}`))
        : [],
    [audit],
  );
  const unsafeSceneIds = useMemo(
    () =>
      new Set(
        (audit?.status === 'done' ? audit.scenes : [])
          .filter((s) => !s.insideSafe)
          .map((s) => s.sceneId),
      ),
    [audit],
  );
  const safeFix = auditViolations.length
    ? auditViolations[0] + (auditViolations.length > 1 ? ` (+${auditViolations.length - 1} más)` : '')
    : undefined;
  const retention = useMemo(
    () =>
      computeRetention(scenes, {
        safePoints: audit?.status === 'done' ? audit.safePoints : null,
        safeFix,
        format,
      }),
    [scenes, audit, format, safeFix],
  );

  /* ---------- Persistencia ---------- */
  useEffect(() => {
    writeJSON(LS_STATE, { templateId, format, agentId, selectedScene });
  }, [templateId, format, agentId, selectedScene]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Espacio reproduce/pausa (paridad con vanilla, web/app.js:2094):
  // con guarda para no robar el Espacio a inputs ni a botones con foco.
  const togglePlay = useCallback(() => {
    if (!playing && timeRef.current >= total) {
      // Al final: pulsar play reinicia desde 0 (si no, el play "muere").
      timeRef.current = 0;
      setTime(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [playing, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || t?.isContentEditable) return;
      e.preventDefault();
      togglePlay();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  const handleRestart = useCallback(() => {
    setPlaying(false);
    timeRef.current = 0;
    setTime(0);
  }, []);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  /* ---------- Playback ---------- */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const nt = timeRef.current + dt;
      if (nt >= total) {
        timeRef.current = total;
        setTime(total);
        setPlaying(false);
        return;
      }
      timeRef.current = nt;
      setTime(nt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  // El detalle de la Timeline sigue a la escena actual.
  useEffect(() => {
    setSelectedScene(currentSceneIdx);
  }, [currentSceneIdx]);

  // Log: auto-scroll al final.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  // Limpieza de la simulación al desmontar.
  useEffect(
    () => () => {
      simTimers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  // API pública para jueces (como vanilla): seek + duración + medición actual.
  useEffect(() => {
    window.__flareSeek = (t: number) => {
      const v = Math.max(0, Math.min(total, Number(t) || 0));
      timeRef.current = v;
      setTime(v);
    };
    window.__flareDuration = total;
    window.__flareMeasureCurrent = () => {
      const stage = document.querySelector<HTMLElement>('[data-preview-stage="visible"]');
      if (!stage) return { error: 'no hay stage visible' };
      const { stage: s, elements } = measureStage(stage);
      return auditScene(s, elements, scenes[sceneAt(scenes, timeRef.current)]);
    };
  }, [total, scenes]);

  // La landing puede pedir abrir una plantilla.
  useEffect(() => {
    if (!openTemplate) return;
    handleTemplate(openTemplate.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTemplate]);

  const logLine = useCallback((kind: LogLine['kind'], text: string, tag: string) => {
    setLogLines((prev) => [...prev.slice(-60), { kind, text, tag }]);
  }, []);

  const seek = useCallback(
    (t: number) => {
      const v = Math.max(0, Math.min(total, t));
      timeRef.current = v;
      setTime(v);
    },
    [total],
  );

  const handleTemplate = useCallback(
    (slug: string) => {
      const b = TEMPLATES[slug];
      if (!b) return;
      setTemplateId(slug);
      setScenes(cloneScenes(b.meta.scenes));
      setTime(0);
      timeRef.current = 0;
      setSelectedScene(0);
      setPlaying(false);
      setBrief(null);
      logLine('info', `Plantilla cargada: «${b.meta.name}» (${b.meta.scenes.length} escenas, ${formatDuration(b.meta.duration)}).`, 'STUDIO');
    },
    [logLine],
  );

  const resetTemplate = useCallback(() => {
    setScenes(cloneScenes(template.scenes));
    setTime(0);
    timeRef.current = 0;
    setSelectedScene(0);
    setPlaying(false);
    logLine('info', 'Plantilla restablecida a los datos del ejemplo (solo en el Studio).', 'STUDIO');
  }, [template, logLine]);

  const editCaption = useCallback((sceneId: string, text: string) => {
    setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, caption: text } : s)));
  }, []);

  /* ---------- Proveedor ---------- */
  const switchProvider = useCallback(
    (id: ProviderId) => {
      // Guarda la key del proveedor actual antes de cambiar (no se pierde).
      const map = { ...savedKeys.current };
      if (providerKey) map[providerId] = providerKey;
      else delete map[providerId];
      savedKeys.current = map;
      writeJSON(LS_KEYS, map);
      const def = PROVIDERS[id];
      setProviderId(id);
      setProviderBaseUrl(def.baseUrl);
      setProviderModel(def.models[0] || '');
      setProviderKey(map[id] || '');
      setProviderSavedLabel('');
    },
    [providerId, providerKey],
  );

  const saveProvider = useCallback(() => {
    writeJSON(LS_CONFIG, { provider: providerId, baseUrl: providerBaseUrl, model: providerModel });
    const map = { ...savedKeys.current };
    if (providerKey) map[providerId] = providerKey;
    else delete map[providerId];
    savedKeys.current = map;
    writeJSON(LS_KEYS, map);
    if (PROVIDERS[providerId].hosted) {
      setProviderSavedLabel('Guardado localmente · Flare Cloud, sin key: el modelo lo pone Flare.');
      logLine('ok', `Proveedor guardado en este navegador: Flare Cloud (Qwen) · ${providerModel || 'sin modelo'}. Sin key: el modelo lo pone Flare.`, 'PROVEEDOR');
      return;
    }
    setProviderSavedLabel(
      `Guardado localmente · ${providerKey ? 'key guardada' : 'sin key'} — nunca sale de tu navegador.`,
    );
    logLine('ok', `Proveedor guardado en este navegador: ${PROVIDERS[providerId].name} · ${providerModel || 'sin modelo'}. La key nunca sale de tu navegador.`, 'PROVEEDOR');
  }, [providerId, providerBaseUrl, providerModel, providerKey, logLine]);

  /* ---------- Brief + copiar ---------- */
  const generateBrief = useCallback(() => {
    const built = buildBrief({
      scenes,
      template,
      format,
      agentId,
      providerId,
      providerBaseUrl,
      providerModel,
      retention,
      unsafeSceneIds,
    });
    setBrief(built);
    logLine('ok', `Brief generado para ${AGENTS[agentId].name} · proveedor ${PROVIDERS[providerId].name} · score ${retention.total === null ? 'sin verificar' : retention.total + '/100'}.`, 'BRIEF');
  }, [scenes, template, format, agentId, providerId, providerBaseUrl, providerModel, retention, unsafeSceneIds, logLine]);

  const copyText = useCallback(async (text: string, feedback: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(feedback);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopyFeedback(feedback);
      } catch {
        setCopyFeedback('No se pudo copiar: selecciona el texto manualmente.');
      }
      ta.remove();
    }
    window.setTimeout(() => setCopyFeedback(''), 3500);
  }, []);

  /* ---------- Export ---------- */
  const handleExportWebM = useCallback(() => {
    if (exporting) return;
    setExporting(true);
    setExportStatus('Preparando exportación…');
    setPlaying(false);
    void exportWebM(scenes, format, templateId, {
      onStatus: setExportStatus,
      onLog: logLine,
      onSeek: seek,
      onDone: () => setExporting(false),
      onError: (text) => {
        setExportStatus(text);
        setExporting(false);
      },
    });
  }, [exporting, scenes, format, templateId, logLine, seek]);

  const handleStoryboard = useCallback(() => {
    const html = buildStoryboardHtml(scenes, template, format, retention.total);
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flare-storyboard-${templateId}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    logLine('ok', `Storyboard HTML exportado: ${a.download}.`, 'EXPORT');
  }, [scenes, template, format, retention.total, templateId, logLine]);

  /* ---------- Simulación del agente ---------- */
  const simulateAgent = useCallback(() => {
    if (agentBusyRef.current) return;
    agentBusyRef.current = true;
    setSimulating(true);
    setChatStatus('streaming');
    const before = computeRetention(scenes, {
      safePoints: audit?.status === 'done' ? audit.safePoints : null,
      format,
    });
    const weak = before.items.filter((i) => !i.pass);
    const weakText = weak.length
      ? 'Puntos débiles reales: ' + weak.map((i) => `${i.label} ${i.pts === null ? '—' : i.pts}/${i.max}`).join(' · ') + '.'
      : 'Sin puntos débiles: todo en su máximo.';
    const okText = before.items.filter((i) => i.pass).map((i) => i.label).join(', ');
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };
    simTimers.current = timers;

    later(300, () => {
      setAgentStatus('pensando');
      setMessages((prev) => [
        ...prev,
        assistantTextMessage(`Leyendo brief.md y la composición actual de «${template.product}»…`),
      ]);
      logLine('info', `Leyendo brief.md y la composición actual de «${template.product}»…`, 'AGENTE');
    });

    later(1500, () => {
      setAgentStatus('analizando');
      bringToFront('retention');
      setMessages((prev) => [
        ...prev,
        thinkingMessage(
          `Score actual ${before.total === null ? 'sin verificar' : before.total + '/100'}. ${weakText} En su máximo: ${okText || 'nada'}.`,
        ),
        assistantTextMessage(
          `Score de retención actual: ${before.total === null ? 'sin verificar' : before.total + '/100'}. ${weakText}`,
        ),
      ]);
      logLine('info', `Score de retención actual: ${before.total === null ? 'sin verificar' : before.total + '/100'}. ${weakText}`, 'ANÁLISIS');
    });

    later(2800, () => {
      setAgentStatus('editando');
      bringToFront('timeline');
      setPlaying(false);
      const { scenes: fixed, fixes, notes } = applyAgentFixes(
        scenes,
        before,
        audit?.status === 'done'
          ? audit.scenes.filter((s) => !s.insideSafe).map((s) => `«${s.sceneName}»`)
          : [],
      );
      const todos: TodoItem[] = [
        { content: 'Acortar la primera escena a ≤ 2,5 s (hook completo)', status: fixes.some((f) => f.includes('primera escena')) ? 'completed' : 'pending' },
        { content: 'Extender captions a cobertura completa', status: fixes.some((f) => f.includes('caption')) ? 'completed' : 'pending' },
        { content: 'Recortar escenas de más de 4 s', status: fixes.some((f) => f.includes('Acorté «')) ? 'completed' : 'pending' },
      ];
      setMessages((prev) => [...prev, todoMessage(todos)]);
      if (fixes.length) {
        setScenes(fixed);
        setTime(0);
        timeRef.current = 0;
        setMessages((prev) => [
          ...prev,
          editMessage('scenes.json (sesión)', 'duration: 3', 'duration: 2'),
          assistantTextMessage(`Apliqué ${fixes.length} arreglo(s) en la sesión (el archivo del ejemplo no cambia):\n- ${fixes.join('\n- ')}`),
        ]);
        fixes.forEach((f) => logLine('edit', f, 'EDIT'));
      } else {
        setMessages((prev) => [
          ...prev,
          assistantTextMessage('No había puntos débiles que corregir: la composición ya estaba en forma.'),
        ]);
        logLine('info', 'No había puntos débiles que corregir: la composición ya estaba en forma.', 'EDIT');
      }
      notes.forEach((n) => logLine('warn', n, 'NOTA'));
      seek(0);
    });

    later(4600, () => {
      setAgentStatus('renderizando');
      const after = computeRetention(
        applyAgentFixes(scenes, before, []).scenes,
        { safePoints: audit?.status === 'done' ? audit.safePoints : null, format },
      );
      setMessages((prev) => [
        ...prev,
        bashMessage(
          `flare score --template ${templateId}`,
          `score ${after.total === null ? '—' : after.total}/100 (hook ${after.hook}/30 · captions ${after.captions}/25 · cortes ${after.cuts}/20 · cta ${after.cta}/15 · safe ${after.safe === null ? '—' : after.safe}/10)`,
        ),
      ]);
      logLine('info', 'Re-renderizando el preview con los cambios…', 'RENDER');
      seek(0);
      setPlaying(true);
    });

    later(6200, () => {
      // Las escenas del closure son las originales: el "después" honesto se
      // calcula aplicando los mismos arreglos (determinista) sobre ellas,
      // que es exactamente lo que quedó en el estado tras el paso de edición.
      const afterScenes = applyAgentFixes(scenes, before, []).scenes;
      const after = computeRetention(afterScenes, {
        safePoints: audit?.status === 'done' ? audit.safePoints : null,
        format,
      });
      setMessages((prev) => [
        ...prev,
        assistantTextMessage(
          `Listo. Score de retención: ${before.total === null ? 'sin verificar' : before.total} → ${after.total === null ? 'sin verificar' : after.total}/100${after.total !== null && before.total !== null && after.total > before.total ? ' (mejora aplicada en la sesión).' : '.'} Revisa la Timeline y el panel de Retención.`,
        ),
      ]);
      logLine(
        'ok',
        `Listo. Score de retención: ${before.total === null ? 'sin verificar' : before.total} → ${after.total === null ? 'sin verificar' : after.total}/100. Revisa la Timeline y el panel de Retención.`,
        'LISTO',
      );
      setAgentStatus('listo');
      setChatStatus('ready');
      agentBusyRef.current = false;
      setSimulating(false);
      bringToFront('retention');
    });
  }, [scenes, audit, format, templateId, template, seek, logLine]);

  /* ---------- Agente REAL (Flare Cloud / Qwen) ---------- */
  // Bucle agentic contra /api/agent: el modelo decide con herramientas y
  // cada herramienta se ejecuta aquí, contra el estado vivo del Studio.
  // Si el proxy no responde o no está configurado, cae a la simulación
  // (mismos arreglos reales, sin modelo) para no dejar el chat muerto.
  const runRealAgent = useCallback(
    async (instruction: string) => {
      if (agentBusyRef.current) return;
      agentBusyRef.current = true;
      setSimulating(true);
      setChatStatus('streaming');
      const abort = new AbortController();
      agentAbortRef.current = abort;
      let currentScenes = cloneScenes(scenesRef.current);
      let fixesApplied = false;

      const scoreOf = (list: Scene[]) =>
        computeRetention(list, {
          safePoints: audit?.status === 'done' ? audit.safePoints : null,
          safeFix,
          format,
        });
      const scoreText = (r: RetentionResult) =>
        `${r.total === null ? 'sin verificar' : `${r.total}/100`} (hook ${r.hook}/30 · captions ${r.captions}/25 · cortes ${r.cuts}/20 · CTA ${r.cta}/15 · safe ${r.safe === null ? '—' : `${r.safe}/10`})`;
      const sceneSummary = (list: Scene[]) =>
        list
          .map(
            (s, i) =>
              `${i + 1}. «${s.name}» ${s.duration}s${s.caption ? ` · caption ${s.captionDuration}s` : ' · sin caption'}`,
          )
          .join('\n');

      const snapshot = (): AgentSnapshot => ({
        templateName: template.name,
        product: template.product,
        format,
        totalDuration: totalDuration(currentScenes),
        scenes: cloneScenes(currentScenes),
        retention: scoreOf(currentScenes),
        unsafeSceneNames:
          audit?.status === 'done'
            ? audit.scenes.filter((s) => !s.insideSafe).map((s) => `«${s.sceneName}»`)
            : [],
      });

      // Ejecuta una llamada de herramienta del modelo y devuelve el texto
      // que se le devuelve como resultado. Todo actúa sobre currentScenes
      // (la verdad del turno) y refleja el cambio en el estado.
      const execTool = (name: AgentToolName, args: Record<string, unknown>): string => {
        if (name === 'get_score') {
          const r = scoreOf(currentScenes);
          return JSON.stringify({
            score: scoreText(r),
            items: r.items.map((i) => ({ label: i.label, pts: i.pts, max: i.max, pass: i.pass, fix: i.fix })),
          });
        }
        if (name === 'list_scenes') {
          return sceneSummary(currentScenes);
        }
        if (name === 'apply_fixes') {
          const before = scoreOf(currentScenes);
          const { scenes: fixed, fixes, notes } = applyAgentFixes(
            currentScenes,
            before,
            audit?.status === 'done'
              ? audit.scenes.filter((s) => !s.insideSafe).map((s) => `«${s.sceneName}»`)
              : [],
          );
          if (!fixes.length) {
            return JSON.stringify({ fixes: [], notes, score: scoreText(before), note: 'No había puntos débiles que corregir.' });
          }
          currentScenes = fixed;
          setScenes(cloneScenes(fixed));
          setTime(0);
          timeRef.current = 0;
          seek(0);
          fixesApplied = true;
          fixes.forEach((f) => logLine('edit', f, 'EDIT'));
          notes.forEach((n) => logLine('warn', n, 'NOTA'));
          const after = scoreOf(fixed);
          return JSON.stringify({ fixes, notes, before: scoreText(before), after: scoreText(after) });
        }
        if (name === 'edit_scene') {
          const idx = typeof args.scene_index === 'number' ? Math.floor(args.scene_index) - 1 : -1;
          if (idx < 0 || idx >= currentScenes.length) {
            return JSON.stringify({ error: `No hay escena ${args.scene_index}: el anuncio tiene ${currentScenes.length} escenas.` });
          }
          const next = cloneScenes(currentScenes);
          const s = next[idx];
          if (typeof args.duration === 'number') {
            if (args.duration < 0.5 || args.duration > 10) {
              return JSON.stringify({ error: 'La duración debe estar entre 0.5 y 10 segundos.' });
            }
            s.duration = args.duration;
            s.captionDuration = Math.min(s.captionDuration, s.duration);
          }
          if (typeof args.caption === 'string') {
            if (args.caption.length > 200) {
              return JSON.stringify({ error: 'El caption supera los 200 caracteres.' });
            }
            s.caption = args.caption;
            if (s.captionDuration === 0) s.captionDuration = Math.min(s.duration, 2);
          }
          if (typeof args.headline === 'string') {
            if (args.headline.length > 120) {
              return JSON.stringify({ error: 'El headline supera los 120 caracteres.' });
            }
            s.headline = args.headline;
          }
          let t = 0;
          next.forEach((sc) => {
            sc.start = t;
            t += sc.duration;
          });
          currentScenes = next;
          setScenes(cloneScenes(next));
          fixesApplied = true;
          const after = scoreOf(next);
          logLine('edit', `Editada «${s.name}» (duración ${s.duration}s).`, 'EDIT');
          return JSON.stringify({
            scene: `${idx + 1}. «${s.name}» duración ${s.duration}s · caption «${s.caption}»`,
            score: scoreText(after),
          });
        }
        if (name === 'generate_brief') {
          const built = buildBrief({
            scenes: currentScenes,
            template,
            format,
            agentId,
            providerId,
            providerBaseUrl,
            providerModel,
            retention: scoreOf(currentScenes),
            unsafeSceneIds,
          });
          setBrief(built);
          logLine('ok', `Brief generado para ${AGENTS[agentId].name} · proveedor ${PROVIDERS[providerId].name}.`, 'BRIEF');
          return JSON.stringify({ ok: true, note: 'Brief generado en el panel «Brief para tu agente».' });
        }
        if (name === 'export_video') {
          if (exporting) {
            return JSON.stringify({ ok: false, note: 'Ya hay una exportación en curso.' });
          }
          setExporting(true);
          setExportStatus('Preparando exportación…');
          setPlaying(false);
          void exportWebM(currentScenes, format, templateId, {
            onStatus: setExportStatus,
            onLog: logLine,
            onSeek: seek,
            onDone: () => setExporting(false),
            onError: (text) => {
              setExportStatus(text);
              setExporting(false);
            },
          });
          return JSON.stringify({ ok: true, note: 'Exportación iniciada: el WebM se descargará en el navegador.' });
        }
        return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
      };

      try {
        const system = buildSystemPrompt(snapshot());
        const history = [
          ...historyToModelMessages(messagesRef.current),
          { role: 'user', content: instruction },
        ];
        type ModelMessage = {
          role: string;
          content?: string;
          tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
          tool_call_id?: string;
        };
        let convo: ModelMessage[] = [{ role: 'system', content: system }, ...history];
        let done = false;
        for (let turn = 0; turn < 6 && !done; turn++) {
          setAgentStatus(turn === 0 ? 'pensando' : 'editando');
          const resp = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: convo, tools: AGENT_TOOLS, model: providerModel }),
            signal: abort.signal,
          });
          const data: unknown = await resp.json().catch(() => null);
          if (!resp.ok) {
            const msg =
              data !== null && typeof data === 'object' && 'error' in data &&
              data.error !== null && typeof data.error === 'object' && 'message' in data.error
                ? String(data.error.message)
                : `El servidor respondió ${resp.status}.`;
            throw new Error(msg);
          }
          const choice =
            data !== null && typeof data === 'object' && 'choices' in data &&
            Array.isArray(data.choices) && data.choices[0] !== undefined &&
            typeof data.choices[0] === 'object' && data.choices[0] !== null &&
            'message' in data.choices[0]
              ? (data.choices[0].message as { content?: unknown; tool_calls?: ModelMessage['tool_calls'] })
              : null;
          if (!choice) throw new Error('El modelo no devolvió respuesta.');
          const calls = Array.isArray(choice.tool_calls) ? choice.tool_calls : [];
          if (calls.length === 0) {
            const text = typeof choice.content === 'string' ? choice.content.trim() : '';
            setMessages((prev) => [
              ...prev,
              assistantTextMessage(text || 'Listo. Revisa la Timeline y el panel de Retención.'),
            ]);
            done = true;
            break;
          }
          convo = [
            ...convo,
            {
              role: 'assistant',
              content: typeof choice.content === 'string' ? choice.content : '',
              tool_calls: calls,
            },
          ];
          const toolResults: ModelMessage[] = [];
          for (const call of calls) {
            const toolName = call.function?.name as AgentToolName;
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function?.arguments || '{}') as Record<string, unknown>;
            } catch {
              args = {};
            }
            setMessages((prev) => [...prev, thinkingMessage(`Usando ${toolName}…`)]);
            const result = execTool(toolName, args);
            let parsed: Record<string, unknown> = {};
            try {
              parsed = JSON.parse(result) as Record<string, unknown>;
            } catch {
              parsed = {};
            }
            if (toolName === 'apply_fixes' && Array.isArray(parsed.fixes) && parsed.fixes.length) {
              const fixes = parsed.fixes as string[];
              setMessages((prev) => [
                ...prev,
                todoMessage([{ content: 'Aplicar arreglos del motor de retención', status: 'completed' }]),
                editMessage('scenes.json (sesión)', 'score anterior', 'score nuevo'),
                assistantTextMessage(`Apliqué ${fixes.length} arreglo(s) en la sesión:\n- ${fixes.join('\n- ')}`),
              ]);
            }
            if (toolName === 'edit_scene' && typeof parsed.scene === 'string' && !parsed.error) {
              setMessages((prev) => [...prev, editMessage('scenes.json (sesión)', 'escena anterior', parsed.scene as string)]);
            }
            if (toolName === 'get_score' && typeof parsed.score === 'string') {
              setMessages((prev) => [...prev, thinkingMessage(`Score actual: ${parsed.score}.`)]);
            }
            toolResults.push({ role: 'tool', tool_call_id: call.id, content: result });
          }
          convo = [...convo, ...toolResults];
        }
        if (!done) {
          setMessages((prev) => [
            ...prev,
            assistantTextMessage('Hice lo que pude en este turno: revisa la Timeline y el panel de Retención para ver los cambios.'),
          ]);
        }
        logLine('ok', `Agente real: score ${scoreText(scoreOf(currentScenes))}.`, 'AGENTE');
        if (fixesApplied) {
          bringToFront('retention');
          seek(0);
        }
      } catch (err) {
        if (abort.signal.aborted) {
          setMessages((prev) => [...prev, assistantTextMessage('Parado.')]);
        } else {
          const detail = err instanceof Error ? err.message : 'Error desconocido.';
          logLine('warn', `Agente real no disponible (${detail}): uso la simulación.`, 'AGENTE');
          setMessages((prev) => [
            ...prev,
            assistantTextMessage(`No pude llamar al modelo real (${detail}). Te muestro el flujo simulado con los mismos arreglos reales.`),
          ]);
          agentBusyRef.current = false;
          setSimulating(false);
          setChatStatus('ready');
          simulateAgent();
          return;
        }
      } finally {
        if (agentAbortRef.current === abort) agentAbortRef.current = null;
      }
      agentBusyRef.current = false;
      setSimulating(false);
      setChatStatus('ready');
      setAgentStatus('listo');
    },
    [
      audit, format, template, templateId, agentId, providerId, providerBaseUrl,
      providerModel, unsafeSceneIds, safeFix, exporting, logLine, seek,
      simulateAgent,
    ],
  );

  const handleImproveClick = useCallback(() => {
    if (agentBusyRef.current) return;
    const instruction =
      'Analiza el score de retención del anuncio y aplica los arreglos que hagan falta, luego dime el score antes y después.';
    setMessages((prev) => [
      ...prev,
      userTextMessage('Mejora el anuncio: analiza el score y aplica los arreglos que hagan falta.'),
    ]);
    void runRealAgent(instruction);
  }, [runRealAgent]);

  /* ---------- Ventanas ---------- */
  const bringToFront = useCallback((id: WinId) => {
    topZRef.current += 1;
    const z = topZRef.current;
    setWinZ((prev) => ({ ...prev, [id]: z }));
  }, []);

  const moveWindow = useCallback((id: WinId, x: number, y: number) => {
    userMovedRef.current = true;
    setWinPos((prev) => ({ ...prev, [id]: { ...prev[id], x, y } }));
  }, []);

  const toggleMin = useCallback((id: WinId) => {
    setMinimized((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleChatSend = useCallback(
    (message: { role: 'user'; content: string }) => {
      const text = message.content;
      setMessages((prev) => [...prev, userTextMessage(text)]);
      // Flare Cloud: el modelo real responde (con herramientas). Los demás
      // proveedores BYO aún no llaman a ningún modelo: respuestas por clave.
      if (providerId === 'flare-cloud') {
        void runRealAgent(text);
        return;
      }
      const low = text.toLowerCase();
      if (low.includes('brief')) {
        generateBrief();
        setMessages((prev) => [
          ...prev,
          assistantTextMessage('Brief generado abajo, en «Brief para tu agente». Cópialo y pásaselo a tu CLI con el comando que ves ahí.'),
        ]);
      } else if (low.includes('exporta') || low.includes('webm') || low.includes('vídeo') || low.includes('video')) {
        setMessages((prev) => [...prev, assistantTextMessage('Exportando el vídeo en WebM… lo verás descargarse cuando termine.')]);
        handleExportWebM();
      } else if (low.includes('acorta') || low.includes('hook')) {
        const { scenes: fixed, fixes } = applyAgentFixes(scenes, retention, []);
        if (fixes.length) {
          setScenes(fixed);
          setMessages((prev) => [...prev, assistantTextMessage(`Hecho en la sesión:\n- ${fixes.join('\n- ')}`)]);
          fixes.forEach((f) => logLine('edit', f, 'EDIT'));
        } else {
          setMessages((prev) => [...prev, assistantTextMessage('El hook ya está en su máximo (30/30): la primera escena dura ≤ 2,5 s y tiene motion.')]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          assistantTextMessage(
            'Puedo ayudarte con el anuncio que tienes abierto: dime «genera el brief», «exporta el vídeo» o «acorta la primera escena», o pulsa «Agente: mejora el anuncio». (Consejo: cambia a Flare Cloud para hablar con el modelo real, sin key.)',
          ),
        ]);
      }
    },
    [generateBrief, handleExportWebM, scenes, retention, logLine, providerId, runRealAgent],
  );

  const selected = scenes[Math.min(selectedScene, scenes.length - 1)] || scenes[0];
  const providerDef = PROVIDERS[providerId];
  const agentDef = AGENTS[agentId];
  const chatSuggestions = [
    { id: 's-brief', label: 'Generar el brief', value: 'Genera el brief para mi agente' },
    { id: 's-export', label: 'Exportar el vídeo', value: 'Exporta el vídeo en WebM' },
    { id: 's-hook', label: 'Acortar la primera escena', value: 'Acorta la primera escena a 2 s' },
  ];

  const win = (id: WinId) => ({
    winId: id,
    floating,
    pos: winPos[id],
    z: winZ[id],
    minimized: minimized[id],
    onFocus: bringToFront,
    onMove: moveWindow,
    onToggleMin: toggleMin,
  });
  const logColor: Record<LogLine['kind'], string> = {
    info: '#9A9AA8',
    ok: '#34D399',
    warn: '#FBBF24',
    edit: '#A78BFA',
  };
  const verdictColor =
    retention.verdict === 'Listo para publicar'
      ? { border: 'rgba(52,211,153,0.5)', color: '#34D399', bg: 'rgba(52,211,153,0.10)' }
      : retention.total !== null && retention.total >= 75
        ? { border: 'rgba(251,191,36,0.5)', color: '#FBBF24', bg: 'rgba(251,191,36,0.10)' }
        : { border: 'rgba(251,113,133,0.5)', color: '#FB7185', bg: 'rgba(251,113,133,0.10)' };

  return (
    <section id="studio-app" className="mx-auto w-full max-w-[1240px] scroll-mt-24 px-4 pb-24 pt-16 sm:px-6">
      <AuditStage scenes={scenes} templateSlug={template.slug} format={format} onAudit={setAudit} />

      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FFB020]">
          Flare Studio · agent-native
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          El estudio donde trabaja tu agente
        </h2>
        <p className="mt-2 max-w-2xl text-[#9A9AA8]">
          El agente opera las ventanas: preview, timeline, retención y chat. El score de
          retención se mide con posiciones reales en tu navegador, escena por escena —
          no con un flag.
        </p>
      </div>

      {/* Banner honesto mientras el safe no está medido (R6 B2). */}
      {retention.safe === null && (
        <div
          className="mb-4 flex items-start gap-3 rounded-[16px] border border-[#FBBF24]/40 bg-[#FBBF24]/10 px-4 py-3 text-sm"
          role="status"
        >
          <span aria-hidden="true">⚠</span>
          <p>
            <strong>Safe zones sin verificar —/10.</strong>{' '}
            {audit?.status === 'measuring'
              ? 'Midiendo las posiciones reales en tu navegador…'
              : audit?.status === 'error'
                ? `La medición falló en este navegador (${audit.error}).`
                : 'La medición aún no termina.'}{' '}
            El total aparece cuando la medición termina. Flare nunca muestra un 0/10 por
            falta de datos.
          </p>
        </div>
      )}

      {/* Toolbar del Studio */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[18px] border border-white/10 bg-[#12121A] p-3">
        <label htmlFor="template-select" className="text-xs uppercase tracking-wider text-[#82828F]">
          Plantilla
        </label>
        <select
          id="template-select"
          value={templateId}
          onChange={(e) => handleTemplate(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#0A0A0F] px-3 py-2 text-sm text-white"
        >
          {TEMPLATE_ORDER.map((slug) => {
            const m = TEMPLATES[slug].meta;
            return (
              <option key={slug} value={slug}>
                {m.name} · {m.productLine} · {formatDuration(m.duration)}
              </option>
            );
          })}
        </select>
        <div
          className="flex overflow-hidden rounded-lg border border-white/10"
          role="group"
          aria-label="Formato"
        >
          {(['9:16', '1:1', '16:9'] as FormatId[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              aria-pressed={f === format}
              className={
                f === format
                  ? 'bg-flare px-3 py-2 text-sm font-bold text-white'
                  : 'px-3 py-2 text-sm text-[#9A9AA8] hover:bg-white/5 hover:text-white'
              }
            >
              {f}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#9A9AA8]">
          <input
            type="checkbox"
            checked={showSafeGuides}
            onChange={(e) => setShowSafeGuides(e.target.checked)}
            className="accent-[#FF5A3C]"
          />
          Guías de safe zone
        </label>
        <button
          type="button"
          onClick={resetTemplate}
          className="ml-auto rounded-lg border border-white/10 px-3 py-2 text-sm text-[#9A9AA8] hover:bg-white/5 hover:text-white"
        >
          Restablecer plantilla
        </button>
      </div>

      {/* Ventanas flotantes — altura medida (fase 2, R7b B1–B3): con 1240
          fijo el Agente se desbordaba 270 px y tapaba el Brief. */}
      <div
        ref={containerRef}
        className={floating ? 'relative' : 'flex flex-col gap-4'}
        style={floating ? { height: containerH } : undefined}
      >
        <FloatWindow {...win('preview')}>
          <div className="flex justify-center py-2">
            <PreviewClip scene={currentScene} format={format} showSafeGuides={showSafeGuides} />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              className="bg-flare flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-[0_8px_28px_rgba(255,90,60,0.28)]"
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              aria-label="Reiniciar"
              title="Reiniciar (volver a 0 s)"
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 text-sm text-[#9A9AA8] hover:bg-white/5 hover:text-white"
            >
              ⟲ Reiniciar
            </button>
            <input
              type="range"
              min={0}
              max={total}
              step={0.1}
              value={time}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label="Posición en la timeline"
              className="h-1.5 flex-1 accent-[#FF5A3C]"
            />
            <span className="shrink-0 font-mono text-xs text-[#9A9AA8]">
              {time.toFixed(1)} s / {total.toFixed(1)} s
            </span>
          </div>
          <p className="mt-2 text-sm text-[#9A9AA8]">
            Escena {currentSceneIdx + 1}/{scenes.length} ·{' '}
            <b className="text-white">{currentScene.name}</b>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportWebM}
              disabled={exporting}
              className="bg-flare rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {exporting ? 'Grabando…' : 'Exportar video (WebM)'}
            </button>
            <button
              type="button"
              onClick={handleStoryboard}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              Storyboard HTML
            </button>
            {exportStatus && <p className="text-xs text-[#9A9AA8]">{exportStatus}</p>}
          </div>
        </FloatWindow>

        <FloatWindow {...win('timeline')}>
          <div className="relative">
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-[2px] bg-[#FF5A3C]"
              style={{ left: `${total ? (time / total) * 100 : 0}%` }}
              aria-hidden="true"
            />
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#82828F]">
              Vídeo
            </p>
            <div className="flex gap-1">
              {scenes.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    seek(s.start);
                    setSelectedScene(i);
                  }}
                  aria-label={`Ir a la escena ${i + 1}: ${s.name}`}
                  className={`min-w-0 rounded-[10px] border px-2 py-1.5 text-left ${
                    i === selectedScene
                      ? 'border-[#FF5A3C]/60 bg-[#FF5A3C]/15'
                      : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                  style={{ flexGrow: s.duration, flexBasis: 0 }}
                >
                  <span className="block truncate text-[11px] font-semibold text-white">
                    {i + 1}. {s.name.split(':')[0]}
                  </span>
                  <span className="block font-mono text-[10px] text-[#9A9AA8]">{s.duration} s</span>
                </button>
              ))}
            </div>
            <p className="mb-1 mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#82828F]">
              Captions
            </p>
            <div className="flex gap-1">
              {scenes.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    seek(s.start);
                    setSelectedScene(i);
                  }}
                  aria-label={`Caption de la escena ${i + 1}`}
                  className={`min-w-0 rounded-[10px] border px-2 py-1.5 text-left ${
                    i === selectedScene
                      ? 'border-[#FF5A3C]/60 bg-[#FF5A3C]/15'
                      : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                  style={{ flexGrow: s.duration, flexBasis: 0 }}
                >
                  <span className="block truncate text-[11px] text-[#9A9AA8]">{s.caption}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-[14px] border border-white/[0.06] bg-[#0A0A0F]/60 p-3">
            <p className="text-sm font-bold text-white">
              {selected.name}{' '}
              <span className="font-mono text-xs font-normal text-[#9A9AA8]">
                {selected.start.toFixed(1)}–{(selected.start + selected.duration).toFixed(1)} s ·{' '}
                {selected.duration} s{selected.isCTA ? ' · CTA' : ''}
              </span>
            </p>
            <p className="mt-1 text-sm text-[#9A9AA8]">{selected.headline}</p>
            <label
              htmlFor="caption-edit"
              className="mt-2 block text-[11px] uppercase tracking-wider text-[#82828F]"
            >
              Caption
            </label>
            <input
              id="caption-edit"
              value={selected.caption}
              onChange={(e) => editCaption(selected.id, e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A0A0F] px-3 py-2 text-sm text-white"
            />
            <p className="mt-1 text-[11px] text-[#82828F]">
              Editar el caption es solo en esta sesión: el ejemplo no cambia.
            </p>
          </div>
        </FloatWindow>

        <FloatWindow {...win('retention')}>
          <div className="flex items-center gap-4">
            <AnimatedCircularProgressBar
              value={retention.total ?? 0}
              max={100}
              min={0}
              gaugePrimaryColor="#FF5A3C"
              gaugeSecondaryColor="rgba(255,255,255,0.08)"
              className="size-28 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-display text-3xl font-bold text-white">
                {retention.total === null ? '—' : retention.total}
                <span className="text-lg text-[#9A9AA8]">/100</span>
              </p>
              <p
                className="mt-1 inline-block rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: verdictColor.border,
                  color: verdictColor.color,
                  background: verdictColor.bg,
                }}
              >
                {retention.verdict}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#9A9AA8]">
                Hook {retention.hook}/30 · Captions {retention.captions}/25 · Cortes{' '}
                {retention.cuts}/20 · CTA {retention.cta}/15 · Safe{' '}
                {retention.safe === null ? '—' : retention.safe}/10
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {retention.items.map((item) => (
              <li
                key={item.key}
                className="rounded-[12px] border border-white/[0.06] bg-[#0A0A0F]/50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-white">
                    {item.pass ? '✓ ' : item.pts === null ? '– ' : '✗ '}
                    {item.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[#9A9AA8]">
                    {item.pts === null ? '—' : item.pts}/{item.max}
                  </span>
                </div>
                {!item.pass && <p className="mt-1 text-xs leading-relaxed text-[#FB7185]">{item.fix}</p>}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-[12px] border border-white/[0.06] bg-[#0A0A0F]/50 px-3 py-2 text-xs leading-relaxed text-[#9A9AA8]">
            {audit?.status === 'measuring' && (
              <p className="flex items-center gap-2">
                <SpiralLoader size={16} /> Midiendo safe zones en vivo… (posiciones reales,
                escena por escena)
              </p>
            )}
            {audit?.status === 'done' && (
              <div>
                <p>
                  Medido en vivo: {audit.scenes.filter((s) => s.insideSafe).length}/
                  {audit.scenes.length} escenas dentro de la safe zone · Safe{' '}
                  {audit.safePoints}/10
                </p>
                {auditViolations.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-[#FB7185]">
                    {auditViolations.slice(0, 3).map((v, i) => (
                      <li key={i}>· {v}</li>
                    ))}
                    {auditViolations.length > 3 && <li>· (+{auditViolations.length - 3} más)</li>}
                  </ul>
                )}
              </div>
            )}
            {audit?.status === 'error' && (
              <p className="text-[#FBBF24]">
                No se pudo medir la safe zone en este navegador: {audit.error}. Safe: —/10 (sin
                verificar).
              </p>
            )}
            <p className="mt-1 text-[#82828F]">
              Export (scenes.html): Safe {exportSafe.points === null ? '—' : exportSafe.points}
              /10 · score {exportRetention.total === null ? '—' : exportRetention.total}/100 — el
              mismo motor, medido sobre el HTML exportado.
            </p>
          </div>
        </FloatWindow>

        <FloatWindow {...win('agent')}>
          <div className="flex flex-wrap items-center gap-4">
            <AgentOrb status={agentStatus} />
            <div className="min-w-[180px] flex-1">
              <label htmlFor="agent-select" className="text-[11px] uppercase tracking-wider text-[#82828F]">
                Agente
              </label>
              <select
                id="agent-select"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value as AgentId)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A0A0F] px-3 py-2 text-sm text-white"
              >
                {AGENT_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {AGENTS[id].name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#9A9AA8]">{agentDef.sub}</p>
            </div>
            <div className="min-w-0 flex-1 font-mono text-[11px] leading-relaxed text-[#9A9AA8]">
              <span className="text-[#82828F]">$ </span>
              {agentDef.command}
            </div>
            <button
              type="button"
              onClick={handleImproveClick}
              disabled={simulating}
              className="bg-flare shrink-0 rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {simulating ? 'Agente trabajando…' : '▶ Agente: mejora el anuncio'}
            </button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="h-[380px] overflow-hidden rounded-[14px] border border-white/[0.06]">
              <AgentPanel
                messages={messages}
                status={chatStatus}
                onSend={handleChatSend}
                onStop={() => {
                  agentAbortRef.current?.abort();
                  setChatStatus('ready');
                }}
                suggestions={chatSuggestions}
              />
            </div>
            <div className="min-w-0">
              <div
                ref={logRef}
                className="h-[180px] overflow-y-auto rounded-[14px] border border-white/[0.06] bg-[#0A0A0F] p-3 font-mono text-[11px] leading-relaxed"
                aria-label="Log del agente"
              >
                {logLines.length === 0 ? (
                  <p className="text-[#82828F]">Sin actividad todavía.</p>
                ) : (
                  logLines.map((l, i) => (
                    <p key={i} style={{ color: logColor[l.kind] }}>
                      [{l.tag}] {l.text}
                    </p>
                  ))
                )}
              </div>
              <div className="mt-3 rounded-[14px] border border-white/[0.06] bg-[#0A0A0F]/50 p-3">
                <p className="text-sm font-bold text-white">
                  {providerDef.hosted ? 'Modelo del agente (incluido)' : 'Proveedor de modelo (BYO key)'}
                </p>
                <label htmlFor="provider-select" className="mt-2 block text-[11px] uppercase tracking-wider text-[#82828F]">
                  Proveedor
                </label>
                <select
                  id="provider-select"
                  value={providerId}
                  onChange={(e) => switchProvider(e.target.value as ProviderId)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A0A0F] px-3 py-2 text-sm text-white"
                >
                  {PROVIDER_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {PROVIDERS[id].name}
                    </option>
                  ))}
                </select>
                {providerDef.hosted ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-[#9A9AA8]">
                    Flare Cloud (Qwen) — el modelo lo pone Flare, sin key. Tus
                    mensajes van a nuestro servidor y de ahí a Qwen Cloud; la
                    key nunca sale del servidor. Si prefieres traer tu propia
                    key, elige otro proveedor abajo.
                  </p>
                ) : (
                  <>
                    <label htmlFor="provider-baseurl" className="mt-2 block text-[11px] uppercase tracking-wider text-[#82828F]">
                      Base URL
                    </label>
                    <input
                      id="provider-baseurl"
                      value={providerBaseUrl}
                      onChange={(e) => setProviderBaseUrl(e.target.value)}
                      placeholder={providerDef.custom ? 'https://tu-endpoint.com/v1' : providerDef.baseUrl}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A0A0F] px-3 py-2 font-mono text-xs text-white"
                    />
                    <label htmlFor="provider-model" className="mt-2 block text-[11px] uppercase tracking-wider text-[#82828F]">
                      Modelo
                    </label>
                    <input
                      id="provider-model"
                      value={providerModel}
                      onChange={(e) => setProviderModel(e.target.value)}
                      placeholder={providerDef.custom ? 'nombre-del-modelo' : providerDef.models[0] || ''}
                      list="flare-models"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A0A0F] px-3 py-2 font-mono text-xs text-white"
                    />
                    <datalist id="flare-models">
                      {providerDef.models.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <label htmlFor="provider-key" className="mt-2 block text-[11px] uppercase tracking-wider text-[#82828F]">
                      API key {providerDef.needsKey ? '(requerida)' : '(opcional en local)'}
                    </label>
                    <input
                      id="provider-key"
                      type="password"
                      value={providerKey}
                      onChange={(e) => setProviderKey(e.target.value)}
                      placeholder={providerDef.local ? 'Opcional en local — puede ir vacía' : 'sk-…'}
                      autoComplete="off"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A0A0F] px-3 py-2 font-mono text-xs text-white"
                    />
                    {providerDef.local && (
                      <p className="mt-1 text-[11px] text-[#9A9AA8]">
                        Corre en tu máquina: la key es opcional y nunca sale de tu navegador.
                      </p>
                    )}
                    {providerDef.custom && (
                      <p className="mt-1 text-[11px] text-[#9A9AA8]">
                        Cualquier endpoint compatible con la API de OpenAI: pon su base URL y su
                        modelo.
                      </p>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={saveProvider}
                  className="mt-3 w-full rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
                >
                  Guardar en este navegador
                </button>
                {providerSavedLabel && (
                  <p className="mt-2 text-xs text-[#34D399]">{providerSavedLabel}</p>
                )}
              </div>
            </div>
          </div>
        </FloatWindow>
      </div>

      {/* Brief para el agente */}
      <div className="mt-6 rounded-[20px] border border-white/10 bg-[#12121A] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-white">Brief para tu agente</h3>
            <p className="mt-1 text-sm text-[#9A9AA8]">
              El brief describe el anuncio actual (escenas, score, proveedor) para que
              cualquier CLI lo construya con la skill flare.
            </p>
          </div>
          <button
            type="button"
            onClick={generateBrief}
            className="bg-flare rounded-full px-4 py-2.5 text-sm font-bold text-white"
          >
            Generar con mi agente
          </button>
        </div>
        {brief && (
          <div className="mt-4">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-[14px] border border-white/[0.06] bg-[#0A0A0F] p-4 font-mono text-xs leading-relaxed text-[#F5F5F2]">
              {brief.brief}
            </pre>
            <div className="mt-3 rounded-[14px] border border-white/[0.06] bg-[#0A0A0F] p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#82828F]">
                Comando
              </p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#F5F5F2]">
                {brief.command}
              </pre>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyText(brief.brief, 'Brief copiado al portapapeles.')}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
                >
                  Copiar brief
                </button>
                <button
                  type="button"
                  onClick={() => copyText(brief.command, 'Comando copiado al portapapeles.')}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
                >
                  Copiar comando
                </button>
                {copyFeedback && <span className="text-xs text-[#34D399]">{copyFeedback}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
