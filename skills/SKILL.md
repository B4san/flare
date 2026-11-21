# Flare — Skill canónica

> **Flare es un estudio agent-native open source para crear comerciales, ads y presentaciones animadas de producto (HTML/CSS/GSAP → video: WebM en el navegador, o MP4 local con el CLI como opción avanzada). NO es un clon de HyperFrames ni un generador de vídeo con IA. El usuario trae su propio agente y su propia API key (BYO agent, BYO key). Nada sube a un servidor.**

Esta es la skill canónica. Es el contrato común que comparten todos los agentes (Claude, Codex, Cursor, Gemini, OpenCode, Qwen Code y cualquier otro). Los adaptadores de `skills/agents/` solo explican cómo instalar y cargar esta skill en cada agente; si hay conflicto, manda este archivo.

Proveedores: el usuario trae su propio modelo y su propia key — ver `skills/providers.md` (OpenAI, Anthropic, Gemini, Qwen, DeepSeek, Groq, Together, Mistral, OpenRouter, Fireworks, Ollama/LM Studio local, cualquier endpoint OpenAI-compatible). La key vive en su navegador o en su CLI, nunca en el repo ni en un servidor de Flare.

---

## 1. Qué es (y qué NO es)

- **Sí:** guiones cortos de 15–30 s, escenas en HTML/CSS/GSAP autocontenidas, captions quemadas, CTA final, lint + preview + render (WebM en el navegador con MediaRecorder, o MP4 local con el CLI `flare render` como opción avanzada).
- **No:** no genera vídeo con IA, no descarga clips de stock con licencia dudosa, no sube el brief ni el render a ningún servidor, no inventa marcas, precios ni testimonios.
- **BYO:** el usuario trae su agente y su API key. Flare no pide credenciales ni las guarda.

## 2. Flujo completo (síguelo en orden, no te saltes pasos)

```
brief → guion 15–30 s → escenas HTML (contrato §3)
  → captions → CTA → lint → preview → render
```

1. **Brief** — Producto, público, dolor, promesa, formato, duración, CTA. Si falta alguno, pregunta. No inventes el dolor ni la promesa.
2. **Guion 15–30 s** — Escena por escena, con `start`, `duration` y `caption` por escena. Cortes cada 2–4 s. Hook en los primeros 2 s.
3. **Escenas HTML** — Un `scenes.html` autocontenido por pieza (ver §3).
4. **Captions** — Cubren ≥80 % de la duración total. Texto grande, legible, dentro de safe zones (§5).
5. **CTA** — Últimos 3 s, visible ≥2 s, con `class="cta"`.
6. **Lint** — `flare lint` (o el script de validación, §6). Corrige todo lo que falle antes de seguir.
7. **Preview** — Abre `scenes.html` y `storyboard.html`; comprueba el seek con `?t=SEGUNDOS`.
8. **Render** — Solo después de lint en verde y preview revisado: exporta WebM en Flare Studio (MediaRecorder, sin instalar nada) o `flare render` para MP4 local (opción avanzada). Nunca prometas un render sin validar la timeline.

### Regla de oro

> **Nunca inventes duraciones ni prometas un render sin validar la timeline.**
> La duración declarada (`data-duration` del stage y `duration` de `meta.json`) debe ser exactamente la suma de las duraciones de las escenas. Si no cuadra, no hay render: hay un bug que corregir.

## 3. Contrato de escenas (respétalo exacto)

### 3.1 Composición

```html
<div id="stage"
     data-composition-id="slug-del-ejemplo"
     data-width="1080" data-height="1920"
     data-duration="18">
  <!-- clips, captions y CTA dentro -->
</div>
```

- `data-composition-id` = slug de `meta.json`.
- `data-width` / `data-height` = formato exacto (9:16 → 1080×1920; 16:9 → 1920×1080; 1:1 → 1080×1080).
- `data-duration` = duración total en segundos (entero o decimal, igual que `meta.json`).

### 3.2 Clips

```html
<section class="clip" data-start="0" data-duration="3" data-track-index="0">
  <!-- contenido de la escena: CSS, gradientes, formas -->
</section>
```

- Un clip por escena, en orden cronológico, sin huecos ni solapes: `start[n+1] = start[n] + duration[n]`.
- Cada clip dura **2–4 s** (cortes cada 2–4 s; ver §5).
- `data-track-index="0"` para la pista principal. Pistas adicionales (si las hay) usan índices superiores.
- Contenido solo con CSS, gradientes y formas. Sin imágenes externas con licencia dudosa. Si se usa una imagen, que sea de una URL estable (picsum/Unsplash) o mejor ninguna.

### 3.3 Captions

```html
<p class="caption" data-start="0" data-duration="3">¿Dormiste mal otra vez?</p>
```

- Un caption por escena como mínimo; cubren en conjunto **≥80 %** de la duración total.
- Texto corto (≤ 8–10 palabras por caption), grande, alto contraste.
- Dentro de las safe zones: márgenes del 10 % en 9:16 (y en 1:1); en 16:9, márgenes del 8 % lateral y 10 % vertical. Nunca texto pegado al borde.

### 3.4 CTA final

```html
<div class="cta" data-start="15" data-duration="3">
  <strong>Descúbrelo hoy</strong>
</div>
```

- Es el último clip (o un elemento dentro de él) y ocupa los **últimos 3 s**.
- Visible **≥2 s** seguidos.
- Un solo mensaje + una sola acción. Sin URLs inventadas ni precios inventados.

### 3.5 Animación GSAP — pausada y buscable por tiempo

- GSAP local: `web/vendor/gsap.min.js` (3.12.5, autoalojado; el CDN `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js` es alternativa si el ejemplo vive fuera del repo)
- **Todas las timelines con `paused: true`. Nunca auto-play sin control de seek.**
- Cada clip tiene su propia timeline pausada; una función de seek posiciona cada timeline según `t`.
- Al cargar, leer `?t=SEGUNDOS` de la URL y posicionar la animación ahí (para que el renderer capture frame por frame).
- Exponer obligatoriamente:

```js
window.__flareDuration = 18;          // segundos, igual que data-duration
window.__flareSeek = function (t) {   // posiciona la animación en t
  t = Math.max(0, Math.min(window.__flareDuration, Number(t) || 0));
  // para cada clip: progress 0 si t < start, 1 si t > start+duration,
  // (t - start) / duration en caso contrario; mostrar solo el clip activo
};
```

- El renderer llama a `window.__flareSeek(t)` para cada frame. Si no existe, el render falla.

## 4. Archivos de cada pieza

```
examples/<slug>/
  brief.md        # producto, público, dolor, promesa, formato, duración,
                  # guion escena por escena, CTA, score de retención objetivo
  scenes.html     # autocontenido: CSS inline + GSAP CDN, contrato §3
  storyboard.html # tarjetas por escena: tiempo, caption, mini-preview
  meta.json       # {slug,title,format,width,height,duration,fps,
                  #  scenes:[{id,name,start,duration,caption}]}
```

`format` es `"9:16"`, `"16:9"` o `"1:1"`. `fps` típico: 30. `meta.json.scenes` debe coincidir escena por escena con los clips de `scenes.html` (mismo `start`, `duration` y `caption`).

## 5. Reglas de retención — VERIFICABLES (no consejos vagos)

El score es sobre 100. Objetivo: **≥75/100**. Ver `skills/retention-checklist.md` para el detalle y cómo arreglar cada fallo.

**Motor unificado (2026-11-21):** estas reglas son idénticas en los tres scorers — `skills/examples-check.mjs`, `renderer/lib/score.js` (`flare score`) y `web/app.js` (`computeRetention`). Si cambias una regla, cámbiala en los tres sitios y re-verifica con los probes (captions 60 % → 79/100; safe zones 0 % → 75/100). Los scores fraccionarios se redondean al entero más cercano.

| # | Regla | Puntos | Umbral verificable |
|---|-------|--------|--------------------|
| 1 | Hook | 30 | Primera escena empieza en 0, tiene texto de hook (clase `hook` o headline `<h1>`/`<h2>`), dura ≤ 2,5 s y hay motion (GSAP o animación CSS) → 30. Hook presente pero primera escena > 2,5 s o sin motion → 15. Sin hook → 0 |
| 2 | Captions cubren ≥80 % | 25 | Cobertura = UNIÓN de intervalos de captions / duración total (los solapes no suman dos veces). Score = min(25, 25 × cobertura / 0,8) |
| 3 | Cortes cada 2–4 s | 20 | 20 × (clips con duración entre 2 y 4 s, ambos incluidos / clips totales) |
| 4 | CTA últimos 3 s, visible ≥2 s | 15 | CTA presente en los últimos 3 s y visible ≥ 2 s → 15; si visible < 2 s → 15 × visible / 2; sin CTA → 0 |
| 5 | Safe zones | 10 | 10 si todos los captions y el CTA están dentro de las safe zones (margen 10 % arriba/abajo según formato); si no, 10 × (elementos dentro / elementos totales). La posición se verifica de verdad (top/bottom declarado en el estilo inline o en la regla CSS `.caption`/`.cta`), nunca por un substring "10 %" en el archivo. Un elemento sin anclaje vertical declarado se cuenta como FUERA (criterio conservador: el scorer no regala puntos que no puede verificar) |

**Etiquetas (las mismas en los tres scorers):** ≥ 75 "Sólido · listo para publicar" · 50–74 "Necesita trabajo" · < 50 "Débil".

Puntuación: suma de las 5 reglas. Si alguna regla da 0, el lint debe avisar aunque el total pase de 75.

## 6. Comandos del renderer

```bash
flare lint   <dir|slug>   # valida contrato, duraciones, captions, CTA y retención
flare score  <dir|slug>   # solo el score de retención (0–100) con el desglose por regla
flare preview <dir|slug> [--port 8321] [--no-serve]
                          # valida el proyecto y lo sirve en http://localhost:8321/…
                          # (con --no-serve solo valida e imprime la ruta de scenes.html)
flare storyboard <dir|slug> [--out file.html]
                          # sin --out escribe <dir>/storyboard-export.html
                          # (nunca sobrescribe el storyboard.html del ejemplo)
flare render <dir|slug>  # render local a MP4 (opción avanzada); solo si lint está en verde
```

`<dir|slug>` es una ruta (`examples/colchon-descanso-total`,
`renderer/test-fixture`) o un slug (`colchon-descanso-total`, que se
busca en `examples/<slug>/` y `renderer/<slug>/`). Un proyecto
inexistente da un error amigable con la lista de proyectos disponibles,
sin stack trace.

**Render principal: WebM en el navegador.** El render rápido es exportar
WebM en Flare Studio (MediaRecorder / `captureStream`, botón "Exportar
video (WebM)", sin instalar nada). `flare render` a MP4 local es la
opción avanzada (determinista, frame por frame, necesita Chrome +
FFmpeg). Nunca prometas un MP4 como si fuera el render principal.

Si el CLI aún no está instalado en la máquina, el equivalente verificable es el script de validación del repo:

```bash
node skills/examples-check.mjs   # valida los 3 ejemplos y calcula su score
```

Nunca digas "el render funciona" sin haber corrido `flare lint` (o `examples-check.mjs`) y haber visto el resultado en verde. No inventes la salida de un comando que no corriste.

## 7. Qué no hacer

- No inventar duraciones, precios, marcas, testimonios ni URLs.
- No usar imágenes con licencia dudosa ni hotlinkear imágenes que expiren.
- No hacer auto-play: toda animación va pausada y bajo control de seek.
- No prometer un MP4 antes del lint.
- No subir nada a ningún servidor: el render es local.
- No duplicar la skill canónica en cada adaptador: los adaptadores referencian este archivo.

## 8. Plantilla mínima de guion (15–30 s)

| Escena | start | dur. | Caption | Visual |
|--------|-------|------|---------|--------|
| 1 Hook | 0 | 3 | Pregunta o contraste | Movimiento grande en ≤2 s |
| 2 Dolor | 3 | 3 | El dolor, en una frase | Antes / problema |
| 3 Producto | 6 | 3 | Qué es / qué hace | Producto en el centro |
| 4 Demo | 9 | 3 | Cómo funciona | Pantalla o detalle |
| 5 Beneficio | 12 | 3 | Resultado concreto | Después / resultado |
| 6 CTA | 15 | 3 | Acción + marca | CTA grande, últimos 3 s |

Ajusta el número de escenas a la duración (18 s → 6 escenas de 3 s; 24 s → 8; 15 s → 5). Nunca escenas de más de 4 s ni de menos de 2 s.
