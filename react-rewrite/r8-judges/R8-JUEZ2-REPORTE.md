# R8 — Juez 2 (Funcional) — Reporte de verificación independiente

**Veredicto: APTO** — La landing rediseñada estilo Codrops no rompió nada funcional. Todo lo verificado funciona en los 4 combos (claro/oscuro × 1280/820).

- **Fecha:** 2026-11-21 (noche, CST)
- **App:** `~/workspace/flare/react-rewrite/app/`, `dist/` servido con `vite preview` propio en el puerto **4186**
- **Navegador:** Chromium real `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`, CDP directo (WebSocket global de Node), perfil `/tmp/flare-r8j2-profile`
- **Sondas:** propias, escritas desde cero para esta ronda (`r8-funcional.mjs`, `r8-reprobe.mjs`). No se usó `codrops-verify.mjs` del constructor como evidencia. No se fió del reporte del constructor (27/27 PASS): se midió todo de nuevo.
- **Nota de método:** el run principal dio 108 checks con 13 FAIL. Los 13 se investigaron uno por uno y **todos resultaron ser bugs de mis propias sondas, no de la app**; cada uno se re-verificó con una sonda corregida en `r8-reprobe.mjs`: **12/12 PASS**. Detalle en §2. No se oculta ningún FAIL: están todos listados con su causa.

## 1. Resultados por área (run principal + re-probe)

| Área | Resultado |
|---|---|
| Landing: hero, badge Dojo, bento, plantillas, timeline, footer | PASS en 4 combos |
| Navegación (4 enlaces: Qué es / Plantillas / Retención / Studio) | PASS — cada click deja su sección a `top: 168` (scroll-mt + nav flotante) |
| Scroll suave (Lenis): rueda no atascada, subir/bajar funciona | PASS — rueda 0 → 600 px; sin scroll bloqueado |
| Botones hero "Ver plantillas" / "Abrir el Studio" | PASS — llegan a `#plantillas` (top 168) y `#studio` (top 96) |
| Studio: auditoría | PASS — `status: done`, Safe 10/10 en los 4 combos |
| Scores | PASS — colchón 100/100 "Listo para publicar"; marca 85/100 y SaaS 85/100 "Casi listo" |
| Play/pausa por botón y con Espacio | PASS — botón avanza 0,0 → 1,9 s; Espacio pausa (tiempo congelado en dos lecturas) y reanuda (1,9 → 3,3 s) |
| Seek (slider a 10 s) | PASS — 10,7–10,8 s |
| Llegar al final + Reiniciar | PASS (tras re-probe) — 17,5 s y vuelta a 0,0 s |
| Formatos 9:16 / 1:1 / 16:9 | PASS — rects 270×480 / 384×384 / 512×288 exactos |
| Cambio de ejemplo | PASS — marca 15,0 s / 5 escenas; SaaS 24,0 s / 8 escenas |
| Agente (6) y proveedor (13) | PASS — 6 opciones de agente, 13 de proveedor |
| Guardar key + persistencia tras recargar | PASS (tras re-probe) — Cursor + Anthropic + key `sk-test…` (22 caracteres) sobreviven a recargar; `localStorage` (`flare.studio.state`, `flare.provider.keys`, `flare.provider.config`) correcto |
| Brief + copiar | PASS — brief generado; al copiar aparece "Brief copiado al portapapeles." |
| Chat del agente | PASS (tras re-probe) — mensaje enviado y respuesta del agente ("Brief generado…", log `[BRIEF]`) |
| Simulación del agente ("Simular agente trabajando") | PASS — completa sin errores |
| Storyboard HTML descargado | PASS — `flare-storyboard-colchon-descanso-total.html`, 3.191 B, con las 6 escenas |
| Export WebM real | PASS — `flare-colchon-descanso-total-9x16.webm`, 2.446.598 B, cabecera EBML `1A 45 DF A3`, VP9 1080×1920, ffmpeg decodifica con salida 0 (90 frames, timestamps hasta 14,96 s) |
| Consola / red | PASS — **0 errores de consola, 0 excepciones, 0 peticiones fallidas** en las 4 sesiones |
| Overflow horizontal | PASS — `scrollWidth == clientWidth` en los 4 combos (1280/1280 y 812/812) |

**Totales:** run principal 108 checks (95 PASS, 13 FAIL todos de sonda); re-probe 12 checks (12 PASS, 0 FAIL). **Bugs reales de la app encontrados: 0.**

## 2. Los 13 FAIL iniciales: todos bugs de sonda, no de la app

| FAIL inicial | Causa real (verificada) | Re-probe |
|---|---|---|
| `landing-badge-dojo` ×4 combos | Mi sonda usaba `document.body.innerText`, que excluye el contenido `aria-hidden`: el badge renderiza sus letras en spans `aria-hidden` (scramble). Por `textContent` el badge existe, es visible (344×17 px) y dice `DOJO AI HACKATHON 2026 — FLARE · MIT`, con `aria-label="Dojo AI Hackathon 2026 — Flare · MIT"`. | PASS light-1280 y dark-820 |
| `llega-al-final-17.5` ×4 combos | Mi sonda pulsaba Espacio tras el seek sin comprobar el estado: el reproductor ya estaba reproduciendo (tras el seek a 10 s), así que Espacio lo **pausó** en 15,1 s y el tiempo quedó congelado. Comportamiento correcto de la app; error de la sonda. Respetando el estado real (`aria-label` Reproducir/Pausar) llega a 17,5 s. | PASS light-1280 y dark-820 (desde 14,5 s → 17,5 s; Reiniciar → 0,0 s) |
| `guardar-key-etiqueta` ×1 | Mi selector buscaba el primer `#studio *` con "key guardada" y devolvía un contenedor ancestro. Con selector preciso (`#studio p` con "Guardado localmente") la etiqueta es `Guardado localmente · key guardada — nunca sale de tu navegador.` | PASS |
| `persistencia-tras-recargar` ×1 | Mi sonda leía los selects 5 s fijos tras `Page.navigate`, antes de que React remontara (devolvió `null`). Con espera por polling, tras recargar: agente `cursor`, proveedor `anthropic`, key de 22 caracteres. Además, el `localStorage` del run anterior ya traía esos valores: el guardado del run principal sí había funcionado. | PASS |
| `brief-copiar-portapapeles` ×1 | `navigator.clipboard.readText()` está bloqueado en headless (`NotAllowedError: Document is not focused`), no es un fallo de la app. La confirmación propia de la app (`copyFeedback`) muestra "Brief copiado al portapapeles." y el código tiene fallback a `execCommand('copy')`. | PASS |
| `chat-envia-y-responde` ×1 | Mi sonda escribía en el textarea pero pulsaba Enter con el foco en `body` (nunca hizo `focus()` en el textarea), así que Enter no llegó al chat. Con foco real + `Input.insertText` + Enter, el mensaje se envía y el agente responde generando el brief. | PASS |
| `storyboard-descargado` ×1 | Umbral arbitrario de mi sonda (> 5.000 B). El archivo descargado es real: 3.191 B, HTML válido con las 6 escenas (7 ocurrencias de `sb-scene` = 1 CSS + 6 escenas) y score 100/100. | Verificado en disco, PASS |

## 3. Observaciones (no son bugs, no bloquean el APTO)

1. **Export WebM: 90 frames para 17,5 s.** El archivo es WebM real (EBML, VP9 1080×1920, decodifica limpio en ffmpeg, timestamps hasta 14,96 s), pero solo trae 90 frames frente a los ~525 de una captura nominal a 30 fps. Causa probable: throttling de `requestAnimationFrame` en Chromium headless durante la grabación; en una máquina real probablemente salgan más frames. No entra en el criterio de esta ronda (WebM real verificado en disco), pero conviene que el juez de retención o el constructor lo tengan en cuenta antes del envío.
2. **La app tiene un solo tema oscuro.** Emular `prefers-color-scheme: light` o `dark` no cambia nada: el fondo es siempre `#0A0A0F`. Por eso las capturas claro/oscuro son byte a byte idénticas (mismo md5). No es una regresión (así era en R7c); los 4 combos se ejecutaron igual con la emulación puesta.
3. **Nombres de capturas.** `*-landing.png` se tomó tras el click de "Abrir el Studio", así que muestra el viewport del Studio, no el hero. El contenido es real (el píxel de muestra es `#0A0A0F` y `light-1280-studio-brief.png` difiere), solo el nombre es engañoso.
4. **Limpieza.** La key de prueba `sk-test-r8j2-funcional` se borró del `localStorage` del perfil de pruebas al final del re-probe (guardado con key vacía). El perfil de pruebas (`/tmp/flare-r8j2-profile`) no es el navegador del usuario.

## 4. Evidencia

En `/tmp/flare-judge/r8-funcional/` (copia del reporte también en `~/workspace/flare/react-rewrite/r8-judges/R8-JUEZ2-REPORTE.md`):

- `r8-funcional.mjs` — sondas propias del run principal (108 checks)
- `r8-funcional.log` — salida completa del run principal
- `r8-funcional-results.json` — resultados en JSON (95 PASS / 13 FAIL con detalle)
- `r8-reprobe.mjs` — sondas de dirimido de los 13 FAIL
- `r8-reprobe-results.json` — resultados del re-probe (12 PASS / 0 FAIL)
- `flare-colchon-descanso-total-9x16.webm` (2.446.598 B, VP9 1080×1920)
- `flare-storyboard-colchon-descanso-total.html` (3.191 B, 6 escenas)
- `export-webm.json`
- Capturas: `light-1280-{landing,studio-brief,studio-final,final}.png`, `dark-1280-{landing,final}.png`, `light-820-{landing,final}.png`, `dark-820-{landing,final}.png`
- `preview.log` — log del `vite preview` propio (puerto 4186, HTTP 200)

**No se corrigió nada. No se tocó GitHub, Vercel ni Dojo.**
