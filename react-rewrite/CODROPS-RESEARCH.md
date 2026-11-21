# Investigación Codrops para la landing de Flare

**Objetivo:** que la landing de Flare llegue al nivel de [tympanus.net/codrops](https://tympanus.net/codrops/) — texto animado, scroll cinematográfico, movimiento en todo — estudiando las demos a fondo con ingeniería inversa, para que el rediseño copie técnicas reales, no impresiones.

**Fecha:** 2026-11-21. **Estado de la landing actual:** React 19 + Vite + Tailwind v4 + GSAP 3.15.1 ya instalado; `landing.tsx` usa SplitText por palabras en el H1, AnimatedGradientText en el tagline, Particles en el fondo, NumberTicker en stats, BlurFade en secciones; badge genérico: `Dojo AI Hackathon 2026 · Open source (MIT)`. Tokens Flare: fondo `#0A0A0F`, degradado ámbar `#FFB020` → coral `#FF5A3C` → violeta `#8B5CF6`, Space Grotesk + Inter.

**Método:** 8 demos elegidas por relevancia para una landing de producto creativo. Para cada una: artículo leído, repo clonado o código leído por web/espejo, y captura de frames con script CDP propio (`codrops-research/capture.mjs`, Chromium Playwright `~/.cache/ms-playwright/chromium-1255`, mismo patrón que `r7c-verify.mjs`).

## ⚠️ Limitación honesta de los frames — leer antes de usarlos

El Chromium de la VM **no puede alcanzar `tympanus.net` ni `style.gallery`**: devuelve `ERR_TUNNEL_CONNECTION_FAILED` y `curl` confirma `HTTP 403 Forbidden, Cf-Mitigated: challenge` (Cloudflare bloquea al headless). No es un problema de las demos — `browser.open` sí las lee.

**Frames REALES** (demo servida en local desde el repo clonado, mismo código y assets que la demo viva):

| Demo | Frames | Evidencia |
|---|---|---|
| Kinetic Typography | `frames/kinetic-typography/` — 8 PNG + `meta.json` (`scrollHeight: 6300`, 0 errores) | Intro "DO NOT SCROLL", "Not" con estela a 50%, "SCROLL" gigante a 100% |
| Text Character Animations | `frames/text-character-animations/` — 8 PNG + `meta.json` (`scrollHeight: 17791`) + `variations/` 18 PNG (v01–v04 y v16, before/mid/after + replays) | v01 tipeado, v04 lupa magnificando letras, v16 en texto plano (ver nota WebGL) |
| Telescope Zoom | `frames/telescope-zoom/` — 8 PNG + `meta.json` (`scrollHeight: 1800`, 0 errores) | 0% rejilla de fotos + "for the planet"; 50% cangrejo a medio zoom; 100% cangrejo a pantalla completa |

**Frames = página de error de Chrome** (NO muestran la demo; documentan el fallo, no se inventó nada):

| Demo | Frames | `meta.json` |
|---|---|---|
| Dual Wave | `frames/dual-wave/` — 8 PNG | `title: style.gallery`, `scrollHeight: 900`, `h1: "This site can't be reached"` |
| On-Scroll Text Motion | `frames/scroll-text-motion/` — 8 PNG | `scrollHeight: 900`, error |
| Blurry Text Reveal | `frames/blurry-text-reveal/` — 8 PNG | `scrollHeight: 900`, error |
| 3D Text Scroll | `frames/3d-text-scroll/` — 8 PNG | `scrollHeight: 900`, error |
| Cinematic 3D Scroll | `frames/cinematic-3d-scroll/` — 8 PNG | `scrollHeight: 900`, error |

La técnica de esas 5 demos está documentada desde **código real leído** (artículos con snippets literales, repos por web/raw GitHub, espejo style.gallery), no desde frames. Para verificarlas visualmente hace falta un navegador con red real, o servir en local los fuentes recuperados (como se hizo con las 3 primeras).

**Nota WebGL en esta VM:** en Chromium headless con `--disable-gpu`, `getContext('webgl2')` → `false`. Las 4 variaciones WebGL de Text Character Animations (v16–v19) degradan a texto plano por diseño (`glText.js`: `if (!this.acquire()) { this.show(); return; }`); sus frames v16 son pixel-idénticos entre sí por eso. En un navegador real con GPU el glow sí se renderiza. La demo Cinematic (OGL/R3F) no pudo probarse en local porque su `git clone` falló por TLS y la aprobación para reintentarlo venció (ver §7).

---

## 1. Kinetic Typography on Scroll — Antoine Wodniack (10 nov 2026)

- **Artículo:** https://tympanus.net/codrops/2026/11/10/kinetic-typography-gsap/
- **Demo viva:** https://tympanus.net/Demos/DoNotScroll/ (bloqueada por Cloudflare en la VM; frames del clon local)
- **Repo:** https://github.com/AntoineW/Codrops-GSAP-Scroll (MIT, `main` d57ac1d)
- **Qué hace:** 4 pasos — intro "Do not scroll" + palabras gigantes "Do / Not / Scroll" que viajan de abajo a arriba ligadas al scroll, con estela de colores por letra, zoom con pausa legible en el centro, grid violeta reactivo de fondo, y al final las letras se pueden lanzar por los aires con física.

**Stack (versiones exactas, `package.json` + lock):** `gsap ^3.15.0` (lock 3.15.0), `lenis ^1.3.27`; dev: `esbuild 0.28.2`, `sass 1.106.1`. Plugins GSAP: `ScrollTrigger, SplitText, CustomEase, SlowMo (EasePack), Physics2DPlugin`. Build propio con esbuild → `dist/` commiteado. Fuente display PP Frama (licencia solo para la demo; el repo público usa fuentes del sistema).

**Técnica exacta (código real):**

Estructura: cada `.step` mide `200lvh` con `.step-inner` en `position: fixed` centrado a `100svh`. Timelines pausadas, movidas por el scroll:

```js
ScrollTrigger.create({
  trigger: step, toggleClass: 'is-active',
  start: 'top bottom',
  end: isLastStep ? 'bottom bottom' : 'bottom top',
  scrub: 0,
  onUpdate: (self) => { tl.progress(self.progress); },
});
```

Estela de letras fantasma (el efecto central): SplitText por caracteres; cada carácter es transparente y lleva 6 capas fantasma; el glifo visible lo pinta CSS:

```scss
.step--text { font-size: 16vw; letter-spacing: -0.04em; line-height: 0.78; }
.char { position: relative; display: inline-block; color: transparent; will-change: transform; }
.char__ghost {
  position: absolute; left: 0;
  transform-origin: var(--transform-origin-x, 50%) 50%;
  &:before { content: attr(data-char); }
  $colors: #fffbf0, #ffbd00, #ff5400, #ff0054, #9e0059, #3e0074;
  @for $i from 1 through 6 { &:nth-child(#{$i}) { z-index: 6 - $i; color: list.nth($colors, $i); } }
}
```

El viaje vertical usa `SlowMo` para que la palabra "se lea" en el centro (`slow(0.25, 0.95, false)`); el zoom 0.3→1 usa un `CustomEase` hecho a mano (`'M0,0 C0.445,0 0.39,0.583 0.426,0.707 0.457,0.816 0.424,1 1,1'`). El origen de escala es el **centro de la palabra** (`--transform-origin-x`, medido en JS con `getBoundingClientRect()`), no de cada letra — sin esto las letras se separan al escalar. El `end: 'bottom top'` (en vez de `'bottom bottom'`) hace que un paso termine cuando el siguiente ya empezó: flujo continuo sin cortes.

Grid reactivo: canvas 2D (`Grid.js`), celdas 24 px, color `#9000FF33`, desplazamiento `scroll * 0.05`, redibujado en cada tick de GSAP desde `lenis.scroll`. Fondo `#150022`, texto crema `#fffbf0`.

Final con física: al seguir bajando pasada la mitad final, `lenis.on('virtual-scroll', …)` clona una letra con sus 6 fantasmas y la lanza con `Physics2DPlugin` (velocidad 0.75–1.125 × altura viewport, ángulo −120…−60°, gravedad 1.6 × altura viewport, rotación ±100°, máx. 20 lanzamientos/s, anticipación de 40 px hacia abajo antes del salto); la letra origen se recupera de escala 0→1 en 1.5 s.

**CSS puro vs JS:** CSS = layout (steps 200lvh, inners fijos, paleta de fantasmas, `overflow: hidden`, fallback `prefers-reduced-motion` que oculta fantasmas y muestra texto plano). **Todo el movimiento es JS** (split, timelines scrubbed, grid en canvas, throws con Physics2D). El artículo advierte del coste: 6 capas fantasma por letra = muchos nodos; si el rendimiento sufre, dibujar en canvas.

**Port a Flare:**
1. **Hero — estela Flare:** mantener el H1 con SplitText por palabras y añadir 3 capas fantasma por carácter con la paleta Flare (frente blanco, estelas ámbar `#FFB020` → coral `#FF5A3C` → violeta `#8B5CF6`), escala 0.3→1 con `slow(0.25,0.95,false)` ligada al scroll. Solo CSS `::before { content: attr(data-char) }` + easings que GSAP ya trae.
2. **Fondo — grid reactivo:** patrón `Grid.js` (canvas fijo, celdas 24 px, violeta ~20% alfa, `scrollFactor 0.05`) detrás del bento/stats, sustituyendo o atenuando Particles. Un canvas, cero dependencias nuevas.
3. **Badge Dojo — tratamiento "intro":** el badge como línea mono pequeña que sube letra a letra (`stagger: 0.01, y: '-100%', ease: 'power3.in'`, el `createIntroTimeline` del repo) y se oculta al hacer scroll — un momento, no una pastilla.
4. **"Cómo funciona" — 3 pasos scrubbed:** Brief → Agente → Render como 3 `.step` de 200lvh con palabra gigante fija por paso, entrando desde abajo, pausa legible en el centro (SlowMo) y saliendo por arriba. Reutiliza `initStepsScroll` casi tal cual.

---

## 2. Text Character Animations with GSAP — Manoela Ilic (3 nov 2026)

- **Artículo:** sin URL publicada (el README trae `[Article on Codrops](#)`, placeholder).
- **Demo viva:** https://tympanus.net/Demos/TextCharacterAnimations/ (bloqueada por Cloudflare en la VM; frames del clon local)
- **Repo:** https://github.com/codrops/TextCharacterAnimations (MIT)
- **Qué hace:** 19 animaciones carácter a carácter en una página, cada una se reproduce al entrar en viewport (o al hacer clic / botón Replay). 15 en DOM/GSAP, 4 en WebGL (Filament, Photocopy, Photon, Caustics). Píldora fija con los números 01–19 (glass: `backdrop-filter: blur(14px) saturate(140%)`).

**Stack (sin `package.json` — vanilla ES modules + scripts vendoreados, cabecera GSAP 3.15.0):** `gsap.min.js`, `ScrollTrigger.min.js`, `ScrollSmoother.min.js`, `SplitText.min.js`, `Flip.min.js`. Fuentes locales woff2: Plus Jakarta Sans + Host Grotesk (`font-display: block`; todo se construye tras `document.fonts.ready`).

**Técnica exacta (código real):**

Arquitectura (`js/index.js`): mapa `data-variation` → clase; `ScrollSmoother.create({ wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: 1 })`; construcción perezosa por sección (`requestIdleCallback` + ScrollTrigger `'top 200%' once`); zona de play `'top 80%'` → `'bottom 35%'`, rearmado al salir del viewport; `prefers-reduced-motion` → texto plano + scroll nativo. Cada variación corre el mismo efecto en 2 bloques: texto pequeño + big text (Host Grotesk, `clamp(2.93rem, 8vw, 8.53rem)`).

Hero (`js/hero.js`): morph `tide` → `time`: prefijo compartido "ti" + los dos finales apilados en una misma celda de grid, letras con `yPercent: 150 → 0`, `expo.out`, `reveal: 1.1s`, `stagger: 0.07`; `fit()` mide con un probe a 100 px y limita la palabra al 55% de la altura del viewport.

**01 Cursor Scramble** (`cursorScramble.js`): SplitText palabras+caracteres; un `.typer` con 3 glifos aleatorios por delante (`GLYPHS = 'a-zA-Z0-9/<>=+*'`, re-sorteo cada 0.05 s) + cursor bloque `0.45em × 0.7em`; `letter: 0.035 s`; las letras llegan a opacidad 1 en 4 letras; al final de línea el cursor parpadea 2 veces (0.25 s). CSS: `.char { opacity: 0 }`, `.typer { position: absolute; will-change: transform }`.

**02 Proofread** (`proofread.js`, usa **Flip**): 5 errores deterministas en ciclo (swap / double / missing / typo) sobre palabras de ≥4 letras; mapa QWERTY de vecinos (`NEIGHBOURS = { q: 'wa', w: 'qeas', … }`); caret medido con `canvas.measureText` (ascent/descent reales); la corrección usa `Flip.getState` + `Flip.from(state, { scale: true, simple: true })` para deslizar los glifos siguientes; la letra mala cae (`y: 0.35em`), la buena baja desde `-0.35em`, y el acento `#e23e1d` se asienta al color de texto en 0.6 s.

**03 Telegram** (`telegram.js`): lista `SMALL_WORDS` (35 palabras: a, an, the, and, of, to, in…); estado "packed" que oculta palabras pequeñas y puntuación (`display: none !important`); luego `unpack()` mide antes/después y desliza las letras (FLIP, `power3.inOut`, 0.65 s), las pequeñas suben (`yPercent: 40 → 0`) y la puntuación cae última (`yPercent: -60`).

**04 Loupe** (`loupe.js`): sin tweens sobre las letras — solo se tweenea la posición de la lente (`sine.inOut`, 0.04 s/letra) y cada frame `render()` calcula por carácter: `scale = 1 + grow·exp(-d²)` (magnify 1.9, radio 1.6 em), empuje lateral con la función error `erf()` (efecto Dock de macOS), opacidad con smoothstep y acento por variable CSS:

```css
[data-effect='loupe'] .char {
  opacity: 0;
  color: color-mix(in srgb, var(--color-accent, #e23e1d) calc(var(--lens, 0) * 100%), currentColor);
  transform-origin: 50% var(--baseline);
}
```

**16–19 WebGL** (`glText.js`, 763 líneas + fragment shaders): WebGL2, un triángulo a pantalla completa; textura RGBA por píxel: R = cobertura de letra (potencia `edge: 2.4`), G = letra difuminada, B = inicio de letra / `uMaxDelay`, A = semilla. Filament: rampa de calor rojo oscuro → naranja → blanco cálido, halo de 24 taps en espiral de girasol, flicker en semillas < 0.4; Photon: ruido hash a 7 Hz + exposición; Caustics: 6 ondas planas; Photocopy: 6 generaciones con motas de tóner. Máx. 8 contextos vivos; al terminar, el canvas se funde 0.8 s sobre el texto DOM (handover que mantiene el brillo constante).

**CSS puro vs JS:** `base.css` = tokens (`--color-accent: #e23e1d`, `--color-bg: #0b0b0b`, grano con `body::after`, luz radial), grid de 12 columnas ≥53 em, máscara del hero (`overflow: clip`), `.js [data-line]:not(.is-ready) { visibility: hidden }`. Cada CSS de variación solo fija estados iniciales (`.char { opacity: 0 }`, formas de cursor/caret, `color-mix`). **Toda la animación de letras es JS**; no hay `@keyframes` para las letras.

**Port a Flare:**
1. **Tagline — Cursor Scramble:** tipear el tagline con 3 glifos aleatorios por delante del cursor bloque en ámbar `#FFB020`, letras que aclaran en 4 caracteres (`letter: 0.035 s`); se reproduce al entrar en viewport y al hacer clic. Sin dependencias nuevas (SplitText ya está en la landing).
2. **Badge Dojo — Telegram:** el badge entra primero empaquetado ("Dojo Hackathon Open source") y se despliega: las palabras de contenido se separan con FLIP, las pequeñas suben y la puntuación cae última. Lista `SMALL_WORDS` adaptada al inglés del badge.
3. **Titulares de bento/timeline — Loupe:** pasada de lente sobre UN titular por sección (magnify 1.9, acento coral `#FF5A3C` vía `color-mix` + `--lens`); no masificarlo porque el `render()` por frame toca cada carácter.
4. **Stats 100/85/85 — Proofread + morph del hero:** los scores se tipean con caret y una "errata" deliberada que se corrige en coral (patrón `Typo` + `Flip.from` — muy on-brand para un producto de agentes); y el morph `tide → time` se aplica a una palabra rotativa del H1 (p. ej. `idea → ideas`, finales apilados en una celda de grid, `yPercent: 150`, `expo.out`).

---

## 3. Dual Wave Text Animation on Scroll — Valentin Descombes (15 ene 2026)

- **Artículo:** https://tympanus.net/codrops/2026/01/15/building-a-scroll-driven-dual-wave-text-animation-with-gsap/
- **Demo viva:** espejo https://style.gallery/codrops-previews/codrops-44b4482e4a9e/ (no se encontró URL `tympanus.net/Development/…` en el artículo ni buscando; frames = error de red, ver §0)
- **Repo:** **no existe** — proyecto Vite del tutorial, sin repo en la org codrops. Fuente del código: artículo + espejo `https://style.gallery/codrops-previews/codrops-44b4482e4a9e/source/src/dual-wave/DualWaveAnimation.js.txt` (445 líneas, coincide con el artículo). `package.json` no recuperable (el espejo no lo expone; el artículo solo dice `npm install gsap` + CDN jsDelivr sin versión legible) — **versión de GSAP no verificable, no se inventa**.
- **Qué hace:** dos columnas de texto se desplazan en X siguiendo un seno ligado al progreso de scroll, en direcciones opuestas; el texto más cercano al centro del viewport recibe `.focused` y una imagen central cambia a su `data-image`. Inspirado en la web del 15º aniversario de Plus Ex.

**Stack:** Vite + GSAP (ScrollTrigger + ScrollSmoother). Sin más librerías. Smooth scroll obligatorio: `ScrollSmoother.create({ smooth: 1.5, effects: true, normalizeScroll: true })` (el artículo ofrece Lenis como alternativa).

**Técnica exacta (código real, `DualWaveAnimation.js`):**

```js
this.leftQuickSetters = this.leftTexts.map((text) =>
  gsap.quickTo(text, "x", { duration: 0.6, ease: "power4.out" }));
this.scrollTrigger = ScrollTrigger.create({
  trigger: this.wrapper, start: "top bottom", end: "bottom top",
  onUpdate: (self) => this.handleScroll(self),
});
calculateWavePosition(index, globalProgress, minX, range) {
  const phase = this.config.waveNumber * index
    + this.config.waveSpeed * globalProgress * Math.PI * 2 - Math.PI / 2;
  const wave = Math.sin(phase);
  return minX + ((wave + 1) / 2) * range;
}
```

Config por `data-wave-number` / `data-wave-speed`, defaults `waveNumber: 2, waveSpeed: 1`; la demo usa `data-wave-number="12"`. El multiplicador `1` (izquierda) / `-1` (derecha) invierte la onda. El rango X se calcula del ancho de columna menos el texto más ancho (`calculateRanges()`, recalculado en `resize`). La imagen central se mueve con `gsap.set(thumbnail, { y: clampedY })` (sin tween, para sincronía exacta) y solo cambia `src` si `currentImage` difiere. `destroy()` mata el ScrollTrigger y el listener de resize. La demo trae 24 ítems por columna.

**CSS clave (artículo):**

```css
.dual-wave-wrapper { display: flex; gap: 25vw; position: relative; }
.wave-column { flex: 1; flex-direction: column; gap: 1.25rem; font-size: clamp(2rem, 10vw, 3rem); line-height: 0.7; z-index: 100; }
.animated-text { width: max-content; color: #4d4d4d; text-transform: uppercase; transition: color 300ms ease-out; }
.animated-text.focused { color: white; }
.image-thumbnail-wrapper { position: absolute; top: 0; left: 50%; transform: translate(-50%, 0); width: 15vw; z-index: 1; pointer-events: none; }
.spacer { height: 75svh; }
```

Responsive ≤1023 px: gap 10vw, fuente 5vw, imagen 50vw.

**CSS puro vs JS:** layout/estados/foco = CSS; todo el movimiento (onda, foco, imagen) = JS/GSAP.

**Port a Flare:**
1. **Bento / showcase "Lo que puedes dirigir":** columna izquierda con nombres de escenas (`Hook 2s`, `Captions`, `CTA`…) y derecha con formatos (`9:16`, `1:1`, `16:9`); imagen central = frame del Studio que cambia según la fila enfocada (`data-image` + `updateThumbnail`). `waveNumber` ~6, `waveSpeed` 1; portar la clase tal cual a un `useEffect` React + `gsap.context()`.
2. **Stats en onda:** izquierda cifras (`100/85/85`), derecha etiquetas (`colchón/marca/SaaS`); el stat enfocado se ilumina con el degradado ámbar→coral→violeta en vez de blanco, y un mini-gráfico central sincronizado hace de "thumbnail".
3. **Timeline del flujo agente:** izquierda pasos (`Brief → Guión → Render`), derecha duraciones; la imagen central muestra el estado del Studio en cada paso.
4. **Hero secundario (no el H1, que ya tiene SplitText):** lista de proveedores BYO key (OpenAI, Anthropic, Gemini…) en dos columnas opuestas como índice cinético antes del footer.

---

## 4. On-Scroll Text Motion (ScrollTextMotion) — Manoela Ilic (19 dic 2025)

- **Artículo:** no hay artículo Codrops enlazado (demo inspirada en un shot de satto.studio en Instagram).
- **Demo viva:** https://tympanus.net/Development/ScrollTextMotion/ (frames = error de red, ver §0)
- **Repo:** https://github.com/codrops/ScrollTextMotion (público, MIT, 53★, HEAD `9f05d93`). Sin `package.json`: todo vendorizado en `js/`.
- **Qué hace:** palabras gigantes que "viajan" entre dos posiciones CSS al hacer scroll (FLIP scrubbeado), con scramble al entrar en viewport. Curiosidad verificada: entre los textos de la demo aparece literalmente la palabra **"Flare"** (`<div class="el pos-4" data-alt-pos="pos-3">Flare</div>`), junto a "Signal", "Quantum waves", "Nebula"… y dos frases en japonés con `█` parpadeante.

**Stack (versiones exactas, cabeceras de los `.min.js` vendorizados):** GSAP **3.14.1**, ScrollTrigger, ScrollSmoother, **Flip** y **ScrambleTextPlugin** (versión exacta de Flip/Scramble no legible sin abrir los minificados — no se inventa). `index.html` los carga por `<script>` locales + `js/index.js`.

**Técnica exacta (código real, `js/index.js` íntegro, 436 líneas):**

Mecánica 1 — FLIP por scroll: cada `.el` tiene clase de posición `pos-N` y `data-alt-pos`. Al hacer scroll, `Flip.getState(el, { props: 'opacity, filter, width' })` captura el estado final tras cambiar temporalmente de clase, y se crean **dos** tweens scrubbeados:

```js
gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Flip, ScrambleTextPlugin);
ScrollSmoother.create({ smooth: 1, normalizeScroll: true });
Flip.to(flipState, { ease: flipEase, scrollTrigger: {
  trigger: el, start: 'clamp(bottom bottom-=10%)',
  end: 'clamp(center center)', scrub: true } });
Flip.from(flipState, { ease: flipEase, scrollTrigger: {
  trigger: el, start: 'clamp(center center)',
  end: 'clamp(top top)', scrub: true } });
```

El elemento "viaja" de su posición inicial a la alternativa al llegar al centro, y vuelve al salir por arriba. En `resize` se rehacen todos los FLIP y los scramble (`ScrollTrigger.refresh(true)`).

Mecánica 2 — Scramble al entrar: un ScrollTrigger por `.el` (`start: 'top bottom'`, `onEnter`/`onEnterBack`) dispara `scramble()` con `ScrambleTextPlugin` (`chars: 'upperAndLowerCase'`, duración por `data-scramble-duration`, `revealDelay`); el logo fijo `.logo > span` ("Mens Absens") se scramble una vez al inicio con `revealDelay: 0.5`.

Mecánica 3 — sección "related": al entrar, el logo hace fade out y los items entran con `xPercent: 100, scale: 0, opacity: 0 → 0/1/1`, `stagger: 0.1`, `ease: 'expo'`.

**CSS clave (`css/base.css`):**

```css
.el { white-space: nowrap; filter: blur(0px); opacity: 0.6; }
.el--xl { font-size: clamp(2rem, 20vw, 15rem); opacity: 1; }
.pos-2 { margin-left: 25vw; } .pos-3 { margin-left: 70vw; } .pos-4 { margin-left: auto; }
.pos-5/.pos-6 { margin-top: 200px; opacity: 1; }
.pos-7 { filter: blur(1.2px); } .pos-8 { filter: blur(2px); margin-top: 50px; }
.pos-10 { margin-top: 40vh; }
.content { padding: 100vh 1.5rem 25vh; } .group { margin-bottom: 10vh; }
.typing-indicator { animation: blink-cursor 0.7s linear infinite; }
```

**CSS puro vs JS:** las posiciones inicial/final son 100% CSS (clases `pos-*`); el *movimiento entre ellas* y el scramble son JS/GSAP. Nota de portabilidad: en GSAP ≥3.13 todos los plugins (incl. ScrambleText y Flip) son gratuitos en npm; Flare ya tiene GSAP instalado, así que el port puede importar `gsap/ScrambleTextPlugin` y `gsap/Flip` en vez de vendorizar.

**Port a Flare:**
1. **Títulos de sección con FLIP:** cada titular entra descentrado/borroso (`pos-7` blur 1.2px, `opacity: .6`) y "aterriza" centrado y nítido al llegar al centro del viewport; reutiliza las clases `pos-*` con tokens Flare (márgenes en vw, `clamp()`).
2. **Scramble en el badge Dojo:** el badge hace scramble al entrar en viewport (`onEnter`, ~1 s, `upperAndLowerCase`) y revela "DOJO AI HACKATHON 2026 — FLARE". Único uso de scramble recomendado: un solo elemento corto.
3. **Letras XL de fondo:** `F · L · A · R · E` gigantes (`el--xl`, hasta 15rem) como capa de fondo que cambia de `pos-*` entre secciones con FLIP scrubbeado; en ámbar a 8% de opacidad sobre `#0A0A0F`.
4. **Grid final estilo "related":** el footer/cross-links (GitHub, Vercel, Dojo) entra con `xPercent: 100, scale: 0 → 1, stagger: 0.1, ease: expo` cuando el logo hace fade out.

---

## 5. Blurry Text Reveal on Scroll — Manoela Ilic (23 abr 2024)

- **Artículo:** https://tympanus.net/codrops/2024/04/23/blurry-text-reveal-on-scroll/ (inspirado en el "Blur reveal" de Rauno en X)
- **Demo viva:** https://tympanus.net/Development/ScrollBlurTypography/ (URL confirmada en el README del repo; frames = error de red, ver §0)
- **Repo:** https://github.com/codrops/ScrollBlurTypography (público, MIT, 152★, HEAD `3e64d4b`)
- **Qué hace:** 4 variantes de reveal por desenfoque ligado al scroll: el texto entra borroso (y a veces oscuro o deformado) y se enfoca al pasar por el centro.

**Stack (versiones exactas):** GSAP **3.12.5** (cabecera del `gsap.min.js` vendorizado), ScrollTrigger, **SplitType** (`split-type.min.js`, vía `TextSplitter` propio) y **Lenis** para smooth scroll (`js/smoothscroll.js`: `new Lenis({ lerp: 0.2 })`, `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`). Sin `package.json`; todo vendorizado. Fuentes Typekit (`lnu1fpi`, precargadas con `preloadFonts('lnu1fpi')` antes de `init()`).

**Técnica exacta (código real: `js/index.js`, `textSplitter.js`, `effect-1/2/3/4/blurScrollEffect.js`, `css/base.css`):**

Arquitectura: `js/index.js` instancia 4 efectos por selector (`[data-effect-1]` … `[data-effect-4]`). Cada efecto divide el texto con `TextSplitter` (wrapper de SplitType; `ResizeObserver` + debounce 100 ms re-divide al cambiar el ancho) y anima con un `gsap.fromTo` scrubbeado (`start: 'top bottom-=15%'`, `end: 'bottom center+=15%'`).

```js
gsap.fromTo(chars, { filter: 'blur(10px) brightness(0%)', willChange: 'filter' }, {
  ease: 'none', filter: 'blur(0px) brightness(100%)', stagger: 0.05,
  scrollTrigger: { trigger: this.textElement,
    start: 'top bottom-=15%', end: 'bottom center+=15%', scrub: true },
});
```

Los 4 efectos (diferencias exactas):
- **Efecto 1** (chars): `filter: 'blur(10px) brightness(0%)' → 'blur(0px) brightness(100%)'`, `stagger: 0.05`, `ease: 'none'`, `willChange: 'filter'`.
- **Efecto 2** (chars): idéntico pero `brightness(30%)` inicial (el texto nunca llega a negro: queda legible mientras se desenfoca).
- **Efecto 3** (chars): añade deformación — `scaleY: 0.1, scaleX: 1.8, filter: 'blur(10px) brightness(50%)' → scaleY: 1, scaleX: 1, blur(0), brightness(100%)`, `willChange: 'filter, transform'`.
- **Efecto 4** (palabras, no caracteres): `opacity: 0, skewX: -20, filter: 'blur(8px)' → opacity: 1, skewX: 0, blur(0)`, `ease: 'sine'`, `stagger: 0.04`. Es el más barato (menos nodos animados, blur menor).

**CSS clave:** `.blur-text { width: 70vw; max-width: 1000px; font-size: clamp(1.5rem, 5vw, 3rem); line-height: 1.2; }`; 4 variantes tipográficas con `font-variation-settings` (`wght` 420/300/600/400, `wdth` 100/80/100/95, `letter-spacing: -0.05em`); `body { background: #000; background-image: url(../img/noise.png); background-size: 200px; }` (grano que el artículo destaca); `.intro { min-height: calc(100vh - 6rem); margin-bottom: 50vh; }`, `.content { gap: 20vh; margin-bottom: 70vh; }` (recorridos de scroll largos por efecto).

**CSS puro vs JS:** el blur es 100% JS/GSAP (propiedad `filter` animada por tween); CSS solo aporta layout, tipografía variable y el grano de fondo.

**Coste de rendimiento (advertencia literal del artículo):** *"Animating filters can be a bit heavy on some machines so this is not perfect of course. But used in moderation on small texts can really contribute to nice visuals!"* — y: *"They don't have the sophisticated mask effect but I like the results, especially when paired with a grainy background"*. Traducción práctica: animar `filter: blur()` por carácter fuerza repaint por nodo en cada frame de scroll; conviene **solo en textos pequeños y con moderación** (pocos efectos simultáneos, `willChange: filter` solo durante el scrub, preferir el efecto 4 por palabras). Ninguna de las demos contempla `prefers-reduced-motion` — hay que añadirlo en el port.

**Port a Flare:**
1. **Tagline / intros de sección (efecto 1, solo textos cortos):** el tagline bajo el H1 y la entradilla de cada sección se revelan por carácter `blur(10px) brightness(0%) → 0/100%`, `stagger: 0.05`, scrub `top bottom-=15% → bottom center+=15%`. No aplicarlo al H1 (ya tiene SplitText) ni a párrafos largos.
2. **Stats con efecto 2:** los `100/85/85` y sus etiquetas usan `brightness(30%)` inicial para que nunca se pierdan sobre `#0A0A0F` mientras se desenfocan.
3. **Descripciones del bento con efecto 4 (el más barato):** reveal por palabra con `blur(8px) + skewX(-20) → 0`, `stagger: 0.04`, `ease: 'sine'` — un efecto por tarjeta, nunca varios a la vez en viewport.
4. **NO al badge Dojo ni a botones:** texto demasiado pequeño para el coste; el badge queda nítido y, si acaso, con el scramble de §4. Bonus fiel al original: añadir grano `noise.png` sutil sobre `#0A0A0F` (la demo lo usa a 200 px) para que el blur no se vea "plano".

---

## 6. 3D Text Scroll Animations — David Faure (4 nov 2025)

- **Artículo:** https://tympanus.net/codrops/2025/11/04/creating-3d-scroll-driven-text-animations-with-css-and-gsap/
- **Demo viva:** https://tympanus.net/Tutorials/3DTextScroll/ (demo 1 Cylinder; hermanas verificadas por enlace: `index2.html` — Double Circle, 2×48 nombres franceses — e `index3.html` — Tube, nombres cortos Coco/Maria/Dan/Miko/Vigo). Frames = error de red, ver §0.
- **Repo: NO localizado.** El artículo no enlaza ningún GitHub (solo "Demo 1/2/3" + 3 mp4 de preview) y la búsqueda web no devolvió repo. **No hay `package.json` verificable**: el artículo solo dice Vite + TypeScript + GSAP (ScrollTrigger + ScrollSmoother), sin versiones. Toda la técnica de abajo viene del artículo, no de un clon.
- **Qué hace:** tres efectos 3D con solo CSS + GSAP, sin Three.js/WebGL: texto que gira alrededor de un cilindro invisible (Cylinder), dos círculos de nombres que orbitan en sentidos opuestos (Double Circle), y texto dentro de un tubo que rota 360° (Tube).

**Técnica exacta (artículo, snippets literales):**

**Cylinder — CSS:** `.cylinder__wrapper { perspective: 70vw; overflow: hidden; }` (400 px en ≤768 px); `.cylinder__text__wrapper { transform-style: preserve-3d; font-size: 5vw; }`; `.cylinder__text__item { position: absolute; backface-visibility: hidden; }` (esto último evita ver texto espejado al girar >90°). **JS:** `calculatePositions()`: `radius = Math.min(innerWidth, innerHeight) * 0.4`, `spacing = 180 / items.length`, `y = sin(angle)*radius; z = cos(angle)*radius`, `item.style.transform = translate3d(-50%,-50%,0) translate3d(0, y, z) rotateX(-spacing*index)`; `resize()` recalcula. **ScrollTrigger:** `trigger: title, start: "center center", end: "+=2000svh", pin: wrapper, scrub: 2, animation: gsap.fromTo(textWrapper, {rotateX: -80}, {rotateX: 270, ease: "none"})`.

**Double Circle — CSS:** sin `perspective` ni `preserve-3d` (movimiento 2D); columnas en `left: 30%` / `left: 70%`, `top: 50%`, ítems `font-size: 3rem; font-weight: 700; text-transform: uppercase`. **JS:** 24 ítems por lado, `direction: 1` (izq, horario) / `-1` (der, antihorario); `updateItemsPosition`: `spacing = Math.PI / totalItems`, `angle = index*spacing - scrollY*direction*Math.PI*2`, `x = centerX + cos(angle)*radius`, `y = centerY + sin(angle)*radius`, `gsap.set(item, {x, y, rotation, transformOrigin: "center center"})`; legibilidad: `rotationOffset = direction === -1 ? 180 : 0`. **ScrollTrigger:** `trigger: ".circle__wrapper", start: "top bottom", end: "bottom top", scrub: 1, onUpdate: self => { scrollY = self.progress * 0.5; updateItemsPosition(ambos) }` (media vuelta por pasada completa).

**Tube — CSS:** `.tube__wrapper { perspective: 70vw; overflow: hidden; }`, wrapper `preserve-3d`. **JS:** igual que Cylinder pero `spacing = 360 / items.length`, `x = sin(angle)*radius; y = 0; z = cos(angle)*radius`, `rotateY(index*spacing)`. **ScrollTrigger:** idéntico al Cylinder salvo `gsap.fromTo(textWrapper, {rotateY: 0}, {rotateY: 360, ease: "none"})` (mismo `end: "+=2000svh"`, `pin`, `scrub: 2`).

**CSS puro vs JS:** la geometría 3D es 100% CSS (`perspective` + `preserve-3d` + `backface-visibility`, sin Three.js/WebGL); JS solo calcula posiciones trigonométricas (responsive) y GSAP hace scrub/pin. **Portabilidad: máxima** — cero dependencias nuevas para Flare (GSAP ya está).

**Port a Flare:**
1. **Hero — Cylinder con el tagline:** las 6–8 palabras/frases del value prop ("Tu agente dirige", "Hook 2s", "Captions", "Ritmo", "CTA", "Safe zones"…) como ítems del cilindro, `pin` + `scrub: 2`, `end: +=1500svh` (no 2000, para no alargar la landing); la palabra frontal se tiñe con el degradado ámbar→coral→violeta.
2. **Stats — Double Circle:** dos órbitas espejadas con los números (100/85/85, 9:16/1:1/16:9, 17.5 s, 6 escenas) girando media vuelta al pasar la sección; `scrub: 1`, sin pin (como el original), para no robar scroll.
3. **Timeline/bento — Tube:** los pasos del flujo (Brief → Agente → Timeline → Export) como ítems del túnel `rotateY 0→360`; cada ítem que pasa al frente se ilumina.
4. **Badge Dojo — mini-cylinder:** una sola línea ("Dojo AI Hackathon 2026 · MIT") en cilindro pequeño `rotateX` con `scrub` corto, como guiño sin coste.

---

## 7. Cinematic 3D Scroll Experiences with GSAP — Joseph Santamaria (19 nov 2025)

- **Artículo:** https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/
- **Repo:** https://github.com/JosephASG/codrops-cinematic-scroll-animations (público, 86★, 32 forks, commit `7a56d1f`, MIT; React 19 + Vite + Tailwind v4)
- **Demo viva:** https://tympanus.net/Tutorials/Cinematic3DScroll/ — demo 1 en `/`, demo 2 en `/#/variant-2` (derivado de `App.tsx`: `HashRouter` con rutas `/` → `CylinderCarousel` y `/variant-2` → `CinematicSceneShowcase`, con `body.demo-1/demo-2`). Frames = error de red, ver §0.
- **Qué hace:** dos demos de "scrollytelling" cinematográfico: (1) cilindro WebGL con shaders + partículas reactivas; (2) escena 3D con cámaras movidas por scroll + tipografía animada. GSAP actúa como "director de cine": scroll → cámaras, luces, shaders, texto.

**Stack (versiones exactas, `package.json` leído del repo):** `gsap ^3.13.0`, `ogl ^1.0.11`, `three ^0.180.0`, `@react-three/fiber ^9.4.0`, `@react-three/drei ^10.7.6`, `@react-three/postprocessing ^3.0.4`, `react ^19.1.0`, `react-dom ^19.1.0`, `react-router-dom ^7.7.0`, `tailwindcss ^4.1.11`, `@tailwindcss/vite ^4.1.11`, `vite ^7.0.4`, `typescript ~5.8.3`.

**Técnica exacta (código real del repo, leído por web — el clon falló, ver §7):**

**Demo 1 — cilindro WebGL con OGL (`cylinder-carousel.tsx`):** canvas fijo `z-0`, contenido ScrollSmoother encima (`smooth: 4, smoothTouch: 0.1, effects: false`), contenedor `height: 500vh`. Atlas: 12 imágenes `./img/img1.webp`…`img12.webp` de 1024×1024 cosidas en un `<canvas>` 2D y subidas como una sola `Texture` (`wrapS/T: CLAMP_TO_EDGE`, sin mipmaps, límite `min(MAX_TEXTURE_SIZE, 8192)`). Cilindro: `radius: 2.5` (2.2 móvil), `height: 2` (1.2 móvil), `radialSegments: 64`. Shaders (`lib/variant-1/shaders.ts`, GLSL literal): vertex pasa `vUv`; fragment `tex.rgb *= (1.0 - uDarkness)` con `uDarkness: 0.3`. Easings custom: `CustomEase.create("cinematicSilk","0.45,0.05,0.55,0.95")`, `cinematicSmooth "0.25,0.1,0.25,1"`, `cinematicFlow "0.33,0,0.2,1"`, `cinematicLinear "0.4,0,0.6,1"`. Timeline cámara (5 planos, `scrub: 1`): `(0,0,8) → (0,5,5) → (1.5,2,2) → (0.5,0,0.8) → (-6,-1,8)`; `tl.to(cylinder.rotation, {y: "+=28.27", duration: 8.5, ease: "none"}, 0)` (≈4.5 vueltas). Overlays: 4 capítulos (`Immersive experiences` / `Infinite Perspective` / `Inside the Universe` / `Cinematic GSAP Scroll Experiences`, posiciones top/center/bottom) con fade in/out por tramos de 25% (`opacity 0→1→0`, `scrub: 0.8`). **Partículas reactivas:** `numParticles: 12`, `particleRadius: 3.3`, `segments: 20`, `angleSpan: 0.3`, `LINE_STRIP`; en el render loop `vel = rotación actual − anterior`, `momentum = momentum*0.92 + vel*0.15`, `targetOpacity = isRotating ? min(|vel|*100*3, 0.95) : 0` con lerp `0.15`, y cada segmento se recoloca en arco (`cos/sin(baseAngle + angleSpan*t)`).

**Demo 2 — escena Three.js/R3F (`cinematic-scene-showcase.tsx`):** `Canvas` fijo con `useGLTF('./cyberpunk_skyscraper.glb')`, `scene.scale.set(3,3,3)`, `Fog(#0a0a0a, 12, 28)`, `background #0a0a0a`, luces ambient 0.4 + directional 1.2 con sombras + point cyan `#00ffff`. Contenedor `900svh`. `scenePerspectives` (10 capítulos, `lib/variant-2/scene-data.ts`): DISCOVER (0–11.9%, cámara 0,2,10) → CYBERPUNK → INNOVATION → ELEVATION → tramo sin texto (45.8–52.5%) → VISION → ARCHITECTURE → FUTURE → SUMMIT → WELCOME (84.7–100%, cámara 20,20,−10); cada capítulo anima `cameraAnimRef` + `targetAnimRef` con `ease: "none"` en su franja de progreso, y la cámara se aplica por frame con `useFrame` + `lookAt`. **SplitText por chars:** `new SplitText(titleEl, {type: "chars"})`, entrada `fromTo {x: -100, opacity: 0} → {x: 0, opacity: 1, stagger: 0.02, ease: "power2.out"}`, salida `{x: 100, opacity: 0, stagger: 0.02, ease: "power2.in"}`, `scrub: 0.5`. **Overlay UI:** hint de scroll lateral + barra de progreso inferior con `gsap.quickSetter(bar, "width", "%")` y texto `000%`–`100%` actualizado en `ScrollTrigger.onUpdate`.

**¿Carga en Chromium headless sin GPU? NO VERIFICABLE.** La demo viva no llegó a cargar en la VM por el fallo de red (no por WebGL); el clon falló, así que no hubo build local. Lo seguro: **todo lo no-WebGL es viable sin GPU** (CustomEase, timelines de "cámara", SplitText por chars, progress bar con `quickSetter`, overlays por capítulos). El cilindro OGL y el GLB exigen WebGL real; en headless con `--disable-gpu` dependerían de SwiftShader (lento, no comprobado) — no se afirma ni se niega.

**CSS puro vs JS:** casi todo JS/WebGL; el CSS es solo layout fijo (`fixed inset-0`, `z-0/z-10/z-20`) y Tailwind para overlays.

**Port a Flare (solo lo viable sin WebGL pesado):**
1. **Barra de progreso cinematográfica** (hero→footer): la misma barra fina con `%` en mono (`000%`→`100%`) con `quickSetter` en `onUpdate`, en degradado ámbar→coral→violeta en vez de cyan; coste ~15 líneas.
2. **Capítulos SplitText por chars** para las secciones (Studio / Retención / Export): entrada `x:-100→0, stagger 0.02` y salida `x:100`, con `scrub: 0.5` — Flare ya usa SplitText por palabras en el H1, esto es el mismo plugin a nivel char.
3. **CustomEase "cinematic"** (`0.45,0.05,0.55,0.95` y `0.33,0,0.2,1`) como easings estándar de la landing para reveals y botones, en lugar de `power2/3` genéricos.
4. **Patrón "cámara" sin WebGL:** una timeline con 4–5 "planos" que anime `scale`/`y`/`rotate` del hero (zoom lento + pane) ligado a scroll, imitando el travelling de la demo 1 pero con transforms CSS — el sustituto barato del cilindro OGL (**no portar el cilindro WebGL**: Flare ya tiene `three ^0.187`, pero añadir OGL + atlas de 12 imágenes es sobreingeniería para una landing de hackathon).

---

## 8. Telescope Zoom Animation on Scroll (Layered Zoom) — Joffrey Spitzer (29 oct 2025)

- **Artículo:** https://tympanus.net/codrops/2025/10/29/building-a-layered-zoom-scroll-effect-with-gsap-scrollsmoother-and-scrolltrigger/ (rebuild del efecto de `telescope.fyi`, de Louis Paquet / Kim Levan / Adrien Vanderpotte / KOKI-KIKO)
- **Repo:** https://github.com/joffreysp/telescope-zoom (público, 19★, commit `8a0e22d`, MIT) — **clonado OK**
- **Demo viva:** https://tympanus.net/Tutorials/TelescopeZoom/ (verificada por `browser.open`: título "for the planet", 10 imágenes flotantes + `img-big.jpg` del cangrejo). Frames REALES del build local del repo (`npm install` + `vite build` en verde, servido en `127.0.0.1:4173`): `meta.json` con `title: "Telescope Zoom Animation on Scroll | Codrops"`, `scrollHeight: 1800`, 0 errores. Verificado visualmente: **0%** rejilla de 10 fotos flotantes + "for the planet" centrado (imagen principal invisible, `scale(0)`); **50%** cangrejo a medio zoom con el texto ya partido (`for the` a la izquierda, `planet` a la derecha) y las fotos pequeñas fuera de encuadre; **100%** cangrejo a pantalla completa, texto fuera de pantalla, capas enmascaradas convergidas.
- **Stack (exacto, `package.json`):** `gsap ^3.13.0`, `imagesloaded ^5.0.0`, `vite ^7.0.4` (dev). Sin React, sin Three.js.

**Estructura de capas y zoom (detalle, código real — `index.html`, `src/main.js` 86 líneas, `src/style.css` 210 líneas):**

**DOM (3 capas, en este orden):** (1) `.section__images` — 10 `<img>` flotantes (`img-1.webp`…`img-10.webp`, con `img-9` duplicado); (2) `.section__media` — `.section__media__back` (1× `img-big.jpg`, el cangrejo) + 6 duplicados `.section__media__front.front-1…6` (el mismo `img-big.jpg`); (3) `<h1>` con `<span class="left">for the</span><span class="right">planet</span>`. Todo dentro de `.section` (`height: 100vh; overflow: hidden`) envuelto en `.wrapper/.content` de ScrollSmoother.

**ScrollSmoother + trigger único:** `ScrollSmoother.create({wrapper: ".wrapper", content: ".content", smooth: 1.5, effects: true, normalizeScroll: true})`; una sola timeline `gsap.timeline({scrollTrigger: {trigger: ".section", start: "top top", end: "bottom top", scrub: true, pin: true, onUpdate: self => dom.style.setProperty("--progress", gsap.parseEase("power1.inOut")(self.progress))}})`. El `pin` es lo que da el `scrollHeight` 1800 (100vh de sección + 900 px de pin-spacer).

**Qué se escala:** (a) **La imagen principal** NO se anima con GSAP directamente: `.section__media { transform: scale(var(--progress)); }` — la variable CSS `--progress` (0→1, con easing `power1.inOut` aplicado en `onUpdate`) escala el contenedor entero de 0 a 1. (b) **Las 6 capas frontales** parten de escalas fijas decrecientes y GSAP las lleva a 1: `.front-1 {scale(1)} .front-2 {scale(0.85)} .front-3 {scale(0.6)} .front-4 {scale(0.45)} .front-5 {scale(0.3)} .front-6 {scale(0.15)}`, con `timeline.to(frontImages, {scale: 1, duration: 1, ease: "power1.inOut", delay: .1}, 0.6)` — el "trailing zoom": las capas pequeñas alcanzan a la grande y convergen. (c) **Blur:** `.section__media__front { filter: blur(2px); }` → `timeline.to(frontImages, {filter: "blur(0px)", duration: 1, delay: .4, stagger: {amount: 0.2, from: "end"}}, 0.6)` — se afina de fuera hacia dentro.

**Qué se enmascara:** cada `.section__media__front img` lleva `mask-image: url(./mask.png); mask-position: 50% 50%; mask-size: cover;` — la máscara es la silueta del cangrejo (PNG en `public/mask.png`), así que de cada capa frontal **solo se ve el sujeto recortado**, no el fondo: al converger las 6 capas, el cangrejo "salta" por encima del fondo con sensación de profundidad. El `back` no tiene máscara (es el fondo completo).

**Split text reveal:** también por `--progress`, en CSS puro: `.left { transform: translate3d(calc(var(--progress) * (-66vw + 100%) - 0.5vw), 0, 0); }` y `.right { transform: translate3d(calc(var(--progress) * (66vw - 100%)), 0, 0); }` (en ≤768 px, `-100vw/100vw` y `font-size: 9vw`). A `--progress: 0` el texto está centrado; a 1, cada mitad está desplazada 66vw fuera de pantalla. El `h1` es `font-size: 3vw; font-weight: 600; transform: translateY(-15%)`.

**Rejilla flotante (efecto Z):** `.section__images { position: absolute; width: 100vw; height: 100vh; perspective: 100vh; }`, cada `img` en `position: absolute; width: 10vw` (20vw móvil) con posiciones fijas por `:nth-of-type` (p. ej. nº1 `top: 15vw; left: -3vw`, nº2 `top: 5vw; left: 20vw`…). GSAP: `gsap.set(smallImages, {transformStyle: "preserve-3d", backfaceVisibility: "hidden", force3D: true})` y `timeline.to(smallImages, {z: "100vh", duration: 1, ease: "power1.inOut", stagger: {amount: 0.2, from: "center"}})` — vuelan hacia el espectador y salen de encuadre al empezar el scroll.

**Arranque:** `preloadImages('.wrapper img')` (lib `imagesloaded`) y solo entonces `animation.init()` + `document.body.classList.remove('loading')`; `body.loading` muestra overlay blanco + línea de 100 px animada (`loaderAnim 1.5s`, `scaleX` 0→1→0) en `base.css`.

**CSS puro vs JS:** el split text y el zoom principal son **CSS puro pilotado por una variable** (`--progress`); GSAP solo posee la timeline, el pin/scrub, el `z` de la rejilla, el `scale`/`blur` de las frontales y el `onUpdate` que escribe la variable. **Portabilidad: la más alta del lote** — sin WebGL, sin React, 86 líneas de JS, 2 dependencias.

**Port a Flare (concretas):**
1. **Hero — Telescope literal:** sustituir el H1 actual por esta estructura: rejilla flotante con 6–8 miniaturas de escenas/frames del Studio (en vez de fotos Pexels) que vuelan en `z: 100vh`; el tagline partido en dos spans ("El comercial que" / "tu agente dirige") que se separan con `--progress`; detrás, una imagen/frame del Studio que escala de 0→1 y termina a pantalla completa; 6 capas frontales con máscara del sujeto (p. ej. silueta de un play/claqueta, o el mock del player) que convergen con blur 2px→0. Es el efecto con más "wow por línea de código" del lote y usa el SplitText/GSAP que Flare ya tiene.
2. **Badge Dojo — máscara + zoom:** el badge con una mini-versión: fondo degradado que escala con `--progress` y texto que se separa en dos mitades al hacer scroll, reutilizando la misma variable.
3. **Bento/timeline — trailing zoom en cards:** cada card del bento con 3 capas frontales enmascaradas (icono recortado) a escalas 1/0.7/0.4 que convergen a 1 al entrar en viewport (ScrollTrigger por card, mismo `stagger from: "end"` para el blur).
4. **Fondo — rejilla Z sin pin:** solo la parte `.section__images` (sin pin, `scrub: 1`, `z` menor, p. ej. `40vh`) como fondo vivo del hero, con las partículas actuales de Flare conviviendo encima: profundidad sin robar scroll ni añadir WebGL.

---

## 9. Plan de port concreto para la landing de Flare

### 9.1 Mapa por zona (qué efecto va dónde)

| Zona de la landing | Efecto elegido (fuente) | Qué cambia respecto a hoy |
|---|---|---|
| **Hero — H1** | Telescope Zoom (§8): split en 2 mitades que se separan con `--progress` + imagen del Studio que escala 0→1 + 6 capas frontales enmascaradas con blur 2px→0 | Hoy: SplitText por palabras al cargar, estático después. Pasa a ser una escena con pin que se vive al hacer scroll |
| **Hero — tagline** | Cursor Scramble (§2, v01) al entrar + estela fantasma Kinetic (§1, 3 capas ámbar→coral→violeta) | Hoy: AnimatedGradientText estático. Pasa a tipear con glifos aleatorios y dejar estela de color |
| **Hero — fondo** | Grid reactivo Kinetic (§1: canvas 24 px, violeta 20% alfa, `scrollFactor 0.05`) + rejilla Z Telescope (§8, sin pin, `z: 40vh`) por encima de Particles | Hoy: Particles + 2 radiales estáticos. Pasa a tener profundidad que responde al scroll |
| **Badge Dojo** | Telegram unpack (§2, v03) + scramble al entrar (§4) + entrada letra a letra Kinetic (§1) — ver §9.2 | Hoy: píldora genérica. Pasa a ser un micro-momento animado, no una pastilla |
| **Stats (3 / 100/100 / 13 / 6)** | Proofread con errata que se corrige (§2, v02) + blur efecto 2 (§5, `brightness(30%)` inicial, nunca se pierde) + Double Circle opcional (§6) | Hoy: NumberTicker al cargar. Pasa a tipear/corregir y enfocarse al pasar |
| **Marquee agentes/proveedores** | Dual Wave (§3): dos columnas opuestas con foco + thumbnail central (aquí: frame del Studio) | Hoy: marquee horizontal simple. Pasa a índice cinético con foco |
| **Bento "Qué es"** | Blur efecto 4 por palabra (§5: `blur(8px) + skewX(-20)`, el más barato) + trailing zoom en iconos (§8: 3 capas 1/0.7/0.4) | Hoy: BlurFade genérico. Pasa a reveal por palabra + icono con profundidad |
| **Plantillas (cards 3D)** | Cylinder (§6) para el nombre del template al frente + capítulos SplitText por chars (§7: `x:-100→0, stagger 0.02, scrub 0.5`) | Hoy: 3D Card con tilt. Se conserva el tilt y se añade rotación de nombres |
| **Retención (h2 + anillo)** | Loupe (§2, v04) sobre el titular + blur efecto 1 en la entradilla (§5) + barra de progreso cinematográfica (§7, `quickSetter`, `000%`→`100%`) | Hoy: TextGenerateEffect + anillo estático. Pasa a lente de acento coral + progreso global |
| **Timeline "Cómo funciona"** | 3 pasos scrubbed Kinetic (§1: `.step` 200lvh, palabra gigante por paso, SlowMo) + Tube (§6) como alternativa | Hoy: Timeline de Aceternity con reveal simple. Pasa a palabras gigantes que se leen al hacer scroll |
| **CTA final + footer** | FLIP de títulos (§4) + grid "related" (§4: `xPercent: 100, scale: 0 → 1, stagger: 0.1, expo`) en los links + barra de progreso §7 llegando a 100% | Hoy: caja estática + footer plano. Pasa a aterrizaje con movimiento |
| **Toda la página** | Lenis smooth scroll (§1/§5) + CustomEase "cinematic" (§7: `0.45,0.05,0.55,0.95` y `0.33,0,0.2,1`) como easings estándar + grano `noise.png` sutil (§5) | Hoy: scroll nativo + easings `power2/3`. Pasa a scroll con inercia y curvas propias |

### 9.2 El badge Dojo deja de ser una píldora (propuesta cerrada)

El badge actual (`Dojo AI Hackathon 2026 · Open source (MIT)`, píldora `border-white/10 bg-white/[0.04]`) se sustituye por una **línea editorial animada** en 3 tiempos, combinando 3 técnicas del lote:

1. **Entrada (al cargar):** línea mono pequeña (`font-mono, tracking-[0.22em]`, ámbar `#FFB020`) que sube letra a letra (`stagger: 0.01, y: '-100%'`, Kinetic §1) con un punto ámbar pulsante a la izquierda (en vez del icono Sparkles estático).
2. **Scramble (al entrar en viewport):** el texto hace scramble ~1 s (`upperAndLowerCase`, ScrollTextMotion §4) y revela `DOJO AI HACKATHON 2026 — FLARE · MIT`.
3. **Unpack (al hacer scroll):** al bajar, las palabras de contenido se separan con FLIP y las pequeñas suben (Telegram §2, v03); el badge se compacta a `DOJO '26` en la nav flotante y desaparece del hero.

Nada de píldora, nada de fondo blanco/gris: texto vivo sobre el fondo `#0A0A0F`, con el degradado solo en la palabra `FLARE`.

### 9.3 Decisiones de stack

- **Añadir solo `lenis`** (`^1.3.27`, la versión usada por Kinetic; el patrón de integración con GSAP son 5 líneas: `new Lenis()`, `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t * 1000))`, `gsap.ticker.lagSmoothing(0)`). Justificación: 2 de las 8 demos lo usan como base del scroll suave; es ~10 KB, sin dependencias, y sustituye al scroll nativo en toda la landing. **No añadir ScrollSmoother**: es el equivalente Club de GSAP y Lenis cubre lo mismo con menos peso; además ScrollSmoother exige wrapper/content y complica el layout con ventanas flotantes del Studio.
- **No añadir nada más.** Todo lo demás ya está: GSAP 3.15.1 con SplitText, Flip, ScrollTrigger, CustomEase, SlowMo y ScrambleTextPlugin disponibles gratis en npm desde GSAP 3.13 (verificar `package.json` de Flare: `gsap ^3.15.1` — los plugins se importan como `gsap/SplitText`, `gsap/Flip`, `gsap/ScrambleTextPlugin`, `gsap/CustomEase`, `gsap/EasePack`); `three ^0.187` ya está para lo que haga falta; las partículas ya existen (Magic UI Particles). SplitType no hace falta (SplitText de GSAP lo cubre).
- **WebGL: no portar** el cilindro OGL ni el GLB de Cinematic (§7), ni las variaciones v16–v19 de TCA salvo como experimento aislado. Coste de bundle, de GPU y de verificación muy superior al beneficio en una landing de hackathon.
- **Patrón de implementación recomendado:** un `useEffect` por sección con `gsap.context()` (o `useGSAP`) + `ScrollTrigger.refresh()` tras `document.fonts.ready`; medir posiciones reales con `getBoundingClientRect()` (como hace Kinetic para `--transform-origin-x`); un solo `ScrollTrigger` por efecto; `pin` solo en el hero (Telescope) y en los 3 pasos de "Cómo funciona" — nunca en stats/bento.

### 9.4 Prioridades (orden sugerido)

**P0 — el "wow" en la primera pantalla (hacer primero):**
1. Hero Telescope (§8): pin + `--progress` + split en 2 mitades + imagen Studio 0→1 + rejilla Z. Es el efecto más espectacular por línea de código y el más portable.
2. Tagline Cursor Scramble + estela Kinetic (§2 v01 + §1).
3. Badge Dojo nuevo (§9.2).
4. Lenis + CustomEase "cinematic" en toda la página (§7 + §1).

**P1 — scroll cinematográfico del resto de la landing:**
5. Timeline "Cómo funciona" con 3 pasos scrubbed (§1).
6. Títulos de sección con FLIP + blur efecto 1 (§4 + §5).
7. Stats con Proofread + blur efecto 2 (§2 v02 + §5).
8. Barra de progreso cinematográfica (§7).

**P2 — pulido y profundidad:**
9. Bento con blur efecto 4 + trailing zoom (§5 + §8).
10. Marquee Dual Wave (§3).
11. Grid reactivo Kinetic de fondo (§1) + grano `noise.png` (§5).
12. Loupe en el titular de Retención (§2 v04) y letras XL `F·L·A·R·E` de fondo (§4).

**No hacer en esta ronda:** cilindro OGL / GLB de Cinematic (§7), variaciones WebGL v16–v19 de TCA (§2), Cylinder completo de 2000svh en el hero (§6 — usar la versión corta de 1500svh solo si sobra tiempo), blur por carácter en párrafos largos (§5).

### 9.5 Qué evitar

- **Rendimiento:** no animar `filter: blur()` por carácter en textos largos (el artículo de §5 lo advierte literal); no más de 3 capas fantasma por carácter en el H1 (Kinetic usa 6, pero con texto corto); no más de 1 efecto con `render()` por frame visible a la vez (Loupe §2); cachear medidas y recalcular solo en `resize` (Kinetic lo advierte: no mezclar lecturas de layout con escrituras en el loop); `will-change` solo durante el scrub, no permanente.
- **Móvil:** todos los efectos con valores en `vw`/`svh` deben tener su variante ≤768 px (Telescope y Cylinder la tienen: `font-size: 9vw`, `perspective: 400px`); el pin del hero en móvil debe acortarse o desactivarse; la rejilla Z con `width: 20vw` en móvil; probar a 820 px como en R7/R7b/R7c.
- **`prefers-reduced-motion`:** respetar siempre — Kinetic y TCA lo hacen (texto plano + scroll nativo). Cada efecto nuevo debe tener su rama reducida: sin pin, sin scramble, sin blur, texto en estado final.
- **Contrastes (no romper R7b/R7c):** los estados FINALES de todo texto animado deben medir ≥4,5:1 (muted `#82828F` 5,21:1 sobre `#0A0A0F`); los estados intermedios pueden bajar (blur, opacidad, scramble) solo mientras animan y siempre terminan en el token. No usar los colores originales de las demos (crema `#fffbf0` sobre morado, rojo `#e23e1d` de TCA) fuera de la paleta Flare.
- **El Studio no se toca:** todo esto es solo `landing.tsx` (+ un hook/util de animación si hace falta). El Studio, el motor de retención y la verificación R7c quedan intactos; tras el rediseño, re-verificar en vivo (contrastes, rects, scores 100/85/85) antes de subir a GitHub/Vercel/Dojo.
- **Accesibilidad:** texto real en el DOM (nunca solo canvas/WebGL para el mensaje principal); los fantasmas/clones con `aria-hidden="true"`; el scramble no debe dejar el texto ilegible más de ~1 s; keyboard navigation intacta con Lenis.

---

## 10. Archivos de esta investigación

- Este documento: `react-rewrite/CODROPS-RESEARCH.md`
- Script de captura: `react-rewrite/codrops-research/capture.mjs` (CDP directo, Chromium Playwright 1255; uso: `CDP_PORT=9226 PROFILE=/tmp/codrops-prof-x node capture.mjs <url> <outdir>`)
- Frames: `react-rewrite/codrops-research/frames/<demo>/` — reales solo en `kinetic-typography/`, `text-character-animations/` (+ `variations/`) y `telescope-zoom/`; el resto son páginas de error documentadas (ver §0)
- Clones locales (efímeros, en `/tmp/codrops-research/`): `kinetic-typography/`, `text-character-animations/`, `telescope-zoom/` — clonados OK; los de Cinematic y lote B no se clonaron (ver §7)
- Artículos y repos citados en cada sección (todas las URLs verificadas por lectura, no adivinadas)

## 11. Pendientes / huecos

1. **Clon de Cinematic pendiente de aprobación:** `git clone --depth 1 https://github.com/JosephASG/codrops-cinematic-scroll-animations` falló por TLS y su aprobación venció sin respuesta. Si se aprueba, se puede hacer build local y capturar las demos 1 (OGL) y 2 (R3F) en localhost como se hizo con Telescope, y comprobar si WebGL carga en headless sin GPU.
2. **Clones del lote B pendientes de lo mismo:** Dual Wave no tiene repo (fuente: artículo + espejo style.gallery, suficiente); ScrollTextMotion y ScrollBlurTypography se recuperaron íntegros por web/raw GitHub, pero no hay clon local.
3. **Sin repo de 3D Text Scroll:** no existe o no es público/enlazado; su port se haría desde el artículo, que da el código completo.
4. **Versiones no verificables:** GSAP de Dual Wave (sin `package.json`); versión exacta de Flip/ScrambleTextPlugin en ScrollTextMotion (vendorizados minificados). No afectan al port: Flare usa GSAP 3.15.1 con los plugins por npm.
5. **Verificación visual pendiente:** las 5 demos sin frames reales necesitan un navegador con red real (o build local desde los fuentes recuperados) para verlas en movimiento antes de portar sus detalles finos; los artículos incluyen vídeos mp4 de referencia (enlazados en cada sección vía el artículo).
