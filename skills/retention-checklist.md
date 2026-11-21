# Checklist de retención — reglas verificables

Objetivo: **≥75/100**. Cada regla tiene un umbral numérico, cómo medirlo y cómo arreglarlo si falla. Nada de "que se sienta dinámico": o el número cuadra o no cuadra.

Medir con: `flare score <slug>` o `node skills/examples-check.mjs` (desglose por regla).

**Motor unificado (2026-11-21):** estas reglas son idénticas en los tres scorers — `skills/examples-check.mjs`, `renderer/lib/score.js` (`flare score`) y `web/app.js` (`computeRetention`). Los scores fraccionarios se redondean al entero más cercano. **Etiquetas (las mismas en los tres):** ≥ 75 "Sólido · listo para publicar" · 50–74 "Necesita trabajo" · < 50 "Débil".

---

## Regla 1 — Hook — 30 pts

**Umbral:**
- La primera escena empieza en `t = 0` y tiene texto de hook: clase `hook` o headline (`<h1>` / `<h2>`).
- La primera escena dura **≤ 2,5 s**.
- Hay motion en la pieza: timeline GSAP (o animación CSS / `@keyframes`).

**Puntos:** 30 si cumple todo; 15 si el hook está presente pero la primera escena dura > 2,5 s o no hay motion; 0 si no hay hook (primera escena sin texto de hook, o que no empieza en 0).

**Cómo medirlo:** primer clip `data-start="0"`, elemento con `class="hook"` (o `<h1>`/`<h2>`) dentro, `data-duration <= 2.5`, y `gsap.` o `@keyframes`/`animation` en el archivo.

**Si falla:**
- Primera escena de 3 s → recórtala a ≤ 2,5 s (o acepta 15/30: el total aún puede pasar de 75).
- Sin movimiento → añade `gsap.fromTo` de entrada en el clip 1 (escala 0.9→1, y 20→0 px, opacidad 0→1) dentro de su timeline pausada.
- Sin texto de hook → añade un `<h1 class="hook">` con la pregunta o el contraste en la primera escena.

## Regla 2 — Captions cubren ≥80 % de la duración — 25 pts

**Umbral:** cobertura = (segundos cubiertos por al menos un caption) / duración total ≥ 0,80. La cobertura es la **unión** de intervalos `[start, start+duration)` de todos los `.caption`: los solapes no suman dos veces.

**Puntos:** `min(25, 25 × cobertura / 0,8)` (redondeado). Ejemplos: cobertura 100 % → 25; 60 % → 19; 40 % → 13; 0 % → 0.

**Cómo medirlo:** unión de intervalos de todos los `.caption`. Un caption por escena, con la misma duración que su clip, da 100 %.

**Si falla:**
- Añade un caption a cada escena sin caption, con la duración completa del clip.
- Si una escena es puramente visual, pon un caption corto que narre lo que se ve (no dejes escenas mudas de más de 1 s).
- No alargues captions más allá de su clip para "inflar" cobertura: los solapes no suman dos veces.

## Regla 3 — Cortes cada 2–4 s — 20 pts

**Umbral:** todos los clips duran entre 2 y 4 s, ambos incluidos.

**Puntos:** `20 × (clips en rango / clips totales)` (redondeado). Ejemplos: 6/6 → 20; 3/6 → 10; 0/6 → 0.

**Cómo medirlo:** cada `.clip` con `data-duration` entre 2 y 4. La suma de duraciones debe ser igual a `data-duration` del stage y a `meta.json.duration`.

**Si falla:**
- Clip >4 s → divídelo en dos escenas (cambia el ángulo, el texto o el plano).
- Clip <2 s → fusiónalo con la escena vecina o alarga su contenido hasta 2 s.
- Suma ≠ duración total → corrige `data-duration` del stage o de los clips; nunca "ajustes" el total para que cuadre sin cambiar las escenas.

## Regla 4 — CTA en los últimos 3 s, visible ≥2 s — 15 pts

**Umbral:** existe un elemento `.cta` visible dentro de los últimos 3 s de la pieza.

**Puntos:** 15 si el CTA es visible ≥ 2 s dentro de los últimos 3 s; si es visible menos de 2 s, `15 × visible / 2` (redondeado); 0 si no hay CTA o nunca es visible en los últimos 3 s.

**Cómo medirlo:** `.cta` con `start` y `duration` en el HTML; visible = solape de `[start, start+duration)` con `[duración−3, duración)`.

**Si falla:**
- CTA antes de los últimos 3 s → muévelo al último clip.
- CTA de <2 s → alarga el último clip a 3 s (o el CTA a ≥2 s dentro de él).
- Sin `.cta` → añade el elemento con `class="cta"` y un solo mensaje + una sola acción. **Diseño intencionado:** sin CTA el lint falla y `flare score` se niega a puntuar (el fixture `renderer/fixture-broken/` existe justo para comprobarlo).

## Regla 5 — Safe zones: texto dentro de márgenes del 10 % — 10 pts

**Umbral:** ningún caption ni el CTA está a menos del 10 % del borde del stage (margen vertical del 10 % en todos los formatos; en 16:9 el lateral es 8 %).
- 9:16 (1080×1920): margen ≥108 px lateral, ≥192 px vertical.
- 1:1 (1080×1080): margen ≥108 px en todos los lados.
- 16:9 (1920×1080): margen ≥154 px lateral (8 %), ≥108 px vertical (10 %).

**Cómo medirlo (posición real, no substrings):** el scorer lee el `top`/`bottom` declarado de cada caption y del CTA — primero del estilo inline del elemento, si no de su regla CSS `.caption`/`.cta` — y lo compara con el 10 % de la altura. Un elemento está dentro si todos sus anclajes verticales declarados están a ≥ 10 % del borde. **Nunca** se busca un "10 %" suelto en el archivo: un gradiente decorativo con "10 %" ya engañó una vez a este chequeo y dio 10/10 a una pieza con todo el texto pegado al borde.

**Puntos:** `10 × (elementos dentro / elementos totales)` (redondeado). Un elemento **sin anclaje vertical declarado** (ni `top` ni `bottom` en inline ni en su regla CSS) se cuenta como FUERA: criterio conservador documentado — el scorer no regala puntos que no puede verificar. Limitación conocida: se comprueba el borde anclado declarado, no la caja renderizada; el preview visual sigue siendo necesario.

**Si falla:**
- Sube el `padding` lateral del stage a ≥10 % y el vertical a ≥10 %.
- Mueve captions/CTA que estén con `top: 0`, `bottom: 0`, `left: 0` o `right: 0` hacia dentro (p. ej. `.caption { left: 10%; right: 10%; bottom: 12%; }`).
- Reduce el `font-size` si el texto se desborda del margen.

---

## Tabla resumen

| # | Regla | Pts | Umbral |
|---|-------|-----|--------|
| 1 | Hook | 30 | 1ª escena en 0 + hook + ≤2,5 s + motion → 30; hook presente pero >2,5 s o sin motion → 15; sin hook → 0 |
| 2 | Captions ≥80 % | 25 | min(25, 25 × cobertura / 0,8), cobertura = unión de intervalos |
| 3 | Cortes cada 2–4 s | 20 | 20 × (clips en rango / clips totales) |
| 4 | CTA últimos 3 s, ≥2 s | 15 | visible ≥2 s → 15; si no, 15 × visible / 2; sin CTA → 0 |
| 5 | Safe zones 10 % | 10 | 10 × (elementos dentro / elementos totales), por posición real |
| | **Total** | **100** | **objetivo ≥75 — "Sólido · listo para publicar"** |

## Checklist rápida (copiar antes de entregar)

- [ ] Suma de clips = `data-duration` = `meta.json.duration`
- [ ] Primera escena en 0, con hook, duración ≤2,5 s y motion GSAP/CSS
- [ ] Captions cubren ≥80 %
- [ ] Todos los clips duran 2–4 s
- [ ] `.cta` en los últimos 3 s, visible ≥2 s
- [ ] Texto dentro de márgenes del 10 % (top/bottom declarados, no "10 %" suelto)
- [ ] `window.__flareSeek` y `window.__flareDuration` expuestos; `?t=` funciona
- [ ] `node skills/examples-check.mjs` en verde
