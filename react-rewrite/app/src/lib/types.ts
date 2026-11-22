// Flare — tipos del dominio (plantillas, escenas, agentes, proveedores).

export type FormatId = '9:16' | '1:1' | '16:9';

export type AgentId =
  | 'claude-code'
  | 'codex'
  | 'cursor'
  | 'gemini-cli'
  | 'opencode'
  | 'qwen-code';

export type ProviderId =
  | 'flare-cloud'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'qwen'
  | 'deepseek'
  | 'groq'
  | 'together'
  | 'mistral'
  | 'openrouter'
  | 'fireworks'
  | 'ollama'
  | 'lmstudio'
  | 'custom';

export interface Scene {
  id: string;
  name: string;
  start: number;
  duration: number;
  kicker?: string;
  headline?: string;
  headlineHl?: string;
  sub?: string;
  caption: string;
  captionDuration: number;
  motion?: boolean;
  /** Flag del meta.json (verdad del export). null = sin dato. */
  safe?: boolean | null;
  tone?: string;
  visualKind?: string;
  isCTA?: boolean;
  ctaLabel?: string;
  midline?: string;
  midChips?: string[];
}

export interface TemplateMeta {
  slug: string;
  name: string;
  title: string;
  description: string;
  product: string;
  productLine: string;
  format: FormatId;
  width: number;
  height: number;
  duration: number;
  fps: number;
  scenes: Scene[];
}

/** Una plantilla con sus datos empaquetados + su scenes.html (verdad del export). */
export interface TemplateBundle {
  meta: TemplateMeta;
  /** Contenido de examples/<slug>/scenes.html, importado en build (?raw). */
  scenesHtml: string;
}
