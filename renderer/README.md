# Flare — Renderer local (MP4 avanzado, opcional)

**Flare Studio** es un estudio agent-native open source para crear
comerciales y ads animados (HTML/CSS/GSAP → vídeo).

> **Render rápido en web (recomendado):** el render principal de Flare
> es **en el navegador, con MediaRecorder a WebM** — no necesita instalar
> nada. Este paquete, `flare-renderer`, es la **opción avanzada** para
> quien quiera un **MP4 local determinista, frame por frame**
> (HTML → PNGs → H.264 con FFmpeg). No es un generador con IA: captura
> frames deterministas y codifica. No llama a ningún modelo.

## Agnóstico al agente y al proveedor

Flare es agnóstico al agente y al proveedor: el renderer **no llama a
ningún modelo ni guarda API keys**. Funciona con escenas HTML generadas
por cualquier agente — Claude Code, Codex, Cursor, Gemini CLI, OpenCode,
Qwen Code — o escritas a mano, siempre que sigan el formato de escenas
de abajo. Tus keys (si usas un agente con LLM) viven solo en tu
navegador / tu agente, nunca en este renderer.

## Requisitos

| Herramienta | Para qué | Versión |
|---|---|---|
| Node.js | CLI `flare` | **22+** (verificado en esta VM: Node v24.22.1) |
| FFmpeg (+ ffprobe) | Codificar el MP4 | 8.1.2 en esta VM (`/usr/bin/ffmpeg`) |
| Chrome / Chromium | Capturar cada frame (solo `render` real) | ver "Instalar Chrome" |

`lint`, `score` y `storyboard` **no necesitan Chrome ni FFmpeg**:
son análisis estáticos del HTML. Solo `render` (sin `--dry-run`)
necesita ambos.

**Cero dependencias obligatorias.** `puppeteer-core` / `playwright`
son solo dependencias opcionales documentadas en `package.json`
(`optionalDependencies`) y **nunca se instalan por defecto**; el
renderer usa Chrome directamente por línea de comandos.

## Instalación

```bash
cd renderer
# No hay nada que instalar: cero dependencias.
# Opcional, para tener el comando global `flare`:
npm link
# ...o úsalo directamente:
node bin/flare.mjs --help
```

## Formato de escenas (`scenes.html`)

```html
<body data-composition-id="mi-anuncio" data-width="1080" data-height="1920" data-duration="6">
  <section data-scene="escena-1" data-start="0" data-duration="3" data-bg="#7c2d12">
    <div data-caption data-start="0" data-duration="3" style="font-size:96px">¿CAFÉ FRÍO OTRA VEZ?</div>
  </section>
  <section data-scene="escena-2" data-start="3" data-duration="3" data-bg="#0f766e">
    <div data-caption data-start="3" data-duration="3">Caliente hasta la última gota</div>
  </section>
  <a data-cta data-start="4" data-duration="2">PÍDELO HOY −20%</a>
</body>
```

Reglas del formato:

- Raíz con `data-composition-id`, `data-width`, `data-height` (px) y
  `data-duration` (segundos totales).
- Escenas: elementos con `data-scene`, `data-start`, `data-duration`
  (segundos) y opcional `data-bg` (color de fondo para el storyboard).
  Las escenas deben cubrir la duración total sin huecos.
- Clips (cortes): elementos con `data-clip` y `data-start` /
  `data-duration`. Si no hay clips explícitos, cada escena cuenta como
  un corte.
- Captions: elementos con `data-caption`, `data-start`, `data-duration`.
- CTA: elemento con `data-cta`, visible en los últimos 3 s (al menos 2 s).
- **Determinismo (`?t=`):** para renderizar, la página debe honrar el
  parámetro `?t=SEGUNDOS`: al cargar con `?t=1.5` muestra la escena
  cuyo intervalo `[start, start+duration)` contiene `1.5`. El renderer
  carga `scenes.html?t=<t>` una vez por frame. Ver
  `test-fixture/fixture.html` como ejemplo (JS de ~10 líneas).

## Comandos

`<dir|slug>` es una ruta (`examples/colchon-descanso-total`,
`test-fixture`) o un slug (`colchon-descanso-total`, `test-fixture`):
el CLI busca en `examples/<slug>/` y `renderer/<slug>/` desde la raíz
del repo. Un proyecto inexistente da un error amigable con la lista de
proyectos disponibles, sin stack trace.

```bash
# Validar una carpeta de escenas (busca scenes.html, o fixture.html)
flare lint test-fixture
flare lint colchon-descanso-total   # por slug, desde la raíz del repo

# Puntuación de retención 0-100 + checklist por regla
flare score test-fixture

# Validar y servir la pieza en el navegador (puerto 8321 por defecto)
flare preview colchon-descanso-total
flare preview colchon-descanso-total --port 8322
flare preview colchon-descanso-total --no-serve  # solo valida, imprime la ruta

# Storyboard HTML con las escenas (tiempo, caption, fondo real).
# Sin --out escribe <dir>/storyboard-export.html: nunca sobrescribe
# el storyboard.html del ejemplo sin --out explícito.
flare storyboard test-fixture --out storyboard.html

# Render real a MP4 (necesita Chrome + FFmpeg)
flare render test-fixture --fps 30 --out out.mp4

# Plan sin renderizar: valida la timeline, genera el storyboard y lista
# exactamente los frames que se capturarían (no necesita Chrome)
flare render test-fixture --fps 30 --out out.mp4 --dry-run
```

### `lint`

Valida `scenes.html`: `data-composition-id`, `data-width` / `height` /
`duration` válidos, escenas y clips con `data-start` / `data-duration`,
captions, y CTA presente. Errores con `archivo:línea` aproximada y
salida con código 1 si hay errores. Avisos (warnings) no bloquean:
escenas que no suman la duración total, CTA con < 2 s en los últimos 3 s.

### `score` — retención 0–100

Motor de retención unificado (las mismas reglas y números en
`skills/examples-check.mjs` y en `web/app.js`):

| Regla | Puntos | Criterio |
|---|---|---|
| Hook | 30 | Primera escena en 0 + texto de hook (clase `hook` o headline) + duración ≤ 2,5 s + motion (GSAP o animación CSS) → 30; hook presente pero > 2,5 s o sin motion → 15; sin hook → 0 |
| Captions ≥ 80 % de la duración | 25 | Cobertura real (unión de intervalos): min(25, 25 × cobertura / 0,8) |
| Cortes de 2–4 s | 20 | 20 × (clips en rango / clips totales) |
| CTA en los últimos 3 s, visible ≥ 2 s | 15 | Visible ≥ 2 s → 15; si no, 15 × visible / 2; sin CTA → 0 |
| Safe zones | 10 | 10 × (captions y CTA dentro / totales), por posición real (top/bottom declarado, margen 10 % arriba/abajo); sin anclaje vertical declarado se cuenta como fuera (conservador) |

Imprime el score total y una línea `PASS`/`FAIL` por regla con el
detalle. Si el lint falla, `score` se niega a puntuar (código 1).
Etiquetas: ≥ 75 "Sólido · listo para publicar", 50–74 "Necesita
trabajo", < 50 "Débil".

### `preview`

Valida el proyecto (lint) y lo sirve por HTTP para verlo en el
navegador: por defecto en `http://localhost:8321/<ruta a scenes.html>`
(`--port N` cambia el puerto; pulsa Ctrl+C para parar). Sirve la raíz
del repo cuando el proyecto vive bajo ella, para que los assets
relativos (`../../web/vendor/gsap.min.js`) resuelvan. Con `--no-serve`
solo valida e imprime la ruta de `scenes.html`, sin servidor.

### `storyboard`

Genera un HTML con una tarjeta por escena: tiempo de inicio/fin,
caption y fondo real (el `data-bg` del clip, o el fondo del stage —
normalmente su gradiente CSS —, o "gradiente CSS" si el CSS usa
gradientes sin fondo declarado). Por defecto escribe
`<dir>/storyboard-export.html` (nunca sobrescribe el `storyboard.html`
del ejemplo sin `--out` explícito).

### `render` y `--dry-run`

Flujo real (sin `--dry-run`): por cada frame (`duration × fps`), el
renderer carga `scenes.html?t=SEGUNDOS` en Chrome headless
(`--screenshot`, tamaño = `data-width` × `data-height`) y guarda un
PNG; después FFmpeg los une:

```bash
ffmpeg -y -framerate 30 -i frame%04d.png -c:v libx264 -pix_fmt yuv420p -movflags +faststart out.mp4
```

Los PNGs quedan en una carpeta temporal `.flare-frames-<timestamp>/`
en el directorio actual (bórrala cuando termines).

**`--dry-run`** no captura nada ni escribe MP4: valida la timeline,
genera el storyboard y lista exactamente los frames que se capturarían
(`frame0001.png` a `frameNNNN.png` con su `t=`), y explica qué falta
para el render real.

**Detección de Chrome** (en este orden): variable `CHROME_PATH`;
PATH (`google-chrome`, `chromium`, `chromium-browser`, `chrome`); cachés
de Playwright (`~/.cache/ms-playwright/`) y Puppeteer
(`~/.cache/puppeteer/`); rutas conocidas (incl. `/opt/meta-chromium/chrome`,
el Chromium que trae la imagen de esta VM, que va **el último** porque
responde a `--version` pero rechaza screenshots headless por CLI).

## Instalar Chrome en otra máquina

Elige **una** de estas opciones (comando exacto):

```bash
# Opción A — Playwright (recomendada, descarga un Chromium stock)
npx --yes playwright@latest install chromium

# Opción B — Chromium del sistema (Debian/Ubuntu)
sudo apt-get update && sudo apt-get install -y chromium-browser

# Opción C — Google Chrome (.deb oficial, Debian/Ubuntu)
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
```

Después verifica y renderiza:

```bash
# Si Chrome quedó fuera del PATH, apúntalo:
export CHROME_PATH=/ruta/a/chrome   # p. ej. ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
flare render test-fixture --fps 30 --out out.mp4
ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,width,height -of default=nw=1 out.mp4
```

## Limitaciones conocidas (verificadas en esta VM)

- El Chromium que trae la imagen de esta VM (`/opt/meta-chromium/chrome`,
  "Muse Browser" 157.0.8103.81) **no arranca en modo headless por CLI**:
  aborta con `Hatch WebGL domain policy is required for browser startup`
  (exit 13). El renderer lo detecta, pero solo como último recurso.
  **El render real sí se consiguió en esta VM** con el Chromium stock
  de Playwright (`Google Chrome for Testing 159.0.8154.6`, en
  `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`):
  MP4 de 3 s, 1080×1920, H.264, 90 frames, verificado con ffprobe.
  Detalle y pruebas en `TEST-REPORT.md`. (La descarga del
  `chrome-headless-shell` de Playwright falló dos veces por cierre de
  conexión del servidor; es un binario aparte que el renderer no usa.)
- El fixture de prueba dura 3 s con escenas de 1,5 s, así que la regla
  de cortes 2–4 s falla a propósito: un anuncio de 3 s no puede tener
  cortes de 2–4 s. Su score esperado es **80/100**, no 100.
- Un render a 30 fps tarda ~1,9 s por frame en esta VM (un lanzamiento
  de Chrome por frame): 3 s de vídeo ≈ 3 min.
- El renderer es Node 22+ y no usa APIs exclusivas de Node 24.

## Archivos

```
renderer/
  package.json            flare-renderer, cero dependencias obligatorias
  bin/flare.mjs           CLI (lint / score / storyboard / preview / render)
  lib/parse.js            parseo de scenes.html -> timeline
  lib/score.js            score de retención 0-100
  lib/render.js           detección de Chrome/FFmpeg, storyboard, render real
  test-fixture/fixture.html   escena mínima 9:16, 3 s, 2 escenas + CTA
  fixture-broken/fixture.html fixture roto a propósito (sin CTA)
  README.md               este archivo
  TEST-REPORT.md          qué se probó de verdad en esta VM
```
