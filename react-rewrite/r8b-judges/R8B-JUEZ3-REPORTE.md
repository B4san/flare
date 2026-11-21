# R8b — JUEZ 3 (retención / medición) — REPORTE

**Veredicto: APTO**

Fecha: 2026-11-21 ~23:12–23:16 UTC (17:12–17:16 CST). Juez independiente de
retención/medición. No se corrigió nada; solo verificación y reporte.
No se tocó GitHub, Vercel ni Dojo. Los fixes R8 tocaron solo la landing
(pin-ready.ts, estela Kinetic, ScrubbedSteps); el Studio y el motor de
retención no se tocaron — eso es justo lo que se verifica aquí, y la
medición confirma que siguen intactos.

## Método (sondas propias, no el script del agente de fixes)

- Serví `~/workspace/flare/react-rewrite/app/dist/` con mi propio
  `vite preview` en el puerto **4203** (`http://127.0.0.1:4203/`).
  Nota: a mitad de la sesión detecté que todos los `vite preview` de la VM
  habían muerto (incluidos 4186/4201/4202 de otros agentes); reinicié el
  mío a las 23:11 UTC y verifiqué HTTP 200 + HTML de la app antes de medir.
- `dist/` está al día: ningún archivo de `src/` es más nuevo que
  `dist/index.html` (2026-11-21 22:52:36 UTC).
- Chromium real por CDP (`~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`),
  viewport 1280×900 (9 combos) y 820×900 (2 spots), `prefers-color-scheme:
  light` emulado. Perfil de Chrome nuevo y limpio.
- Sonda propia `j3b-limpio.mjs` (escrita desde cero para esta ronda; no
  reutiliza `r8b-verify.mjs` ni `r7c-verify.mjs`): mide con
  `getBoundingClientRect` el stage **visible** escena por escena, con
  aritmética propia — safe zone 10–90% en los 4 lados, solape > 0,5 px²
  entre roles (`kicker/headline/sub/visual/midline/chips/mid-line/cta/
  caption`), visual ≥ 20 px, CTA visible (opacidad 1) y dentro de safe.
  La auditoría interna (`window.__flareAudit`) solo se lee como contraste,
  nunca como evidencia primaria.
- Navegación escena por escena con los botones reales de la lane de vídeo
  de la Timeline (`Ir a la escena N`); espera de 1,1 s tras cada cambio
  para que asiente la entrada GSAP (0,4 s + stagger) antes de medir.
- Playback real en la escena CTA: seek al inicio de la CTA + Reproducir,
  medida ~1,4 s después con el tiempo avanzando verificado en el contador,
  luego Pausa y comprobación de que el tiempo queda congelado.
- Panel en vivo (`#win-retention`) comparado con el checker local, corrido
  por mí: `node skills/examples-check.mjs` desde `~/workspace/flare/`.
- Consola: se capturan `console.error`, excepciones, fallos de red
  (status ≥ 400, `loadingFailed`) y eventos CDP de navegación/crash
  durante toda la sesión.

## Resultados — 9 combos @1280×900 + 2 spots @820

| Plantilla | Formato | Escenas | Score panel | Etiqueta panel | Desglose vivo (hook/capt/cortes/CTA/safe) | Medido vivo | Peor margen a safe* | Visual mín. |
|---|---|---|---|---|---|---|---|---|
| colchon-descanso-total | 9:16 | 6 | 100/100 | Listo para publicar | 30/25/20/15/10 | 6/6 | +6,2 px | 48 px |
| colchon-descanso-total | 1:1 | 6 | 100/100 | Listo para publicar | 30/25/20/15/10 | 6/6 | +8,4 px | 40 px |
| colchon-descanso-total | 16:9 | 6 | 100/100 | Listo para publicar | 30/25/20/15/10 | 6/6 | +6,5 px | 28 px |
| marca-personal | 9:16 | 5 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 5/5 | +6,2 px | 48 px |
| marca-personal | 1:1 | 5 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 5/5 | +8,4 px | 40 px |
| marca-personal | 16:9 | 5 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 5/5 | +6,5 px | 28 px |
| saas-presentacion | 9:16 | 8 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 8/8 | +6,2 px | 48 px |
| saas-presentacion | 1:1 | 8 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 8/8 | +8,4 px | 40 px |
| saas-presentacion | 16:9 | 8 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 8/8 | +6,5 px | 28 px |
| colchon-descanso-total | 9:16 @820 | 6 | 100/100 | Listo para publicar | 30/25/20/15/10 | 6/6 | +6,2 px | 48 px |
| saas-presentacion | 16:9 @820 | 8 | 85/100 | Casi listo · revisa los puntos en rojo | 15/25/20/15/10 | 8/8 | +6,5 px | 28 px |

\* Peor margen = distancia mínima de cualquier texto a la safe zone en los
4 lados, peor escena de cada combo (tolerancia 0,5 px). Las bandas van al
12%, así que el margen mínimo lo marca el borde lateral (9:16/1:1) o el
superior (16:9). Tamaños de stage medidos: 270×480 (9:16), 384×384 (1:1),
512×288 (16:9) — los fijos de `FORMATS`.

- **Checks de la sonda limpia: 188/188 PASS, 0 FAIL.**
- **Escenas medidas con rects propios (stage visible): 71**
  (57 @1280 + 14 @820), ids únicos y en orden (s1…sN) en los 11 combos.
- **Violaciones de safe zone: 0. Solapes entre roles: 0.**
- **Scores en vivo = checker local en los 11 combos** (ver §3).
- **Etiquetas coherentes** con la regla única: 100 → "Listo para
  publicar" solo con todas las reglas en verde; 85 → "Casi listo · revisa
  los puntos en rojo" (el punto en rojo es el hook 15/30: 1ª escena de
  3 s > 2,5 s, igual que dice el checker). Sin "sin verificar" en ningún
  combo: la auditoría interna llegó a `done` en los 11, con Safe 10/10.
- **Cero errores de consola** en toda la sesión (0 `console.error`,
  0 excepciones, 0 fallos de red, 0 crashes de pestaña).

## 1. Playback real en la escena CTA — 11/11 limpio

Se entró a la escena CTA (última de cada plantilla), se pulsó Reproducir
(botón real), se midió ~1,4 s después con el tiempo avanzando y se pausó.
En los 11 casos el CTA siguió visible (opacidad 1), dentro de la safe zone
y sin solapes, y la pausa congeló el tiempo.

| Combo | Tiempo antes → durante playback | CTA (top–bottom) vs safe vert. (top–bottom) | Pausa en |
|---|---|---|---|
| colchón 9:16 @1280 | 14,5 s → 15,8 s / 17,5 s | 328,3–364,3 vs 48–432 | 15,9 s |
| colchón 1:1 @1280 | 14,5 s → 15,8 s / 17,5 s | 257,3–291,3 vs 38,4–345,6 | 15,9 s |
| colchón 16:9 @1280 | 14,5 s → 15,8 s / 17,5 s | 186,4–218,4 vs 28,8–259,2 | 15,9 s |
| marca 9:16 @1280 | 12,0 s → 13,3 s / 15,0 s | 328,3–364,3 vs 48–432 | 13,3 s |
| marca 1:1 @1280 | 12,0 s → 13,3 s / 15,0 s | 257,3–291,3 vs 38,4–345,6 | 13,3 s |
| marca 16:9 @1280 | 12,0 s → 13,4 s / 15,0 s | 186,4–218,4 vs 28,8–259,2 | 13,5 s |
| saas 9:16 @1280 | 21,0 s → 22,1 s / 24,0 s | 328,3–364,3 vs 48–432 | 22,1 s |
| saas 1:1 @1280 | 21,0 s → 22,4 s / 24,0 s | 257,3–291,3 vs 38,4–345,6 | 22,4 s |
| saas 16:9 @1280 | 21,0 s → 22,4 s / 24,0 s | 186,4–218,4 vs 28,8–259,2 | 22,4 s |
| colchón 9:16 @820 | 14,5 s → 15,8 s / 17,5 s | 328,3–364,3 vs 48–432 | 15,8 s |
| saas 16:9 @820 | 21,0 s → 22,1 s / 24,0 s | 186,4–218,4 vs 28,8–259,2 | 22,2 s |

Escenas CTA verificadas: colchón s6 «CTA: Descúbrelo hoy» 14,5–17,5 s;
marca s5 «CTA: sígueme y construyamos» 12,0–15,0 s; SaaS s8 «CTA: prueba
gratis 14 días» 21,0–24,0 s. El avance medido (1,1–1,4 s en 1,4 s de
espera) es consistente con el bucle rAF de la app; la pausa congela el
tiempo en los 11 casos (doble lectura estable tras 0,7 s).

## 2. Checker local (referencia, corrido por mí)

`node skills/examples-check.mjs` (desde `~/workspace/flare`, salida íntegra
en `examples-check-juez3.txt`, exit 0):

- `[PASS] colchon-descanso-total — 100/100 (Listo para publicar)
  (hook 30/30, captions 25/25, cortes 20/20, CTA 15/15, safe 10/10)`
- `[PASS] marca-personal — 85/100 (Casi listo · revisa los puntos en rojo)
  (hook 15/30, …) — nota: hook parcial (primera escena 3s > 2.5s)`
- `[PASS] saas-presentacion — 85/100 (Casi listo · revisa los puntos en rojo)
  (hook 15/30, …) — nota: hook parcial (primera escena 3s > 2.5s)`
- `Resultado: PASS — todos los ejemplos validan y puntúan >=75/100.`

Coincide exactamente con los 11 scores en vivo (§1 y tabla principal).

## 3. Nota honesta: mi primera pasada estaba CONTAMINADA (descartada)

Mi primera ejecución (`j3b-sonda.mjs`, puerto CDP 9231) dio **162/167 PASS
con 5 FAIL** — y esos 5 FAIL **no son bugs de la app: son interferencia
de otros jueces corriendo en paralelo en la misma VM**. La evidencia:

1. El puerto CDP **9231 ya estaba ocupado antes de mi corrida** por el
   Chrome de otro juez (`/tmp/flare-r8b-diag4-profile`, PID 2322, en marcha
   desde las 22:48; otro Chrome más, `judge1-profile`, tenía `[::1]:9231`).
   Mi `fetch` a `127.0.0.1:9231/json/list` conectó al DevTools de ese
   Chrome, así que mi sonda condujo **su pestaña** mientras su propio
   script también la conducía. Mi Chrome propio nunca llegó a escuchar
   en 9231.
2. El re-chequeo focal (`j3b-recheck.mjs`, puerto 9232, perfil propio)
   lo confirmó de forma directa: sus `navEvents` muestran que mi pestaña
   fue navegada a `http://127.0.0.1:4201/` (el preview del juez visual)
   **dos veces durante mi recorrido** — otro agente navegaba mi mismo tab.
   Eso explica al detalle los 5 FAIL: el "cambio a marca/1:1" a mitad de
   la caminata @820 (otro juez cambió plantilla y formato), y el
   "reseteo a 0" durante el playback de SaaS 9:16 (navegación ajena que
   recargó la app con los valores por defecto). Mi re-chequeo además se
   rompió por un bug propio (leer `trace` sin guarda ante `undefined`
   tras la navegación ajena), así que tampoco cuenta como evidencia.
3. **Repetición limpia (esta ronda):** puerto CDP **9247 verificado libre
   antes de lanzar** (`ss` + `curl`), perfil Chrome **fresco**
   (`chrome-profile-limpio`), y verificación de propiedad al conectar
   (exactamente 1 pestaña `about:blank` recién lanzada) y **en cada combo**
   (URL sigue en `:4203`, contador de cargas `sessionStorage` 1…11
   secuencial, `performance.navigation` = 1, exactamente 1
   `frameNavigated` a `:4203` por combo, 0 navegaciones ajenas en los 11
   combos; 22 eventos de navegación en total = 11 míos + 11 `load`).
   Con el navegador realmente privado, **los dos caminos que fallaron
   antes pasan limpios**: SaaS 9:16 @1280 playback 21,0 → 22,1 s con CTA
   en safe, y colchón 9:16 @820 caminata s1…s6 completa.

Por eso la primera pasada queda **descartada como evidencia** (sus
capturas `*-esc1/cta/cta-playback.png` sin prefijo `limpio-` y su
`j3b-resultados.json` corresponden al navegador de otro juez, no al mío)
y el veredicto se apoya **solo** en la corrida limpia 188/188.

Acción pendiente para el orquestador (no es bug de Flare): mi Chrome del
re-chequeo roto (PID 7540, perfil `chrome-profile`, puerto 9232) **sigue
vivo** porque el script se rompió antes del `kill`, y otro juez lo está
usando como su navegador. No lo maté para no romper su corrida; conviene
coordinar su limpieza cuando ese juez termine. Lección para futuras
rondas con jueces en paralelo: **verificar la propiedad del navegador**
(puerto libre antes de lanzar + 1 sola pestaña `about:blank` al conectar
+ URL/contador por combo), porque dos scripts con el mismo puerto CDP se
conducen la pestaña mutuamente sin ningún error visible.

## 4. Bugs encontrados

**Ninguno** en retención/medición para esta ronda.

Observaciones (no son bugs, no bloquean):

1. **Margen más ajustado en 9:16 (+6,2 px) y 16:9 (+6,5 px).** Las bandas
   van al 12% y la safe al 10%; el margen mínimo lo marca el borde
   lateral (9:16/1:1) o el superior (16:9). Sigue dentro con holgura
   frente a la tolerancia de 0,5 px y es idéntico en las 3 plantillas y
   en los 2 viewports, así que es geometría del diseño, no una regresión
   de los fixes R8 (que no tocaron el Studio). Si un cambio futuro de
   tipografía o de anclaje crece el kicker/caption, estos son los
   primeros sitios que se romperían.
2. **Visual más bajo en 16:9: 28 px** (frente a 48 px en 9:16). Por encima
   del mínimo de 20 px, sin colapso en ningún combo.

## 5. Limitaciones de la evidencia

- Solo se juzgó retención/medición (solapes, safe zones, CTA, scores,
  consola/red). No se verificaron los fixes R8 de la landing en sí
  (pin, estela Kinetic, ScrubbedSteps): eso es alcance del Juez 1.
  Tampoco se verificaron diseño visual, copy, export WebM, ni
  comportamiento con ediciones del usuario.
- Las capturas automáticas por combo (`limpio-*-esc1/cta/cta-playback.png`)
  son de página completa con el Studio en su posición tras el scroll; la
  evidencia primaria son los rects medidos (JSON + consola), no las
  capturas.

## Evidencia

- Sonda limpia: `/tmp/flare-judge/r8b-retencion/j3b-limpio.mjs`
- Mediciones (71 escenas + 11 playbacks, rects completos):
  `/tmp/flare-judge/r8b-retencion/j3b-limpio-resultados.json`
- Consola limpia: `/tmp/flare-judge/r8b-retencion/j3b-limpio-consola.log`
  (188/188 PASS, 0 FAIL)
- Checker local: `/tmp/flare-judge/r8b-retencion/examples-check-juez3.txt`
- Capturas (33 PNG): `/tmp/flare-judge/r8b-retencion/limpio-*.png`
- Log del servidor: `/tmp/flare-judge/r8b-retencion/vite-preview-4203b.log`
  (preview propio :4203, PID 8590; quedó en marcha al terminar)
- Primera pasada contaminada (descartada, se conserva para auditar el
  incidente): `/tmp/flare-judge/r8b-retencion/j3b-sonda.mjs`,
  `j3b-resultados.json`, `j3b-consola.log` (162/167),
  `j3b-recheck.mjs`, `j3b-recheck-consola.log`,
  `j3b-recheck-trace-saas-916-1280-A1.json` (prueba de las navegaciones
  ajenas a :4201)
- Copia de este reporte:
  `~/workspace/flare/react-rewrite/r8b-judges/R8B-JUEZ3-REPORTE.md`
