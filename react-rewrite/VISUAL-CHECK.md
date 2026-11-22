# Verificación visual — landing cinematográfica 2026

Este documento existe porque las sesiones de agente tienen prohibido abrir
capturas de pantalla (el router limita a 8 imágenes por conversación). Todo
lo verificable sin ojos se comprueba con texto; lo visual lo revisa una
persona fuera del sandbox con esta lista.

## Arrancar

```bash
cd react-rewrite/app
npm run build          # debe terminar en "✓ built"
npm run preview -- --port 4292 --host 127.0.0.1
```

Con el preview vivo, la verificación automática **solo texto** (sin capturas,
33 comprobaciones: copy, scores, modales, foco, scroll lock, overflow a
390/820/1024/1440, orden de capítulos y consola limpia):

```bash
node react-rewrite/textcheck.mjs
```

Y el checker del motor de retención del repo:

```bash
npm run check          # PASS · 100/85/85 · Safe 10/10
```

## Qué mirar (humano)

### 1. Hero
- Preloader FLARE con barra de progreso; desaparece y libera el scroll.
- H1 en tres líneas con máscara y «cinemático.» en serif itálica.
- El teléfono reproduce el comercial real y rota de escena cada 2,7 s.
  Al pasar el ratón se pausa; las seis rayas de debajo son clicables.
- Inclinación 3D del teléfono con el puntero (solo puntero fino).
- Chips: `Live preview`, `100/100 score`, `Safe 10/10`, `Hook 0–2,5 s`.
- Cursor propio (punto + anillo) y botones magnéticos.

### 2. Manifiesto (01)
- Titular «El anuncio dejó de ser un archivo. Ahora se dirige.».
- Ledger con los tres ejemplos: **100 / 85 / 85**, `Safe 10/10` en los tres.
- Filas clicables: abren ese ejemplo en el Studio.
- Marquee inferior con Hook / Captions / Cortes / CTA / Safe zones.

### 3. El reel (02)
- Sección pinned: al hacer scroll las tres tarjetas se desplazan en
  horizontal; barra de progreso y contador 01—03.
- Cada tarjeta: score real, frame real (sin mockups), tags.
- «Ver escenas» abre modal: foco entra en el diálogo, `Tab` queda atrapado,
  `Escape` cierra, el scroll de la página queda bloqueado mientras está abierto.
- «Abrir en Studio» cierra el modal y lleva al ejemplo correcto.

### 4. Motor de retención (03)
- Estado inicial **roto a propósito** (~40/100): hook 3,6 s, sin captions,
  cortes lentos, CTA 1,2 s, safe apagada.
- Mover el slider, los segmentos y los toggles recalcula el score en vivo.
- «Arreglar con el agente» aplica los cinco fixes en cadena y el score
  termina en **100/100** (Hook 30, Captions 25, Cortes 20, CTA 15, Safe 10).
- La timeline (6 escenas) permite saltar de escena; el playhead avanza.

### 5. Proceso (04)
- Sección pinned con tres actos (Brief → Agente → Render), crossfade
  scrubbed con el scroll y barra de progreso.
- Escenarios: `brief.md`, consola del agente con ventanas flotantes y
  export con filmstrip.

### 6. Agentes (05)
- Seis filas; hover/focus cambia el agente y el panel de la derecha.
- «Copiar» copia el comando real (feedback «Copiado» durante 1,8 s).
- Marquees de proveedores en dos direcciones.

### 7. Studio (06)
- Puente «El set está abierto. Pasa.» y después la app real.
- Selector de plantilla: **100/85/85** con `Safe 10/10` medido en vivo.
  Si aparece `—/10` es solo durante la medición; nunca un 0/10 falso.
- Probar formatos 9:16 / 1:1 / 16:9, play/pausa, arrastrar ventanas,
  timeline, chat del agente y export WebM / storyboard.
- El cursor del Studio es nativo (no el custom de la landing).

### 8. Finale (07)
- «El siguiente corte es tuyo.» y «Tu próximo comercial empieza con un brief.».
- CTA al Studio, enlace al repo, footer, wordmark FLARE interactivo.
- El rail debe marcar `06 · Studio` y luego `07 · Acción` (nunca 07 → 06).

### 9. Reduced motion
Con `prefers-reduced-motion: reduce`: sin preloader, sin cursor custom, sin
pins ni transforms; las tres tarjetas del reel se apilan y todo el texto
queda legible en estado final.

### 10. Responsive
390 / 820 / 1024 / 1440: sin scroll horizontal. A ≤900 px el reel se apila
y el rail de capítulos se oculta; el hero mantiene la rejilla de fondo.

## Capturas (solo para revisión humana)

```bash
# con el preview en 4292
node react-rewrite/shoot.mjs http://127.0.0.1:4292/ /tmp/flare-shots
```

Genera hero, 13 paradas de scroll, full-page y dos capturas móviles. El
agente **no** debe leer ni abrir esos PNG.
