# Fixes R5b — Flare beta (2026-11-21)

Ronda 5b de jueces: **SIN VERIFICAR EN NAVEGADOR** (Chromium muerto en
esta VM: SIGTRAP exit 133 en ambos binarios, verificado por 3 jueces).
Los hallazgos de abajo eran estáticos; estos fixes los corrigen y se
verificaron estáticamente. La verificación visual en vivo sigue pendiente
(ver "Pendiente" al final).

## F1 — MAYOR: `examples/*/scenes.html` no usaban tokens.css

**Antes:** `body` en Georgia serif (colchón) o Arial/Helvetica (marca,
SaaS); stage con fondos índigo/navy (`#1a1a40→#2d2a6b`,
`#111→#3b1d5e`, `#0b1020→#1b2a6b`); CTAs `#ffb703` / `#ff4d8d` /
`#6ee7ff`. Ningún ejemplo enlazaba `tokens.css`.

**Después (los 3 `scenes.html`):**
- `<link>` a `../../web/tokens.css` y `../../web/vendor/fonts.css`
  (mismas rutas relativas que ya usaban para `favicon.svg` y
  `gsap.min.js`).
- `body`: `background:var(--bg,#0A0A0F)`, `font-family:var(--font-body)`.
- `#stage`: `background-color:#0A0A0F` + dos glows radiales sutiles en
  colores flare (ámbar 8% arriba, violeta 9% abajo). El `background-color`
  va primero a propósito: `renderer/lib/parse.js:extractCssRules` lee el
  primer `background(-color):` del `#stage`, así el storyboard sigue
  reportando `fondo: #0A0A0F`.
- Títulos `var(--font-display)` (Space Grotesk), cuerpo/captions/chips
  `var(--font-body)` (Inter); CTA y badge con `background:var(--flare)`
  y texto blanco (misma convención que `.clip .cta` del Studio).
- Barras del mockup SaaS (antes navy/cian/lavanda/verde): violeta
  `#8B5CF6`, ámbar `#FFB020`, coral `#FF5A3C`, `--success` para la barra
  de stock positivo. Tag "DESPUÉS" (marca): `var(--success)`.

**Acentos de marca que se mantienen deliberadamente** (documentados en
la cabecera de cada `scenes.html`): luna/sol/cama del colchón
(ilustración de producto, ámbar cálido ≈ `--flare-1`; el sol usa
`#ffb703`, que es literalmente el hex de `--flare-1`), y el panel blanco
`.screen` del SaaS (mockup de la UI del producto, no chrome de Flare).
- `web/styles.css:1-5`: la afirmación "Toda la web usa los tokens. Sin
  excepciones" se corrigió por una veraz: landing + Studio usan tokens;
  los anuncios exportados usan la misma base, con acentos de marca
  documentados por ejemplo.

**Verificación:** grep de `Georgia|Arial|Helvetica|#6ee7ff|#ff4d8d|
#1b2a6b|#3b1d5e|#2d2a6b|#1a1a40` en `examples/*/scenes.html` → 0
resultados. Único ámbar restante: el sol del colchón (`#ffb703`,
documentado).

## F2 — MAYOR: kicker de 16:9 fuera de la safe-zone

**Antes:** `web/styles.css:481` `.preview-stage.aspect-16-9 .clip`
con `padding:5px 38px 46px` → kicker en y≈5–18px; línea superior de la
safe-zone al 10% de 205px = 20,5px. El kicker quedaba ~2,5px por encima
(el propio comentario lo admitía).

**Después:** `padding:22px 38px 46px` y `.clip-visual` de 36px → 30px
solo en 16:9 (`web/styles.css`, comentario actualizado con la nueva
aritmética).

**Aritmética verificada** (script `/tmp/flare-verify-r5b.mjs`, exit 0;
stage 16:9 = 364×205, safe-zone 10% → líneas 20,5 / 36,4 / 184,5px;
caption top ≈156,1px):
- Kicker 16:9: arranca en **22,0px vs línea 20,5px → dentro por 1,5px**,
  en los 3 templates (no-CTA y CTA). La etiqueta de la safe-zone ya va
  abajo en 16:9, así que no choca con el kicker.
- Peor pila no-CTA 16:9 (SaaS s1: h4 a 2 líneas + sub a 2 líneas +
  visual 30px): termina en **150,0px → gap 6,1px** hasta el caption.
  CTA 16:9: pila termina en 140,0px → **gap 16,1px**.
- 9:16 (sin cambios): kicker no-CTA arranca ~92px vs línea 44,8px;
  CTA arranca 70px; gaps pila→caption 49,6px (no-CTA) y 124–146px (CTA).
- 1:1 (sin cambios): kicker no-CTA arranca 51–61px vs línea 34px;
  CTA arranca 38px (dentro por 4px); gaps 16,8–26,8px y 83,8px.
- Caption dentro en los 3 formatos (lados y abajo, margen ≥1,5px).

## O1 — Storyboard: texto concatenado y corte a mitad de palabra

**Causa raíz:** `renderer/lib/parse.js:stripTags` sustituía las
etiquetas por `''`, así `<br>` pegaba palabras ("¿Dormiste malotra
vez?", "Te levantascansado"), y el texto se cortaba con
`.slice(0, 200)` a mitad de palabra ("…Duerme mejor desd").

**Fix (`renderer/lib/parse.js`):**
- `stripTags`: las etiquetas se sustituyen por `' '` y se quita el
  espacio antes de puntuación (`papeleo ?` → `papeleo?`).
- Nuevo `truncateText(s, max=200)`: corta en el último espacio ≤200 y
  añade `…`.

**Verificación:** texto de las 6 escenas del colchón y de las 13 de
marca+SaaS, regenerado en memoria — sin concatenaciones; la escena 6
del colchón termina en "…Descúbrelo hoy Duerme mejor…".

## O2 — `--dry-run` escribía un fichero

**Antes:** `renderer/bin/flare.mjs:272-274` (`cmdRender`, rama dry-run)
llamaba a `writeStoryboard(t, <dir>/storyboard-export.html)`. En este
sandbox la escritura falla con EPERM *después de truncar* el fichero,
así que el dry-run daba exit 1 y dejaba un fichero de 0 bytes (incidente
ya documentado por el Juez 3 en R5b).

**Después:** el dry-run no escribe nada; solo imprime el plan y remite
a `flare storyboard <slug> --out <file.html>` para generar el storyboard.
Uso actualizado: "--dry-run … no files written".

**Verificación:** `flare render <slug> --dry-run` → **exit 0 en los 3
ejemplos**; `storyboard-export.html` intacto (sha
`8ed3a08e…` antes del fix; ver incidente abajo para su regeneración).

**Incidente durante este fix:** al probar `flare storyboard
--out` (antes de restaurar), el EPERM truncó
`examples/colchon-descanso-total/storyboard-export.html` a 0 bytes
(sha `e3b0c44…`). Se restauró con la herramienta de escritura (no con
node) a partir de la generación determinista en memoria y se verificó
**byte a byte idéntica** (sha `8470093c…`, 3519 caracteres, 3587 bytes
UTF-8). El fichero ahora contiene el texto corregido por O1 y la
duración 17,5s de O3.

## F3 — Solape ~4px entre `.mid` y `.cta` (marca y SaaS)

**Antes:** marca `.mid{top:36%;bottom:37.4%}` → borde inferior 62,6%
vs CTA top ≈62,2%; SaaS `.mid{top:42%;bottom:38.2%}` → 61,8% vs CTA
top ≈61,4%. Solape de cajas ~4px (el texto no se solapaba).

**Después:** `bottom:39%` en ambos (borde inferior 61% = 658,8px en
1080px).
- Marca: gap de cajas **13,2px** (658,8 → 672,0px).
- SaaS: gap de cajas **4,2px** (658,8 → 663,0px; CTA de 201px por el
  strong de 72px). El contenido del `.mid` termina ~32px por encima
  del CTA, como ya documentó el Juez 1.
- Colchón (sin solape previo): gap 38,8px, sin cambios.

## F5 — Menores (solo lo barato y verificable)

- `.preview-stage` pasa de `border-radius:14px` a
  `var(--radius-sm)` (16px, escala de tokens).
- `tokens.css` define ahora `--radius-xs:8px` (controles pequeños) y
  `--radius-inner:10px` (elementos internos), y `.win-btn` usa
  `--radius-xs`. Los radios 6/8/10px restantes son de elementos
  internos y quedan cubiertos por esa escala documentada.
- **NO se tocó:** `.clip.tone-cyan` (el nombre engaña — su fondo
  empieza en ámbar `#2b1a08`, no en cian — pero renombrarlo toca 8
  puntos en `styles.css` + `app.js` (5 plantillas embebidas + mapa de
  color) + `meta.json`; riesgo sin navegador para verificarlo, se deja
  documentado) ni los colores de los visuales `.pv-*`/`.mini-*`
  (cian/rosa/verde): son ilustración/contenido, no chrome de página.

## F4 — Verificado, sin cambios

- Colchón final: logo+badge terminan ≈27,4% vs `.mid{top:28%}` →
  ~12px de holgura, sin solape. SaaS s4: contenido termina ≈899px vs
  caption ≈917px → ~18px. Bandas CTA↔caption en `scenes.html`:
  colchón ≈86px, marca ≈48px, SaaS ≈53px (todas ≥5px).

## O3 — Un ejemplo con hook 30/30 (colchón)

**Antes:** los 3 ejemplos tenían la primera escena en 3s → hook
15/30, score 85/100.

**Después:** primera escena del colchón a **2,5s**, resto a 3s;
duración total **17,5s**. Archivos actualizados en lockstep (el
`examples-check` exige `meta.scenes == clips`, clips contiguos y suma
== duración):
- `examples/colchon-descanso-total/scenes.html`: stage
  `data-duration 18 → 17.5`, s1 `2.5s`, s2–s6 `start 2.5/5.5/8.5/
  11.5/14.5`, `__flareDuration 17.5`, título `17.5s`.
- `examples/colchon-descanso-total/meta.json`: `duration 17.5`,
  s1 `duration/captionDuration 2.5`, starts 2.5/5.5/8.5/11.5/14.5.
- `examples/colchon-descanso-total/brief.md`: duración 17,5s, tabla
  de tiempos y score objetivo **100/100** (hook 30).
- `examples/colchon-descanso-total/storyboard.html`: tiempos
  0–2,5 / 2,5–5,5 / 5,5–8,5 / 8,5–11,5 / 11,5–14,5 / 14,5–17,5
  (los `?t=` de los iframes siguen dentro de su escena).
- `web/app.js` (plantilla embebida, fallback `file://`): mismos
  starts/durations del colchón. `web/index.html:335`
  (`data-duration="18"`) NO se tocó: es un placeholder que `app.js:790`
  sobrescribe con `totalDuration()` al cargar.

**Verificación:** `examples-check` colchón **100/100** (hook 30/30,
captions 25/25, cortes 20/20, CTA 15/15, safe 10/10); marca y SaaS
siguen en 85/100 con hook parcial (decisión deliberada: solo un
ejemplo demuestra el 100).

## Verificación estática final (todo en verde)

| Chequeo | Resultado |
|---|---|
| `node skills/examples-check.mjs` | PASS exit 0 — colchón **100/100**, marca 85/100, SaaS 85/100 |
| `flare lint` ×3 | OK — colchón 17.5s/6 escenas, marca 15s/5, SaaS 24s/8 |
| `flare score` ×3 | 100 / 85 / 85 (hook 30/30 solo en colchón) |
| `node --check web/app.js`, `flare.mjs`, `parse.js`, `render.js` | OK |
| `flare render <slug> --dry-run` ×3 | exit 0 (antes exit 1 por EPERM) |
| `node /tmp/flare-verify-r5b.mjs` | TODO OK — 40+ checks de safe-zone/gap/F1/F3 (exit 0) |
| `styles.css` llaves | 432 `{` / 432 `}` balanceadas |
| `meta.json` ×3 | JSON válido |
| Archivos en 0 bytes | ninguno en todo el repo |
| Secretos (grep `sk-…`/`AKIA`/`ghp_`/`gho_`/`xox`) | solo placeholders `sk-…` en la UI de proveedor, sin claves reales |
| `storyboard-export.html` | regenerado con O1+O3, byte a byte idéntico a la generación determinista (sha `8470093c…`) |

## Pendiente — verificación visual en vivo (no se puede hacer aquí)

Chromium sigue muerto en esta VM (SIGTRAP exit 133, verificado por los
3 jueces de R5b; no se intentó lanzar en bucle). Falta, en un navegador
real (otra VM, otro sandbox, o el navegador en vivo del chat principal):
- Ejecutar `r5.mjs` contra `http://127.0.0.1:8234/web/`: solapes en px²
  (3 plantillas × 3 formatos × escenas), safe-zone por rects reales,
  gap CTA→caption en px, play real, Studio a 820px, `scenes.html`.
- Confirmar en vivo que el kicker 16:9 ya no sale marcado MAYOR (la
  aritmética estática dice que entra por 1,5px; el margen es estrecho
  y el peor caso — SaaS s1 — deja solo 6,1px hasta el caption).
- Confirmar visualmente que los 3 `scenes.html` se ven como un solo
  sistema con la landing/Studio (F1) y que el export WebM es >0 bytes.
- Confirmar que `flare storyboard --out` y `flare render` (no dry-run)
  escriben bien fuera de este sandbox (aquí todo `writeFileSync` tras
  leer da EPERM: entorno, no producto).
