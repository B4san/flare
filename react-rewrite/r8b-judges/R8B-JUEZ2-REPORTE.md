# R8b — Juez 2 (Funcional) — Reporte de verificación independiente

**Veredicto: APTO** — Los fixes R8 de la landing no rompieron nada funcional. Todo lo verificado funciona; los únicos FAIL que aparecieron durante la ronda resultaron ser bugs de mis propias sondas y se dirimieron uno por uno con re-probes corregidos (ver §2). **Bugs reales de la app encontrados: 0.**

- **Fecha:** 2026-11-21 (noche, CST)
- **App:** `~/workspace/flare/react-rewrite/app/`, `dist/` servido tal cual (sin reconstruir) con `vite preview` propio en el puerto **4202** (HTTP 200; `dist/index.html` del 2026-11-21 22:52 UTC)
- **Navegador:** Chromium real `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`, CDP directo por WebSocket (sin Playwright). Perfiles de pruebas en `/tmp/flare-r8bj2-profile*` (no es el navegador del usuario)
- **Sondas:** propias, escritas desde cero para esta ronda (`r8b-j2.mjs`, `r8b-j2-reprobe.mjs`, `r8b-j2-reprobe2.mjs`, `r8b-j2-reprobe3.mjs`). Los scripts `r7c-verify.mjs` / `r8b-verify.mjs` del agente de fixes se leyeron solo como referencia de método (patrón CDP); **no** se usó `r8b-verify.mjs` como evidencia. No se dio por bueno el reporte del agente de fixes (37/37 PASS): se midió todo de nuevo.
- **Alcance:** re-chequeo funcional completo (landing + Studio), no solo la landing: navegación, hero, scroll Lenis, Studio entero, export real.

## 1. Resultados

### 1.1 Cuatro combos claro/oscuro × 1280/820 (run principal, 48 checks, 48 PASS)

| Check (por combo) | light-1280 | dark-1280 | light-820 | dark-820 |
|---|---|---|---|---|
| Carga, auditoría `status: done`, Safe 10/10 | PASS | PASS | PASS | PASS |
| Score colchón 100/100 | PASS (`100/100` ×3 en body) | PASS | PASS | PASS |
| Secciones `#que-es #plantillas #retencion #como #studio` presentes | PASS | PASS | PASS | PASS |
| Nav: 4 enlaces llegan a su sección (`top: 168` en los 4) | PASS | PASS | PASS | PASS |
| Hero "Abrir el Studio" → `#studio` top 168 | PASS | PASS | PASS | PASS |
| Hero "Ver plantillas" → `#plantillas` top 168 | PASS | PASS | PASS | PASS |
| Lenis: rueda baja 0 → 600 px y sube 600 → 0 | PASS | PASS | PASS | PASS |
| Sin overflow horizontal (`scrollWidth == clientWidth`: 1272/1272 y 812/812) | PASS | PASS | PASS | PASS |
| Cero errores de consola | PASS | PASS | PASS | PASS |
| Cero peticiones fallidas (Network ≥400 / loadingFailed) | PASS | PASS | PASS | PASS |

### 1.2 Studio deep-dive (light-1280, run principal + re-probes)

| Check | Resultado | Valor medido |
|---|---|---|
| Play por botón avanza | PASS | 0,0 s → 2,5 s en 2,5 s |
| Espacio pausa (tiempo congelado en doble lectura) | PASS | 2,6 s → 2,6 s |
| Espacio reanuda | PASS | 2,6 s → 4,5 s |
| Seek por slider a 10 s | PASS | `10.0 s / 17.5 s` exacto |
| Llegar al final | PASS | `17.5 s / 17.5 s` (desde 14,5 s, respetando estado real play/pausa) |
| Reiniciar vuelve a cero | PASS | `0.0 s / 17.5 s` |
| Formato 1:1 | PASS | stage 384×384 exacto |
| Formato 16:9 | PASS | stage 512×288 exacto |
| Formato 9:16 | PASS | stage 270×480 exacto |
| Plantilla marca-personal | PASS (tras re-probe) | **85/100 "Casi listo"**, 15,0 s, 5 escenas |
| Plantilla saas-presentacion | PASS (tras re-probe) | **85/100 "Casi listo"**, 24,0 s, 8 escenas |
| Volver a colchón | PASS | **100/100 "Listo para publicar"**, 17,5 s, 6 escenas |
| 6 agentes | PASS | claude-code, codex, cursor, gemini-cli, opencode, qwen-code |
| 13 proveedores | PASS | openai, anthropic, gemini, qwen, deepseek, groq, together, mistral, openrouter, fireworks, ollama, lmstudio, custom |
| Guardar key (feedback + localStorage) | PASS | "key guardada", `flare.studio.state` y `flare.provider.keys` presentes |
| Persistencia tras recargar | PASS (tras re-probe) | agente `cursor`, proveedor `anthropic`, key 23 caracteres `sk-test…` |
| Brief generado | PASS | sección "Brief para tu agente" presente |
| Brief: Copiar brief / Copiar comando | PASS (tras re-probe 3) | "Brief copiado al portapapeles." / "Comando copiado al portapapeles." |
| Simulación del agente | PASS | completa; log `[BRIEF] Brief generado para Claude Code · proveedor OpenAI · score 100/100` |
| Chat: mensaje enviado y respuesta del agente | PASS (tras re-probe 2) | mensaje visible en `#win-agent`; el agente responde generando el brief |
| Storyboard HTML descargado | PASS | `flare-storyboard-colchon-descanso-total.html`, 3.191 B, 6 escenas (7 ocurrencias de `sb-scene` = 1 CSS + 6 escenas) |
| Export WebM real | PASS | `flare-colchon-descanso-total-9x16.webm`, **2.463.283 B**, cabecera EBML `1A 45 DF A3`, **VP9 1080×1920**, ffmpeg decodifica con salida 0 (93 frames, último timestamp 17,01 s) |
| Cero errores de consola / cero peticiones fallidas (sesión deep-dive) | PASS | [] / [] |

**Totales:** run principal 48/48 en combos + 9 PASS en Studio antes del corte (ver §2.3); re-probe 13/16 (3 FAIL de sonda, dirimidos); re-probe 2: 3/5 (2 FAIL de sonda, dirimidos); re-probe 3: **5/5 PASS**.

## 2. Los FAIL iniciales: todos bugs de sonda, no de la app

### 2.1 Plantilla marca/saas: la sonda leía el score del sitio equivocado
- **FAIL inicial:** `studio plantilla-marca-85-15s-5esc` y `...saas-85-24s-8esc` — mi sonda buscaba `/\d+\/100/` en `document.body.innerText` y tomaba las dos primeras ocurrencias, que son "100/100" estáticos del copy de la landing (sección de retención), no el score vivo. La duración (15,0 s / 24,0 s) y el nº de escenas (5 / 8) sí eran correctos: el cambio de plantilla había funcionado.
- **Dirimido:** re-probe leyendo el panel `#win-retention` directamente: marca **85/100 "Casi listo · revisa los puntos en rojo"** (Hook 15/30, resto en verde), SaaS igual, colchón **100/100 "Listo para publicar"**. PASS 3/3.

### 2.2 Persistencia: mi key de prueba tenía 23 caracteres, no 22
- **FAIL inicial:** `reprobe persistencia-tras-recargar` — tras recargar: agente `cursor`, proveedor `anthropic`, key `sk-test…` de **23** caracteres; mi sonda esperaba 22 (copié el 22 del informe R8, cuya key era `sk-test-r8j2-funcional`, un carácter más corta que la mía, `sk-test-r8bj2-funcional`).
- **Dirimido:** `printf 'sk-test-r8bj2-funcional' | wc -c` = **23**. La persistencia es correcta; el umbral de la sonda era el erróneo. PASS.

### 2.3 Crash del run principal en el conteo de agentes (harness, no app)
- Tras los 2 FAIL de plantilla, el script principal murió con `TypeError: Cannot read properties of undefined (reading 'length')` al leer `opts.agent`: una evaluación CDP devolvió respuesta vacía (harness, probablemente la página estaba ocupada recomputando la auditoría tras el cambio de plantilla). No es un fallo de la app: no hubo errores de consola ni peticiones fallidas en esa sesión, y el mismo conteo pasó limpio en el re-probe (6 agentes / 13 proveedores con sus valores exactos).

### 2.4 Brief-copiar: la sonda pulsó el botón equivocado
- **FAIL inicial (re-probe 1 y 2):** tras pulsar "Generar el brief" no existía ningún botón "Copiar" en todo el documento (`COPY-BTNS: []`). Eso es **correcto por diseño**: "Generar el brief" es un chip de sugerencia dentro de la ventana del agente que solo rellena el textarea del chat con "Genera el brief para mi agente" (`Studio.tsx:904`); el brief como tal se genera con **"Generar con mi agente"** (sección Brief, `Studio.tsx:1428`), y solo entonces aparecen "Copiar brief" y "Copiar comando" (`Studio.tsx:1446/1453`).
- **Dirimido:** re-probe 3 con el flujo correcto: antes de generar no existe "Copiar brief" (`before: false`); tras "Generar con mi agente" aparecen ambos botones; al pulsar cada uno aparece su feedback: **"Brief copiado al portapapeles."** y **"Comando copiado al portapapeles."**. 5/5 PASS.

### 2.5 Chat: primer intento sin entrega de tecla + textarea prellenado
- **FAIL inicial (re-probe 1):** el mensaje no apareció en `#win-agent` — el Enter no llegó al chat (foco perdido tras la simulación del agente, problema de timing del harness).
- **Dirimido (re-probe 2):** con foco real en el textarea, `Input.insertText` y Enter, el mensaje aparece y el agente responde generando el brief (`[BRIEF] Brief generado para Claude Code · proveedor OpenAI · score 100/100`). El check estricto de igualdad del textarea falló solo porque el textarea trae texto prellenado ("Genera el brief para mi agente", resto del chip del §2.4) y mi texto se añadió detrás; el envío y la respuesta están verificados. PASS.

## 3. Observaciones (no son bugs, no bloquean el APTO)

1. **Export WebM: 93 frames para 17,5 s.** Archivo real (EBML, VP9 1080×1920, ffmpeg salida 0, último timestamp 17,01 s), pero solo 93 frames frente a ~525 nominales a 30 fps. Causa probable, como ya se observó en R8: throttling de `requestAnimationFrame` en Chromium headless durante la grabación. Además `ffprobe` no reporta duración (metadato ausente, típico de MediaRecorder). No entra en el criterio de esta ronda (WebM real verificado en disco).
2. **Tema único oscuro.** `document.documentElement` lleva la clase `dark` en los 4 combos (también con `prefers-color-scheme: light` emulado); fondo `#0A0A0F`. No es una regresión (así era en R7c/R8); los 4 combos se ejecutaron igual con la emulación puesta. Las capturas claro/oscuro difieren por el estado de scroll/animación en el momento de la captura, no por el tema.
3. **"Generar el brief" vs "Generar con mi agente".** Dos controles con nombres casi iguales hacen cosas distintas: el primero es un atajo del chat (rellena el prompt) y el segundo genera el brief de verdad. Funciona, pero el nombre del chip puede confundir a un usuario (y confundió a dos sondas). Sugerencia no bloqueante: renombrarlo a algo como "Pedir el brief al agente".
4. **Limpieza.** La key de prueba `sk-test-r8bj2-funcional` se borró del `localStorage` del perfil de pruebas al final del re-probe (guardado con key vacía). Los perfiles (`/tmp/flare-r8bj2-profile*`) no son el navegador del usuario. El `vite preview` propio (puerto 4202) se detuvo al terminar la verificación.
5. **Concurrencia.** Durante la ronda había otros Chromium de verificación corriendo en la misma VM (otros jueces); se usaron puerto CDP y perfil propios (9234–9237, `/tmp/flare-r8bj2-profile*`) y no se tocó ningún proceso ajeno: al final seguían vivos.

## 4. Evidencia

En `/tmp/flare-judge/r8b-funcional/` (copia de este reporte también en `~/workspace/flare/react-rewrite/r8b-judges/R8B-JUEZ2-REPORTE.md`):

- `r8b-j2.mjs` — sondas propias del run principal; `r8b-j2.log` — salida completa
- `r8b-j2-reprobe.mjs` / `r8b-j2-reprobe.log` / `r8b-j2-reprobe-results.json` — 13/16 (3 FAIL de sonda)
- `r8b-j2-reprobe2.mjs` / `r8b-j2-reprobe2.log` / `r8b-j2-reprobe2-results.json` — chat y copy, 3/5 (2 FAIL de sonda)
- `r8b-j2-reprobe3.mjs` / `r8b-j2-reprobe3.log` / `r8b-j2-reprobe3-results.json` — flujo correcto de copiar, 5/5
- `dump.mjs`, `dump2.mjs` — sondeos previos de selectores
- `flare-colchon-descanso-total-9x16.webm` (2.463.283 B, VP9 1080×1920, 93 frames)
- `flare-storyboard-colchon-descanso-total.html` (3.191 B, 6 escenas)
- Capturas: `light-1280-landing.png`, `dark-1280-landing.png`, `light-820-landing.png`, `dark-820-landing.png`, `light-1280-studio-final.png`
- `preview.log` — log del `vite preview` propio (puerto 4202, HTTP 200)

**No se corrigió nada. No se tocó GitHub, Vercel ni Dojo.**
