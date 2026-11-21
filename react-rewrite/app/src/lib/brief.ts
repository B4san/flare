// Flare — brief + comando para el agente (port de web/app.js buildBrief).

import { AGENTS, FORMATS, PROVIDERS, totalDuration } from './data';
import type { RetentionResult } from './retention';
import type { AgentId, FormatId, ProviderId, Scene, TemplateMeta } from './types';

export interface BriefInput {
  scenes: Scene[];
  template: TemplateMeta;
  format: FormatId;
  agentId: AgentId;
  providerId: ProviderId;
  providerBaseUrl: string;
  providerModel: string;
  retention: RetentionResult;
  /** Escenas con violaciones medidas en vivo (auditoría), si las hay. */
  unsafeSceneIds?: Set<string>;
}

export function buildBrief(input: BriefInput): { brief: string; command: string } {
  const { scenes, template, format, agentId, providerId } = input;
  const r = input.retention;
  const a = AGENTS[agentId] || AGENTS['claude-code'];
  const p = PROVIDERS[providerId] || PROVIDERS.openai;
  const f = FORMATS[format];
  const total = totalDuration(scenes);
  const unsafe = input.unsafeSceneIds || new Set<string>();

  const sceneLines = scenes
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} (${s.start.toFixed(1)}–${(s.start + s.duration).toFixed(1)} s, ${s.duration} s)` +
        (s.isCTA ? ' [CTA]' : '') +
        `\n   Headline: ${s.headline || '(sin headline)'}` +
        `\n   Caption: "${s.caption}" (${s.captionDuration} s)` +
        (unsafe.has(s.id)
          ? '\n   ⚠ Texto fuera de la safe zone del 10% (medido en vivo) — corrígelo.'
          : ''),
    )
    .join('\n');

  const brief =
    '# Brief — Flare Studio\n' +
    `Producto: ${template.productLine}\n` +
    `Plantilla: ${template.name}\n` +
    `Formato: ${format} (${f.width}×${f.height})\n` +
    `Duración total: ${total} s\n` +
    `Score de retención actual: ${r.total === null ? 'sin verificar' : r.total + '/100'}\n` +
    `Agente: ${a.name}\n` +
    `Proveedor de modelo (BYO key): ${p.name} · modelo ${input.providerModel || '—'} · ${input.providerBaseUrl || '—'}\n` +
    'API key: guardada solo en el navegador del usuario (localStorage). No la pidas, no la incluyas en archivos, no la envíes a ningún servidor.\n' +
    `\n## Escenas\n${sceneLines}\n` +
    '\n## Reglas de retención (obligatorias)\n' +
    '- Hook en los primeros 2 s: movimiento + texto grande + pregunta o contraste.\n' +
    '- Captions que cubran al menos el 80% de la duración total.\n' +
    '- Ritmo de cortes: escenas de 2 a 4 segundos.\n' +
    '- CTA en los últimos 3 s, visible al menos 2 s.\n' +
    '- Safe zones: en 9:16, el texto dentro de los márgenes del 10%.\n' +
    '\n## Contrato de salida\n' +
    `- Un <div data-composition-id="flare-ad" data-width="${f.width}" data-height="${f.height}" data-duration="${total}">.\n` +
    '- Clips con class="clip" y data-start, data-duration, data-track-index.\n' +
    '- Captions con class="caption" y data-start, data-duration.\n' +
    '- CTA final con class="cta".\n' +
    '- Animaciones GSAP en timelines pausadas; exponer window.__flareSeek(t) y window.__flareDuration.\n' +
    '- El render en web usa MediaRecorder (WebM). El render a MP4 es opcional, con el CLI local Node + FFmpeg.\n' +
    '\n## Qué NO hacer\n' +
    '- No inventes otro producto, ni precios, ni testimonios, ni especificaciones.\n' +
    '- No uses metraje generado por IA ni imágenes de stock sin licencia.\n' +
    '- No guardes keys ni credenciales en el código.\n';

  const command =
    a.command +
    `\n# Proveedor (BYO key): ${p.name} · ${input.providerModel || 'sin modelo'} · ${input.providerBaseUrl || 'sin base URL'}` +
    '\n# Tu key vive solo en tu navegador. Flare no tiene servidor.';

  return { brief, command };
}
