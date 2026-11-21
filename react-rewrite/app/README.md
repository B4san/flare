# Flare — app React

Landing + Studio de Flare reescritos en React 19 + Vite + Tailwind v4, con
componentes reales de 21st.dev, Magic UI, Aceternity UI, Motion Primitives,
React Bits y agent-elements. Diseño y decisiones en
`../DESIGN.md`; catálogo de componentes en `../COMPONENTS.md`.

> La versión vanilla sigue en `~/workspace/flare/web/` (viva en Vercel hasta
> que esta React la sustituya). Esta app no toca `skills/`, `renderer/` ni
> `examples/`: los datos de los ejemplos van empaquetados en el bundle
> (`src/lib/data.ts`), no se sirven por fetch.

## Requisitos

- Node 20+ y npm.
- Nada más: no hay backend, no hay base de datos, no hay keys en el servidor.
  Las API keys de los proveedores viven solo en el `localStorage` del
  navegador.

## Correr en local

```bash
cd app
npm install
npm run dev        # http://localhost:5173 (hot reload)
```

Build de producción + preview local:

```bash
npm run build      # tsc + vite build → dist/
npm run preview    # http://localhost:4173 (sirve dist/)
```

Verificación rápida:

```bash
npm run build                    # debe terminar en "✓ built" sin errores
node ../../skills/examples-check.mjs   # desde ~/workspace/flare → PASS (100/85/85)
```

## Despliegue en Vercel

Opción A — proyecto nuevo (recomendada; no tocar el proyecto `flare-web`
actual hasta verificar esta versión):

1. Vercel → Add New → Project → importar `B4san/flare`.
2. **Root Directory: `react-rewrite/app`** (el repo tiene varias apps; sin
   esto Vercel no encuentra el `package.json`).
3. Framework Preset: **Vite** (Build Command `npm run build`, Output
   Directory `dist`, Install Command `npm install` — los detecta solos).
4. Variables de entorno (opcionales):
   - `VITE_SPLINE_SCENE_URL=https://prod.spline.design/<escena>/scene.splinecode`
     — solo si existe una escena Spline publicada para el hero; sin ella el
     hero usa Particles.
5. Deploy. La URL resultante es la demo a juzgar.

Opción B — sustituir el proyecto `flare-web` actual: cambiar su Root
Directory de `web/` a `react-rewrite/app` y redeployar. Hacerlo solo cuando
la R7 (o una ronda de jueces posterior) dé la beta por buena.

Comprobación post-deploy (antes de presentar): abrir la URL viva y verificar
landing + Studio + cambio de formato/ejemplo + play, y que el panel de
Retención muestre scores **100 / 85 / 85** con Safe **10/10** (medido en
vivo, nunca `—/10` en los ejemplos). Si aparece `—/10 · sin verificar`,
la auditoría no corrió: no es un score, es un fallo a investigar.

## Notas

- `lottie-react` 2.4.2 tiene un alias forzado al build ESM en `vite.config.ts`
  (su campo `browser` apunta al UMD y crashea la app con React #130).
  No quitarlo sin re-verificar en navegador.
- `src/components/vendor/` es código de terceros (vendored): se edita solo
  para compatibilidad, nunca para rediseñar. Ver `../DESIGN.md` §4.
- Los archivos de `vendor/` sin uso están excluidos del chequeo de tipos en
  `tsconfig.app.json`; el código usado sí se chequea.
