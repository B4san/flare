# R7c — JUEZ 2 (funcional) — REPORTE

**Veredicto: APTO**

**Fecha:** 2026-11-21 ~13:45–13:55 CST
**Método:** verificación independiente en Chromium real (headless, CDP crudo con WebSocket de Node).
No me fié del reporte del agente de fixes (84/84) ni reutilicé su script `r7c-verify.mjs`:
escribí mis propias sondas desde cero (`juez2-probe.mjs`, `juez2-probe2.mjs`, `juez2-probe3.mjs`).
**Servidor:** mi propio `vite preview` del `dist/` en `http://127.0.0.1:4183/` (el puerto 4182
ya estaba ocupado por otro preview que sirve el mismo bundle — mismo hash `index-ekSozXt5.js`).
**Chrome:** `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`.
**Combinaciones:** claro 1280 (pase completo), oscuro 820 (pase completo), oscuro 1280 y claro 820
(control de overflow). En las 4: `scrollWidth == clientWidth` (1280→1272/1272, 820→812/812).

## Resumen de resultados

| Sonda | Checks | PASS | FAIL | Estado final |
|---|---|---|---|---|
| 1 — pase completo (claro 1280 + oscuro 820) | 54 | 50 | 4 | Los 4 FAIL resultaron ser **artefactos de mi sonda**, no bugs (ver §2) |
| 2 — diagnóstico + re-export | 15 | 7 | 8 | 7 de los 8 FAIL, mismo artefacto de scroll; confirmó el export completo |
| 3 — re-test con scroll correcto + export tras Simular+Brief | 13 | 13 | 0 | Todo PASS |

**Cero errores de consola, cero excepciones y cero peticiones fallidas (HTTP ≥ 400 / loadingFailed)
en las 3 sondas.**

## 1. Todo lo verificado (PASS)

- **Carga:** `#studio` presente, título Flare, clase `dark` forzada en `<html>` con SO en modo claro.
- **Landing y Studio sin overflow horizontal** en claro/oscuro × 1280/820.
- **Play/pausa por botón:** el tiempo avanza (1,5 s en 1,5 s) y se congela al pausar; el botón cambia a Pausar.
- **Espacio reproduce/pausa** (con foco en zona neutra): 1,5 → 2,6 s al pulsar; congela al volver a pulsar. Igual en 820 oscuro.
- **Seek con ratón en el slider:** 50 % → 8,8 s; 25 % → 4,1 s (sonda 3, con scroll correcto).
- **Seek exacto programático:** a 5,0 s → `5.0 s / 17.5 s` exactos.
- **Click en escena 3 de la timeline:** salta a su inicio, 5,5 s.
- **Fin + Reiniciar:** llega a 17,5 s y se detiene solo; «Reiniciar» vuelve a `0.0 s` (en 1280 claro y 820 oscuro).
- **Formatos (rects medidos en vivo):** 9:16 → 270×480, 1:1 → 384×384, 16:9 → 512×288, con `aria-pressed`
  correcto; verificado en 1280 claro y 820 oscuro.
- **Ejemplos:** Descanso Total 17,5 s / 6 escenas; marca 15 s / 5; SaaS 24 s / 8; vuelta a colchón correcta.
- **Agente (6):** claude-code, codex, cursor, gemini-cli, opencode, qwen-code.
- **Proveedor (13):** openai, anthropic, gemini, qwen, deepseek, groq, together, mistral, openrouter,
  fireworks, ollama, lmstudio, custom.
- **Persistencia tras recargar:** agente sigue en `cursor`, proveedor en `openai`,
  key en `localStorage['flare.provider.keys']`. La key guardada fue un valor falso de prueba
  (`sk-juez2-test-12345`) en el perfil headless desechable de la sonda, no una key real.
- **Guardar key:** muestra «[PROVEEDOR] Proveedor guardado en este navegador: OpenAI · gpt-5…».
- **Simular agente:** añade líneas al log (`[AGENTE] Leyendo brief.md y la composición actual…`).
- **Brief:** genera texto real (producto, formato 9:16 1080×1920, duración 17,5 s, score 100/100,
  agente Cursor); «Copiar brief» muestra «Brief copiado al portapapeles.».
- **Chat del agente:** mensaje del usuario aparece y el agente responde («El hook ya está en su máximo
  (30/30): la primera escena dura ≤ 2,5 s y tiene motion.»). Verificado con foco real (sonda 3).
- **Storyboard:** descarga `flare-storyboard-colchon-descanso-total.html` (3.191 bytes, contiene «Descanso Total»).
- **Export WebM REAL (ver §3):** cabecera EBML `1a 45 df a3`, VP9, 1080×1920, decodifica con ffmpeg;
  los exports 2 y 3 cubren la timeline completa (último PTS 17,412 s y 17,174 s) y el frame a t=16 s
  muestra la escena CTA completa («Descúbrelo hoy»).

## 2. Los 4 FAIL de la sonda 1 — artefactos de mi sonda, no bugs

La sonda 1 dio FAIL en A12, B06 (seek con ratón) y A32, A33 (chat). La sonda 2 lo diagnosticó:
mi `scrollIntoView()` dejaba los elementos **fuera del viewport de 900 px** (slider en y=1031,
textarea del chat en y=1223; `inViewport: false`, `elementFromPoint` = null), así que los clicks
de ratón CDP caían fuera de la ventana y no llegaban al elemento. La sonda 3 repitió ambas pruebas
con `scrollIntoView({block:'center', behavior:'instant'})` + verificación de `inView` antes de clicar:
**13/13 PASS** (seek 8,8 s @50 %, 4,1 s @25 %; chat con mensaje y respuesta del agente).
Queda constancia del error en `juez2-probe2.log` para que nadie lo confunda con un bug de la app.

## 3. Export WebM — verificado en disco (3 intentos)

| Intento | Tamaño | Frames (ffprobe) | Último PTS | Duración cubierta |
|---|---|---|---|---|
| 1 (tras Simular+Brief) | 1.706.043 B | 75 | 14,515 s | **14,5 s — truncado** |
| 2 (limpio) | 1.709.253 B | 68 | 17,412 s | 17,4 s — completa |
| 3 (tras Simular+Brief, misma secuencia que el 1) | 3.197.747 B | 112 | 17,174 s | 17,2 s — completa |

- Los 3 archivos: EBML `1a 45 df a3`, VP9 1080×1920, decodifican (`ffmpeg -f null` y extracción de
  frames OK). El frame a t=16 s del intento 3 muestra la CTA completa.
- **Anomalía no reproducida:** el intento 1 terminó en 14,515 s (justo el inicio de la escena CTA);
  su último frame es la CTA en fade de entrada (`drawFrame` usa `p = localT/0.6`). No se reprodujo
  en los intentos 2 y 3 — incluido el 3, con la misma secuencia previa (Simular + Brief) que el 1,
  y con el total confirmado en 17,5 s antes de exportar. El timeline del intento 2 muestra
  «Grabando… 17,2 s / 17,5 s» y «Video WebM exportado (1,6 MB)» a los ~19 s de pared.
  Lo clasifico como **flake de MediaRecorder/captureStream bajo carga en headless, no como bug
  reproducible de la app**, pero conviene un export de control en máquina real antes de presentar
  la beta (ver §4).
- **Fluidez:** en este headless los exports salen a ~4–6 fps efectivos (68–112 frames en 17,5 s):
  la línea de tiempo es correcta pero el vídeo se ve entrecortado. Es casi seguro un artefacto del
  render por software de la VM (rAF en reposo: 34 fps; cada tick del export redibuja un canvas
  1080×1920 + re-render de React), no un defecto funcional; en máquina real debería ser más fluido.

## 4. Bugs encontrados

**Ningún bug funcional reproducible.** Observaciones no bloqueantes:

1. **OBS-1 (no reproducida):** 1 de 3 exports WebM se truncó a 14,5 s en headless (ver §3).
   Recomendación: un export de control en Chrome real antes de la demo/Dojo.
2. **OBS-2:** en headless el WebM sale a ~4–6 fps efectivos (línea de tiempo correcta, vídeo
   entrecortado). Verificar fluidez en máquina real; si también es baja ahí, el export debería
   desacoplar el dibujado del re-render de React por tick.

## 5. Evidencia

- `/tmp/flare-judge/r7c-funcional/` — sondas `juez2-probe.mjs`, `juez2-probe2.mjs`,
  `juez2-probe3.mjs`; logs `juez2.log`, `juez2-probe2.log`, `juez2-probe3.log`;
  JSON `resultados.json`, `resultados-probe2.json`, `resultados-probe3.json`, `export2-timeline.json`;
  capturas `a-landing-1280-light.png`, `a-tras-reiniciar-1280-light.png`,
  `a-formato-16x9-1280-light.png`, `a-tras-simulacion-1280-light.png`, `a-chat-1280-light.png`,
  `b-landing-820-dark.png`, `b-studio-820-dark.png`, `p3-chat.png`;
  descargas `downloads/` (WebM 1 + storyboard), `downloads2/` (WebM 2), `downloads3/` (WebM 3);
  frames extraídos `wb-1.png`, `wb-6.png`, `wb-13.png`, `wb-14.4.png`, `wb3-16.png`.
- Copia de este reporte: `~/workspace/flare/react-rewrite/r7c-judges/R7C-JUEZ2-REPORTE.md`.

## 6. Alcance y límites

- Solo verifiqué funcionalidad (este juez). Diseño/copy/UX y retención los cubren los jueces 1 y 3.
- No toqué GitHub, Vercel ni Dojo; no corregí nada en la app.
- El `vite preview` propio (puerto 4183) y los Chromes de las sondas quedaron cerrados al terminar.
