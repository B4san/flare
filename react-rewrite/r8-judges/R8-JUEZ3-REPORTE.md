# R8 — Juez 3 (Retención / medición) — REPORTE

**Veredicto: APTO**

**Fecha:** 2026-11-21 ~22:06–22:10 CR
**Juez:** Juez 3 — Retención/medición (independiente; no se usó `codrops-verify.mjs` del constructor como evidencia)
**Objeto:** Flare React, rediseño Codrops de la landing (§8 de `DESIGN.md`). El rediseño tocó solo la landing; el Studio y el motor de retención no se tocaron — eso es justo lo que se verifica aquí.

## Método (sondas propias)

- Servidor propio: `vite preview` del `dist/` en el puerto **4187** (solo este juez; `curl` devolvió 200 antes de medir; cerrado al terminar).
- Navegador real: `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`, `--headless=new`, CDP directo (WebSocket global de Node), puerto CDP 9227, perfil propio en `/tmp/flare-judge/r8-retencion/chrome-profile`.
- Sonda propia: `/tmp/flare-judge/r8-retencion/r8-juez3-sonda.mjs` (escrita desde cero para esta ronda). Re-implementa la medición de rects: `getBoundingClientRect` sobre el **stage visible** (`[data-preview-stage="visible"]`), rects relativos al stage, safe zone 10–90% en ambos ejes, tolerancia 0,5 px, solape > 0,5 px² como violación, visual ≥ 20 px. El `window.__flareAudit` de la app solo se leyó como **contraste**, nunca como evidencia primaria.
- Navegación escena por escena con los propios botones de la lane de vídeo de la Timeline; espera de 950 ms tras cada cambio para que asiente la entrada GSAP (0,4 s + stagger) antes de medir.
- Checker local (referencia, no evidencia de navegador): `node skills/examples-check.mjs` desde `~/workspace/flare` → **PASS 100/85/85** (ver §4). El `dist/` estaba al día: ningún archivo de `src/` más nuevo que `dist/index.html` (22:04).
- Viewports: **1280×900** (9 combos) y **820×900** (2 combos: colchón 9:16 y saas 16:9, layout apilado < 1100 px).

## Resultado global

| Métrica | Resultado |
|---|---|
| Checks de la sonda | **195 / 195 PASS, 0 FAIL** |
| Escenas medidas con rects propios (stage visible) | **71** (57 @1280 + 14 @820) |
| Violaciones de safe zone (10–90%) | **0** |
| Solapes entre elementos del preview | **0** |
| Muestras de playback real en escena CTA | **11** (9 @1280 + 2 @820), todas limpias |
| Scores en vivo vs checker local | **idénticos en los 9 combos** |
| Errores de consola en toda la sesión | **0** |
| Requests fallidas (≥ 400) | **0** |

## 1. Los 9 combos @1280×900 — scores en vivo = checker

| Plantilla | Formato | Escenas | Score vivo | Veredicto vivo | Desglose vivo (hook/capt/cortes/CTA/safe) | Safe audit interna (contraste) |
|---|---|---|---|---|---|---|
| colchon-descanso-total | 9:16 | 6 | 100/100 | Listo para publicar | 30/25/20/15/10 | 10/10, 0 viol. |
| colchon-descanso-total | 1:1 | 6 | 100/100 | Listo para publicar | 30/25/20/15/10 | 10/10, 0 viol. |
| colchon-descanso-total | 16:9 | 6 | 100/100 | Listo para publicar | 30/25/20/15/10 | 10/10, 0 viol. |
| marca-personal | 9:16 | 5 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 10/10, 0 viol. |
| marca-personal | 1:1 | 5 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 10/10, 0 viol. |
| marca-personal | 16:9 | 5 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 10/10, 0 viol. |
| saas-presentacion | 9:16 | 8 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 10/10, 0 viol. |
| saas-presentacion | 1:1 | 8 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 10/10, 0 viol. |
| saas-presentacion | 16:9 | 8 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 10/10, 0 viol. |

Etiquetas coherentes con la regla única (R6 B9 / R7b B4): 100 → "Listo para publicar" solo con todas las reglas en verde; 85 → "Casi listo · revisa los puntos en rojo" (el punto en rojo es el hook 15/30: 1ª escena de 3 s > 2,5 s, igual que dice el checker). Sin "sin verificar" en ningún combo: la auditoría interna llegó a `done` en los 9.

## 2. Medición propia escena por escena @1280 — 0 violaciones, 0 solapes

Márgenes mínimos por combo (peor escena de cada combo; + = dentro de la safe zone). El margen es simétrico porque kicker/caption van al 12% y la safe al 10%.

| Plantilla | Formato | Escenas | Viol. | Solapes | Peor margen kicker↑ (px) | Peor margen caption↓ (px) | Visual mín. (px) |
|---|---|---|---|---|---|---|---|
| colchon | 9:16 | 6 | 0 | 0 | +10,4 | +10,4 | 48 |
| colchon | 1:1 | 6 | 0 | 0 | +8,4 | +8,4 | 40 |
| colchon | 16:9 | 6 | 0 | 0 | +6,5 | +6,5 | 28 |
| marca | 9:16 | 5 | 0 | 0 | +10,4 | +10,4 | 48 |
| marca | 1:1 | 5 | 0 | 0 | +8,4 | +8,4 | 40 |
| marca | 16:9 | 5 | 0 | 0 | +6,5 | +6,5 | 28 |
| saas | 9:16 | 8 | 0 | 0 | +10,4 | +10,4 | 48 |
| saas | 1:1 | 8 | 0 | 0 | +8,4 | +8,4 | 40 |
| saas | 16:9 | 8 | 0 | 0 | +6,5 | +6,5 | 28 |

- En cada combo se midió exactamente **1 escena CTA** (la última: colchón 6/6, marca 5/5, saas 8/8), con kicker, badge/visual, midline, chips, mid-line, botón CTA y caption, todos dentro de safe y sin solapes entre sí.
- Tamaños de stage medidos: 270×480 (9:16), 384×384 (1:1), 512×288 (16:9) — los fijos de `FORMATS`, no otros.
- El preview estaba en viewport en los 9 combos tras el scroll (p. ej. top 79 px a 1280).

## 3. Playback real en la escena CTA — 11/11 limpio

Se entró a la escena CTA, se pulsó Reproducir (botón real), se midió ~1,2 s después con el tiempo avanzando y se pausó. En los 11 casos el CTA siguió dentro de la safe zone y sin solapes.

| Combo | Tiempo antes → durante playback | CTA (top–bottom) vs safe (top–bottom) | Viol. |
|---|---|---|---|
| colchón 9:16 @1280 | 14,5 s → 15,7 s / 17,5 s | 328,3–364,3 vs 48–432 | 0 |
| colchón 1:1 @1280 | 14,5 s → 15,6 s / 17,5 s | 257,3–291,3 vs 38,4–345,6 | 0 |
| colchón 16:9 @1280 | 14,5 s → 15,6 s / 17,5 s | 186,4–218,4 vs 28,8–259,2 | 0 |
| marca 9:16 @1280 | 12,0 s → 13,2 s / 15,0 s | 328,3–364,3 vs 48–432 | 0 |
| marca 1:1 @1280 | 12,0 s → 13,1 s / 15,0 s | 257,3–291,3 vs 38,4–345,6 | 0 |
| marca 16:9 @1280 | 12,0 s → 13,1 s / 15,0 s | 186,4–218,4 vs 28,8–259,2 | 0 |
| saas 9:16 @1280 | 21,0 s → 22,2 s / 24,0 s | 328,3–364,3 vs 48–432 | 0 |
| saas 1:1 @1280 | 21,0 s → 22,1 s / 24,0 s | 257,3–291,3 vs 38,4–345,6 | 0 |
| saas 16:9 @1280 | 21,0 s → 22,1 s / 24,0 s | 186,4–218,4 vs 28,8–259,2 | 0 |
| colchón 9:16 @820 | 14,5 s → 15,6 s / 17,5 s | 328,3–364,3 vs 48–432 | 0 |
| saas 16:9 @820 | 21,0 s → 22,1 s / 24,0 s | 186,4–218,4 vs 28,8–259,2 | 0 |

El tiempo avanzó en todos los casos (~1,1–1,2 s en 1,2 s de espera) y la pausa funcionó (el tiempo quedó fijo tras pausar; p. ej. saas 16:9: 22,1 s antes y después de pausar).

## 4. @820×900 — 2 combos, mismo resultado

| Plantilla | Formato | Escenas | Score vivo | Veredicto vivo | Viol. / solapes |
|---|---|---|---|---|---|
| colchon-descanso-total | 9:16 | 6 | 100/100 | Listo para publicar | 0 / 0 |
| saas-presentacion | 16:9 | 8 | 85/100 | Casi listo · revisa los puntos en rojo | 0 / 0 |

Márgenes mínimos idénticos a 1280 (+10,4 px en 9:16; +6,5 px en 16:9): el layout apilado (< 1100 px) no cambia los rects del stage. Playback CTA también limpio en ambos (tabla §3).

## 5. Checker local (referencia)

`node skills/examples-check.mjs` (desde `~/workspace/flare`, salida íntegra en la sesión):

- `[PASS] colchon-descanso-total — 100/100 (Listo para publicar) (hook 30/30, captions 25/25, cortes 20/20, CTA 15/15, safe 10/10)`
- `[PASS] marca-personal — 85/100 (Casi listo · revisa los puntos en rojo) (hook 15/30, …) — nota: hook parcial (primera escena 3s > 2.5s)`
- `[PASS] saas-presentacion — 85/100 (Casi listo · revisa los puntos en rojo) (hook 15/30, …) — nota: hook parcial (primera escena 3s > 2.5s)`
- `Resultado: PASS — todos los ejemplos validan y puntúan >=75/100.`

Coincide exactamente con los 9 scores en vivo (§1).

## 6. Consola y red

- `Runtime.exceptionThrown`: 0 en toda la sesión (11 combos + carga inicial).
- `console.error`: 0.
- Requests con status ≥ 400 o `loadingFailed`: 0.

## 7. Bugs encontrados

**Ninguno.** No hay bug reproducible que reportar en retención/medición para esta ronda.

Observaciones (no son bugs, no bloquean):

1. **Margen más ajustado en 16:9: +6,5 px.** Es el formato con el stage más bajo (288 px): kicker y caption quedan a 6,5 px de la safe zone. Sigue dentro con holgura frente a la tolerancia de 0,5 px y es idéntico en las 3 plantillas y en los 2 viewports, así que es geometría del diseño (bandas al 12%), no una regresión del rediseño. Si un cambio futuro de tipografía crece el kicker/caption en 16:9, este es el primer sitio que se rompería.
2. **Visual más bajo en 16:9: 28 px** (frente a 48 px en 9:16). Por encima del mínimo de 20 px (R6 B6), sin colapso en ningún combo.

## 8. Nota honesta sobre la primera pasada

La primera ejecución de mi sonda dio 44 FAIL — **todos por un bug de mi propio harness, no de la app**: en `gotoScene` interpolé mal el índice de escena en la expresión evaluada en la página (`ReferenceError: i is not defined`), así que no se midió ninguna escena. Los checks de panel/auditoría/consola de esa pasada ya eran PASS. Corregí la sonda (interpolación `${i}`), la re-ejecuté completa desde cero y el resultado fue **195/195 PASS**. No se oculta la pasada fallida: los JSON finales corresponden a la segunda ejecución limpia.

## Evidencia

- Sonda: `/tmp/flare-judge/r8-retencion/r8-juez3-sonda.mjs`
- Mediciones (71 escenas + 11 playbacks, rects completos): `/tmp/flare-judge/r8-retencion/r8-juez3-mediciones.json`
- Checks (195): `/tmp/flare-judge/r8-retencion/r8-juez3-checks.json`
- Capturas (34 PNG): `/tmp/flare-judge/r8-retencion/` — `r8-landing-1280.png` + por combo `<plantilla>-<formato>-<viewport>-esc1.png`, `...-cta.png`, `...-cta-playback.png`
- Log del servidor: `/tmp/flare-judge/r8-retencion/vite-preview-4187.log`
- Copia de este reporte: `~/workspace/flare/react-rewrite/r8-judges/R8-JUEZ3-REPORTE.md`
