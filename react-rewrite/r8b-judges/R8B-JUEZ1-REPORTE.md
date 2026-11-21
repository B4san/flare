# R8b — Juez 1 (Visual / diseño / animación) — REPORTE

**Veredicto: APTO** (con 2 observaciones no bloqueantes, OBS-1 y OBS-2; ningún bug confirmado)

- **Fecha:** 2026-11-21 (noche, hora CR)
- **Ámbito:** landing Codrops de Flare React tras los fixes R8b (B1 trigger de `ScrubbedSteps` + B2 estela Kinetic). El Studio no se tocó y no se re-verifica aquí salvo lo incidental.
- **Build verificado:** `~/workspace/flare/react-rewrite/app/dist/` (el `dist/` existente; no se recompiló ni se tocó código).
- **Método:** verificación **independiente**. Serví el `dist/` con mi propio `vite preview` en el puerto **4201** y medí con sondas CDP propias contra Chromium real (Playwright `chromium-1255`, `--headless=new --remote-debugging-port`). **No** reutilicé `r8b-verify.mjs` como evidencia: mi script (`judge1-verify.mjs`) muestrea más fino (**50 px** en vez de 100 px), usa un criterio de dwell **estricto** (centro del paso dentro del viewport, no ±180 px) y una zona muerta con dos umbrales (0,05 y 0,10). Las anomalías se persiguieron con dos scripts de diagnóstico propios (`diag820.mjs`, `diag2.mjs`) y un cierre (`close.mjs`).
- **Combos:** modo claro/oscuro emulado × 1280/820, viewport 900 px de alto. Reduced-motion como pasada aparte (1280 claro).

## Resumen de resultados

| Combo | Dwell Brief / Agente / Render (estricto, op ≥ 0,9) | Zona muerta < 0,05 | Zona muerta < 0,10 | Estela g1 a mitad de pin | Contraste | Overflow / consola |
|---|---|---|---|---|---|---|
| claro 1280 | 400 / 400 / 600 px | 0 px | 1 muestra (50 px) en el borde, ver OBS-1 | 0,393, real 0 | 0 bajo 4,5:1 | 0 / 0 errores |
| oscuro 1280 | 400 / 400 / 600 px | 0 px | 1 muestra (50 px) en el borde, ver OBS-1 | 0,393, real 0 | 0 bajo 4,5:1 | 0 / 0 errores |
| claro 820 | **400 / 250 / 0 px** (anómalo, ver OBS-2) | 50 px en y=7419 | 100 px (6219 y 7419) | 0,393, real **0,571** | 0 bajo 4,5:1 | 0 / 0 errores |
| oscuro 820 | 400 / 400 / 600 px | 0 px | 1 muestra (50 px) en el borde, ver OBS-1 | 0,393, real 0 | 0 bajo 4,5:1 | 0 / 0 errores |
| rueda 820 (diag2, geometría estable) | ~475 / ~478 / ~480 px | 0 px | 0 px | — | — | 0 / 0 errores |

Geometría medida (estable en todas las pasadas limpias): sticky **1280: 4503–6663** (contenedor 3060 px, sección desde 4343); **820: 6219–8379** (sección desde 6058). Pin-spacer del hero: 1800 px. Sin deriva de layout en 40 s de muestreo (diag2).

**Contabilidad honesta de mi pasada principal: 48/60 PASS, 12 FAIL.** Los 12 FAIL se desglosan así y **ninguno es un bug confirmado de la app**: 4× "fit del trigger" (bug de **mi** sonda de la barra, no de la app — ver § Nota de método; la barra se verificó funcionando aparte), 4× "zona muerta < 0,10" (una sola muestra de 50 px en el borde del sticky en cada combo — OBS-1), 4× la anomalía de claro-820 (OBS-2, no reproducida en 3 repeticiones limpias). No oculto los FAIL: están todos explicados abajo con sus números.

## (a) Dwell legible por paso (opacidad ≥ 0,9 con centro en viewport)

Barrido de 50 px por toda la sección; el dwell estricto y el laxo (±180 px del centro) coinciden en todos los combos limpios, así que el centrado es robusto, no un artefacto del umbral.

- **1280 (claro y oscuro, idénticos):** Brief **400 px** (muestras y=4753 op 0,96 cy 579 → y=5103 op 0,97 cy 562); Agente **400 px** (y=5453 op 0,97 cy 590 → y=5803 op 0,96 cy 571); Render **600 px** (y=6103 op 0,90 cy 612 → y=6653 op 1, dentro del sticky; sigue en 1 hasta y=6853 fuera del sticky). Umbral pedido: ≥ 300 px por paso. **Pasa con margen.**
- **820 oscuro:** Brief **400 px** (6469–6819), Agente **400 px** (7169–7519), Render **600 px** (7819–8369). **Pasa.**
- **820 claro (pasada principal, anómala):** Brief 400 px (6469–6819), Agente **250 px** (7169–7369), Render **0 px** (nunca ≥ 0,9 centrado; Render llega a op 1 pero con centro fuera del viewport, por encima). Ver OBS-2: no se reproduce.
- **Rueda 820 (diag2, geometría estable, scroll de rueda real vía Lenis):** dwell aproximado por deltas de scrollY **~475 / ~478 / ~480 px**, Render centrado op 1 en y=8013 (cy 560) y y=8253 (cy 560). **Pasa.**

## (b) Zona muerta (los 3 pasos en opacidad ~0 dentro del sticky)

- **Umbral 0,05: 0 px en los 3 combos limpios** (y en la rueda 820). No hay pantalla vacía dentro del sticky. El B1 de R8 (1500 px muertos) está corregido.
- **Umbral 0,10: 1 muestra de 50 px en cada combo limpio, siempre en el píxel exacto de enganche** (scrollY = stickyStart: 4503 a 1280, 6219 a 820). Ver **OBS-1**.
- En la pasada anómala claro-820 hubo además 50 px muertos en y=7419 (entre la salida de Agente y la entrada de Render). Ver OBS-2.

### OBS-1 (marginal, reproducible, NO bloqueante) — Brief entra al 9 % en el píxel de enganche

En el instante exacto en que el sticky se engancha, Brief todavía no llega al 10 % de opacidad:

| scrollY (1280) | Brief op | Agente op | Render op |
|---|---|---|---|
| 4453 (antes del sticky) | 0,01 | 0 | 0 |
| **4503 (= stickyStart)** | **0,09** | 0 | 0 |
| 4553 | 0,24 | 0 | 0 |
| 4603 | 0,45 | 0 | 0 |
| 4653 | 0,67 | 0 | 0 |

Es decir: con el criterio estricto "< 0,10" hay una rendija continua de **~12 px** (de 4503 hasta que Brief cruza 0,10, entre 4503 y 4553) en la que ningún paso llega a 0,10; con el criterio "< 0,05" no hay nada (Brief ya está en 0,09). El lead-in de 75 px deja a Brief **entrando** en el enganche, pero no visible: un usuario que haga scroll continuo ve el fundido empezar de inmediato, sin pantalla vacía sostenida. Lo dejo como pulido opcional (empezar Brief ~25–50 px antes o alargar el lead-in), no como bloqueo: el dwell de Brief (400 px) y el resto de la sección están bien.

## (c) Estela Kinetic a mitad del pin

Sondas en 7 puntos del pin (scrollY 0/150/300/450/600/750/900; `--progress` 0 / 0,056 / 0,222 / 0,5 / 0,778 / 0,944 / 1,0). Valores a 1280 (idénticos en claro y oscuro; a 820 iguales en las pasadas limpias):

| scrollY | `--progress` | `--ghost` | fantasma g1 | g2 | g3 | `.k-real` (media) |
|---|---|---|---|---|---|---|
| 0 | 0,0000 | 0,0000 | 0 | 0 | 0 | 0* |
| 150 | 0,0556 | 0,0794 | 0,044 | 0,032 | 0,024 | 0 |
| 300 | 0,2222 | 0,3174 | 0,175 | 0,127 | 0,095 | 0 |
| **450 (mitad)** | **0,5000** | **0,7143** | **0,393** | **0,286** | **0,214** | **0** |
| 600 | 0,7778 | 0,7407 | 0,407 | 0,296 | 0,222 | 0 |
| 750 | 0,9444 | 0,1853 | 0,102 | 0,074 | 0,056 | 0 |
| 900 (fin) | 1,0000 | 0,0000 | 0 | 0 | 0 | 0 |

\* En y=0 la media de `.k-real` varía según la pasada (0 en claro-1280, 0,898 en oscuro-1280, 1 en 820): es el scramble de entrada todavía en curso cuando cae la primera sonda; no es un defecto — a partir de y=150 el fade del pin ya manda y el real está en 0.

- **B2 corregido:** a mitad de pin el fantasma g1 está en **0,393 (> 0,10)** con el texto real en **0** — la estela es visible mientras el texto real ya se desvaneció. Se apaga al final del pin (g1 = 0 en y=900). Confirmado visualmente en las capturas `*-02-pin-mid.png` (1280 claro/oscuro y 820): la estela ámbar del tagline se lee sobre el mock centrado.
- La curva `--ghost` (0,7143 en p=0,5; máx ~0,74 en p≈0,7–0,78; 0 en p=1) coincide con el diseño descrito en `TelescopeHero.tsx` (crece a 1 en p=0,7 y baja a 0 en p=1; g1 = `--ghost` × 0,55).

## (d) Frames (movimiento real)

Capturas en `evidence/` (ver § Archivos): hero, mitad de pin, cada paso centrado y final del sticky, en **1280 claro y oscuro** (6 + 6), más 820 claro (hero, mitad de pin, paso centrado, final), reduced-motion (hero y `#como`) y diag2 (mitad del sticky y zona de Render a 820). Verificadas visualmente por mí:

- `light-1280-02-pin-mid.png`: estela ámbar legible, mock 9:16 centrado, barra de progreso 005 %.
- `light-1280-04-paso-agente-y5453.png` y `dark-1280-05-paso-render-y6103.png`: pasos gigantes centrados y legibles, barra 063 % / 078 %; en el frame de Render se ve "Agente" saliendo muy tenue arriba (solape de salida por diseño, opacidad baja).
- `light-820-03-steps-mid.png`: "Agente" centrado y legible a 820, sin cortes.
- `reduced-motion-1280-como.png`: lista estática legible (ver § f).

## (e) Contrastes (medidos, con blending de fondos semitransparentes)

Escaneo completo de textos visibles (hojas con texto, excluidos `aria-hidden` y color transparente): **0 por debajo del umbral en los 4 combos** — 204 textos (181 de landing) en claro-1280, 193 (170) en oscuro-1280, 204/194 a 820. Textos clave medidos en 1280 claro:

| Texto | Ratio | Tamaño / peso |
|---|---|---|
| H1 (ambas mitades) | **18,08:1** | 72 px / 700 |
| Badge Dojo / kicker "Cómo funciona" / label de paso | **10,80:1** | 11 px / 400–600, ámbar #FFB020 |
| H2 "Del brief al vídeo en tres pasos" | **18,08:1** | 36 px / 700 |
| Palabra "Brief" | **19,75:1** | 144 px / 700 |
| Descripción de paso / subtítulo del hero | **7,11:1** | 16–18 px, #9A9AA8 |
| Peor texto de toda la página | **4,91:1** | 12 px, tarjeta de plantilla ("6 escenas · Un colchón ficticio…"), umbral 4,5:1 — pasa |

El tagline real (`.k-real`) usa color transparente con degradado (`background-clip:text`), así que no admite ratio por color sólido; se verifica visualmente en las capturas (legible en ámbar/fantasmas y en blanco al cargar). Los textos en degradado `.text-flare` quedan fuera de esta medición por el mismo motivo (ya documentado en R8).

## (f) Overflow, texto cortado y reduced-motion

- **Sin overflow horizontal:** `scrollWidth − clientWidth = 0` en los 4 combos y en reduced-motion (1280: 1272/1272; 820: 812/812). Los únicos elementos más anchos que el viewport son las filas internas del marquee (`animate-marquee`, dentro de un contenedor con overflow oculto por diseño). Cero errores de consola en todas las pasadas.
- **Sin texto cortado en los pasos:** sonda `scrollWidth > clientWidth` en los `<p>` de `.step-word` a 820: **vacía**. H1 a 820 sin partición a mitad de palabra en la captura del hero (el `scrollWidth` 2380 del H1 medido al final del pin corresponde a las mitades desplazadas fuera de pantalla dentro del header con `overflow-hidden`, no a un corte visible; `overflowX = 0`).
- **Reduced-motion** (`prefers-reduced-motion: reduce`, 1280 claro): `#como` es una **lista estática** con los 3 pasos legibles (Brief/Agente/Render, opacidad 1, visibles), sin `.step-word` (0), fantasmas con `display: none`, tagline en texto plano ("Atrapa la mirada. Retén el scroll. Gana el click."), sin overflow horizontal, cero errores de consola. Capturas: `reduced-motion-1280-hero.png`, `reduced-motion-1280-como.png`.

## OBS-2 (transitorio NO reproducido — se documenta, no se considera bug) — pasada anómala claro-820

En la pasada principal, solo el combo **claro-820** salió anómalo: dwell Agente 250 px, Render 0 px, zona muerta de 50 px en y=7419 (los 3 pasos en 0, con centros en cy ≈ −906, es decir, el sticky no retenía y la timeline parecía desplazada ~900 px), `.k-real` en 0,571 a mitad de pin (49 caracteres: media 0,571, máx 1) y un salto de `scrollY` de 900 → **9764** en la sonda del final del pin. Señales de que esa pasada corrió con la página a medio cargar / recargada a mitad de sonda:

- La sonda del pin en y=150 de esa misma pasada devolvió error: `getComputedStyle` sobre `null` — `document.querySelector('.t-hero')` era **null** en ese instante (el hero no estaba montado: navegación o remontaje en curso).
- El salto a 9764 no se reproduce: en el diagnóstico, tras `scrollTo(900)` el `scrollY` se mantuvo en 900 durante 30 muestras de 100 ms.
- El servidor `vite preview` que yo mismo había levantado en 4201 **se encontró caído** (`curl 000`) entre el diagnóstico 1 y el 2 — el entorno, no la app, estaba inestable en ese tramo.

**Tres repeticiones limpias lo desmienten:**

1. **oscuro-820, misma pasada principal** (mismo layout, solo cambia el esquema emulado): dwell 400/400/600, zona muerta 0, estela 0,393 con real 0. Un bug real de layout no dependería del esquema de color.
2. **diag820 (carga fresca a 820):** pin limpio — a y=450, 0 de 49 caracteres reales por encima de 0,9 y 49 de 49 por debajo de 0,1, fantasma g1 0,393; traza de scroll estable en 900.
3. **diag2 (carga fresca a 820, geometría muestreada 40 s):** secTop 6058, stickyStart 6219, pin-spacer 1800 y `scrollHeight` 13273 **constantes desde t=2 s hasta t=40 s, sin deriva**; barrido con **rueda real** (eventos `mouseWheel` vía Lenis, como un usuario) sobre la geometría estable: dwell ~475/478/480, zona muerta 0 en ambos umbrales, Render centrado op 1 en y=8013 (cy 560) y 8253 (cy 560).

La discrepancia de geometría 4103 vs 6219 vista en la recarga de diag820 se midió sobre una recarga a medio asentar (con el scroll restaurado tras el salto) y su barrido de rueda usó esa geometría transitoria; no es evidencia contra la app. Recomendación no bloqueante: si el orquestador quiere más seguridad, que se repita una pasada fresca a 820; yo no lo considero un bug confirmado y no lo cuento como tal en el veredicto.

## Nota de método — el "fit del trigger" (mi sonda, no la app)

Mis 4 checks "trigger alineado con sticky (fit ±100 px)" dieron FAIL con `fit: null` porque mi sonda leía siempre `prog: null` de la barra `#como .bg-flare`. **Es un bug de mi script, no de la app:** en el diagnóstico 2, a mitad del sticky estable, la barra mide `style.transform = "scaleX(0.516779)"` (computado `matrix(0.516779, 0, 0, 1, 0, 0)`), es decir, la barra **sí** se actualiza con el progreso. La alineación trigger↔sticky queda establecida por las mediciones que no dependen de la barra: los pasos juegan exactamente dentro del rango del sticky en todas las pasadas limpias (dwell 400/400/600, zona muerta 0), y la geometría es estable.

## Bugs

**Ningún bug bloqueante.** Observaciones (arriba): OBS-1 (rendija de ~12 px con Brief al 9 % en el píxel de enganche; pulido opcional) y OBS-2 (transitorio no reproducido en claro-820; documentado con evidencia). Nota menor sin verificar como bug: en una captura de reduced-motion la píldora de navegación se ve a medio recortar en el borde superior — un solo frame, compatible con su animación de aparición/desaparición al hacer scroll; fuera del ámbito R8b y sin reproducción como defecto, no se reporta como bug.

No se corrigió nada (directiva del encargo). No se tocó GitHub, Vercel ni Dojo.

## Archivos

- Este reporte: `/tmp/flare-judge/r8b-visual/R8B-JUEZ1-REPORTE.md` y copia en `~/workspace/flare/react-rewrite/r8b-judges/R8B-JUEZ1-REPORTE.md`
- Evidencia (capturas + datos crudos): `/tmp/flare-judge/r8b-visual/evidence/` y copia en `~/workspace/flare/react-rewrite/r8b-judges/r8b-juez1-evidence/`
  - `judge1-raw.json` (barridos de 50 px, sondas de pin, contrastes, overflow de los 4 combos + reduced-motion), `judge1-run.log`, `judge1-verify.mjs` (sondas propias)
  - `diag-820.json`, `diag820.mjs`, `diag820.log`, `diag2-timing.json`, `diag2-wheel.json`, `diag2.mjs`, `diag2.log`, `contrast-key-1280.json`, `close.mjs`, `close.log`
  - Capturas: `light-1280-0{1..6}-*.png`, `dark-1280-0{1..6}-*.png`, `light-820-0{1..4}-*.png`, `reduced-motion-1280-*.png`, `diag2-820-*.png`, `diag-820-wheel-*.png`
- Servidor usado: `vite preview` propio en `http://127.0.0.1:4201/` (puerto 4201, `dist/` sin recompilar); detenido al terminar el encargo. Chromium: `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`.
