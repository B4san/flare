---
name: flare
description: Crea comerciales, ads y presentaciones animadas de producto con Flare (HTML/CSS/GSAP -> video renderizado en web o local). Usa esta skill cuando el usuario pida un comercial, un ad, una presentacion animada de producto, un guion de 15-30s, escenas HTML con captions y CTA, o validar/renderizar una pieza Flare. BYO agent, BYO key: nada sube a un servidor.
---

# Flare (Qwen Code)

Flare es un estudio agent-native open source para crear comerciales, ads y presentaciones animadas de producto (HTML/CSS/GSAP → video: WebM en el navegador con MediaRecorder, o MP4 local con el CLI `flare render`). NO es un clon de HyperFrames ni un generador de vídeo con IA. El usuario trae su propio agente y su propia API key (BYO agent, BYO key, nada sube a un servidor).

## Instalación (Qwen Code skills)

Qwen Code carga skills desde su carpeta de skills. Copia esta carpeta como `flare`:

```bash
# Opción A: global
mkdir -p ~/.qwen/skills/flare
cp skills/agents/qwen/SKILL.md ~/.qwen/skills/flare/SKILL.md

# Opción B: solo este repo (si tu Qwen Code soporta skills de proyecto)
mkdir -p .qwen/skills/flare
cp skills/agents/qwen/SKILL.md .qwen/skills/flare/SKILL.md
```

Verifica con: `ls ~/.qwen/skills/flare/SKILL.md`.

## Skill canónica

La fuente de verdad es `skills/SKILL.md` en el repo Flare. Léela completa antes de crear o validar cualquier pieza. Resumen del contrato — el detalle manda en la canónica:

- **Flujo:** brief → guion 15–30 s → escenas HTML → captions → CTA → lint → preview → render.
- **Composición:** `<div id="stage" data-composition-id="slug" data-width="…" data-height="…" data-duration="…">`.
- **Clips:** `class="clip" data-start data-duration data-track-index="0"`, 2–4 s cada uno, sin huecos ni solapes; la suma es la duración total.
- **Captions:** `class="caption" data-start data-duration`, cubren ≥80 % de la duración.
- **CTA:** `class="cta"`, últimos 3 s, visible ≥2 s.
- **GSAP:** timelines con `paused: true`, nunca auto-play. Al cargar, leer `?t=SEGUNDOS` y exponer `window.__flareSeek(t)` y `window.__flareDuration`.
- **Retención (≥75/100):** hook primeros 2 s (30), captions ≥80 % (25), cortes 2–4 s (20), CTA últimos 3 s ≥2 s (15), safe zones 10 % (10). Umbrales y arreglos en `skills/retention-checklist.md`.
- **Proveedores:** el usuario trae su propia key del proveedor que elija (OpenAI, Anthropic, Gemini, Qwen, DeepSeek, Groq, Together, Mistral, OpenRouter, Fireworks, Ollama/LM Studio local, o cualquier endpoint OpenAI-compatible). La key vive en su navegador (localStorage) o en su CLI, nunca en el repo ni en un servidor de Flare. Detalle en `skills/providers.md`.

## Comandos

```bash
flare lint <dir>        # valida scenes.html y meta.json
flare score <dir>       # puntúa retención 0-100 con checklist
flare storyboard <dir>  # genera storyboard HTML
flare render <dir>      # MP4 local (opción avanzada; el render rápido es en web a WebM)
node skills/examples-check.mjs   # valida los 3 ejemplos del repo
```

## Regla de oro

> **Nunca inventes duraciones ni prometas un render sin validar la timeline.**
