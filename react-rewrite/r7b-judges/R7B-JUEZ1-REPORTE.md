# R7b — JUEZ 1 (visual / diseño / copy / UX) — REPORTE INDEPENDIENTE

- **Fecha:** 2026-11-21 ~19:00 CST
- **App:** `~/workspace/flare/react-rewrite/app/` (build en `dist/`, servida por mí en `http://127.0.0.1:4181/`)
- **Método:** sondas propias en Node + CDP contra Chromium real (`~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`, headless). NO re-ejecuté `r7b-verify.mjs` del agente de fixes; escribí mis propias sondas (`juez1.mjs`, `juez1b.mjs`, `juez1c.mjs`, `juez1d.mjs` en `/tmp/flare-judge/r7b-visual/`). Contraste calculado con conversión propia oklch/oklab → sRGB y fórmula WCAG. Capturas en `/tmp/flare-judge/r7b-visual/`.
- **Combos:** SO emulado claro/oscuro (`Emulation.setEmulatedMedia`, `prefers-color-scheme`) × viewport 1280/820, `innerWidth` verificado en cada combo. 0 errores de consola y 0 excepciones en los 4 combos.

## Veredicto: NO APTO

Las regresiones visuales de R7 están corregidas (oscuro forzado, sin Login, sin placeholder, copy real, sin overflow), **pero el layout por defecto del Studio a 1280 esconde contenido detrás de la ventana del Agente**: la 5ª regla de retención del panel del Studio, la línea de estado del export y **la ventana completa «Brief para tu agente»** (con su botón «Generar con mi agente») no se ven a 1280. Además el token de texto muted `#6E6E7C` incumple WCAG AA de forma sistemática (3,94:1). Ambos son defectos visuales/UX medidos por mí, reproducibles, y están dentro del alcance de este juez.

---

## 1. Lo que SÍ se verificó (fixes R7 confirmados)

| Check | Resultado medido |
|---|---|
| Oscuro forzado en los 4 combos | `html.dark` presente, `color-scheme: dark`, `body` `rgb(10, 10, 15)` = `#0A0A0F` en claro y oscuro, 1280 y 820 |
| `@custom-variant dark` + `class="dark"` + `main.tsx` | Presentes en `src/index.css:9`, `index.html:2`, `src/main.tsx:9` (verificado en fuente y en vivo) |
| Sin botón «Login» | `innerText` completo sin «login» en los 4 combos |
| Sin placeholder Aceternity | Sin «Changelog from my journey» en los 4 combos |
| Header Aceternity «El flujo, paso a paso» | Presente, con copy real («Brief, construcción por el agente, preview con score en vivo y export…») |
| Tagline y footer en español | «Atrapa la mirada. Retén el scroll. Gana el click.» presente en hero, CTA y footer (ver B5 por el matiz) |
| «17,5 s» sin aclaración interna | 2 ocurrencias, ambas peladas: «9:16 · 17,5 s» (tarjeta Descanso Total y diálogo de escenas) |
| Sin línea «checker local» | Ausente en los 4 combos |
| Chat en español | Placeholder `«Escribe un mensaje al agente…»` |
| Overflow horizontal de página | `scrollWidth ≤ innerWidth` en los 4 combos (1272/1280, 812/820); 0 elementos con overflow real fuera de un ancestro con clip |
| Solapes de texto | 0 a 820 (ambos esquemas). A 1280 solo los 8 solapes del Studio descritos en B1–B3 |
| 6 botones de escena del timeline | Todos visibles y dentro del viewport: a 1280 x641–1215, a 820 x41–771 (el 6.º, «6. CTA», NO está cortado) |
| Chips de captions del preview (escena CTA) | Solo la escena 6 tiene `midChips` (3 chips: «✓ Soporte firme», «✓ Frescura total», «✓ Despierta renovado»). A 1280 los 3 están dentro de su caja y dentro del clip: caja (218,5985,204×85), clip (185,5794,270×480), chips x246–378, y5985–6070. Las escenas 1–5 no tienen `midChips` por diseño de la plantilla (verificado en el bundle) |
| Contraste (ver tabla §2) | Todo el texto principal ≥4,5:1 (o ≥3:1 texto grande), incluido el tagline en degradado (peor parada 4,66:1, texto grande) |
| Diálogo «Ver escenas» | Fondo `#12121A`, rect (400,199,480×502) a 1280 y (170,199,480×502) a 820, centrado; título «Descanso Total» blanco 20 px bold 17,06:1; subtítulo `#9A9AA8` 14 px 6,71:1; escenas `#F5F5F2` 16 px; tiempos `#9A9AA8` 12 px 6,71:1 |
| Nav flotante | Enlaces «Qué es / Plantillas / Retención / Studio» en `oklch(0.87 0 none)` (~#D8D8D8) sobre píldora oscura 85 % ≈ 13,9:1; visible al subir scroll (ver B6) |
| Armonía visual | Una paleta (fondo `#0A0A0F`, superficie `#12121A`, texto `#F5F5F2`, degradado `#FFB020→#FF5A3C→#8B5CF6`) y dos tipografías (Space Grotesk display, Inter cuerpo), medidas en `computed style` |
| Componentes usados de verdad | Magic UI (AnimatedGradientText, NumberTicker, Particles —único `<canvas>`, 1272×828 en el hero—, ShimmerButton, Marquee ×4, BentoGrid), Aceternity (FloatingNav, Timeline), React Bits (SplitText, `split-word` ×7), Lottie real (AgentOrb/SpiralLoader, nodos `__lottie_element_*` en el DOM), GSAP/motion. Rive/Spline/Three.js NO se ven montados en vivo (SplineSlot solo renderiza con escena publicada; Rive documentado como slot preparado, no activo) |

### 2. Contraste WCAG medido (ratios numéricos, idénticos en los 4 combos salvo nota)

Fondo base `#0A0A0F`; superficie `#12121A`. Umbral: ≥4,5:1 texto normal, ≥3:1 texto grande (≥24 px o ≥18,66 px bold).

| Elemento | Color | Fondo | Tamaño/peso | Ratio | Veredicto |
|---|---|---|---|---|---|
| Hero H1 «El comercial que tu agente puede dirigir.» | `#F5F5F2` | `#0A0A0F` | 72 px / 700 | **18,08:1** | PASS |
| Hero tagline (degradado, peor parada `#8B5CF6`) | degradado `#FFB020→#8B5CF6` | `#0A0A0F` | 24 px / 700 | **4,66:1** | PASS (grande) |
| Hero tagline (parada ámbar `#FFB020`) | — | `#0A0A0F` | 24 px / 700 | **10,80:1** | PASS |
| Hero cuerpo «Flare es un estudio…» | `#9A9AA8` | `#0A0A0F` | 18 px / 400 | **7,11:1** | PASS |
| Stats «3 / 13 / 6» (NumberTicker) | `#FFFFFF` | `#0A0A0F` | 36 px / 700 | **19,75:1** | PASS |
| Stat «100/100» («100» blanco + «/100» degradado) | `#F5F5F2` + `text-flare` | `#0A0A0F` | 36 px / 700 | **19,75:1 / 4,40:1** | PASS (grande) |
| Stats labels («plantillas reales», «mejor score»…) | `#9A9AA8` | `#0A0A0F` | 12 px / 400 | **7,11:1** | PASS |
| H2 secciones («No un generador…», «Tres anuncios…», «Del brief…», «El flujo, paso a paso») | `#F5F5F2` | `#0A0A0F` | 36 px / 700 | **18,08:1** | PASS |
| H2 cierre «Atrapa la mirada…» | `#F5F5F2` | `#12121A` | 36 px / 700 | **17,06:1** | PASS |
| CTA span «Retén el scroll.» (`text-flare`, peor parada) | degradado | `#12121A` | 36 px / 700 | **4,40:1** | PASS (grande) |
| Bento H3 «Agent-native de verdad» | `oklch(0.87 0 none)` | `#0A0A0F` | 20 px / 600 | **13,33:1** | PASS |
| Bento cuerpo | `oklch(0.708 0 none)` | `#0A0A0F` | 16 px / 400 | **7,64:1** | PASS |
| Timeline pasos («Brief», «El agente construye»…) | `oklch(0.708 0 none)` | `#0A0A0F` | 48 px / 700 | **7,64:1** | PASS |
| Timeline descripciones | `#9A9AA8` | `#0A0A0F` | 14 px / 400 | **7,11:1** | PASS |
| Studio H2 «El estudio donde trabaja tu agente» | `#F5F5F2` | `#0A0A0F` | 36 px / 700 | **18,08:1** | PASS |
| Chat textarea (texto escrito) | `#F5F5F2` | `#1A1A26` | 14 px / 400 | **15,76:1** | PASS |
| Footer enlace «github.com/B4san/flare» | `#9A9AA8` | `#0A0A0F` | 12 px / 400 | **7,11:1** | PASS |
| Footer texto y tagline repetido | `#6E6E7C` | `#0A0A0F` | 12 px / 400 | **3,94:1** | **FAIL — ver B4** |

Nota: el stat del hero se asienta en «100/100» (el «99/100» que se ve en una primera lectura es el NumberTicker contando; verificado en captura y en DOM asentado).

---

## 3. Bugs (concretos y reproducibles)

### B1 — ALTA (bloqueante): la 5ª regla de retención del panel del Studio queda tapada por la ventana del Agente a 1280

- **Qué:** en el panel de retención del Studio solo se ven 4 reglas (Hook, Captions, Ritmo, CTA). La 5ª, «✓ Safe zones (texto dentro del margen 10%) — 10 pts», existe en el DOM pero está cubierta por la ventana del Agente.
- **Valores medidos (1280, ambos esquemas):** LI rect página `(641, 6494, 574×38)`; ventana del Agente rect `(40, 6495, 1192×730)`, `z-index: 13`, fondo `#12121A/95 %` (opaco). `document.elementFromPoint` en el centro del LI devuelve el `<p>«Agente»</p>` de la ventana del Agente → tapado confirmado por geometría y por hit-test, no solo por solape de cajas. En la captura `crop-studio-1280.png` la fila Safe zones no aparece (el panel muestra Hook/Captions/Ritmo/CTA y debajo empieza directamente la ventana del Agente).
- **Cómo reproducirlo:** servir el build, viewport 1280×900, SO claro u oscuro, bajar hasta el Studio (sección «El estudio donde trabaja tu agente»), mirar el panel de retención a la derecha del preview: faltan la fila Safe zones y la línea de estado (B2). La lista equivalente de la landing (sección Retención) sí muestra las 5 reglas, así que es solo el panel del Studio.
- **A 820 no ocurre:** layout apilado; la fila Safe está en y≈9113 y la ventana del Agente empieza en y≈9320; visible en `crop-studio-820.png`.

### B2 — ALTA (bloqueante, misma causa que B1): la línea de estado del export del Studio queda tapada a 1280

- **Qué:** «Export (scenes.html): Safe 10/10 · score 100/100 — …» (línea bajo las reglas del panel de retención del Studio) no se ve a 1280.
- **Valores medidos:** P rect página `(654, 6580, 548×39)`, color `#6E6E7C` 12 px; `elementFromPoint` en su centro devuelve el div del comando `$ claude "/flare:build --brief brief.md"` dentro de la ventana del Agente → tapado. A 820 la línea está en y≈9200, visible (también listada en el inventario de B4).

### B3 — ALTA (bloqueante, misma causa): la ventana completa «Brief para tu agente» es invisible a 1280

- **Qué:** la ventana «Brief para tu agente» (título + descripción + botón «Generar con mi agente») no se ve en absoluto a 1280: queda entera detrás de la ventana del Agente. Su botón es inalcanzable.
- **Valores medidos (1280):** ventana Brief rect `(40, 6979, 1192×94)`; ventana del Agente rect `(40, 6495, 1192×730)` → la Brief cae íntegramente dentro de la huella del Agente; Agente `z-index: 13`, fondo opaco 95 %; Brief sin `z-index`. `elementFromPoint` en el centro del H3 «Brief para tu agente» `(121, 7014)` devuelve el div de botones del Agente («Generar el brief / Exportar el vídeo / Acortar la primera escena»). En `crop-studio-1280.png` (pág. y6400–7225) no aparece el título «Brief para tu agente» en ningún punto.
- **Cómo reproducirlo:** mismo que B1; bajar al final de la página a 1280: tras la ventana del Agente no hay ventana de Brief. Cambiar a viewport 820 y bajar: la ventana Brief aparece apilada (rect `(24, 10411, 764×166)`, visible en `crop-studio-820.png`).
- **Causa raíz probable (para el fix, no verificada más allá de la geometría):** el layout por defecto del Studio a ≥1280 posiciona la ventana del Agente en absoluto (`WIN_DEFAULTS agent y:780`, sección Studio empieza en pág. y≈5714 → 6494) con altura 730, mientras la ventana Brief fluye después y cae dentro de su huella; el contenido del panel de retención (5 filas + línea de estado) es más alto que la fila que le toca y su cola queda bajo el Agente. El fix de `WIN_DEFAULTS`/ResizeObserver de R7b no resolvió este solape.

### B4 — MEDIA: el token de texto muted `#6E6E7C` incumple WCAG AA en todos los combos

- **Qué:** `#6E6E7C` sobre `#0A0A0F` = **3,94:1** (sobre `#12121A` = 3,71:1), por debajo de 4,5:1 para texto normal (10–12 px). Es sistemático, no un caso aislado.
- **Valores medidos:** inventario a 820 (mismo token en los 4 combos): 18 textos visibles — footer, ambas líneas (incluido el tagline repetido «Atrapa la mirada…» a 12 px); descripciones de las 3 tarjetas de plantilla («6 escenas · Un colchón ficticio…» etc., 12 px); etiquetas del Studio (PLANTILLA, VÍDEO, CAPTIONS, CAPTION, AGENTE, PROVEEDOR, BASE URL, MODELO, API KEY (REQUERIDA), 10–12 px); «Sin actividad todavía.» (11 px); línea «Export (scenes.html)…» (12 px); «$» del prompt. El resto de la paleta de texto está bien (`#9A9AA8` 7,11:1; `#F5F5F2` 18,08:1).
- **Cómo reproducirlo:** cualquier combo; inspeccionar cualquier elemento con `color: rgb(110, 110, 124)` (p. ej. el `<footer>`, `text-xs text-[#6E6E7C]`) y calcular el ratio contra `#0A0A0F`.
- **Fix sugerido:** subir `--color-text-muted` hasta ≥4,5:1 (p. ej. `#9A9AA8`, que ya da 7,11:1) o reservar `#6E6E7C` solo para texto decorativo/no informativo. (El placeholder del chat, también `#6E6E7C`, se reporta solo como informativo: WCAG no exige 4,5:1 a placeholders.)

### B5 — BAJA: el footer conserva un fragmento en inglés

- **Qué:** la línea izquierda del footer dice «Flare — open source (MIT) · **Built for Dojo AI Hackathon 2026** · github.com/B4san/flare». El claim del fix era «footer en español»; el tagline sí está en español, pero esa frase no.
- **Cómo reproducirlo:** pie de la landing, cualquier combo. (También aparece «Dojo AI Hackathon 2026 · Open source (MIT)» como badge del hero; ese es un nombre propio/badge y no lo cuento como bug.)

### B6 — BAJA (observación): la nav flotante está oculta al cargar

- **Qué:** al cargar, la FloatingNav está en `y=-60` (fuera de viewport); solo aparece al hacer scroll hacia arriba. En la landing no hay navegación visible hasta que el usuario desplaza la página. Es el comportamiento por defecto del componente Aceternity, y los enlaces en sí tienen buen contraste (~13,9:1) y se ven correctos cuando aparece (verificado en captura). Lo dejo como observación de UX, no como bloqueante.

### B7 — Observación: tarjetas bento con gran zona vacía; Rive/Spline/Three.js no visibles

- Las tarjetas del bento («Qué es Flare») tienen una zona superior oscura y vacía muy grande, con icono+texto anclados abajo; a 820 (una columna) se acentúa. No hay texto cortado, pero se lee como espacio muerto (probable área de CanvasRevealEffect/spotlight sin contenido hasta hover).
- En vivo solo hay un `<canvas>` (Particles del hero). SplineSlot se monta solo con escena publicada y Rive está documentado como slot preparado, no activo (ver `src/components/studio/AgentOrb.tsx:3-8` y `src/components/landing.tsx:17`). No es un bug, pero «Three.js / Rive» no se ven usados en la app viva.

---

## 4. Notas de método y limitaciones

- Mi primera pasada midió el combo claro-820 con `innerWidth=1280` (carrera al aplicar el override antes de navegar); lo detecté por el `innerWidth` medido y **repetí los combos 820 con viewport verificado** (`juez1b.mjs`, `juez1d.mjs`: `innerWidth=820` confirmado).
- Mi primera medición de chips leyó la **etapa de auditoría off-screen** (`[data-role="chips"]` en x≈-9967, usada para medir safe zones con `getBoundingClientRect`); la corregí filtrando solo cajas visibles (x≥-1 y dentro del viewport). Los valores de chips de este reporte son de la caja visible.
- Los clics en los botones de escena del timeline **no cambiaron el caption visible en mis sondas** (el preview avanzaba por su propio temporizador; la caja de chips de la escena 6 se capturó cuando la reproducción llegó a la CTA). No lo califico como bug: la búsqueda/seek del preview corresponde al juez funcional.
- El servidor de preview que levanté (`:4181`) sigue corriendo al entregar este reporte; las capturas de otros jueces en el mismo directorio (`*-landing.png`, `*-studio.png` de las 18:55) no son mías.
- No corregí nada; no toqué GitHub, Vercel ni Dojo.

## 5. Evidencia

- Reporte (esta copia): `/tmp/flare-judge/r7b-visual/R7B-JUEZ1-REPORTE.md` y `~/workspace/flare/react-rewrite/r7b-judges/R7B-JUEZ1-REPORTE.md`
- Datos crudos de mis sondas: `/tmp/flare-judge/r7b-visual/juez1-raw.json`, `juez1b-raw.json`, `juez1c-raw.json`, `juez1d-raw.json`
- Sondas: `/tmp/flare-judge/r7b-visual/juez1.mjs`, `juez1b.mjs`, `juez1c.mjs`, `juez1d.mjs`
- Capturas clave: `light-1280-full.png`, `dark-820-full.png`, `light-1280b-hero.png`, `light-1280b-bento.png`, `light-1280b-timeline.png`, `light-1280b-studio.png`, `light-820b-hero.png`, `light-820b-bento.png`, `light-820b-studio.png`, `crop-studio-1280.png` (zona del solape B1–B3), `crop-studio-820.png`, `crop-hero-1280.png`, `juez1-dialog-1280.png`, `juez1-dialog-820.png` (todas en `/tmp/flare-judge/r7b-visual/`)
