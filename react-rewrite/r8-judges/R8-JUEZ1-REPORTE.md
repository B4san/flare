# R8 — Juez 1 (Visual / diseño / animación) — Reporte de verificación independiente

- **Fecha:** 2026-11-21 (noche, hora CR)
- **App verificada:** `~/workspace/flare/react-rewrite/app/` — `dist/` servido con `vite preview` propio en el puerto **4185**
- **Método:** sondas propias en Chromium real (`~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`, CDP directo). No se reutilizó `codrops-verify.mjs` del constructor como evidencia. 4 combos (claro/oscuro × 1280/820) + pasada reduced-motion.
- **Sondas:** `/tmp/flare-judge/r8-visual/r8-judge1.mjs` (103 checks), `r8-judge1-supp.mjs` (13 checks), `deadzone-shot.mjs` (captura puntual de B1)
- **Capturas:** `/tmp/flare-judge/r8-visual/*.png`

## Veredicto: NO APTO

El hero Telescope, el badge y el scramble son genuinamente de nivel Codrops. Pero la sección **"Cómo funciona" — una sección P1, el corazón narrativo de la landing — está rota en los 4 combos**: el paso 1 ("Brief") nunca llega a verse opaco y centrado, y hay **~1,5 viewports de pantalla completamente vacía** en mitad de la sección. Eso no es un detalle: es el usuario haciendo scroll por una pantalla negra esperando contenido que no llega. El reporte del constructor (27/27 PASS) no detectó este fallo.

Bug secundario (B2): la estela Kinetic del tagline es prácticamente invisible durante el pin — existe como variable CSS, pero su opacidad efectiva es 0.

## Resumen por criterio

| Criterio | Resultado |
|---|---|
| (a) H1 anima de verdad (carga + pin) | ✅ PASS en los 4 combos |
| (b) Badge Dojo, línea editorial, no píldora | ✅ PASS (incl. unpack al hacer scroll) |
| (c) Scramble + estela Kinetic | ⚠️ Scramble PASS (incl. replay); **estela NO VISIBLE → B2** |
| (d) Pasos "Cómo funciona" scrubbed | ❌ **FAIL en los 4 combos → B1** |
| (e) Contraste ≥4,5:1 de todos los textos | ✅ PASS (0 de 194 textos bajo umbral, tras corregir un falso positivo de mi sonda) |
| (f) Sin overflow, sin palabras partidas, sin losas tapando | ✅ PASS (1280 y 820) |
| (g) Reduced-motion | ✅ PASS (8/8) |
| (h) Copy sin placeholders ni inglés fuera de lugar | ✅ PASS (tras corregir un falso positivo de mi sonda) |
| Consola | ✅ 0 errores en los 4 combos + RM |

**Totales brutos:** sonda principal 103 checks (75 PASS / 28 FAIL); suplementaria 13 checks (10 PASS / 3 FAIL).
**Totales corregidos** (descontando 3 artefactos de mis propias sondas, ver § "Artefactos propios"): los únicos FAIL reales son **B1 (12 checks: 3 por combo × 4)** y **B2 (1 check suplementario)**. El resto de los FAIL brutos eran errores de medición míos, no del producto.

---

## BUG B1 (principal, bloqueante) — Pasos "Cómo funciona" desalineados: "Brief" ilegible + zona muerta de ~1,5 viewports

### Qué se observa

Barrido fino con rueda de 150 px midiendo opacidad y centro vertical (cy) de cada paso, viewport 900 px:

**1280 (claro y oscuro, idéntico):**

| scrollY | Brief | Agente | Render |
|---|---|---|---|
| 4080 | op 0,99 — **cy 990 (bajo el borde inferior)** | 0 | 0 |
| 4230 | op 0,58 — cy 732 | 0 | 0 |
| 4380 | op 0,04 — cy 441 (centrado) | 0,19 | 0 |
| 4530–4980 | 0 | 0,83–1,0 (centrado) | 0–0,03 |
| 5130–5280 | 0 | 0 | 0,55–0,99 |
| **5730–6780+** | **0** | **0** | **0 — pantalla vacía** |

- **"Brief" nunca se ve opaco y centrado: dwell legible 0 px.** Su único instante casi opaco (0,99) ocurre con el centro en cy≈990–1006, es decir, por debajo del borde inferior del viewport; cuando llega al centro (cy≈441) su opacidad ya es 0,04. El usuario ve "Brief" solo como un fantasma que se desvanece por arriba.
- **Zona muerta: 1500 px de scroll** (scrollY 5730–6780+) con el sticky cubriendo el centro del viewport y ningún paso con opacidad >0,05. Son ~1,7 viewports de pantalla negra.
- Dwell legible (op>0,9 y centrado ±180 px): Brief **0 px**, Agente 150 px, Render 300 px.

**820 (claro y oscuro, idéntico):** mismo patrón. Brief 0 px, Agente 300 px, Render 300 px. Zona muerta **1350 px** (scrollY 7560–8610+).

Sin solapes de 2 pasos opacos a la vez (PASS) y el hit-test `elementFromPoint` sobre un paso visible cae dentro del elemento (PASS) — el problema no es solape, es **desalineación temporal**.

### Prueba visual

- `r8-deadzone-6200.png` (captura puntual, 1280 claro): scrollY 6200, progreso 072% — **viewport completamente vacío**, solo la barra de progreso arriba y una línea tenue abajo. Medición en ese instante: sticky `[0, 900]`, los 3 pasos a opacidad 0.
- `light-1280-steps-mid.png`: muestra el paso "Agente" legible y centrado — es el único paso que se ve bien; no es prueba de la zona muerta (la zona muerta está en `r8-deadzone-6200.png`).

### Reproducción

1. Servir `dist/` (`vite preview`, puerto 4185) y abrir a 1280×900.
2. Hacer scroll lento por la sección `#como` ("Del brief al vídeo en tres pasos").
3. Observar: "Brief" aparece ya desvaneciéndose por la parte inferior; tras "Render" la pantalla queda negra durante ~1,5 viewports antes de llegar a la siguiente sección.
4. Atajo determinista: `window.scrollTo(0, 6200)` → pantalla vacía, 3 pasos a opacidad 0.

### Causa medida (no solo hipotética)

Geometría a 1280: `#como` top doc 4343; contenedor 340vh top 4503, altura 3060; rango sticky **4503–6663**. La timeline de los pasos, derivada de su progreso real, cubre **scrollY 3779–5580**. Es decir, **el trigger de la timeline está desplazado hacia arriba 724 px al inicio y 1083 px al final** respecto al rango del sticky (suplementaria: `timelineStartY 3779 / stickyStartY 4503`, `timelineEndY 5580 / stickyEndY 6663`, check de alineación FAIL). El desplazamiento es del orden del pin-spacer del hero (100svh = 900 px): la timeline corre como si el pin del hero no existiera.

Hipótesis de mecanismo (no probada hasta el final, pero coherente con el código): el pin del hero se crea dentro de `document.fonts.ready.then(...)` (asíncrono), después de que `ScrubbedSteps` ya creó su ScrollTrigger; el `ScrollTrigger.refresh()` que se llama ahí no realinea este trigger.

### Archivos

- `app/src/components/landing/ScrubbedSteps.tsx`
  - Líneas 56–59: `scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.5 }`
  - Líneas 66–78: pasos en `t = i * 1.3`, entrada 0,7 s, salida en `t + 0.9` durante 0,7 s (total 4,2)
  - Líneas 104–105: contenedor `height: '340vh'` + `sticky top-0 h-screen`
  - Líneas 68–70 (comentario): *"nunca hay un instante con la pantalla vacía entre pasos"* — **falso en la práctica**: hay 1500 px de pantalla vacía.
- `app/src/components/landing/TelescopeHero.tsx`
  - Líneas 216–219: pin `end: '+=100%'`, `pin: true`
  - Líneas 286–289: `document.fonts.ready.then(() => { setup(); ScrollTrigger.refresh(); })` — setup del pin diferido.

### Impacto

Sección P1 ("Cómo funciona") con su primer paso ilegible y 1,5 viewports de negro. Un visitante que hace scroll ve la landing "romperse" justo cuando debe entender el producto. Es el único fallo que por sí solo justifica el NO APTO.

---

## BUG B2 (secundario) — Estela Kinetic del tagline prácticamente invisible

### Qué se observa

Los fantasmas (`.k-ghost`) existen y su opacidad CSS crece con `--ghost`: a mitad de pin real (p=0,5) la variable vale g1=0,275 / g2=0,2 / g3=0,15. **Pero la visibilidad efectiva es 0**: el tagline tiene clase `hero-fade` y se desvanece al inicio del pin (opacidad 0 ya en p=0,3547; medida: `fadeOp: 0` a p=0,5). Los fantasmas son hijos del tagline, así que su visibilidad efectiva es `fadeOp × ghostOp = 0` en toda la segunda mitad del pin. La ventana donde ambos factores son >0 (p≈0–0,3) da un producto que nunca supera ~0,08.

- Captura `supp-pin-mid-true.png` (p=0,5): mock centrado, H1 fuera, **ningún rastro de estela visible**; solo el mock y las losas-punto.
- Check suplementario "estela VISIBLE a mitad de pin (efectiva >0,10)": **FAIL**, efectiva `{g1: 0, g2: 0, g3: 0}`.
- Ojo: mi sonda principal marcó este check como PASS porque medía la variable CSS, no la opacidad efectiva — ese PASS era un artefacto mío (ver § Artefactos).

### Archivos

- `app/src/components/landing/TelescopeHero.tsx`
  - Línea 166: el tagline es `.k-tagline hero-fade` (los fantasmas heredan el fade)
  - Línea 242: `.to('.hero-fade', { opacity: 0, y: -24, duration: 0.4, ease: 'power1.in' }, 0)` — el fade se completa al inicio del pin
  - Línea ~227: `root.style.setProperty('--ghost', p)` — la estela crece con el progreso, justo cuando el fade ya la apagó
- `app/src/index.css` líneas 293–296: `.k-ghost.g1 { opacity: calc(var(--ghost, 0) * 0.55) }` (g2 ×0,4, g3 ×0,3)

### Reproducción

Scroll hasta p≈0,5 del pin (scrollY≈570 a 1280): el tagline ya no se ve y no hay estela. La estela solo podría intuirse en los primeros ~100 px de scroll del pin, con opacidad efectiva <0,08.

---

## Lo que SÍ funciona (medido, no declarado)

### (a) Hero Telescope — anima de verdad

- **Intro al cargar:** muestreo denso (24 muestras × 250 ms): los caracteres del H1 pasan de y≈73–87 px / opacidad 0–0,16 a matriz identidad / opacidad 1 en ~1–1,5 s tras `fonts.ready`. Frames: a +30 ms op 0 / y 86,9; a +548 ms op 0,64 / y 31,4; a +1087 ms op 1 / identidad.
- **Pin:** `--progress` 0 → 1 (frames p=0 / 0,3547 / 0,9509 / 1,0 en scrollY 0 / 379 / 759 / 1139). Mitades fuera de pantalla al final: 1280 izq x=−1495 / der x=2330; 820 izq −1265 / der 1616.
- **Pin-mid real (p=0,5, suplementaria):** mock centrado, mitades partidas, captura `supp-pin-mid-true.png`.
- **Mock 9:16:** escala 0 → 1, termina en **349×620** (tamaño diseñado: `height: min(78svh,620px)`, `aspect-ratio: 9/16`).
- **Losas:** a 1280 vuelan en z (tile0 `matrix3d` z=250 a p=0,35; z=540 a p≈0,95; 8 visibles). A 820 la rejilla está oculta por diseño (`display: none`, `@media (max-width: 900px)`).

### (b) Badge Dojo — línea editorial, no píldora

- Fondo `rgba(0,0,0,0)`, borde `0px solid`, radio `0px`, mono ámbar `#FFB020` (JetBrains Mono). Texto `DOJO AI HACKATHON 2026 — FLARE · MIT`, letras opacas sin transform al final. Entrada letra a letra medida en la intro.
- **Unpack al hacer scroll (suplementaria, p=0,5):** `small` se desvanece (op 0, y −9,9 px) y el tracking se abre a 3,74 px — PASS. (La opacidad del badge completo es 0 a p=0,5 porque el badge también es `.hero-fade`: se apaga con el hero por diseño, no es un bug; en reposo es perfectamente legible.)

### (c) Tagline scramble — funciona, incluido el replay

- Glifos aleatorios capturados en muestreo denso en los 4 combos (ej. `V/Q/7/S`, `F/k`, `U/M/5/W` en "Atrapa…") y texto final correcto: `Atrapa la mirada. Retén el scroll. Gana el click.`
- **Replay por clic (suplementaria, timing corregido +150/+300/+600 ms):** glifos aleatorios 3 / 3 / 5 en cada muestreo; captura `supp-scramble-replay-300ms.png` muestra `AtrapW << mirada. Retén el scroll. Gana el click.` a +300 ms. Texto final correcto. (El FAIL bruto de este check en ambas sondas era artefacto mío: ver § Artefactos.)

### (e) Contraste — PASS real

- Suplementaria con parser `oklab()` corregido: **0 de 194 textos <4,5:1** en claro-1280, oscuro-1280 y claro-820. Los 3 textos marcados en la sonda principal eran falsos positivos; sus ratios reales: "Descanso Total" 9,41, "Otra noche en vela, otra mañana agotada." 10,71, "Soy el agente de Flare…" 11,14 (blanco 70–80% sobre `rgb(18,18,26)`).

### (f) Overflow y palabras

- Sin overflow horizontal (1280: sw=cw=1272; 820: sw=cw=812). H1 sin palabras partidas: suplementaria por altura de línea a 820 — cada palabra en 1 línea (tops 182 / 258 / 333; "dirigir." sola en la 3ª línea, salto entre palabras, no a mitad). Rejilla oculta a 820.

### (g) Reduced-motion — PASS (8/8)

- Sin Lenis (`html.lenis` false), H1 completo y visible (`El comercial que tu agente puede dirigir.`, rect x=188 w=896), tagline plano con `.k-real` opacidad 1, badge legible opacidad 1, `.hero-media` y `.hero-grid` en `display: none`, fantasmas `display: none`, pasos como lista estática (`#como ol` presente), `scrollHeight` 6864 (sin pin). Captura `reduced-motion-1280.png`.

### (h) Copy — PASS

- 0 líneas en inglés sospechosas en los 4 combos. Sin placeholders con regex corregida (ver § Artefactos).

### Consola

- 0 errores en los 4 combos y en reduced-motion.

### Nota: tema claro/oscuro

La app fuerza tema oscuro en ambos modos emulados: las mediciones son idénticas en claro y oscuro. No es un bug reportado (el diseño es oscuro por intención), pero significa que el "modo claro" no existe como tal.

---

## Artefactos de mis propias sondas (corregidos; NO son bugs del producto)

Honestidad metodológica — estos FAIL brutos eran errores míos, y la suplementaria los corrigió:

1. **Contraste (e):** mi parser no manejaba `oklab()`, así que `oklab(0.999…)` se parseaba como RGB≈(1,0,0) y daba ratio 1,0. Los 3 textos marcados en los 4 combos eran falsos positivos (ratios reales 9,41 / 10,71 / 11,14). Suplementaria: parser `oklab()` correcto + composición alfa → 0 fallos.
2. **Placeholders (h):** mi regex `/TODO/` matcheaba la palabra española "todo" ("todo el día", "todo el negocio"). Regex corregida: `/lorem ipsum|\bTODO\s*:|\[TODO|FIXME|placeholder|\bxxx\b/i` → 0 hallazgos.
3. **Replay del scramble:** muestrear solo los 10 primeros caracteres a +500 ms llega tarde (terminan en ~465 ms). La suplementaria muestrea el tagline completo a +150/+300/+600 ms → glifos aleatorios presentes. Además el FAIL de la suplementaria era por comparar con espacios normales un texto final que usa NBSP (`\u00a0`): normalizado, el texto final es idéntico al esperado.
4. **Partición de palabras:** mi selector buscaba `span`, pero los caracteres de SplitText son `div` (`topsUnique` vacío = check vacuo). Suplementaria con hojas `div` y altura de línea → PASS real.
5. **Pin-mid:** mi bucle sobrepasaba a p≈0,9516 (las capturas `*-pin-mid.png` son en realidad casi-fin de pin). Suplementaria con pasos de 150 px → pin-mid real p=0,5.
6. **Estela (c):** mi sonda principal medía la variable CSS `--ghost`, no la opacidad efectiva. La suplementaria mide `fadeOp × ghostOp` → 0, que es el dato correcto (B2).
7. **Mock:** mi expectativa inicial (ancho >50% del viewport) era errónea; el tamaño diseñado es 349×620. Corregida.
8. **Badge:** mi check exigía `border` con "none"; el borde real es `0px solid` (sin borde efectivo). Corregido.
9. **Corrección a una nota previa mía:** `light-1280-steps-mid.png` NO muestra un viewport vacío — muestra "Agente" legible y centrado (es el único paso que se ve bien). La prueba visual de la zona muerta es `r8-deadzone-6200.png`, no esa captura.

---

## Evidencia

- Sondas: `/tmp/flare-judge/r8-visual/r8-judge1.mjs`, `r8-judge1-supp.mjs`, `deadzone-shot.mjs`, `diag.mjs`
- Resultados JSON: `r8-j1-results.json` (103 checks: 75 PASS / 28 FAIL brutos), `r8-j1-supp-results.json` (13 checks: 10 PASS / 3 FAIL brutos)
- Logs: `r8-j1-run.log`, `r8-j1-supp-run.log`
- Capturas clave:
  - `r8-deadzone-6200.png` — **B1: viewport vacío a scrollY 6200 (072%)**
  - `supp-pin-mid-true.png` — pin-mid real p=0,5 (sin estela visible → B2)
  - `supp-scramble-replay-300ms.png` — replay con glifos aleatorios (`AtrapW << mirada…`)
  - `supp-820-intro.png` — hero limpio a 820, H1 en 3 líneas sin palabras partidas
  - `light-1280-steps-mid.png` — paso "Agente" legible (el único que se ve bien)
  - `light-1280-intro-done.png`, `light-1280-pin-end.png`, `reduced-motion-1280.png`
  - `{light,dark}-{1280,820}-{intro-done,scramble-replay,pin-mid,pin-end,steps-mid,studio-contrast,final}.png`

## Recomendación para el constructor

1. **B1 (bloqueante):** realinear el trigger de `ScrubbedSteps` con el sticky real — p. ej. crear/actualizar su ScrollTrigger después de que el pin del hero exista (o usar posiciones basadas en el layout con pin ya aplicado + `ScrollTrigger.refresh()` efectivo), y verificar con un barrido que cada paso tenga dwell legible centrado y que no haya zona muerta. El comentario de las líneas 68–70 ("nunca hay un instante con la pantalla vacía") debe verificarse con mediciones, no asumirse.
2. **B2:** desacoplar la estela del fade del tagline (o retrasar el fade / adelantar la estela) para que `fadeOp × ghostOp` supere 0,10 durante una ventana visible del pin.
3. No tocar el hero, el badge ni el scramble: están a nivel Codrops y medidos como tales.

*Juez 1 — R8. Solo verificación; no se corrigió nada, no se tocó GitHub, Vercel ni Dojo.*
