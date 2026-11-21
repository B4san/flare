# Flare — Adaptadores por agente

La skill canónica es [`../SKILL.md`](../SKILL.md). Es el contrato común: brief → guion → escenas HTML → captions → CTA → lint → preview → render, con el contrato de escenas y las reglas de retención verificables.

Los adaptadores de esta carpeta **no duplican** la skill: solo explican cómo instalarla y cargarla en cada agente. Donde el agente exige el contenido incrustado (Cursor, OpenCode), se copia lo necesario y se referencia la canónica como fuente de verdad.

| Agente | Archivo | Instalación |
|--------|---------|-------------|
| Claude Code / Claude | `agents/claude/SKILL.md` | `cp -r skills/agents/claude ~/.claude/skills/flare/` o al repo en `.claude/skills/flare/` |
| Codex | `agents/codex/SKILL.md` | Copiar a la carpeta de skills de Codex del usuario o del repo (ver archivo) |
| Cursor | `agents/cursor/flare.mdc` | Copiar a `.cursor/rules/flare.mdc` del repo |
| Gemini CLI | `agents/gemini/SKILL.md` | Copiar a la carpeta de skills de Gemini CLI (ver archivo) |
| OpenCode | `agents/opencode/` | Copiar `opencode.json` / plugin a la config de OpenCode (ver archivo) |
| Qwen Code | `agents/qwen/SKILL.md` | `cp -r skills/agents/qwen ~/.qwen/skills/flare/` o al repo en `.qwen/skills/flare/` |
| Cualquier CLI con skills | `SKILL.md` (canónica) | El contrato es agnóstico al agente: copia `skills/SKILL.md` a la carpeta de skills de tu CLI |

Proveedores de modelo (BYO key): ver [`../providers.md`](../providers.md) — OpenAI, Anthropic, Gemini, Qwen, DeepSeek, Groq, Together, Mistral, OpenRouter, Fireworks, Ollama/LM Studio local y cualquier endpoint OpenAI-compatible. La key vive solo en tu navegador (`localStorage`) o en tu CLI, nunca en el repo ni en un servidor de Flare.

## Instalación rápida (todos)

```bash
# Desde la raíz del repo flare
ls skills/SKILL.md skills/agents/
```

## Cómo verificar que el agente la cargó

1. En una conversación nueva, pide: **"¿Qué es Flare y cuál es su regla de oro?"**
   - Respuesta correcta: estudio agent-native open source HTML/CSS/GSAP → video (WebM en el navegador, o MP4 local como opción avanzada), BYO agent/BYO key, nada sube a un servidor; regla de oro: *nunca inventar duraciones ni prometer un render sin validar la timeline*.
2. Pide: **"Crea el guion de un ad de 18 s en 9:16 con el contrato de escenas"**
   - Debe producir clips con `class="clip" data-start data-duration`, captions con `class="caption"`, CTA en los últimos 3 s con `class="cta"`, timelines GSAP pausadas y `window.__flareSeek`.
3. Pide: **"Valida este ejemplo con el checklist de retención"**
   - Debe aplicar los umbrales numéricos de `skills/retention-checklist.md` (hook 30, captions 25, cortes 20, CTA 15, safe zones 10; objetivo ≥75/100), no consejos vagos.

Si el agente inventa duraciones, promete un render sin lint o propone generar vídeo con IA, la skill no está cargada: reinstala siguiendo el archivo de su agente y repite la verificación.

## Validación del repo

```bash
node skills/examples-check.mjs
```

Debe salir en verde para los 3 ejemplos (`colchon-descanso-total`, `saas-presentacion`, `marca-personal`) con score ≥75/100 cada uno.
