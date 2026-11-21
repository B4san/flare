---
name: flare
description: Crea comerciales, ads y presentaciones animadas de producto con Flare (HTML/CSS/GSAP -> video: WebM en el navegador, o MP4 local con el CLI como opción avanzada). Usa esta skill cuando el usuario pida un comercial, un ad, una presentacion animada de producto, un guion de 15-30s, escenas HTML con captions y CTA, o validar/renderizar una pieza Flare. BYO agent, BYO key: nada sube a un servidor.
---

# Flare (Codex)

Flare es un estudio agent-native open source para crear comerciales, ads y presentaciones animadas de producto (HTML/CSS/GSAP → video: WebM en el navegador con MediaRecorder, o MP4 local con el CLI `flare render` como opción avanzada). NO es un clon de HyperFrames ni un generador de vídeo con IA. El usuario trae su propio agente y su API key (BYO agent, BYO key, nada sube a un servidor).

## Instalación (Codex skills)

Codex carga skills desde la carpeta de skills del usuario o del proyecto. Copia esta carpeta como `flare`:

```bash
# Opción A: global — carpeta de skills de Codex del usuario
# (ruta típica: ~/.codex/skills/flare/ ; si tu instalación usa otra,
#  copia ahí el contenido de skills/agents/codex/)
mkdir -p ~/.codex/skills/flare
cp skills/agents/codex/SKILL.md ~/.codex/skills/flare/SKILL.md

# Opción B: solo este repo — carpeta de skills del proyecto
mkdir -p .codex/skills/flare
cp skills/agents/codex/SKILL.md .codex/skills/flare/SKILL.md
```

Verifica con: `ls ~/.codex/skills/flare/SKILL.md` (o la ruta de tu instalación).

## Skill canónica

La fuente de verdad es `skills/SKILL.md` en el repo Flare. Léela completa antes de crear o validar cualquier pieza. Resumen del contrato — el detalle manda en la canónica:

- **Flujo:** brief → guion 15–30 s → escenas HTML → captions → CTA → lint → preview → render.
- **Composición:** `<div id="stage" data-composition-id="slug" data-width="…" data-height="…" data-duration="…">`.
- **Clips:** `class="clip" data-start data-duration data-track-index="0"`, 2–4 s cada uno, sin huecos ni solapes; la suma es la duración total.
- **Captions:** `class="caption" data-start data-duration`, cubren ≥80 % de la duración.
- **CTA:** `class="cta"`, últimos 3 s, visible ≥2 s.
- **GSAP:** timelines con `paused: true`, nunca auto-play. Al cargar, leer `?t=SEGUNDOS` y exponer `window.__flareSeek(t)` y `window.__flareDuration`.
- **Retención (≥75/100):** hook primeros 2 s (30), captions ≥80 % (25), cortes 2–4 s (20), CTA últimos 3 s ≥2 s (15), safe zones 10 % (10). Umbrales y arreglos en `skills/retention-checklist.md`.

## Comandos

```bash
flare lint <slug>    # valida contrato, duraciones, captions, CTA y retención
flare score <slug>   # score de retención con desglose por regla
flare preview <slug>  # valida y sirve la pieza en http://localhost:8321/… (--no-serve: solo valida)
flare render <slug>  # MP4 local (opción avanzada; el render rápido es WebM en el navegador)
node skills/examples-check.mjs  # validación de los ejemplos del repo
```

## Regla de oro

**Nunca inventes duraciones ni prometas un render sin validar la timeline.** Corre el lint y muestra su salida antes de hablar de un render.

## Verificar que la skill cargó

En una conversación nueva pregunta: "¿Qué es Flare y cuál es su regla de oro?" Debe responder: estudio agent-native HTML/CSS/GSAP → video (WebM en el navegador, o MP4 local como opción avanzada), BYO agent/BYO key, y la regla de oro de arriba.
