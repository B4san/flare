# R7c — JUEZ 1 (visual / diseño / copy / UX) — REPORTE

**Veredicto: APTO** (visual/diseño/copy/UX)

**Fecha:** 2026-11-21 ~13:45 CST
**App verificada:** `~/workspace/flare/react-rewrite/app/dist/` (build existente, no recompilado)
**Servidor:** `vite preview` propio en `http://127.0.0.1:4182/` (el puerto 4181 ya estaba ocupado por otro `vite preview` sirviendo el mismo `dist/` — `index.html` con md5 idéntico `a3f502aa8909317c15d5c053c30cf66d` — así que serví el mismo build en 4182).
**Navegador:** Chromium real headless (Playwright `chromium-1255`), CDP crudo, sin Playwright.
**Método:** sondas propias (`juez1.mjs`, `juez1b.mjs`, `juez1c.mjs` en `/tmp/flare-judge/r7c-visual/`). No se reutilizó `r7c-verify.mjs` del agente de fixes ni se aceptó su `84/84 PASS` como evidencia. 4 combos: claro/oscuro emulado (`prefers-color-scheme`) × 1280/820, viewport verificado en vivo (`innerWidth` real == objetivo en los 4 combos).

## Resumen por criterio

| Criterio | Resultado |
|---|---|
| (a) Hit-tests 5ª regla / export / Brief / botón, sin tapar el Agente | PASS en los 4 combos |
| (a) Se ven las 5 reglas de retención | PASS en los 4 combos |
| (b) Contraste WCAG ≥ 4,5:1 (≥ 3:1 texto grande), fondos compuestos | PASS en los 4 combos (361 textos auditados por combo) |
| (c) Copy: footer ES, etiqueta 85/100, sin placeholders, chat ES | PASS |
| (d) Armonía visual única, componentes reales | PASS |
| (e) Sin overflow horizontal; cero errores de consola; cero requests fallidas | PASS en los 4 combos |

**Totales (pasada válida juez1b): 56 PASS / 6 FAIL de 62** — los 6 FAIL fueron 2 artefactos de mi propio harness, investigados y refutados en juez1c (ver "Bugs de mi propio harness", abajo). Tras la corrección, **0 fallos reales**.

## (a) Solape del Agente — CORREGIDO (era el NO APTO de R7b)

Hit-tests con `elementFromPoint` en el centro del elemento, tras `scrollIntoView({behavior:'instant', block:'center'})` y con `scroll-behavior: auto` forzado:

| Combo | 5ª regla "Safe zones" | Línea export | H3 Brief | Botón "Generar con mi agente" | Solape Agente∩Retención |
|---|---|---|---|---|---|
| claro 1280 | propio (`SPAN ✓ Safe zones…`, cx 805, cy 450) | propio (`P Export (scenes.html): Safe 10/10 · score 100/100…`, cx 932, cy 450) | propio (H3, cx 447, cy 745) | propio (BUTTON, cx 1122, cy 757) | 0 px² |
| oscuro 1280 | propio, idénticas coords | propio, idénticas coords | propio | propio | 0 px² |
| claro 820 | propio (cx 201, cy 450) | propio (cx 410, cy 450) | propio (cx 410, cy 673) | propio (cx 138, cy 763) | 0 px² |
| oscuro 820 | propio (cx 201, cy 450) | propio (cx 410, cy 450) | propio (cx 410, cy 673) | propio (cx 138, cy 763) | 0 px² |

Geometría a 1280 (medida en vivo): Retención `x 628, y 6126, 608×535`; Agente `x 44, y 6685, 1192×730` — el Agente empieza 24 px debajo del final de Retención (6126+535=6661 → 6685). A 820: Retención `y 8712, 772×515`; Agente `y 9243, 772×1126` (apilado, sin solape). Las 5 reglas se ven en los 4 combos (`Hook 30/30 · Captions 25/25 · Cortes 20/20 · CTA 15/15 · Safe 10/10`, más `Medido en vivo: 6/6 escenas dentro de la safe zone · Safe 10/10`). El Brief completo está debajo del Agente con su botón alcanzable; captura `juez1b-light-1280-brief.png` lo muestra entero. Captura `juez1b-light-1280-studio.png`: panel de Retención completo + Agente debajo, sin tapar nada.

## (b) Contraste WCAG — PASS

361 textos visibles auditados por combo, componiendo fondos semitransparentes sobre el fondo real (`#0A0A0F` / `#12121A`), umbral 4,5:1 (3:1 texto grande ≥24 px o ≥18,66 px bold). **0 textos por debajo del umbral** en la pasada válida.

Muestras medidas (verificación independiente en Python, no solo el harness):
- Token muted `#82828F`: **4,91:1** sobre `#12121A` (fondo de ventana) y **5,21:1** sobre `#0A0A0F` (fondo de página). El fix (subir de `#6E6E7C`, 3,94:1) está aplicado y pasa. Textos que lo usan y pasan: línea de export, `Sin actividad todavía.`, etiquetas `PLANTILLA`, `AGENTE`, `PROVEEDOR`, `BASE URL`, `MODELO`, `API KEY (REQUERIDA)`.
- Secundario `#9A9AA8`: 7,11:1 sobre `#0A0A0F`; 6,71:1 sobre `#12121A`.
- Texto con degradado `text-flare` (ámbar→coral→violeta, `bg-clip: text`): peor stop `#8B5CF6` = **4,66:1**; `#FFB020` = 10,8:1; `#FF5A3C` = 6,38:1. Son textos grandes (24–36 px bold, umbral 3:1), así que pasan con margen. Incluye el tagline del footer `Atrapa la mirada. Retén el scroll. Gana el click.`, el `/100` del score y las palabras de escenas (`Descanso Total`, `frescura total`, `renovado.`, `¿Dormiste mal otra vez?`).

## (c) Copy — PASS

- **Footer en español** en los 4 combos: `Flare — open source (MIT) · Hecho para el Dojo AI Hackathon 2026 · github.com/B4san/flare`.
- **Etiqueta 85/100 coherente:** al cambiar la plantilla a `marca-personal`, el panel muestra `85/100` + `Casi listo · revisa los puntos en rojo` en claro y oscuro a 1280 (verificado en juez1c esperando a que la auditoría en vivo terminara: `Medido en vivo` dentro de `#win-retention`). El desglose es coherente: `Hook 15/30 · Captions 25/25 · Cortes 20/20 · CTA 15/15 · Safe 10/10`, con la regla del hook en rojo. La plantilla `colchon-descanso-total` muestra `100/100 · Listo para publicar`. La landing muestra `Descanso Total · 100/100` y las tarjetas `100/100`, `85/100`, `85/100`.
- **Sin placeholders:** 0 ocurrencias de `Changelog from my journey`, sin botón `Login`, sin `checker local`, sin `18 s`. Duración correcta: `17,5 s` en las tarjetas (formato español) y `0.0 s / 17.5 s` en el reproductor del Studio (mismo valor, dos formatos — ver observación menor O2).
- **Chat del agente en español:** mensaje inicial `Soy el agente de Flare. Puedo leer tu brief, analizar el score de retención y aplicar arreglos en el Studio. Pulsa «Simular agente trabajando» o escríbeme.` Placeholder `Escribe un mensaje al agente…`, acciones `Generar el brief`, `Exportar el vídeo`, `Acortar la primera escena`.

## (d) Diseño — PASS (se ve bien, no genérico)

Una sola armonía en toda la página (captura completa `juez1b-light-1280-full.png`): fondo `#0A0A0F`, degradado ámbar `#FFB020` → coral `#FF5A3C` → violeta `#8B5CF6` en botones, gauge, taglines y `/100`; tipografía Space Grotesk (display) + Inter (cuerpo); tarjetas `#12121A` con bordes finos `white/10` y radios grandes. Modo claro emulado renderiza igual que oscuro (la app fuerza oscuro por clase — `html.class == "dark"` en los 4 combos; es el fix de R7 funcionando, no un bug).

Componentes reales visibles: hero con partículas (1 `<canvas>`), marquee de agentes/proveedores (Codex, Cursor, Gemini CLI, OpenCode, Qwen Code, OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Together…), titulares con reveal palabra a palabra, bento `No un generador de vídeo. Un estudio para tu agente.`, 3 tarjetas de plantilla con score real, sección de retención con gauge circular animado (Magic UI `AnimatedCircularProgressBar`), timeline de 4 pasos, Studio con ventanas flotantes (Preview, Timeline, Retención, Agente) + Brief. 43 elementos con degradado en el DOM.

## (e) Overflow / consola — PASS

`documentElement.scrollWidth == innerWidth` en los 4 combos (1280/1280, 820/820). Cero errores/excepciones de consola y cero requests fallidas (HTTP ≥400 o `loadingFailed`) en los 4 combos.

## Bugs de mi propio harness (honestidad metodológica — no son bugs de la app)

Tres artefactos de mis sondas, todos detectados por mí, corregidos y re-verificados; los resultados afectados de la primera pasada se descartan:

1. **B-H1 (juez1.mjs): espera de auditoría vacuamente true.** Mi condición `!innerText.includes('Safe zones sin verificar')` era true en página en blanco, así que el combo oscuro-1280 se sondó antes de montar (0 textos, footer null, hit-tests vacíos). Corregido en juez1b: esperar a `#win-retention` existente + `body.innerText.length > 1000` + `Medido en vivo`.
2. **B-H2 (juez1.mjs): viewport 820 no aplicado** en el combo claro-820 (`innerWidth` real 1280; `full.png` de 1280 px). Corregido en juez1b: verificar `innerWidth` tras navegar y reaplicar + recargar si no coincide. En juez1b los 4 combos tienen el viewport exacto.
3. **B-H3 (juez1b): contraste de texto con degradado medido con el degradado equivocado.** Mi walker sobrescribía `backgroundImage` al subir por los ancestros, así que midió el glow radial oscuro de un ancestro (`#1A1A26 → #0A0A0F`, ratio ~1,0) en vez del degradado propio del span. En juez1c localicé los 10 spans: su `backgroundImage` propio es `linear-gradient(135deg, rgb(255,176,32), rgb(255,90,60) 48%, rgb(139,92,246))` con `background-clip: text` y `color: transparent` — peor stop 4,66:1, texto grande (26 px bold). **No es texto invisible; es falso positivo del harness.** (Mitad de esos spans viven en slides del carrusel fuera de pantalla, `x ≈ -9900`, dentro de `overflow-hidden`; el mismo degradado.)
4. **Carrera del 85/100 en juez1b:** mi bucle cortaba al aparecer `85/100`, que llega primero por la línea de export (medida síncrona sobre `scenes.html`) mientras la auditoría en vivo aún medía y el veredicto decía transitoriamente `Sin verificar`. En juez1c, esperando a `Medido en vivo` dentro de `#win-retention`, el veredicto es `Casi listo · revisa los puntos en rojo` en claro y oscuro (espera ~1 s).

## Observaciones menores (no bloquean el APTO)

- **O1 — Estado transitorio al cambiar de plantilla (~1 s):** la línea de export ya muestra el score nuevo (`score 85/100`) mientras el veredicto en vivo aún dice `Sin verificar` hasta que termina la re-medición. Estado honesto y se resuelve solo; no es incoherencia persistente.
- **O2 — Dos formatos de duración:** las tarjetas dicen `17,5 s` (coma, español) y el reproductor del Studio `17.5 s` (punto). Mismo valor, sin `18 s` en ningún sitio; solo pulido cosmético.
- **O3 — Contadores animados del hero:** las capturas cazan `95/100` y `97/100` en `mejor score` y `12`/`13` en proveedores porque los números hacen count-up al entrar en vista; el valor final es `100/100` y `13` (ver `landing.tsx:154`). No es un error de copy.

## Archivos de evidencia

En `/tmp/flare-judge/r7c-visual/` (y copia de este reporte en `~/workspace/flare/react-rewrite/r7c-judges/`):
- `juez1.mjs`, `juez1b.mjs`, `juez1c.mjs` — sondas propias (CDP crudo).
- `juez1b-raw.json`, `juez1b-hits-{claro,oscuro}-{1280,820}.json`, `juez1b-contrast-{…}.json`, `juez1b-copy-{…}.json`, `juez1b-85-{…}.json`, `juez1c-85-{claro,oscuro}.json`, `juez1c-words.json`.
- Capturas: `juez1b-{combo}-{top,studio,brief,full}.png`, `juez1b-{combo}-studio-85.png`, `juez1c-word-*.png`, `juez1c-hero.png`. (Las de la primera pasada `juez1-*.png` / `*-1280-*` sin prefijo `juez1b-` incluyen los combos inválidos por B-H1/B-H2; no usar.)
- `preview-4182.log` — log del `vite preview` propio.

## Alcance

Solo visual/diseño/copy/UX en el build local. No se tocó GitHub, Vercel ni Dojo. No se corrigió nada. La verificación funcional y de retención corresponde a los jueces 2 y 3.
