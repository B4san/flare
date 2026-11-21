# Flare renderer — TEST REPORT (esta VM, 2026-11-21)

Producto: **Flare** (antes Hookframe). CLI: `flare`. Todo lo probado
abajo se ejecutó de verdad en esta VM; nada de esto es inventado.
Comandos desde `~/workspace/hookframe/renderer/`.

## Entorno verificado

| Componente | Resultado |
|---|---|
| Node | `v24.22.1` (npm 10.9.4). El CLI solo exige Node 22+ y no usa APIs de Node 24. |
| FFmpeg / ffprobe | `8.1.2` en `/usr/bin/ffmpeg` y `/usr/bin/ffprobe` (con libx264). |
| Chrome en PATH | **No hay**: `which google-chrome chromium chromium-browser` no devuelve nada. |
| Chromium en la imagen | `/opt/meta-chromium/chrome` — "Muse Browser 157.0.8103.81". Responde a `--version`, pero **no arranca headless por CLI**. |
| Caché Playwright/Puppeteer inicial | No existía (`~/.cache/ms-playwright` ausente). |
| `CHROME_PATH` | Vacía. |

## 1. `lint` / `score` / `storyboard` sobre el fixture bueno

Fixture: `test-fixture/fixture.html` — 9:16, 3 s, 2 escenas + CTA.

```
$ node bin/flare.mjs lint test-fixture
lint: /home/hatch/workspace/hookframe/renderer/test-fixture/fixture.html

OK — cafe-nomada-fixture 1080x1920 3s, 2 scene(s), 2 clip(s), 2 caption(s), 1 CTA(s).
(exit 0)
```

```
$ node bin/flare.mjs score test-fixture
score: cafe-nomada-fixture — 80/100 (Sólido · listo para publicar)
  [PASS] Hook (primera escena en 0, <= 2.5s, con motion): 30/30 — Hook en la primera escena (empieza en 0, dura 1.5s <= 2.5s) con motion.
  [PASS] Captions cubren >= 80% de la duración (unión): 25/25 — Captions cubren 100% de 3s (2 caption(s)); score = min(25, 25 * cobertura / 0.8).
  [FAIL] Cortes de 2-4s: 0/20 — 0/2 cut(s) last 2-4s (durations: 1.5s, 1.5s).
  [PASS] CTA en los últimos 3s, visible >= 2s: 15/15 — CTA visible 2s dentro de los últimos 3s.
  [PASS] Safe zones (posición real, margen 10%): 10/10 — Los 3 elemento(s) (captions + CTA) están dentro de las safe zones (margen 10% arriba/abajo).

Verdict: Sólido · listo para publicar (80/100).
(exit 0)
```

El 80/100 es el resultado **esperado**: un fixture de 3 s con escenas
de 1,5 s no puede tener cortes de 2–4 s, así que esa regla falla a
propósito. El checklist funciona; no es un bug.

```
$ node bin/flare.mjs storyboard test-fixture --out test-fixture/storyboard.html
storyboard: 2 scene(s) -> test-fixture/storyboard.html
  escena-1: 0s–1.5s, bg #7c2d12
  escena-2: 1.5s–3s, bg #0f766e
(exit 0)
```

## 2. `--dry-run`

```
$ node bin/flare.mjs render test-fixture --fps 30 --out /tmp/flare-dry.mp4 --dry-run
render: cafe-nomada-fixture 1080x1920 3s @ 30fps -> 90 frame(s) -> /tmp/flare-dry.mp4
  chrome: /opt/meta-chromium/chrome (known-path) — Muse Browser 157.0.8103.81
  ffmpeg: /usr/bin/ffmpeg

--dry-run: no frames captured, no MP4 written.
  timeline OK: 2 scene(s), 2 caption(s), 1 CTA(s).
  frames that WOULD be captured (90):
    frame0001.png  t=0.000s  (.../test-fixture/fixture.html?t=0.000)
    frame0002.png  t=0.033s  (.../test-fixture/fixture.html?t=0.033)
    ... and 80 more (up to frame0090.png at t=2.967s)
  storyboard written: .../test-fixture/storyboard-export.html
(exit 0)
```

Nota: en ese momento el dry-run detectaba el Chromium de la imagen
porque aún no existía la caché de Playwright. Tras instalar Chromium
stock, la detección prefiere la caché de Playwright (ver §4).

## 3. Fixture roto a propósito (sin CTA)

`fixture-broken/fixture.html` es idéntico al bueno pero sin el elemento
`data-cta`. El lint lo rechaza y el score se niega a puntuar:

```
$ node bin/flare.mjs lint fixture-broken
ERRORS:
  .../fixture-broken/fixture.html:16  Missing CTA: add an element with data-cta
  visible in the last 3 seconds (e.g. <a data-cta data-start="4" data-duration="2">Download now</a>).

FAILED — 1 error(s). Fix them and re-run lint.
(exit 1)

$ node bin/flare.mjs score fixture-broken
score: cannot score — .../fixture-broken/fixture.html failed lint.
ERRORS: (el mismo error de CTA ausente)
(exit 1)
```

## 4. Obtener Chrome: el Chromium de la imagen NO sirve, el de Playwright sí

### 4a. Chromium de la imagen (`/opt/meta-chromium/chrome`) — bloqueado

```
$ /opt/meta-chromium/chrome --version
Muse Browser 157.0.8103.81

$ /opt/meta-chromium/chrome --headless=new --disable-gpu --no-sandbox \
    --window-size=1080,1920 --screenshot=/tmp/hf-test-shot.png \
    "file:///.../test-fixture/fixture.html?t=0.500"
[ERROR:chrome/app/chrome_main_delegate.cc:1283] Hatch WebGL domain policy is required for browser startup
(exit 13, no se creó el PNG)
```

Se probaron también `--headless=old` + `--user-data-dir` y
`--disable-webgl --disable-features=WebGL`: mismo error, salida
inmediata. Es un chequeo de política de arranque de este build
personalizado, no un problema de flags. Por eso la detección del
renderer pone este binario **en último lugar**: responde a `--version`
pero no puede capturar frames por CLI.

### 4b. Playwright — descarga parcial, binario completo usable

```
$ npx --yes playwright@latest install chromium
... 90% of 125.7 MiB ...
Error: Download failed: server closed connection.
URL: https://cdn.playwright.dev/builds/cft/159.0.8154.6/linux64/chrome-headless-shell-linux64.zip
Error: Failed to download Chrome Headless Shell 159.0.8154.6 (playwright chromium-headless-shell v1255)
```

El instalador falló **dos veces** en el mismo punto (la descarga del
`chrome-headless-shell`, ~90 % de 125,7 MiB, el servidor cierra la
conexión). Pero el Chromium completo **sí quedó instalado** en el
primer intento:

```
~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome  (414 MB, INSTALLATION_COMPLETE)
```

El headless-shell que falla es un binario aparte que el renderer no
usa (usa el `chrome` completo con `--headless=new`), así que el fallo
no bloquea nada. Verificación directa:

```
$ ~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome --version
Google Chrome for Testing 159.0.8154.6

$ <ese chrome> --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1080,1920 \
    --virtual-time-budget=1500 --screenshot=/tmp/flare-shot.png \
    "file:///.../test-fixture/fixture.html?t=0.500"
(exit 0; /tmp/flare-shot.png: PNG image data, 1080 x 1920, 8-bit/color RGB)
```

(Los errores `dbus/bus.cc ... Failed to connect to the bus` que
imprime son ruido inofensivo sin D-Bus en la VM; el screenshot se crea
igual.)

**Ajuste que esto obligó en el código:** la caché de Playwright nueva
usa `chrome-linux64/chrome`, no `chrome-linux/chrome`; `lib/render.js`
ahora prueba ambos subdirectorios, y la detección prefiere la caché de
Playwright/Puppeteer antes que `/opt/meta-chromium/chrome`.

## 5. Render MP4 REAL — funcionó ✅

```
$ time node bin/flare.mjs render test-fixture --fps 30 --out /tmp/flare-real.mp4
render: cafe-nomada-fixture 1080x1920 3s @ 30fps -> 90 frame(s) -> /tmp/flare-real.mp4
  chrome: /home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome (playwright-cache)
          — Google Chrome for Testing 159.0.8154.6
  ffmpeg: /usr/bin/ffmpeg

Capturing 90 frame(s) with .../chrome-linux64/chrome ...

Done: /tmp/flare-real.mp4 (90 frames)
Frame PNGs kept in .flare-frames-1795238419546 (delete when done).

real  2m50.649s   (90 lanzamientos de Chrome, ~1,9 s/frame)
(exit 0)
```

Verificación con ffprobe:

```
$ ffprobe -v error -show_entries format=duration,size \
    -show_entries stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames \
    -of default=nw=1 /tmp/flare-real.mp4
codec_name=h264
codec_type=video
width=1080
height=1920
r_frame_rate=30/1
nb_frames=90
duration=3.000000
size=73759
```

Y los frames realmente cambian de escena (no es 90 veces la misma
imagen): `frame0001.png` (t=0, escena 1) md5 `5adf7924…`, 36 679 bytes;
`frame0060.png` (t=2 s, escena 2) md5 `f10c0246…`, 64 473 bytes.

**MP4 guardado como evidencia:** `test-fixture/flare-fixture.mp4`
(73 759 bytes, SHA-256
`b7c961ef9495a6495ba327fc698b6ac4d88ad27e09d6a7eb8dbe4c56f5af1130`).
Los 90 PNGs intermedios se borraron tras la verificación.

## Qué quedó como dry-run y por qué

Nada quedó solo en dry-run: el pipeline completo (lint → score →
storyboard → dry-run → render real → ffprobe) se probó en esta VM.
Lo único que **no** se hizo fue instalar Chrome por `apt`
(`chromium-browser`): no hizo falta, porque el Chromium stock de
Playwright ya funcionaba. El `--dry-run` sigue siendo el camino para
máquinas sin Chrome: valida y planifica sin capturar nada.

## Cómo renderizar de verdad en otra máquina

```bash
cd renderer
# 1. Requisitos: Node 22+, FFmpeg, y un Chromium stock (una opción):
npx --yes playwright@latest install chromium
#    ...o: sudo apt-get install -y chromium-browser
#    (Si el Chromium que trae tu VM es un build personalizado con
#     políticas de arranque, usa el de Playwright: el renderer lo
#     detecta solo en ~/.cache/ms-playwright/.)

# 2. Render (sin --dry-run):
node bin/flare.mjs render test-fixture --fps 30 --out out.mp4

# 3. Verificar:
ffprobe -v error -show_entries format=duration \
  -show_entries stream=codec_name,width,height -of default=nw=1 out.mp4

# Si Chrome quedó fuera del PATH:
export CHROME_PATH=/ruta/a/chrome   # p. ej. ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome
```

Notas para otra máquina:

- Un render de 3 s a 30 fps tarda ~3 min en esta VM (un lanzamiento
  de Chrome por frame); para anuncios largos, baja el fps de prueba
  (`--fps 10`) o acepta el tiempo.
- El render principal de Flare sigue siendo **en web con
  MediaRecorder a WebM** (lo hace otro componente); este renderer
  Node + FFmpeg es solo la opción avanzada para MP4 local
  determinista.
- El renderer no llama a ningún modelo ni guarda keys: funciona con
  escenas HTML de cualquier agente (Claude Code, Codex, Cursor,
  Gemini CLI, OpenCode, Qwen Code).

## 6. Addendum 2026-11-21 — correcciones Ronda 1 (Juez 3)

Cambios del motor de retención y del CLI, verificados de verdad en
esta VM (ver `skills/SKILL.md` §5 y `skills/retention-checklist.md`
para las reglas canónicas; son las mismas en los tres scorers:
`renderer/lib/score.js`, `skills/examples-check.mjs`, `web/app.js`).

### 6a. Motor de retención unificado

- Hook: 30 solo si la primera escena empieza en 0, tiene hook
  (clase `hook` o headline) y dura ≤ 2,5 s con motion; 15 si el hook
  está pero la escena es > 2,5 s o no hay motion; 0 sin hook. (Motion
  = GSAP o animación CSS: el fixture solo tiene el `@keyframes pulse`.)
- Captions: `min(25, 25 × cobertura / 0,8)` sobre la unión de intervalos.
- Cortes: `20 × (clips 2–4 s / clips)`. CTA: 15 si visible ≥ 2 s en
  los últimos 3 s, si no `15 × visible / 2`.
- Safe zones: posición REAL (top/bottom declarado en inline o en la
  regla CSS `.caption`/`.cta`, margen 10 %); un elemento sin anclaje
  vertical se cuenta como fuera (conservador). El viejo chequeo por
  substring `/10%/` daba 10/10 a una pieza con todo el texto en
  `bottom: 0` porque un gradiente decorativo contenía "10 %".
- Etiquetas: ≥ 75 "Sólido · listo para publicar", 50–74 "Necesita
  trabajo", < 50 "Débil".

Consecuencia: los 3 ejemplos del repo pasan de 100/100 a **85/100**
(hook 15/30: su primera escena dura 3 s > 2,5 s; el resto 25+20+15+10).
Siguen en verde (≥ 75). El fixture de test sigue en **80/100** (hook
30 + captions 25 + cortes 0 + CTA 15 + safe 10) y el fixture roto sigue
rechazado (lint FAIL sin CTA, score se niega, exit 1).

### 6b. Probes del Juez 3 (idénticos en ambos scorers)

| Probe | `flare score` | `examples-check.mjs` | Antes (Ronda 1) |
|---|---|---|---|
| captions 60 % (`cap60`) | 79/100 | 79/100 | 83 vs 94 |
| safe zones 0 % (`safe0`) | 75/100 | 75/100 | 90 vs 100 |

`cap60` hace FAIL en `examples-check.mjs` (exit 1) solo por el error
de contrato "captions cubren 60 % < 80 %"; el número de score coincide
(79). `hookstatic` es byte-idéntico al ejemplo real, así que puntúa
85/100 en ambos (no existe una variante sin motion en la evidencia).

### 6c. CLI: `preview`, slugs y errores amigables

```
$ flare lint colchon-descanso-total        # por slug, desde la raíz
OK — colchon-descanso-total 1080x1920 18s, 6 scene(s), ... (exit 0)

$ flare lint no-existe
No encontré el proyecto 'no-existe'.
Proyectos disponibles: colchon-descanso-total, fixture-broken, marca-personal, saas-presentacion, test-fixture.
Pasa una ruta (p. ej. examples/colchon-descanso-total) o un slug (p. ej. colchon-descanso-total).
(exit 1, sin stack trace)

$ flare preview marca-personal --no-serve
preview: marca-personal OK — 1080x1080 15s, 5 scene(s).
preview: abre en el navegador: .../examples/marca-personal/scenes.html
(exit 0)

$ flare preview marca-personal --port 8321   # sirve la raíz del repo
preview: http://localhost:8321/examples/marca-personal/scenes.html
# verificado con curl: scenes.html 200, web/vendor/gsap.min.js 200,
# ruta inexistente 404, intento de traversal 404.
```

### 6d. Storyboard: fondo real y sin sobrescribir

Sin `--out`, `flare storyboard` y el `--dry-run` de `render` escriben
`<dir>/storyboard-export.html` (antes: `<dir>/storyboard.html`, que en
los ejemplos es un storyboard artesanal con iframes y se sobrescribía).
El fondo de cada tarjeta es ahora el real: `data-bg` del clip, o el
fondo del stage (p. ej. `linear-gradient(180deg,#1a1a40 0%,#2d2a6b
55%,#0f0f2a 100%)`), o "gradiente CSS" si no hay fondo declarado.

### 6e. MP4 del fixture: re-verificado, no re-renderizado

No se tocó el pipeline de captura/encode (`render.js` solo cambió en
el storyboard), así que no hizo falta re-renderizar: el MP4 guardado
(`test-fixture/flare-fixture.mp4`) se re-verificó con ffprobe y sigue
siendo h264, 1080×1920, 30 fps, 90 frames, 3,0 s, con el mismo SHA-256
`b7c961ef9495a6495ba327fc698b6ac4d88ad27e09d6a7eb8dbe4c56f5af1130`.
