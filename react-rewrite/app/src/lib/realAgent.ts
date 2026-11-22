// Flare — agente real del Studio (Qwen Cloud vía /api/agent).
//
// El chat del Studio era una simulación (mensajes sintéticos + arreglos
// deterministas). Este módulo es el puente al modelo real: construye el
// system prompt con el estado VERDADERO del Studio (plantilla, escenas,
// score de retención) y define las herramientas que el modelo puede usar.
// La ejecución de las herramientas vive en Studio.tsx (es la única que
// tiene acceso al estado); aquí solo van los contratos.

import type { UIMessage } from 'ai';
import type { FormatId, Scene } from './types';
import type { RetentionResult } from './retention';

export interface AgentSnapshot {
  templateName: string;
  product: string;
  format: FormatId;
  totalDuration: number;
  scenes: Scene[];
  retention: RetentionResult;
  unsafeSceneNames: string[];
}

export type AgentToolName =
  | 'get_score'
  | 'list_scenes'
  | 'apply_fixes'
  | 'edit_scene'
  | 'generate_brief'
  | 'export_video';

function sceneLine(s: Scene, i: number): string {
  const bits = [
    `${i + 1}. «${s.name}»`,
    `inicio ${s.start}s`,
    `duración ${s.duration}s`,
    s.caption ? `caption ${s.captionDuration}s «${s.caption}»` : 'sin caption',
  ];
  if (s.headline) bits.push(`headline «${s.headline}»`);
  if (s.isCTA) bits.push('CTA');
  if (s.safe === false) bits.push('FUERA de safe zone');
  return bits.join(' · ');
}

export function buildSystemPrompt(snap: AgentSnapshot): string {
  const r = snap.retention;
  const items = r.items
    .map((i) => `- ${i.label}: ${i.pts === null ? '—' : i.pts}/${i.max} ${i.pass ? '(OK)' : '(falla)'}${i.fix ? ` — arreglo: ${i.fix}` : ''}`)
    .join('\n');
  const scenes = snap.scenes.map((s, i) => sceneLine(s, i)).join('\n');
  return [
    'Eres el agente de Flare, el estudio agent-native para crear comerciales y anuncios animados de producto. Estás DENTRO del Studio, hablando con el creador del anuncio que tiene abierto, y puedes actuar de verdad con herramientas: no eres un chatbot que solo opina.',
    '',
    'ESTADO REAL DEL ANUNCIO (no inventes nada fuera de esto):',
    `Plantilla «${snap.templateName}» · producto ${snap.product} · formato ${snap.format} · duración total ${snap.totalDuration}s.`,
    'Escenas:',
    scenes || '(sin escenas)',
    '',
    `Score de retención: ${r.total === null ? 'sin verificar' : `${r.total}/100 (${r.verdict})`} · hook ${r.hook}/30 · captions ${r.captions}/25 · cortes ${r.cuts}/20 · CTA ${r.cta}/15 · safe ${r.safe === null ? '—' : `${r.safe}/10`} · cobertura de captions ${Math.round(r.coverage * 100)}%.`,
    'Detalle por regla:',
    items,
    snap.unsafeSceneNames.length
      ? `Escenas fuera de safe zone: ${snap.unsafeSceneNames.join(', ')} (eso no se arregla con un flag: hay que mover el texto en el preview).`
      : 'Ninguna escena fuera de safe zone.',
    '',
    'REGLAS:',
    '1. Responde en español, corto y directo. Di lo que vas a hacer, hazlo con herramientas, y luego reporta el resultado con números reales (score antes → después).',
    '2. Antes de afirmar un score o un dato del anuncio, usa get_score o list_scenes. Nunca inventes duraciones, captions ni scores.',
    '3. Para mejorar el anuncio usa apply_fixes (arreglos deterministas del motor de retención) o edit_scene para cambios puntuales que te pidan. No propongas cambios que no puedas ejecutar.',
    '4. Los cambios son solo de la sesión del Studio: el archivo del ejemplo no cambia. Dilo si importa.',
    '5. Si te piden algo fuera del Studio (otro tema, otro archivo, código), responde brevemente y vuelve al anuncio: ofrece lo más cercano que sí puedas hacer aquí.',
    '6. Si una herramienta falla, dilo tal cual y ofrece la alternativa real más cercana. No simules haber hecho algo.',
  ].join('\n');
}

/* Herramientas (esquemas OpenAI function-calling). */
export const AGENT_TOOLS: unknown[] = [
  {
    type: 'function',
    function: {
      name: 'get_score',
      description: 'Devuelve el score de retención actual del anuncio, regla por regla.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_scenes',
      description: 'Devuelve la lista actual de escenas con duraciones, captions y headlines.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_fixes',
      description:
        'Aplica los arreglos del motor de retención (acortar la primera escena a 2 s si el hook falla, extender captions a cobertura completa, recortar escenas de más de 4 s). Devuelve los arreglos aplicados y el score antes/después.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_scene',
      description:
        'Edita una escena concreta: su duración y/o su caption y/o su headline. La duración debe estar entre 0.5 y 10 segundos.',
      parameters: {
        type: 'object',
        properties: {
          scene_index: { type: 'integer', description: 'Número de escena, empezando en 1, como aparece en la lista.' },
          duration: { type: 'number', description: 'Nueva duración en segundos (0.5–10).' },
          caption: { type: 'string', description: 'Nuevo texto de caption.' },
          headline: { type: 'string', description: 'Nuevo headline.' },
        },
        required: ['scene_index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_brief',
      description: 'Genera el brief del anuncio actual en el panel «Brief para tu agente».',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_video',
      description: 'Inicia la exportación del vídeo en WebM: la descarga empieza en el navegador.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

/**
 * Convierte el historial del chat (UIMessage de AgentChat) a mensajes del
 * modelo. Solo se conservan las partes de texto; las partes de herramientas
 * sintéticas de la simulación se omiten porque el modelo no las entiende.
 */
export function historyToModelMessages(messages: UIMessage[]): { role: string; content: string }[] {
  const out: { role: string; content: string }[] = [];
  for (const m of messages.slice(-8)) {
    const parts = (m as unknown as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) continue;
    const text = parts
      .filter((p): p is { type: string; text?: string } => typeof p === 'object' && p !== null && (p as { type?: unknown }).type === 'text')
      .map((p) => p.text || '')
      .join('\n')
      .trim();
    if (!text) continue;
    const role = m.role === 'user' ? 'user' : 'assistant';
    out.push({ role, content: text });
  }
  return out;
}
