# Flare

[![Dojo AI Hackathon 2026](https://img.shields.io/badge/Dojo%20AI%20Hackathon%202026-participante-FFB020)](https://trydojo.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-8B5CF6)](./LICENSE)

> **Catch the eye. Hold the scroll. Earn the click.**
> **Atrapa la mirada. Retén el scroll. Gana el click.**

**Flare** (antes Hookframe) es un estudio agent-native open source para crear comerciales, ads y presentaciones animadas de producto con **HTML/CSS/GSAP → video**. Tú traes tu propio agente y tu propia API key (BYO agent, BYO key). Nada sube a un servidor.

## Qué es Flare (y qué NO es)

**Sí:**
- Guiones cortos de 15–30 s, escenas en HTML/CSS/GSAP autocontenidas, captions quemadas, CTA final.
- Lint + preview + score de retención verificable (0–100, objetivo ≥ 75) + render.
- Render principal en el navegador: **WebM con MediaRecorder** (botón "Exportar video (WebM)" en Flare Studio, sin instalar nada).
- Render avanzado opcional: **MP4 local determinista** con el CLI `flare` (HTML → PNGs → H.264 con FFmpeg).
- 12 proveedores de modelo + Custom (OpenAI-compatible), 6 CLIs con skills (Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Qwen Code).

**No:**
- No es un clon de HyperFrames.
- No es un generador de video con IA (no genera clips con modelos de video).
- No guarda tus keys: viven en tu navegador (`localStorage`) o en tu CLI, nunca en el repo ni en un servidor de Flare.
- No tiene servidor: la web es estática y el render es local.

## Quickstart (5 minutos)

```bash
# 1. Sirve la web estática (o abre web/index.html directamente)
npm run serve
#    → http://localhost:8123/web/

# 2. En Flare Studio: elige plantilla, formato (9:16, 1:1, 16:9) y proveedor,
#    escribe el brief y pulsa "Generar con mi agente".
#    El Studio no llama a ningún modelo: genera el brief para TU agente.

# 3. Tu agente (con la skill de skills/agents/<tu-cli>/) crea
#    examples/<slug>/scenes.html siguiendo el contrato de skills/SKILL.md.

# 4. Valida y puntúa (los dos deben coincidir)
node skills/examples-check.mjs
flare lint <slug>     # o: node renderer/bin/flare.mjs lint <slug>
flare score <slug>    # retención 0–100; objetivo ≥ 75

# 5. Previsualiza en el navegador
flare preview <slug>  # http://localhost:8321/… (Ctrl+C para parar)

# 6. Exporta WebM en el Studio (botón "Exportar video (WebM)"),
#    o MP4 local avanzado:
flare render <slug> --fps 30 --out out.mp4
```

Sin `flare` instalado globalmente, usa `node renderer/bin/flare.mjs …` (cero dependencias, Node 22+).

## Motor de retención (unificado)

El mismo motor, con los mismos números, en los tres scorers: `skills/examples-check.mjs`, `renderer/lib/score.js` (`flare score`) y `web/app.js`. Si cambias una regla, cámbiala en los tres sitios.

| # | Regla | Puntos | Criterio |
|---|-------|--------|----------|
| 1 | Hook | 30 | Primera escena en 0 + texto de hook (clase `hook` o headline) + duración ≤ 2,5 s + motion (GSAP o animación CSS) → 30; hook presente pero > 2,5 s o sin motion → 15; sin hook → 0 |
| 2 | Captions | 25 | Cobertura = unión de intervalos de captions / duración total. Score = min(25, 25 × cobertura / 0,8) |
| 3 | Cortes | 20 | 20 × (clips de 2–4 s, ambos incluidos / clips totales) |
| 4 | CTA | 15 | CTA en los últimos 3 s y visible ≥ 2 s → 15; si visible < 2 s → 15 × visible / 2; sin CTA → 0 |
| 5 | Safe zones | 10 | 10 si todos los captions y el CTA están dentro (margen 10 % arriba/abajo); si no, 10 × (dentro / totales). Posición real (top/bottom declarado), nunca un "10 %" suelto en el archivo |

**Etiquetas:** ≥ 75 "Sólido · listo para publicar" · 50–74 "Necesita trabajo" · < 50 "Débil".

Detalle y arreglos por regla: [`skills/retention-checklist.md`](skills/retention-checklist.md). Contrato de escenas: [`skills/SKILL.md`](skills/SKILL.md).

## Tokens de diseño

Fuente única: [`web/tokens.css`](web/tokens.css).

| Token | Valor |
|---|---|
| Fondo | `#0A0A0F` |
| Superficie | `#12121A` |
| Superficie elevada | `#1A1A26` |
| Borde | `rgba(255,255,255,0.08)` |
| Texto | `#F5F5F2` |
| Texto secundario | `#9A9AA8` |
| Degradado flare | ámbar `#FFB020` → coral `#FF5A3C` → violeta `#8B5CF6` |
| Tipografía | Space Grotesk (títulos) · Inter (cuerpo) · JetBrains Mono (código/logs) |
| Radios | 16–20 px (pill 999 px solo botones) |
| Movimiento | GSAP spring, 300–500 ms (`cubic-bezier(.22,1,.36,1)`) |

## Proveedores y CLIs soportados

**Proveedores (BYO key):** OpenAI, Anthropic, Google Gemini, Qwen, DeepSeek, Groq, Together, Mistral, OpenRouter, Fireworks AI, Ollama (local), LM Studio (local) y Custom (cualquier endpoint OpenAI-compatible). Base URLs y modelos por defecto en [`skills/providers.md`](skills/providers.md) (fuente de verdad: `web/app.js`).

**CLIs con skill:** Claude Code, Codex, Cursor, Gemini CLI, OpenCode y Qwen Code — adaptadores en [`skills/agents/`](skills/agents/) (la canónica es [`skills/SKILL.md`](skills/SKILL.md)).

## Estructura del repo

```
flare/
  web/                  Flare Studio (web estática: index.html, app.js, styles.css, tokens.css)
  skills/               Skill canónica (SKILL.md), retention-checklist.md, providers.md,
                        examples-check.mjs, agents/ (adaptadores por CLI)
  renderer/             CLI `flare` (bin/flare.mjs, lib/parse.js, lib/score.js, lib/render.js),
                        test-fixture/, fixture-broken/, README.md, TEST-REPORT.md
  examples/             3 ejemplos: colchon-descanso-total (9:16),
                        marca-personal (1:1), saas-presentacion (16:9)
  scripts/              serve-web.mjs (servidor estático para la web, cero dependencias)
  README.md  LICENSE  package.json
```

## Licencia

MIT — ver [LICENSE](./LICENSE). Copyright (c) 2026 Sebastian Flores Peralta ([B4san](https://github.com/B4san)).

> El repositorio público es https://github.com/B4san/flare — **planeado, aún no creado** al escribir este README. Hasta que exista, este README vive con el código local.

Hecho para el **Dojo AI Hackathon 2026** (https://trydojo.io).
