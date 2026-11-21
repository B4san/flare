# R7c — JUEZ 3 (retención / medición) — REPORTE

**Veredicto: APTO**

Fecha: 2026-11-21 ~19:39–19:44 UTC (13:39–13:44 CST). Juez independiente de
retención/medición. No se corrigió nada; solo verificación y reporte.
No se tocó GitHub, Vercel ni Dojo.

## Método (sondas propias, no el script del agente de fixes)

- Serví `~/workspace/flare/react-rewrite/app/dist/` con mi propio
  `vite preview` en el puerto **4184** (`http://127.0.0.1:4184/`).
  Nota: el puerto 4183 ya estaba ocupado por un preview residual; comprobé
  que ambos sirven el mismo `dist` (mismo `index-ekSozXt5.js`), y usé el mío.
- `dist/` está al día: `dist/index.html` 19:20 UTC, posterior al último cambio
  de fuente (19:19:54 UTC).
- Chromium real por CDP (`~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`),
  viewport 1280×900, `prefers-color-scheme: light` emulado (la app fuerza
  clase `dark` igualmente). Perfil de Chrome nuevo y limpio.
- Sonda propia `juez3-sondas.mjs` (escrita desde cero para esta ronda; no
  reutiliza `r7c-verify.mjs`): mide con `getBoundingClientRect` escena por
  escena, con aritmética propia — la auditoría interna de la app
  (`window.__flareAudit`) solo se lee como referencia cruzada, nunca como
  evidencia única.
- Criterio propio: safe zone = margen del 10% por lado (tolerancia 0,5 px);
  solape = intersección > 0,5 px² entre roles de texto, o caption/CTA sobre el
  visual; visual colapsado si altura < 20 px; en la escena CTA el botón debe
  existir, ser visible (opacidad > 0) y estar dentro de la safe zone.
- Tres vías de medición por combo:
  - **(A)** stages de auditoría (`staticMode`, en reposo): todas las escenas.
  - **(B)** stage **visible**, escena por escena, en reposo 1,3 s tras el
    click en la timeline (entrada GSAP de 0,4 s ya asentada); se comprueba
    además que la escena mostrada es la esperada (`data-scene-id`).
  - **(C)** stage visible **durante playback real** de la escena CTA:
    seek al inicio de la CTA + Reproducir, 4 muestras (~+0,7 / +1,4 / +2,1 /
    +2,9 s) con tiempo avanzando verificado en el contador.
- Panel en vivo (`#win-retention`) comparado con el checker local, corrido
  por mí: `node skills/examples-check.mjs` desde `~/workspace/flare/`.
- Consola: se capturan `console.error`, excepciones y fallos de red durante
  toda la sesión, más eventos CDP `targetCrashed` / `loadEventFired` /
  `frameNavigated` para detectar recargas o crashes.

## Resultados — 9 combos (3 plantillas × 3 formatos)

| Plantilla | Formato | Score panel | Etiqueta panel | Safe | Medido | (A) reposo | (B) visible | (C) playback CTA |
|---|---|---|---|---|---|---|---|---|
| Descanso Total | 9:16 | 100/100 | Listo para publicar | 10/10 | 6/6 | 6/6 ok | 6/6 ok | 4/4 ok, CTA visible |
| Descanso Total | 1:1 | 100/100 | Listo para publicar | 10/10 | 6/6 | 6/6 ok | 6/6 ok | 4/4 ok, CTA visible |
| Descanso Total | 16:9 | 100/100 | Listo para publicar | 10/10 | 6/6 | 6/6 ok | 6/6 ok | 4/4 ok, CTA visible |
| marca | 9:16 | 85/100 | Casi listo · revisa los puntos en rojo | 10/10 | 5/5 | 5/5 ok | 5/5 ok | 4/4 ok, CTA visible |
| marca | 1:1 | 85/100 | Casi listo · revisa los puntos en rojo | 10/10 | 5/5 | 5/5 ok | 5/5 ok | 4/4 ok, CTA visible |
| marca | 16:9 | 85/100 | Casi listo · revisa los puntos en rojo | 10/10 | 5/5 | 5/5 ok | 5/5 ok | 4/4 ok, CTA visible |
| SaaS | 9:16 | 85/100 | Casi listo · revisa los puntos en rojo | 10/10 | 8/8 | 8/8 ok | 8/8 ok | 4/4 ok, CTA visible |
| SaaS | 1:1 | 85/100 | Casi listo · revisa los puntos en rojo | 10/10 | 8/8 | 8/8 ok | 8/8 ok | 4/4 ok, CTA visible |
| SaaS | 16:9 | 85/100 | Casi listo · revisa los puntos en rojo | 10/10 | 8/8 | 8/8 ok | 8/8 ok | 4/4 ok, CTA visible |

- **Totales (ronda principal): 57 mediciones visibles + 57 stages de
  auditoría + 36 muestras de playback = 150 mediciones, 0 violaciones,
  0 solapes.** Tamaños de stage medidos: 9:16 = 270×480, 1:1 = 384×384,
  16:9 = 512×288.
- **Scores en vivo = checker local en los 9 combos.** El checker dice:
  Descanso Total 100/100 (Listo para publicar; hook 30/30, captions 25/25,
  cortes 20/20, CTA 15/15, safe 10/10); marca 85/100 y SaaS 85/100
  (Casi listo · revisa los puntos en rojo; hook 15/30 por primera escena de
  3 s > 2,5 s, resto al máximo, safe 10/10). El panel muestra exactamente
  esos totales y etiquetas en cada formato, con Safe 10/10 y
  "Medido en vivo: N/N escenas dentro de la safe zone".
- **Cero errores de consola** en toda la sesión (0 `console.error`,
  0 excepciones, 0 fallos de red). Únicos eventos de página: la navegación
  inicial y su `load`.
- Escenas CTA verificadas: Descanso Total s6 «CTA: Descúbrelo hoy»
  14,5–17,5 s; marca s5 «CTA: sígueme y construyamos» 12,0–15,0 s;
  SaaS s8 «CTA: prueba gratis 14 días» 21,0–24,0 s. En reposo y en las 4
  muestras de playback de cada combo el CTA está presente, visible y
  dentro de la safe zone, sin solapes. Comprobación puntual independiente
  (captura dedicada): stage 9:16 de 270×480 en (185, 518); CTA de 204×36
  en (218, 846) — safe zone 212–428 × 566–950 — dentro por todos lados.

## Nota honesta: anomalía de mi primera pasada (no reproducida)

Mi primera ejecución del harness falló en el combo 1 (escena 3 visible
mostró `s1` en vez de `s3`, y luego se perdió el contexto `__j3` inyectado
durante el playback) y abortó los combos 2–9 por un bug propio del harness
(`flatMap` sobre un no-array). **No cuento esa pasada como evidencia contra
la app**, y explico por qué:

1. Corregí el harness (guarda `Array.isArray`, marcador de arranque
   `__j3boot` + chequeo de vida antes de cada paso, listeners CDP de
   crash/recarga) y **repetí la suite completa de 9 combos: 9/9 APTO,
   exit 0, cero pérdidas de contexto, cero recargas/crashes** más allá de
   la navegación inicial.
2. Hice un **re-chequeo adicional de 4 combos** (Descanso Total 9:16 dos
   veces — el camino exacto que falló — más marca y SaaS en 9:16):
   4/4 APTO, 0 errores.
3. La anomalía no se reprodujo en 3 ejecuciones del mismo camino, con
   instrumentación que la habría detectado. La clasifico como fallo
   transitorio del harness/entorno de la primera pasada, no como bug de la
   app. Si reaparece en otra ronda, merece investigación propia.

## Limitaciones de la evidencia

- Las 9 capturas automáticas por combo (`j3-<combo>.png`) quedaron en el
  hero (parte superior de la página), no en el Studio; la evidencia visual
  del Studio es la captura dedicada `j3-studio-cta-916.png` (escena CTA
  9:16 con guías de safe zone, CTA visible dentro) y
  `j3-panel-retencion.png`. La evidencia primaria son los rects medidos
  (JSON + consola), no las capturas.
- Solo se juzgó retención/medición (solapes, safe zones, CTA, scores,
  consola). No se verificaron diseño visual, copy, export WebM, ni
  comportamiento con ediciones del usuario.

## Bugs encontrados

Ninguno en el alcance de retención/medición.

## Evidencia

- `/tmp/flare-judge/r7c-retencion/R7C-JUEZ3-REPORTE.md` (este archivo)
- `/tmp/flare-judge/r7c-retencion/juez3-sondas.mjs` — sondas propias
- `/tmp/flare-judge/r7c-retencion/juez3-resultados.json` — resultados por combo
- `/tmp/flare-judge/r7c-retencion/juez3-consola2.log` — consola completa (9/9 APTO)
- `/tmp/flare-judge/r7c-retencion/juez3-recheck-consola.log` y `recheck/juez3-resultados.json` — re-chequeo 4/4 APTO
- `/tmp/flare-judge/r7c-retencion/examples-check-juez3.txt` — salida del checker local
- `/tmp/flare-judge/r7c-retencion/j3-*.png` — capturas por combo (hero)
- `/tmp/flare-judge/r7c-retencion/j3-studio-cta-916.png`, `j3-panel-retencion.png` — Studio CTA + panel
- Copia de este reporte en `~/workspace/flare/react-rewrite/r7c-judges/R7C-JUEZ3-REPORTE.md`
