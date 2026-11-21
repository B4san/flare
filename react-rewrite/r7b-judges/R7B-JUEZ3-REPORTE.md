# R7b — JUEZ 3 (retención / medición) — REPORTE

**Veredicto: APTO** (retención y medición; sin bugs bloqueantes)

**Fecha:** 2026-11-21 ~12:57–13:00 CST
**Ámbito:** solo retención/medición del Studio React. No se corrigió nada; no se tocó GitHub, Vercel ni Dojo.

## Método (medición propia, no del reporte de fixes)

- App servida por mí: `cd ~/workspace/flare/react-rewrite/app && npm run preview -- --port 4183 --host 127.0.0.1` (build `dist/` existente, HTTP 200).
- Chromium real por CDP: `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome` (headless, viewport 1280×900). Sin Playwright.
- Sondas propias (código escrito por este juez, no reutilizado de `r7b-verify.mjs` ni de `lib/audit.ts`):
  - `juez3-probe.mjs` — barrido 9 combos + playback CTA. Re-mide rects con `getBoundingClientRect` con implementación independiente: safe zone 10 % (tolerancia 0,5 px), solapes texto↔texto y caption/CTA↔visual (> 0,5 px²), visual colapsado (< 20 px), sobre los stages de auditoría fuera de pantalla **y** sobre el preview visible.
  - `juez3-playback.mjs` — sonda focal paso a paso del playback CTA en 1:1 y 9:16.
  - `juez3-repro.mjs` — reproducción exacta de la secuencia de la sonda 1 (perfil fresco).
  - `juez3-init.mjs` — estado inicial en perfil fresco.
- Referencia: `node skills/examples-check.mjs` corrido por mí (los 3 ejemplos, PASS).
- Errores de consola en todas las sesiones: **0**.

## Resultado: 9 combos (3 plantillas × 3 formatos), 57 escenas

Mi medición independiente (J3) coincide escena por escena con `window.__flareAudit` en los 9 combos (`match: true` en todos): mismo `safePoints`, mismo conteo de violaciones. Auditoría `status: done` en los 9 combos; nunca `measuring` colgado ni `error`.

| Plantilla | Formato | Escenas | Safe app | Safe J3 (mío) | Violaciones J3 | Solapes J3 | Score panel | Veredicto panel | «sin verificar» |
|---|---|---|---|---|---|---|---|---|---|
| colchón Descanso Total | 9:16 | 6 | 10/10 | 10/10 | 0 | 0 px² | 100/100 | Listo para publicar | no |
| colchón Descanso Total | 1:1 | 6 | 10/10 | 10/10 | 0 | 0 px² | 100/100 | Listo para publicar | no |
| colchón Descanso Total | 16:9 | 6 | 10/10 | 10/10 | 0 | 0 px² | 100/100 | Listo para publicar | no |
| marca personal | 9:16 | 5 | 10/10 | 10/10 | 0 | 0 px² | 85/100 | Casi listo · revisa los puntos en rojo | no |
| marca personal | 1:1 | 5 | 10/10 | 10/10 | 0 | 0 px² | 85/100 | Casi listo · revisa los puntos en rojo | no |
| marca personal | 16:9 | 5 | 10/10 | 10/10 | 0 | 0 px² | 85/100 | Casi listo · revisa los puntos en rojo | no |
| SaaS | 9:16 | 8 | 10/10 | 10/10 | 0 | 0 px² | 85/100 | Casi listo · revisa los puntos en rojo | no |
| SaaS | 1:1 | 8 | 10/10 | 10/10 | 0 | 0 px² | 85/100 | Casi listo · revisa los puntos en rojo | no |
| SaaS | 16:9 | 8 | 10/10 | 10/10 | 0 | 0 px² | 85/100 | Casi listo · revisa los puntos en rojo | no |

- **0 solapes** entre textos/captions/CTA/kicker y safe zones en las 57 escenas (medido, no calculado).
- **Fallback «sin verificar»: no aparece en ningún combo.** El panel muestra en los 9: «Medido en vivo: N/N escenas dentro de la safe zone · Safe 10/10» + «Export (scenes.html): Safe 10/10 · score …/100». Correcto: la safe zone sí es verificable en vivo en todos los combos, así que no debe aparecer el fallback. El texto «sin verificar» solo existe en las ramas de error/medición del código, que nunca se activaron.
- Tamaños de stage medidos (audit): colchón 9:16 = 270×480 px; SaaS 16:9 = 512×288 px; preview visible 1:1 = 384×384 px. Ningún visual colapsado.

## Scores en vivo vs checker local — COINCIDEN en números

Checker corrido por mí (`node skills/examples-check.mjs`, PASS en los 3):

- colchón: **100/100** (hook 30/30, captions 25/25, cortes 20/20, CTA 15/15, safe 10/10)
- marca personal: **85/100** (hook 15/30 — primera escena 3 s > 2,5 s —, resto 25/20/15/10)
- SaaS: **85/100** (hook 15/30 — misma causa —, resto 25/20/15/10)

El panel de Retención en vivo muestra exactamente los mismos desgloses en los 9 combos (ej. marca 9:16: «Hook 15/30 · Captions 25/25 · Cortes 20/20 · CTA 15/15 · Safe 10/10»). El ítem de hook aparece en rojo con su fix («Acorta la primera escena de 3 s a ≤ 2,5 s para el hook completo (30 pts).»). **Los números coinciden; no hay divergencia de motor.**

## Playback CTA (colchón, escena 6 «CTA: Descúbrelo hoy»)

Seek a la escena 6 + play, medido sobre el preview **visible** durante playback:

| Formato | Tiempo tras seek | Tiempo tras ~1,8–2 s de play | CTA visible | Rect CTA (rel. al stage) | Solapes / violaciones en playback |
|---|---|---|---|---|---|
| 9:16 | 14,5 s / 17,5 s | 16,3–16,5 s | sí | top 328,3 · left 33,2 · 203,7×36 px (stage 270×480) | 0 / 0 |
| 1:1 | 14,5 s / 17,5 s | 16,1–16,3 s | sí | top 257,3 · left 46,8 · 290,3×34 px (stage 384×384) | 0 / 0 |
| 16:9 | 14,5 s / 17,5 s | 16,3 s | sí | top 186,4 · left 62,2 · 387,6×32 px (stage 512×288) | 0 / 0 |

Pausa funciona en los 3 formatos (el tiempo se congela; el botón vuelve a «Reproducir»). El CTA está dentro de la safe zone en los 3 formatos durante playback, sin tapar ni ser tapado por caption, kicker, midline ni chips.

## Coherencia del veredicto «Listo para publicar» / «Casi listo»

- El panel es coherente con su propia regla documentada (`src/lib/retention.ts`, R6 B9): «Listo para publicar» **solo si todas las reglas pasan**. Colchón 100/100 (todo en verde) → «Listo para publicar». Marca y SaaS 85/100 con el hook en rojo (15/30) → «Casi listo · revisa los puntos en rojo». Correcto según esa regla.
- **Hallazgo (no bloqueante, no es bug de medición): el checker y el panel discrepan en la ETIQUETA de veredicto para el mismo 85/100.** `skills/examples-check.mjs` etiqueta 85/100 como «Sólido · listo para publicar» (umbral ≥ 75, sin exigir todas las reglas en verde), mientras el panel en vivo dice «Casi listo». Los números son idénticos; solo cambia la etiqueta. Recomendación: alinear una de las dos (o el checker adopta la regla «todas en verde», o el panel adopta el umbral ≥ 75), porque hoy el mismo ejemplo es «listo para publicar» en el CLI y «casi listo» en el Studio. No afecta al veredicto APTO de esta ronda: la medición es correcta en ambos lados.

## Observación no reproducida (NO es bug — se documenta por transparencia)

En la primera sonda (`juez3-probe.mjs`), la iteración de playback en **1:1** devolvió una lectura anómala: tiempo «0.0 s / 17.5 s», escena 1 visible y CTA ausente, tras clicar «Ir a la escena 6» + «Reproducir» (los otros dos formatos de esa misma corrida salieron bien: 16,3 s, CTA presente).

**No se reprodujo:** dos re-ejecuciones independientes no la reproducen —
1. sonda focal paso a paso (`juez3-playback.mjs`): 1:1 busca a 14,5 s, reproduce a 16,1 s, CTA presente (rect arriba), pausa correcta;
2. reproducción exacta de la secuencia de la sonda 1 con perfil fresco (`juez3-repro.mjs`): 9:16, 1:1 y 16:9 idénticos — seek 14,5 s → play 16,3 s, roles CTA presentes.

Revisé el código (`Studio.tsx`): no hay ningún `seek(0)` asociado al cambio de formato (los `seek(0)` existentes son solo del flujo de simulación del agente), y el estado inicial en fresco es escena 1 / 0,0 s. La lectura anómala fue, con casi total seguridad, un artefacto de mi primera sonda (carrera entre el cambio de formato y la re-renderización/auditoría en esa corrida concreta). **No lo cuento como bug de la app.** Si otro juez lo ve reproducirse con pasos manuales, que lo reabra con captura.

## Bugs encontrados

Ninguno bloqueante. Ningún solape, ninguna violación de safe zone, ningún score divergente, ningún fallback espurio, ningún error de consola.

- Hallazgo menor (etiqueta): discrepancia de veredicto checker vs panel para 85/100 (ver sección anterior). No es un error de medición.

## Evidencia

- `/tmp/flare-judge/r7b-retencion/juez3-mediciones.json` — mediciones completas de los 9 combos (auditoría de la app + mi re-medición J3 escena por escena con rects) y playback CTA.
- `/tmp/flare-judge/r7b-retencion/juez3-probe.mjs`, `juez3-playback.mjs`, `juez3-repro.mjs`, `juez3-init.mjs` — sondas propias.
- `/tmp/flare-judge/r7b-retencion/j3-playback-cta-11.png`, `j3-playback-cta-916.png` — capturas del playback CTA (1:1 y 9:16).
- `/tmp/flare-judge/r7b-retencion/j3-playback-1x1.json` — log paso a paso del playback 1:1.
- Copia de este reporte: `~/workspace/flare/react-rewrite/r7b-judges/R7B-JUEZ3-REPORTE.md`.
