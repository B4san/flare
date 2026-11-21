// Flare — datos empaquetados en el build (B-R6-1).
//
// LECCIÓN R6: en la versión vanilla el Studio hacía fetch a
// `../examples/<slug>/meta.json` y `scenes.html`. Con root=web/ en Vercel,
// `examples/` NO estaba desplegado → 6× 404 → fallback silencioso a
// plantillas embebidas con safe:false → scores falsos 90/75/75.
// Aquí NO hay fetch: los meta.json y los scenes.html se importan en build
// (JSON + ?raw) y viajan DENTRO del bundle. Si un import faltara, el build
// falla en voz alta; en runtime no existe el modo "fallback silencioso".

import colchonMeta from '../../../../examples/colchon-descanso-total/meta.json';
import marcaMeta from '../../../../examples/marca-personal/meta.json';
import saasMeta from '../../../../examples/saas-presentacion/meta.json';
import colchonHtml from '../../../../examples/colchon-descanso-total/scenes.html?raw';
import marcaHtml from '../../../../examples/marca-personal/scenes.html?raw';
import saasHtml from '../../../../examples/saas-presentacion/scenes.html?raw';
import type { AgentId, FormatId, ProviderId, TemplateBundle, TemplateMeta } from './types';

export const TEMPLATES: Record<string, TemplateBundle> = {
  'colchon-descanso-total': {
    meta: colchonMeta as unknown as TemplateMeta,
    scenesHtml: colchonHtml,
  },
  'marca-personal': {
    meta: marcaMeta as unknown as TemplateMeta,
    scenesHtml: marcaHtml,
  },
  'saas-presentacion': {
    meta: saasMeta as unknown as TemplateMeta,
    scenesHtml: saasHtml,
  },
};

export const TEMPLATE_ORDER = [
  'colchon-descanso-total',
  'marca-personal',
  'saas-presentacion',
] as const;

export const TEMPLATE_SLUGS = TEMPLATE_ORDER as unknown as string[];

/* ================= FORMATOS ================= */

// stageW/stageH = tamaño fijo del preview en px (el criterio de aceptación
// R6 es medir rects en vivo sobre ESTOS tamaños; no son arbitrarios: con
// ellos las bandas absolutas del preview dejan margen real, ver
// PreviewClip.tsx y DESIGN.md §2).
export const FORMATS: Record<
  FormatId,
  { label: string; width: number; height: number; stageW: number; stageH: number }
> = {
  '9:16': { label: '9:16', width: 1080, height: 1920, stageW: 270, stageH: 480 },
  '1:1': { label: '1:1', width: 1080, height: 1080, stageW: 384, stageH: 384 },
  '16:9': { label: '16:9', width: 1920, height: 1080, stageW: 512, stageH: 288 },
};

/* ================= AGENTES (6 CLIs) ================= */
// Copiado exacto de web/app.js (AGENTS) — mismos nombres, comandos y colores.
export const AGENTS: Record<
  AgentId,
  { name: string; initial: string; color: string; command: string; sub: string }
> = {
  'claude-code': {
    name: 'Claude Code',
    initial: 'C',
    color: '#8B5CF6',
    command: 'claude "/flare:build --brief brief.md"',
    sub: 'Skill flare · lista para construir',
  },
  codex: {
    name: 'Codex',
    initial: 'X',
    color: '#10B981',
    command: 'codex exec --skill flare "Genera el anuncio desde brief.md"',
    sub: 'Skill flare · lista para construir',
  },
  cursor: {
    name: 'Cursor',
    initial: 'Cu',
    color: '#FF5A3C',
    command: 'cursor --agent flare --brief brief.md',
    sub: 'Agente flare · abre Cursor y ejecuta',
  },
  'gemini-cli': {
    name: 'Gemini CLI',
    initial: 'G',
    color: '#60A5FA',
    command: 'gemini -p "Usa la skill flare para generar este anuncio desde brief.md"',
    sub: 'Skill flare · lista para construir',
  },
  opencode: {
    name: 'OpenCode',
    initial: 'O',
    color: '#F59E0B',
    command: 'opencode run --skill flare "Genera el anuncio desde brief.md"',
    sub: 'Skill flare · lista para construir',
  },
  'qwen-code': {
    name: 'Qwen Code',
    initial: 'Q',
    color: '#FFB020',
    command: 'qwen "/flare:build --brief brief.md"',
    sub: 'Skill flare · lista para construir',
  },
};

export const AGENT_ORDER: AgentId[] = [
  'claude-code',
  'codex',
  'cursor',
  'gemini-cli',
  'opencode',
  'qwen-code',
];

/* ================= PROVEEDORES (13, BYO key) ================= */
// Copiado exacto de web/app.js (PROVIDERS). Las keys viven SOLO en
// localStorage del navegador (flare.provider.keys); nunca salen de ahí.
export interface ProviderDef {
  name: string;
  baseUrl: string;
  models: string[];
  needsKey: boolean;
  local?: boolean;
  custom?: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-5', 'gpt-4o', 'gpt-4o-mini'],
    needsKey: true,
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
    needsKey: true,
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    needsKey: true,
  },
  qwen: {
    name: 'Qwen',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    models: ['qwen3-max', 'qwen3-coder-plus', 'qwen3-235b-a22b'],
    needsKey: true,
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    needsKey: true,
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'],
    needsKey: true,
  },
  together: {
    name: 'Together',
    baseUrl: 'https://api.together.xyz/v1',
    models: ['meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8'],
    needsKey: true,
  },
  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-medium-latest'],
    needsKey: true,
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-5'],
    needsKey: true,
  },
  fireworks: {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    models: ['accounts/fireworks/models/llama-v3p3-70b-instruct'],
    needsKey: true,
  },
  ollama: {
    name: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    models: ['qwen3', 'llama3.2', 'gemma3'],
    needsKey: false,
    local: true,
  },
  lmstudio: {
    name: 'LM Studio (local)',
    baseUrl: 'http://localhost:1234/v1',
    models: ['local-model'],
    needsKey: false,
    local: true,
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    models: [],
    needsKey: true,
    custom: true,
  },
};

export const PROVIDER_ORDER: ProviderId[] = [
  'openai',
  'anthropic',
  'gemini',
  'qwen',
  'deepseek',
  'groq',
  'together',
  'mistral',
  'openrouter',
  'fireworks',
  'ollama',
  'lmstudio',
  'custom',
];

/* ================= HELPERS ================= */

/** Duración en formato español: 17.5 → "17,5 s" (R6 B3: nunca "18 s"). */
export function formatDuration(seconds: number): string {
  return seconds.toFixed(1).replace('.', ',') + ' s';
}

/** "17,5 s" corto para pills. */
export function formatDurationShort(seconds: number): string {
  return formatDuration(seconds);
}

export function totalDuration(scenes: { duration: number }[]): number {
  return scenes.reduce((a, s) => a + s.duration, 0);
}

export function sceneAt(
  scenes: { start: number; duration: number }[],
  t: number,
): number {
  const total = totalDuration(scenes);
  if (t >= total) return scenes.length - 1;
  const idx = scenes.findIndex((s) => t >= s.start && t < s.start + s.duration);
  return idx === -1 ? 0 : idx;
}
