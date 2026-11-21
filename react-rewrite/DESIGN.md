# Flare — Reescritura React · DESIGN.md

Reescritura de la web de Flare (landing + Studio) en React 19 + Vite + Tailwind v4,
usando **componentes reales** de las librerías del catálogo (`COMPONENTS.md`),
editados en colores y texto para una sola armonía visual. No es un re-skin del
vanilla: el Studio es el espacio de trabajo del agente (ventanas flotantes,
chat con herramientas, auditoría de rects en vivo).

> Estado: build en verde, fixes R7 + R7b aplicados, jueces R7c **APTO (3/3)**;
> landing Codrops con fixes R8b aplicados y verificación propia **37/37 PASS**
> (ver §9). No desplegada en Vercel todavía; `~/workspace/flare/web/`
> (vanilla) sigue viva hasta el redeploy. No se tocó GitHub, Vercel ni Dojo.

## 1. Armonía única — tokens Flare

Una sola fuente de verdad, `src/index.css` (+ `src/lib/utils.ts` `cn`):

- Fondo `#0A0A0F`, superficies `#12121A`, bordes `white/10`, texto `#F5F5F2`,
  secundario `#9A9AA8`, terciario `#6E6E7C`.
- Degradado Flare `#FFB020 → #FF5A3C → #8B5CF6` (clase `bg-flare` / `text-flare`):
  CTAs, play, formato activo, acentos. Nada de los degradados propios de cada
  librería (Magic UI trae morados/azules propios; Aceternity, cian): todos se
  re-tintearon a Flare o se dejaron en neutros.
- Tipografía: **Space Grotesk** (display, `font-display`), **Inter** (cuerpo),
  **JetBrains Mono** solo para código/tiempos (`font-mono`). Los componentes
  vendored que traían su propia fuente se normalizaron a estas tres.
- Radios 10–28 px, botones pill en acciones primarias, bordes 1 px `white/10`,
  sin sombras duras (glow suave `rgba(255,90,60,0.28)` solo en CTA/play).
- Regla de edición: cada componente vendored se importa tal cual (no se
  reescribe su lógica), pero su `className`/colores se adaptan en el punto de
  uso; los cambios dentro de `vendor/` son solo fixes de compatibilidad
  (ver §4), nunca re-diseños.

## 2. Componentes usados y por qué

| Componente | Fuente | Dónde | Por qué (criterio de diseñador) |
|---|---|---|---|
| `AgentChat` (+ `message-list`, `input-bar`, `tools/*`, `question/*`) | 21st.dev agent-elements | Studio · chat del agente | Es el corazón agent-native: timeline de herramientas (bash/edit/search/todo/plan), estados, aprobaciones. El agente "trabaja" delante del usuario. Sin esto el Studio sería un formulario. |
| `SpiralLoader` (+ `spiral-loader-data`) | 21st.dev agent-elements | Orbe del agente / estados de carga | Loader Lottie en dos fases (rápido→lento) que comunica "el agente está pensando" sin texto. Pequeño (16 px), reutilizable. |
| `FloatingNav` | Aceternity | Landing (navegación) | Nav flotante con blur que aparece al hacer scroll; da la sensación de producto, no de página estática. |
| `Timeline` | Aceternity | Landing (cómo funciona) | Línea temporal con scroll-linked animation; cuenta el flujo brief → agente → score → export mejor que una lista. |
| `TextGenerateEffect` | Aceternity | Landing (hero) | El titular aparece palabra a palabra: es el "hook" de la propia landing, coherente con el producto (retención). |
| `CardContainer/CardBody/CardItem` (3d-card) | Aceternity | Landing (plantillas) | Tilt 3D sutil en las tarjetas de ejemplo; hace tangibles las plantillas sin robar protagonismo al preview. |
| `BentoGrid/BentoCard` | Magic UI | Landing (features) | Rejilla bento para las capacidades; el `Button` shadcn interno se mantiene. |
| `Marquee` | Magic UI | Landing (proveedores/agentes) | Cinta infinita con los 6 agentes + 13 proveedores: comunica "trae tu agente, trae tu key" de un vistazo. |
| `Particles` | Magic UI | Landing (fondo del hero) | Fondo reactivo al ratón. Es el fallback del hero mientras no hay escena Spline (ver §6). |
| `ShimmerButton` | Magic UI | Landing (CTA "Abrir el Studio") | Brillo animado en el CTA principal; un solo botón con shimmer, no todos. |
| `NumberTicker` | Magic UI | Landing (stats) | Los números (scores, escenas) cuentan hacia arriba al entrar en vista. |
| `AnimatedCircularProgressBar` | Magic UI | Studio (retención) | El score total como anillo: el número que más importa, visible sin leer. |
| `AnimatedGradientText` | Magic UI | Landing (eyebrows) | El degradado Flare animado en los kickers de sección. |
| `BlurFade` | Magic UI | Landing (entrada de secciones) | Entrada escalonada al hacer scroll; unifica el ritmo de la página. |
| `MorphingDialog` | Motion Primitives | Studio (detalle de escena / diálogos) | El diálogo que se expande desde su trigger: el agente "abre" una ventana sin cambiar de pantalla. |
| `SplitText` | React Bits | Landing (titulares) | Split por palabras con stagger; alternativa a TextGenerateEffect donde el control fino importa. |
| `Button` (shadcn/ui) | shadcn | Vía `bento-grid` | Base de botones; el resto de la UI usa botones Tailwind a medida (más rápidos de tunear a Flare). |
| GSAP | gsap | `PreviewClip` (entrada de escena) | `fromTo` opacity/y al cambiar de escena (0.4 s, stagger 0.05). La auditoría usa `staticMode` sin GSAP para medir el estado final. |
| Motion (`motion/react`) | Motion | Motor de animación de todos los vendored | Un solo motor de animación en toda la app; GSAP solo para la entrada del preview. |
| Lottie (`lottie-react` 2.4.2) | lottie-react | `SpiralLoader` | Render del loader. Ver el alias de Vite en §4 (bug del build UMD). |

**No usados directamente pero presentes como dependencias de los usados:**
`@pierre/diffs` (diffs del `edit-tool`), `lottie-web` (motor de lottie-react).

## 3. Componentes descartados y por qué

| Componente | Fuente | Motivo |
|---|---|---|
| `canvas-reveal-effect` | Aceternity | Necesita `@react-three/fiber`; el efecto (canvas que revela) no aporta nada al Studio y añade ~500 kB. Excluido del chequeo de tipos; el archivo re-export de `ui/` se eliminó. |
| `card-spotlight`, `spotlight`, `background-beams` | Aceternity | Efectos de fondo/spotlight genéricos: compiten con Particles y ensucian la armonía. No se usan. |
| `multi-step-loader`, `placeholders-and-vanish-input` | Aceternity | El loader del agente ya lo cubre `SpiralLoader` + `AgentChat`; el input con placeholders animados confunde en un chat de trabajo. En el árbol, sin uso. |
| `animated-beam`, `animated-list`, `animated-shiny-text`, `border-beam`, `dock`, `shine-border`, `terminal`, `text-animate` | Magic UI | Decorativos o redundantes: `animated-beam` (flujo entre nodos) no tiene nodos reales en Flare; `dock` es launcher macOS, no cabe; `terminal` duplicaría el log del agente; `text-animate` duplica `SplitText`/`TextGenerateEffect`. En el árbol, sin uso. |
| `animated-group`, `animated-number`, `border-trail`, `dialog`, `in-view`, `text-morph`, `tilt` | Motion Primitives | O duplican algo usado (`dialog` vs `morphing-dialog`, `tilt` vs 3d-card, `animated-number` vs `NumberTicker`, `text-morph` vs `SplitText`) o necesitan APIs incompatibles con React 19. Excluidos del chequeo de tipos; en el árbol, sin uso. |
| `magnetic` | Motion Primitives | Botones magnéticos: gimmick que rompe la precisión del click en el Studio. Sin uso. |
| `GradientText`, `ShinyText` | React Bits | `AnimatedGradientText` (Magic UI) ya cubre el texto en degradado; no duplicar. Sin uso. |
| Rive (`.riv`) | Rive | Sin asset diseñado: no existe ninguna animación `.riv` de Flare. No se improvisa; no hay slot Rive (el loader lo cubre Lottie). |
| Spline (escena) | Spline | Sin escena publicada. El slot existe (`src/components/studio/SplineSlot.tsx`, activado solo con `VITE_SPLINE_SCENE_URL`); mientras tanto el hero usa `Particles`. Nada de placeholder falso. |
| Three.js / R3F como fondo | Three.js | Sin escena 3D diseñada. El visual de producto del preview son SVG inline por `kind` (`src/components/preview/Visual.tsx`), con altura fija — no colapsan (R6 B6). |

## 4. Fixes de compatibilidad aplicados (no son diseño)

- **Alias `@/`**: `tsconfig.app.json` con `paths: {"@/*": ["./src/*"]}` (TS 7 ya
  no admite `baseUrl`; se quitó) y `types: ["vite/client", "node"]`.
- **`lottie-react` 2.4.2 — bug crítico (React #130)**: su campo `browser`
  apunta al build UMD; Vite/Rollup lo resuelven y su default es el objeto
  `exports` completo → la app crasheaba al montar `SpiralLoader` (toda la
  landing en blanco, cero contenido). Fix en `vite.config.ts`: alias
  `lottie-react` → `node_modules/lottie-react/build/index.es.js` (ESM real).
  Se probó que 3.1.2 cambia la API (`src`/`subscriptions`, sin default);
  la 2.4.2 es la compatible con el componente vendored. **No quitar el
  alias sin re-verificar en navegador.**
- **Layout de agent-elements**: el cosechador dejó `types.ts`, `utils/`,
  `hooks/`, `icons*` y `types/` un nivel por encima de lo que esperan los
  imports relativos del paquete; se movieron dentro de `components/`
  (donde vive `agent-chat.tsx`). Sin cambios en el código que los usa.
- **`@pierre/diffs`**: dependencia que faltaba para `edit-tool`; instalada
  (v1.6.4).
- **Imports de tipos** (`import type`) en `morphing-dialog`, `useClickOutside`
  (TS1484); `ChatStatus` de `ai` v7 no tiene `'idle'` → `'ready'`;
  `SplitText` es export default; `exportVideo.ts` sin `FORMATS` y con
  `LogKind`.
- **Excluidos de `tsc`** (vendored sin uso y con errores propios): los 7 de
  Motion Primitives + `canvas-reveal-effect`, `card-spotlight`,
  `background-beams`, `spotlight` de Aceternity. El código usado sí se
  chequea; `npm run build` pasa limpio.

## 5. Anti-R6 por diseño (lo que la R6 exigía)

- **B-R6-1 (despliegue)**: los datos de ejemplos van **empaquetados** en el
  bundle (`src/lib/data.ts`, imports — `examples/` no se sirve por fetch en
  el deploy). No hay fallback silencioso: si la safe no se ha medido, el
  panel muestra `—/10 · sin verificar` + banner, nunca un 0/10.
- **B-R6-2–6 (posiciones del preview)**: `PreviewClip.tsx` usa **bandas
  absolutas** con posiciones explícitas (igual que el export `scenes.html`),
  sin pila en flujo: zona superior top 12%, caption bottom 12%, CTA bottom
  24% (no 20%: a escala de preview el 20% dejaba −3 px con el caption; el
  export a 1080 px+ mantiene 20%/12%), banda media CTA top 30%/bottom 37%.
  Cada texto lleva `m-0` explícito (además del preflight de Tailwind): la
  causa raíz R6 era que `*{margin:0}` perdía contra las reglas UA
  (h4 37,24 px). Visual con altura fija + `flex-none` + `min-h-0`.
  Las etiquetas `SAFE ZONE · 10%` viven en las bandas de margen, donde
  nunca hay contenido. Tamaños fijos de stage: 270×480 / 384×384 / 512×288.
- **Menores R6**: la selección de agente persiste (`flare.studio.state`
  incluye `agentId`; verificado: Cursor sobrevive a recargar); duraciones
  con `formatDuration` ("17,5 s", nunca "18 s"); veredicto "Listo para
  publicar" solo si todas las reglas pasan (si no: "Casi listo · revisa
  los puntos en rojo").
- **Preservado (APTO en R6)**: landing sin overflow, mecánica del Studio
  (play/pausa/seek, cambio de formato/ejemplo, 6 agentes, 13 proveedores
  con keys solo en localStorage, simulación del agente, export WebM real),
  cero errores de consola.

### Verificación R7 (2026-11-21, Chromium real vía CDP, `vite preview` en 4173)

Harness `/tmp/flare-verify-react/r7-drive.mjs` (adaptación del R6, sin proxy),
medición `/tmp/flare-verify-react/r7-measure.mjs`, evidencia
`/tmp/flare-verify-react/r7-measurements.json` (+ `r7b-scores.json`).

- **Rects: 9 combos (3 plantillas × 3 formatos), 57 escenas + 9 muestras en
  playback (escena CTA): 0 violaciones, 0 solapes.** Auditoría en vivo
  `window.__flareAudit`: `status done`, `safePoints 10/10` en los 9 combos.
- **Scores en vivo = checker: 100 / 85 / 85** (hook 30/15/15 · captions 25 ·
  cortes 20 · CTA 15 · safe 10). "Listo para publicar" solo en Descanso
  Total; "Casi listo" en los 85, con la sugerencia honesta de acortar la
  1ª escena a ≤ 2,5 s.
- Landing: título, hero, sin overflow horizontal, duraciones 17,5 / 15,0 /
  24,0 s. (La frase "no 18 s" de la landing es copy deliberado que explica
  la corrección R6, no un error.)
- Agente: Cursor persiste tras recargar (localStorage `flare.studio.state`).
- Export: WebM real `flare-colchon-descanso-total-16x9.webm`, **4.6 MB**.
- Consola: cero errores en todas las pasadas.
- `node skills/examples-check.mjs`: **PASS** (ejemplos intactos).
- Capturas: `r7-landing.png`, `r7-studio-descanso-916.png`,
  `r7-studio-saas-169.png` (CTA 9:16 y 16:9 visibles y sin solapes).

### Fixes R7 (2026-11-21) y verificación R7b

R7 (jueces independientes) dio **NO APTO visual (2/3)**: funcional y retención
APTOS, pero la landing llegaba rota con SO en modo claro (predeterminado).
Todos los fixes se aplicaron en `app/` y se re-verificaron en vivo (R7b, script
`~/workspace/flare/react-rewrite/r7b-verify.mjs`, CDP contra Chromium real,
`vite preview` en 4180; evidencia en `r7b-evidence/` y copia en
`/tmp/flare-judge/r7b-visual/`):

1. **Modo claro forzado a oscuro**: `@custom-variant dark
   (&:where(.dark, .dark *))` en `src/index.css` + `class="dark"` y
   `lang="es"` en `index.html` + `document.documentElement.classList.add('dark')`
   en `src/main.tsx`. La variante `dark:` de Tailwind v4 ya no depende de
   `prefers-color-scheme`: la app SIEMPRE renderiza oscura. Verificado:
   `dark-class` true y `color-scheme: dark` en los 4 combos.
2. **Re-teñido a tokens Flare** (todo lo que R7 midió negro-sobre-negro o
   blanco): NumberTicker y TextGenerateEffect a `#F5F5F2` (contraste medido
   18,1:1); Timeline con fondo `#0A0A0F` y beam con degradado Flare
   (`#FFB020 → #FF5A3C`); FloatingNav píldora `#12121A/85` (medido
   `oklab(0.186 … / 0.85)`); AnimatedGradientText con `colorFrom #FFB020` /
   `colorTo #8B5CF6`; backdrop del MorphingDialog `bg-black/60` (medido
   `oklab(0 0 0 / 0.6)`); vars `--an-*` de Agent Elements re-teñidas en
   `index.css` (input del chat medido `rgb(26, 26, 38)`, `#1A1A26`).
3. **Copy placeholder eliminado**: header de Aceternity en `timeline.tsx`
   ("Changelog from my journey…") → "El flujo, paso a paso" + copy real de
   Flare; botón "Login" muerto eliminado de la nav (con su divisor).
4. **Copy/UX (B8–B10)**: "17,5 s, no 18 s" → "17,5 s" (la aclaración interna
   ya no existe en la página); tagline y footer en español ("Atrapa la
   mirada. Retén el scroll. Gana el click."); línea "checker local:
   100/85/85" eliminada; **B9 causa raíz real**: los defaults de ventanas
   flotantes (`WIN_DEFAULTS`) asumían un lienzo de 1224 px, pero el
   contenedor real mide 1192 px a 1280 (sección max-w 1240 con px-6) — la
   columna derecha sobresalía 32 px y cortaba el 6º chip de captions.
   Ahora el layout se deriva del ancho real del contenedor (`layoutFor` +
   `ResizeObserver` en `Studio.tsx`; no recoloca tras arrastrar el usuario)
   y los carriles usan `flexGrow`/`flexBasis: 0` en vez de `width: %`.
   Verificado: `winRight = 0`, `studio-sin-overflow` y 6º chip visible en
   captura; títulos de pasos del Timeline `text-neutral-500` → `neutral-400`
   (4,17:1 → ~7,4:1, pasa el 4,5:1 estricto). Visuales del preview y
   `exportVideo.ts` re-teñidos a paleta Flare (13 reemplazos en cada uno).
5. **Funcionales**: Espacio reproduce/pausa (listener `keydown` en
   `Studio.tsx` + `togglePlay` que reinicia al llegar al final) y botón
   "Reiniciar" (`aria-label="Reiniciar"`, `⟲ Reiniciar`) al final del vídeo.
6. **Chat en español**: placeholder "Escribe un mensaje al agente…",
   "Pensando"/"Pensado" y títulos de herramientas (TodoWrite/Edit/Bash)
   traducidos en `thinking-tool.tsx` y `tool-registry.ts`.
- **R7b: 114/114 PASS, 0 FAIL** (claro/oscuro × 1280/820): hero, stats,
  titulares, bento, timeline, nav, diálogo, chat — todo legible en ambos
  modos (contrastes medidos ≥ 4,5:1, h1/tickers 18,1:1); rects y scores
  intactos (`__flareAudit` done, `safePoints 10/10`, panel 100/100 "Listo
  para publicar", sin "sin verificar"); Espacio reproduce (0,0 → 2,5 s) y
  pausa; llega al final (17,5 s) y Reiniciar vuelve a 0,0 s; cero errores de
  consola en los 4 combos; sin overflow horizontal de página.
- Notas de la verificación (para no repetirlas): Tailwind v4 serializa los
  colores computados como **oklch/oklab**, no rgb — las sondas de contraste
  deben convertir oklch→sRGB (ver `r7b-verify.mjs`); `TemplateAudit` no
  tiene `score` ni `fallback` (el score vive en el panel de Retención);
  el FloatingNav se oculta en scroll 0 por diseño de Aceternity (`visible`
  empieza en false) y aparece al hacer scroll; `lottie-react` sigue con el
  alias a `build/index.es.js` en `vite.config.ts` (no quitar sin
  re-verificar). El script de R7b vive en el workspace (no en /tmp: el
  tmpfs se vació durante esta tarea y se perdieron el script R7b original y
  los reportes R7 en `/tmp/flare-judge/`).

## 6. Fixes R7b (veredicto jueces: NO APTO 2/3, 2026-11-21 13:16)

Juez visual NO APTO; funcional y retención APTO. Los 3 bugs ALTOS tenían la
misma causa raíz y el MEDIO era el token muted. Verificación propia R7c:
**84/84 PASS, 0 FAIL** (claro/oscuro × 1280/820), script
`r7c-verify.mjs` + evidencia en `r7c-evidence/` (workspace, no /tmp).

1. **B1–B3 — la ventana del Agente tapaba Retención y Brief a 1280.**
   Causa raíz: layout flotante con alturas FIJAS — contenedor 1240 px y
   Agente en `y:780` con ~730 px de alto (llega a 1510, 270 px fuera del
   contenedor), mientras Retención empieza en y=396 y su contenido (5 reglas
   + estado del export) es más alto que 384 px. El Agente tapaba la 5ª regla,
   la línea de export y toda la ventana Brief (que fluye tras el contenedor).
   Fix (`Studio.tsx`, fase 2): `layoutFor` solo reparte ANCHOS; `measureLayout`
   (useLayoutEffect + ResizeObserver de las 4 ventanas) mide las alturas
   REALES del DOM y deriva `retention.y = timelineH + 24`,
   `agent.y = max(previewH, retention.y + retentionH) + 24` y
   `containerH = agent.y + agentH`. Corre antes del pintado (sin flash de
   solape) y converge en un render extra (las alturas no dependen de y).
   No pelea con el arrastre del usuario (`userMovedRef` lo desactiva).
   Medido a 1280: contenedor 1700 px, Agente termina exactamente en su borde
   (0 px de desborde), Brief 45 px debajo; hit-tests `elementFromPoint` en
   la 5ª regla, la línea de export, el H3 y el botón "Generar con mi agente"
   devuelven el elemento propio en los 4 combos.
2. **B4 — token muted `#6E6E7C` daba 3,94:1 (< 4,5:1 WCAG AA)** en 18
   textos. Subido a **`#82828F` (5,21:1 sobre `#0A0A0F`, 4,91:1 sobre
   `#12121A`)**: `--color-text-muted`, `--an-foreground-subtle`,
   `--an-input-placeholder-color` y los 16 `text-[#6E6E7C]` de Studio y
   landing. El punto de estado `inactivo` de `AgentOrb` es decorativo, no
   texto: se deja. R7c escanea TODOS los textos visibles con blending de
   fondos semitransparentes: 0 por debajo de 4,5:1 en los 4 combos.
3. **B5 — footer en español**: "Built for Dojo AI Hackathon 2026" →
   "Hecho para el Dojo AI Hackathon 2026" (`landing.tsx`).
4. **Etiqueta 85/100 alineada** (juez 3): el checker decía "Sólido · listo
   para publicar" (≥75) y el panel "Casi listo · revisa los puntos en rojo".
   Regla única = veredicto honesto (R6 B9): 100 → "Listo para publicar",
   75–99 → "Casi listo · revisa los puntos en rojo", 50–74 → "Necesita
   trabajo", <50 → "Débil". Aplicada en `renderer/lib/score.js`
   (`verdictLabel`), `skills/examples-check.mjs` y `web/app.js`
   (`retentionVerdict`, tercer sitio del motor — la vanilla sigue el mismo
   invariante documentado en `score.js`). Checker re-verificado: PASS,
   85/100 = "Casi listo · revisa los puntos en rojo"; panel en vivo igual
   (85 → "Casi listo", 100 → "Listo para publicar", probado cambiando de
   plantilla en los 4 combos).
- Lecciones de la verificación R7c (no repetir): (a) la app usa
  `scroll-behavior: smooth` — los hit-tests deben usar
  `scrollIntoView({ behavior: 'instant' })` + espera, o `elementFromPoint`
  devuelve null; (b) `'#studio div.relative'` NO es el contenedor flotante
  (hay otros `.relative` dentro) — usar el padre de `#win-preview`;
  (c) el contraste debe COMPONER fondos semitransparentes (chips
  `bg-[#FF5A3C]/15`, nota ámbar /7%) sobre sus ancestros o salen falsos
  FAIL ~1:1; (d) el export WebM tarda ~2 min en este entorno y navegar
  cancela descargas en curso: verificarlo una sola vez, sin navegar hasta
  que el archivo exista.

## 7. Pendientes

- **Despliegue en Vercel** (por separado, no en esta tarea): root `app/`
  (o `react-rewrite/app`), preset Vite; ver `app/README.md`. Al desplegar,
  verificar que la demo viva sirve el bundle (no hay fetch a `examples/`).
- **Escena Spline**: diseñar y publicar una escena para el hero; activar con
  `VITE_SPLINE_SCENE_URL`. Sin ella, el hero sigue con `Particles`.
- **Asset Rive** (opcional): si se diseña un `.riv` para el orbe del agente,
  sustituir el `SpiralLoader` Lottie donde aporte.
- **Chunk > 500 kB**: el bundle avisa por three.js/lottie (warning de
  build, no error). Code-splitting con `import()` dinámico para la landing
  vs Studio si el peso importa en el deploy.
- **Jueces R7c sobre la React con fixes R7b**: hecho 2026-11-21 — **APTO
  (3/3)**. Queda pendiente la ronda R8b (ver §9) antes de presentar la beta.
- **Jueces R8b sobre la landing Codrops con fixes R8b**: pendiente (ver §9).

## 8. Rediseño Codrops de la landing (2026-11-21, tras el veredicto de Sebastian)

Sebastian vio los screenshots de la landing R7c y pidió más: el texto no era
animado y el badge Dojo se veía genérico; quería el nivel de
tympanus.net/codrops. Investigación en `CODROPS-RESEARCH.md` (8 demos con
ingeniería inversa real, frames de 3 demos servidas en local; el Chromium de
la VM no alcanza tympanus.net por Cloudflare 403, documentado). Esto es solo
landing: el Studio, el motor de retención y los scores no se tocaron.

**P0 — implementado:**
- **Hero Telescope** (`app/src/components/landing/TelescopeHero.tsx`, §8 de
  la investigación): pin 100vh + variable CSS `--progress` (0→1, con
  `power1.inOut`) que pilota en CSS puro el split del H1 en 2 mitades y el
  zoom 0→1 de un mock 9:16 del Studio; rejilla de 8 losas que vuela en
  `z: 60vh` (stagger desde el centro); 3 capas frontales enmascaradas con
  `clip-path` (banda caption+CTA) a escalas 1/0.7/0.4 con blur 2px→0
  (trailing zoom). La intro carga el H1 por caracteres (SplitText
  `words, chars` + máscara, ease `cinematic`).
- **Tagline Kinetic + Cursor Scramble** (§1 + §2 v01): 3 fantasmas por
  carácter (ámbar→coral→violeta, máx 3, pilotados por `--ghost`), scramble
  propio (3 glifos aleatorios por carácter, 35 ms/carácter, cursor bloque
  que viaja; se reescribe al hacer clic). El texto real vive en `aria-label`;
  fantasmas y cursor son `aria-hidden`.
- **Badge Dojo rehecho** (§9.2): nada de píldora — línea editorial mono
  ámbar con punto pulsante, entrada letra a letra, scramble al entrar y
  unpack al hacer scroll (las pequeñas suben, las de contenido se separan).
  Texto: `DOJO AI HACKATHON 2026 — FLARE · MIT`.
- **Lenis 1.3.27** (única dependencia nueva, ~10 KB) + CustomEase
  `cinematic` (`0.45,0.05,0.55,0.95`) y `cinematicFlow` (`0.33,0,0.2,1`)
  como easings estándar. Anclas (`#que-es`, `#plantillas`…) van por
  `lenis.scrollTo`. Sin ScrollSmoother, sin WebGL nuevo.

**P1 — implementado:**
- **"Cómo funciona" con 3 pasos scrubbed** (`ScrubbedSteps.tsx`, §1):
  Brief → Agente → Render, palabra gigante por paso que entra desde abajo,
  se lee en el centro y sale por arriba (sticky 340vh, scrub 0.5, pasos
  solapados para que nunca haya pantalla vacía entre ellos) + barra fina de
  progreso. En reduced-motion se apilan como lista estática.
- **Titulares de sección con blur efecto 1** (§5, solo textos cortos):
  `blur(10px) brightness(0%) → 0/100%`, stagger 0.05, scrub, en los h2 de
  Qué es y Plantillas.
- **Barra de progreso cinematográfica** (`CinematicProgress.tsx`, §7):
  3 px con degradado Flare + `000%`→`100%` en mono, `quickSetter` en
  `onUpdate`; se oculta mientras el Studio está en pantalla.
- **Grano sutil** (§5, noise SVG 200 px, 5% opacidad) solo sobre la landing.

**P2 — no hecho en esta ronda (decisión deliberada):** bento con blur por
palabra + trailing zoom, marquee Dual Wave y grid reactivo canvas. El P0+P1
ya cubre lo que Sebastian pidió (texto animado, badge no genérico, nivel
Codrops) y el resto añade riesgo de regresión antes del envío a Dojo; queda
como pulido opcional.

**Bugs encontrados en la verificación y corregidos:**
1. Mitades del H1 no salían del todo de pantalla al final del pin (70vw no
   bastaba: el H1 es más estrecho que el viewport). Fix: distancia
   `100vw + ancho propio de la mitad`.
2. El cursor del scramble quedaba parpadeando para siempre: `an-blink`
   anima `opacity` y pisaba el `opacity: 0` inline. Fix: `display: none`
   al terminar (y `display: ''` al empezar/replay).
3. A 820 px el H1 se partía a mitad de palabra ("dirigi / r.") y las losas
   tapaban el H1 y las stats. Fix: SplitText `words, chars` + `nowrap` por
   palabra; rejilla oculta a <900 px (el zoom y el split siguen activos).
4. Los pasos scrubbed tenían una zona muerta entre pasos (pantalla vacía
   en el cambio). Fix: solape entrada/salida + centrado explícito
   (`top-1/2 -translate-y-1/2`, que compone con el `transform` de GSAP
   porque Tailwind v4 usa la propiedad `translate`).

**Verificación propia Codrops (`codrops-verify.mjs`, Chromium real,
27/27 PASS, 0 FAIL):** frames de carga / mitad de pin / fin de pin /
pasos / 820 px / reduced-motion en `codrops-evidence/`; `--progress`
0.44 a mitad de pin y 0.99 al final; mitades fuera de pantalla
(-911 px / 2311 px); media 346×614 al final del pin; estela visible
(0.30); pasos centrados y visibles; contrastes finales ≥4,5:1 (H1 18,08:1,
sub 7,11:1, badge 10,80:1); 0 errores de consola; sin overflow a 1280 y
820; reduced-motion con texto plano, sin Lenis ni pin; Studio intacto
(audit done, Safe 10/10) y `node skills/examples-check.mjs` PASS.
`npm run build` en verde (6,4 s); lint sin issues en los archivos nuevos
(los 2 errores de oxlint son preexistentes en vendored agent-elements).
**Pendiente:** ronda de jueces independientes sobre esta landing antes de
presentarla a Sebastian (su directiva), y luego GitHub + Vercel + Dojo.

## 9. Ronda R8 (jueces) y fixes R8b (2026-11-21)

**Veredicto R8: NO APTO (2/3)** — funcional APTO, retención APTO (195/195,
0 solapes en 71 escenas, scores 100/85/85), visual NO APTO con 2 bugs.
Reportes en `r8-judges/`; la verificación propia de los fixes es
`r8b-verify.mjs` (CDP, Chromium real, `vite preview` en 4186) con evidencia
en `r8b-evidence/` (workspace, no /tmp).

**B1 (bloqueante) — "Cómo funciona" desalineado: zona muerta de ~1500 px de
scroll.** Dwell legible medido: Brief 0 px, Agente 150/300 px, Render 300 px.
Causa medida: la timeline de los pasos cubría scrollY 3779–5580 mientras el
sticky cubría 4503–6663 — el trigger estaba desplazado hacia arriba ≈ un
pin-spacer (el pin del hero se crea en `document.fonts.ready.then(...)`,
DESPUÉS de que `ScrubbedSteps` crea su trigger). El comentario del código
que afirmaba que "nunca hay un instante con la pantalla vacía" era falso.

Fixes (`ScrubbedSteps.tsx`, `pin-ready.ts` nuevo):
- **`pin-ready.ts`**: promesa a nivel de módulo que el hero resuelve con
  `markPinReady()` cuando su pin existe; `waitPinReady(4000)` con fallback
  (la sección nunca se bloquea si el pin no llega).
- **Trigger medido de la geometría real**: la timeline se construye solo
  tras `waitPinReady` + `document.fonts.ready` + un rAF, con `start`/`end`
  **numéricos** (`rect.top + scrollY`, `end = start + height − innerHeight`).
  Esto importa: en GSAP, un `start`/`end` numérico se usa tal cual y
  `setPositions` "doesn't persist after refresh()" — por eso ningún
  `ScrollTrigger.refresh()` (tras crear el pin, en load, en resize) lo
  corrigió nunca (verificado en vivo: 4 refreshes y el trigger seguía en
  3603/5763). Los `start`/`end` en string sí se re-miden en cada refresh,
  pero aquí el diseño quiere números medidos en vivo + `invalidateOnRefresh`.
  Rebuild en resize (debounce 250 ms) y en `load` (matando la timeline
  anterior primero). Estado inicial oculto síncrono en el effect (los pasos
  nunca flashean apilados). Reduced-motion intacto (lista estática).
- **Lead-in de 75 px**: `start = stickyStart − 75` — el primer paso ya viene
  entrando cuando el sticky se engancha; sin él, en el instante exacto del
  enganche los 3 pasos están en opacidad 0 (muestra muerta en el borde,
  medida con barrido de 50 px).
- **El último paso (Render) no sale**: si saliera, la cola del sticky
  quedaba vacía (Render con dwell de 200 px y ~50 px muertos al final).
  Queda legible hasta que el sticky se suelta. Hold final con
  `tl.to({}, { duration: 0.9 }, 3.3)` (objeto vacío: solo alarga la timeline)
  para que la duración total siga siendo 4.2.
- **Hold de 0,5 s por paso**: la salida empieza en `t + 1.2` (no `t + 0.9`).
  Con 0,2 s de hold el dwell legible real era ~260 px de scroll y el
  muestreo discreto de 100 px solo cazaba 2 muestras (200 px); con 0,5 s el
  dwell es ~430 px. Sin solape de 2 pasos opacos a la vez (el siguiente
  entra en `t + 1.3`, cuando el anterior ya baja).

**B2 (secundario) — estela Kinetic invisible.** Los fantasmas existían
(`--ghost` 0,275 a p=0,5) pero el tagline era `.hero-fade` y se desvanecía
al inicio del pin (op 0 ya en p=0,3547): visibilidad efectiva
`fade × ghost` = 0 en toda la segunda mitad del pin.

Fix (`TelescopeHero.tsx`, `index.css:293-296`): el tagline ya no lleva la
clase `hero-fade`; la timeline del pin desvanece solo los caracteres reales
(`.k-real`, duración 0,4) más el cursor. La curva de `--ghost` en
`onUpdate` ahora crece a 1 en p=0,7 y baja a 0 en p=1 (antes era `--ghost =
p`, con fantasmas a 0,55/0,4/0,3 al final del pin). A p=0,5 el fantasma g1
mide opacidad efectiva 0,39 con el texto real en 0.

**Verificación propia R8b: 37/37 PASS, 0 FAIL** (claro/oscuro × 1280/820,
barrido de 100 px por toda la sección + sondas de pin):
- Estela visible a mitad de pin en los 4 combos (fantasma g1 0,39 > 0,10;
  tagline real desvanecido < 0,2; `--progress` 0,5).
- Trigger alineado con el sticky (fit 4428–6663 vs sticky 4503–6663 a 1280;
  6144–8379 vs 6219–8379 a 820; la diferencia de 75 px es el lead-in
  intencional).
- Dwell legible (opacidad ≥ 0,9 con centro en viewport): **Brief 400 px,
  Agente 400 px, Render 600 px** en los 4 combos.
- Zona muerta en el sticky: **0 px** en los 4 combos.
- Sin overflow horizontal, cero errores de consola en los 4 combos.
- Studio intacto: abre y muestra scores; auditoría `__flareAudit` done con
  `safePoints 10/10` en las 3 plantillas (cambiando por el `<select>` real);
  veredictos del panel "Listo para publicar" (colchón) / "Casi listo"
  (marca, SaaS); `node skills/examples-check.mjs` **PASS** (100/85/85).
- Contrastes: pasos 18/18 textos ≥ 4,5:1; hero 12/12 reales — el único
  "flag" (`/100`, ratio 1,0) es un artefacto de medición: `.text-flare` es
  texto en degradado con `color: transparent` (el peor stop `#8B5CF6` midió
  4,66:1 en R8, texto grande, umbral 3:1 → PASS).
- Capturas: `r8b-evidence/light-1280-pin-mid.png` (estela visible, mock
  centrado) y `light-1280-steps-mid.png` ("Agente" legible y centrado al
  65%).

Lecciones R8b (no repetir): (a) nunca un `refresh()` para corregir un
trigger numérico de GSAP — los números no se re-miden; medir la geometría
real y crear el trigger después de lo que mueve el layout (pin, fuentes);
(b) el dwell medido con muestreo discreto depende de la fase: un dwell
continuo de ~260 px puede dar 200 o 300 px según la alineación de la
rejilla — dejar margen (≥400 px) en el diseño, no en el umbral; (c) el
primer/último instante del sticky también cuenta: un paso que sale al
final o que empieza en 0 exacto en el enganche deja muestras muertas en
los bordes; (d) `vite preview` en background muere con la sesión de exec
que lo lanzó — relanzar con `nohup` si la verificación lo necesita vivo.
