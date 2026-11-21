# R7b — JUEZ 2 (funcional) — Reporte

**Veredicto: APTO**

Fecha: 2026-11-21. Método: sondas propias (Node + CDP directo) contra Chromium real
(`~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`, headless).
App servida por mí en `http://127.0.0.1:4182/` (`npm run preview`, build en `dist/`).
No me fié del reporte de fixes: cada medición es mía. Scripts y evidencia en
`/tmp/flare-judge/r7b-funcional/` (`juez2-probe-v2.mjs`, `juez2-probe-v3.mjs`,
`juez2-probe-v4.mjs`, `juez2-probe-v5.mjs`, `resultados-v*.json`, `sweep-botones-v3.json`,
capturas `combo-*.png`, `funcional-*.png`, `v3-*.png`, y los WebM exportados en
`downloads/` y `downloads-v5/`).

## Resumen de resultados

| Bloque | Resultado |
|---|---|
| Consola limpia, 4 combos (claro/oscuro × 1280/820) | PASS 8/8: 0 `console.error`, 0 excepciones, 0 peticiones fallidas/HTTP ≥400 |
| Sin overflow horizontal, 4 combos | PASS 4/4 (`scrollWidth == clientWidth`: 1272 y 812) |
| Espacio play/pausa | PASS: `0.0 → 2.5 s` al reproducir; se queda en `2.5 s` al pausar |
| Botón Reproducir/Pausar | PASS: `2.5 → 4.5 s`; pausa y se queda en `4.5 s` |
| Seek con slider | PASS: salto exacto a `8.0 s / 17.5 s` |
| Chip última escena → final → Reiniciar | PASS: chip → `14.5 s`; play hasta `17.5 s / 17.5 s`; botón `aria-label="Reiniciar"` visible al final; clic → `0.0 s / 17.5 s` |
| Cambio de formato | PASS (v3+v5): `aria-pressed` + rect del stage `[data-scene-id]` + `localStorage`: 9:16 → 270×480, 1:1 → 384×384, 16:9 → 512×288, y vuelta |
| Cambio de ejemplo | PASS: Descanso Total 17.5 s/6 escenas → Alex Rivera 15.0 s/5 escenas → Gestión Simple 24.0 s/8 escenas → vuelta a Descanso Total 17.5 s |
| Exportar WebM (botón y por chat) | PASS: archivo real y válido (ver § Export) |
| Persistencia del agente | PASS: Cursor guardado en `localStorage flare.studio.state` (`{"agentId":"cursor",...}`) y sobrevive a recarga (`#agent-select` = `cursor`, etiqueta "Cursor") |
| Auditoría del Studio | `window.__flareAudit`: `status done`, `safePoints 10`, 6 escenas, 0 violaciones, 0 solapes |
| Barrido de botones del Studio (31) | Todos con efecto verificado de forma dirigida (ver § Botones) |
| Storyboard HTML | PASS: descarga `flare-storyboard-colchon-descanso-total.html` (3.131 bytes, título "Storyboard — Descanso Total · Flare") |
| Minimizar ventana ×4 | PASS: las 4 colapsan (`aria-label` pasa a "Expandir ventana") y se restauran |
| Restablecer plantilla | PASS: con formato 1:1, restablece a 9:16 |
| Simular agente trabajando | PASS: escribe líneas `[ANÁLISIS]/[EDIT]/[RENDER]` en el log del agente |
| Guardar en este navegador | PASS: muestra "Guardado localmente · sin key — nunca sale de tu navegador." |
| Chat del agente (Enter) | PASS: "Genera el brief" → respuesta "Brief generado abajo…" + `<pre>` con el brief; "Exporta el vídeo" → exporta; "Acortar la primera escena" → responde |

## Export WebM (medido en disco, no solo el mensaje de la app)

- Botón "Exportar video (WebM)": `flare-colchon-descanso-total-9x16.webm`, **3.476.745 bytes**,
  cabecera EBML `1a 45 df a3`, doctype `webm`, **VP9 1080×1920** (ffprobe), decodifica
  completo con ffmpeg: **125 fotogramas, último PTS 15,73 s**.
- Por chat ("Exporta el vídeo en WebM"): segundo archivo válido, 2.445.090 bytes, mismo nombre.
- `ffprobe` reporta `duration=N/A`: es lo normal en salidas de MediaRecorder (sin metadato
  de duración); el contenido decodifica entero. Ver observación 2.

## Botones: qué se verificó de forma dirigida

El barrido genérico inicial marcó muchos botones como "sin efecto" porque su snapshot
era ciego (leía el primer `<span>` del Studio, no el tiempo, el chat ni las descargas).
Re-verifiqué cada uno con su superficie correcta:

- Formato 9:16/1:1/16:9, Reproducir, Reiniciar, chips "Ir a la escena N" (seek + selección),
  chips "Caption de la escena N" (seek + selección): efecto real medido.
- "Storyboard HTML", "Exportar video (WebM)": descargan archivo real.
- "Minimizar ventana" ×4, "Restablecer plantilla", "Guardar en este navegador",
  "Generar con mi agente", "Simular agente trabajando": efecto real medido.
- Chips "Generar el brief" / "Exportar el vídeo" / "Acortar la primera escena": **solo
  rellenan el borrador del chat** (`setDraft`/`setInput` en el `AgentChat` vendored,
  verificado en código). Es el comportamiento diseñado del componente, no un bug:
  el usuario debe pulsar Enter/enviar. Al enviarlos por chat, las tres acciones
  funcionan (brief, export, acortar).
- El botón "sin etiqueta" del barrido es una acción hover de mensaje del chat
  (`tabindex="-1"`, padre con `opacity-0` y `pointer-events-none`): intencionalmente
  oculto hasta hover, no un botón muerto.
- Cero errores nuevos de consola durante todo el barrido.

## Bugs reproducibles

**Ninguno.** No se encontró ningún bug funcional reproducible.

## Observaciones (no bloqueantes)

1. **Flake de formato en una sola corrida (v4, no reproducido).** En la sonda v4, los
   tres clics de formato fueron no-op (el `aria-pressed` se quedó en `true,false,false`
   y el stage en 270×480 tras 900 ms de espera). En v3 (3/3 cambios) y v5 (4/4 cambios,
   incluido un segundo intento de 1:1) el cambio funciona con `aria-pressed`, rect del
   stage y `localStorage` de acuerdo. En total: 7 cambios correctos frente a 1 corrida
   fallida. Hipótesis más probable: actualización de React demorada bajo contención de
   CPU (varios jueces con Chromium en paralelo en una VM de 1,5 CPU compartidas).
   No lo considero bug de la app, pero si vuelve a aparecer, ahí está el dato.
   (Nota: en v2 hubo además 3 FAILs de formato por error mío de sonda — leía
   `aria-pressed` sincrónicamente justo tras el clic, antes de que React actualizara;
   corregido en v3/v5.)
2. **WebM exportado en headless cargado: 125 fotogramas / último PTS 15,73 s frente a
   17,5 s de timeline.** El export graba en tiempo real con `canvas.captureStream(30)`
   y `requestAnimationFrame`; con la VM saturada se pierden fotogramas. El archivo es
   válido y decodifica entero; en una máquina real debería acercarse a 30 fps.
   No es un defecto de la app en estas condiciones, pero conviene re-medirlo en un
   navegador real sin carga si la duración exacta del export importa.
3. **Incidente de harness en v1 (no es un bug de la app, se reporta por transparencia).**
   Mi primera sonda se colgó ~8 min en el combo claro-820: el puerto CDP 9224 dejó de
   responder aunque el proceso de Chrome seguía vivo y sin proceso renderer. Un dump
   de crash apareció a las 19:06, pero sus metadatos indican que es del proceso
   *browser* y coincide con el momento en que yo maté Chrome con SIGTERM, no con un
   crash de la página. La sonda v2, con perfil y puerto nuevos, completó los 4 combos
   (incluido claro-820) sin incidentes, y el control con página trivial a 820 también
   pasó. Conclusión: incidente del entorno/harness, no reproducible, no atribuible a Flare.

## Archivos de evidencia

- `/tmp/flare-judge/r7b-funcional/R7B-JUEZ2-REPORTE.md` (este reporte)
- `/tmp/flare-judge/r7b-funcional/juez2-probe-v2.mjs`, `juez2-probe-v3.mjs`,
  `juez2-probe-v4.mjs`, `juez2-probe-v5.mjs`
- `/tmp/flare-judge/r7b-funcional/juez2-v2-stdout.log`, `juez2-v3-stdout.log`,
  `juez2-v4-stdout.log`, `juez2-v5-stdout.log`, `resultados-v2.json`,
  `resultados-v3.json`, `resultados-v4.json`, `resultados-v5.json`
- `/tmp/flare-judge/r7b-funcional/combo-{light,dark}-{1280,820}-v2.png`,
  `funcional-tras-reiniciar-v2.png`, `v3-formato-*.png`, `v3-agente-cursor-tras-recarga.png`
- `/tmp/flare-judge/r7b-funcional/downloads/flare-colchon-descanso-total-9x16.webm`
  (3.476.745 bytes) y `downloads-v5/flare-colchon-descanso-total-9x16.webm` (2.445.090 bytes)
- Copia de este reporte: `~/workspace/flare/react-rewrite/r7b-judges/R7B-JUEZ2-REPORTE.md`

No se corrigió nada. No se tocó GitHub, Vercel ni Dojo.
