---
name: flare
description: Crea comerciales, ads y presentaciones animadas de producto con Flare (HTML/CSS/GSAP -> video: WebM en el navegador, o MP4 local con el CLI como opción avanzada). Usa esta skill cuando el usuario pida un comercial, un ad, una presentacion animada de producto, un guion de 15-30s, escenas HTML con captions y CTA, o validar/renderizar una pieza Flare. BYO agent, BYO key: nada sube a un servidor.
---

# Flare (OpenCode)

Flare es un estudio agent-native open source para crear comerciales, ads y presentaciones animadas de producto (HTML/CSS/GSAP → video: WebM en el navegador con MediaRecorder, o MP4 local con el CLI `flare render` como opción avanzada). NO es un clon de HyperFrames ni un generador de vídeo con IA. El usuario trae su propio agente y su API key (BYO agent, BYO key, nada sube a un servidor).

## Instalación

```bash
# Opción A: como plugin/skill en la config de OpenCode del usuario
cp -r skills/agents/opencode ~/.config/opencode/flare/
# y añade "flare" a la lista de plugins en opencode.json,
# o copia skills/agents/opencode/opencode.json a tu opencode.json

# Opción B: solo este repo — copia la skill a .opencode/
mkdir -p .opencode/skill/flare
cp skills/agents/opencode/skill/SKILL.md .opencode/skill/flare/SKILL.md
cp skills/agents/opencode/commands/*.md .opencode/command/ 2>/dev/null || true
```

Verifica con: `ls ~/.config/opencode/flare/skill/SKILL.md` (o la ruta de tu instalación).

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

Los comandos de `commands/` envuelven el CLI (ver `opencode.json`):

```bash
flare lint <slug>    # /flare-lint
flare score <slug>   # /flare-score
flare preview <slug>  # valida y sirve la pieza en http://localhost:8321/… (--no-serve: solo valida)
flare render <slug>  # /flare-render — MP4 local, opción avanzada; solo si lint está en verde
node skills/examples-check.mjs
```

**Render principal: WebM en el navegador** (Flare Studio, MediaRecorder / `captureStream`, botón "Exportar video (WebM)", sin instalar nada). `flare render` a MP4 local es la opción avanzada.

## Regla de oro

**Nunca inventes duraciones ni prometas un render sin validar la timeline.** Corre el lint y muestra su salida antes de hablar de un render.
